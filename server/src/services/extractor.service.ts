import * as cheerio from 'cheerio';
import { searchService } from './search.service';

export interface ExtractedArticle {
  url: string;
  title: string;
  publisher: string;
  publishedAt: string | null;
  content: string;
  restrictedAccess?: boolean;
}

// SSRF prevention: Comprehensive check for private, loopback, or metadata addresses
function isRestrictedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim().replace(/^\[|\]$/g, '');
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('::ffff:127.') ||
    lower.startsWith('fe80:') ||
    lower.startsWith('fc00:') ||
    lower.startsWith('fd00:') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === 'metadata.google.internal' ||
    lower === '169.254.169.254' ||
    lower === '100.100.100.200'
  ) {
    return true;
  }

  // Integer IP notation for 127.0.0.1 (2130706433)
  if (lower === '2130706433' || lower === '0x7f000001') {
    return true;
  }

  // IPv4 private patterns: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x, 127.x.x.x
  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const oct1 = parseInt(ipv4Match[1], 10);
    const oct2 = parseInt(ipv4Match[2], 10);
    if (oct1 === 10) return true;
    if (oct1 === 127) return true;
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return true;
    if (oct1 === 192 && oct2 === 168) return true;
    if (oct1 === 169 && oct2 === 254) return true;
    if (oct1 === 0) return true;
  }

  return false;
}

/**
 * Derive clean human-readable headline/topic from a news article URL pathname
 */
function deriveHeadlineFromSlug(urlObj: URL): string {
  const path = urlObj.pathname.replace(/\.(html|php|htm|asp|aspx)$/i, '');
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) {
    return urlObj.hostname.replace(/^www\./, '');
  }

  // Pick the longest slug segment which typically contains the article title words
  let bestSlug = '';
  for (const seg of segments) {
    if (seg.includes('-') || seg.includes('_') || seg.length > bestSlug.length) {
      if (seg.length > bestSlug.length) {
        bestSlug = seg;
      }
    }
  }

  if (!bestSlug) {
    bestSlug = segments[segments.length - 1];
  }

  // Clean numbers, IDs, and delimiters
  const cleaned = bestSlug
    .replace(/^\d+[-_]/, '')
    .replace(/[-_]\d+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();

  if (cleaned.length < 5) {
    return `${urlObj.hostname.replace(/^www\./, '')} News Report`;
  }

  // Title case conversion
  return cleaned
    .split(' ')
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(' ');
}

export async function extractArticleFromUrl(rawUrl: string): Promise<ExtractedArticle> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Unsupported protocol. Only HTTP and HTTPS URLs are allowed.');
  }

  if (isRestrictedHost(parsedUrl.hostname)) {
    throw new Error('Access to local or private network destinations is blocked for security.');
  }

  const publisher = parsedUrl.hostname.replace(/^www\./, '');
  const slugHeadline = deriveHeadlineFromSlug(parsedUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    // If publisher returned 403 Forbidden, 401 Unauthorized, 429, or anti-bot challenge
    if (!response.ok) {
      console.warn(`Publisher direct fetch returned status ${response.status}. Using search index fallback.`);
      return await fallbackExtractionFromSearch(parsedUrl, publisher, slugHeadline, response.status);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return await fallbackExtractionFromSearch(parsedUrl, publisher, slugHeadline, 200);
    }

    // Limit download size to 3MB
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 3 * 1024 * 1024) {
      throw new Error('Target document exceeds maximum allowed size (3MB).');
    }

    const decoder = new TextDecoder('utf-8');
    const html = decoder.decode(arrayBuffer);

    const $ = cheerio.load(html);

    // Remove noise and scripts
    $('script, style, noscript, nav, footer, header, aside, iframe, svg, [role="banner"], [role="navigation"]').remove();

    // Extract Title
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const documentTitle = $('title').text();
    const h1Title = $('h1').first().text();
    const title = (ogTitle || twitterTitle || h1Title || documentTitle || slugHeadline).trim();

    // Extract Publisher
    const ogSiteName = $('meta[property="og:site_name"]').attr('content');
    const metaPublisher = $('meta[name="publisher"]').attr('content') || $('meta[name="author"]').attr('content');
    const detectedPublisher = (ogSiteName || metaPublisher || publisher).trim();

    // Extract Published Date
    const ogTime = $('meta[property="article:published_time"]').attr('content');
    const pubDate = $('meta[name="pubdate"]').attr('content') || $('meta[name="date"]').attr('content');
    const timeTag = $('time').attr('datetime');
    const publishedAt = ogTime || pubDate || timeTag || null;

    // Extract article text
    let content = '';
    const articleElements = $('article, [itemprop="articleBody"], main, .article-content, .post-content, .entry-content');
    if (articleElements.length > 0) {
      content = articleElements.find('p').map((_, el) => $(el).text().trim()).get().join('\n\n');
    }

    if (!content || content.length < 100) {
      content = $('p').map((_, el) => $(el).text().trim()).get().filter(p => p.length > 30).join('\n\n');
    }

    if (!content) {
      content = $('body').text().replace(/\s+/g, ' ').trim();
    }

    // If the body is too short or blocked by paywall script in HTML
    if (!content || content.length < 40) {
      return await fallbackExtractionFromSearch(parsedUrl, detectedPublisher, title || slugHeadline, 200);
    }

    // Cap text to 6,000 characters
    if (content.length > 6000) {
      content = content.slice(0, 6000) + '... [Truncated for analysis]';
    }

    return {
      url: parsedUrl.toString(),
      title: title || slugHeadline,
      publisher: detectedPublisher,
      publishedAt,
      content,
      restrictedAccess: false,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.message.includes('blocked for security') || err.message.includes('Invalid URL')) {
      throw err;
    }

    // Connection timeout or network error: fallback gracefully to search index
    console.warn(`Extraction error: ${err.message}. Invoking search index fallback.`);
    return await fallbackExtractionFromSearch(parsedUrl, publisher, slugHeadline, 504);
  }
}

/**
 * Fallback extraction: queries search index or uses URL slug so verification never fails on 403/paywalls
 */
async function fallbackExtractionFromSearch(
  urlObj: URL,
  publisher: string,
  slugHeadline: string,
  status: number
): Promise<ExtractedArticle> {
  let searchTitle = slugHeadline;
  let searchSnippet = '';

  try {
    const results = await searchService.researchClaim(slugHeadline, [urlObj.toString()]);
    if (results.length > 0) {
      const match = results.find(r => r.url.includes(urlObj.hostname)) || results[0];
      if (match) {
        searchTitle = match.title || slugHeadline;
        searchSnippet = match.summary || '';
      }
    }
  } catch {
    // Continue with derived headline
  }

  const content = searchSnippet
    ? `[Notice: Direct access to ${publisher} was restricted (HTTP ${status}). TruthLens extracted the story from public reporting index.]\n\nTitle: ${searchTitle}\nSummary: ${searchSnippet}`
    : `[Notice: Direct automated fetch from ${publisher} encountered publisher access restriction (HTTP ${status} Forbidden/Paywall). Story identified via URL headline structure.]\n\nHeadline: ${searchTitle}`;

  return {
    url: urlObj.toString(),
    title: searchTitle,
    publisher,
    publishedAt: null,
    content,
    restrictedAccess: true,
  };
}
