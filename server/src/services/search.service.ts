import { config } from '../config/env';
import * as cheerio from 'cheerio';

export interface RawSearchResult {
  title: string;
  url: string;
  publisher: string;
  publishedAt: string | null;
  summary: string;
  category?: 'OFFICIAL' | 'FACT_CHECK' | 'NEWS' | 'OTHER';
}

export class SearchService {
  public getTavilyKey(): string {
    return process.env.TAVILY_API_KEY || config.research.tavilyApiKey || '';
  }

  public getFactCheckKey(): string {
    return process.env.GOOGLE_FACT_CHECK_API_KEY || config.research.googleFactCheckApiKey || '';
  }

  public isTavilyConfigured(): boolean {
    const key = this.getTavilyKey();
    return Boolean(key && key.trim().length > 0);
  }

  public isFactCheckConfigured(): boolean {
    const key = this.getFactCheckKey();
    return Boolean(key && key.trim().length > 0);
  }

  public getStatus() {
    return {
      tavilyConfigured: this.isTavilyConfigured(),
      factCheckConfigured: this.isFactCheckConfigured(),
      provider: this.isTavilyConfigured()
        ? 'Tavily Search API'
        : 'Open Web Search Index (Fallback Mode)',
    };
  }

  /**
   * Search multiple queries, prioritize sources, deduplicate by URL, and return clean evidence
   */
  public async researchClaim(
    claim: string,
    queries: string[] = []
  ): Promise<RawSearchResult[]> {
    const allQueries = Array.from(new Set([claim, ...queries])).filter(Boolean).slice(0, 4);
    const results: RawSearchResult[] = [];

    // 1. If Google Fact Check API is available, query it first
    if (this.isFactCheckConfigured()) {
      try {
        const factCheckResults = await this.queryGoogleFactCheck(claim);
        results.push(...factCheckResults);
      } catch (err) {
        console.warn('Google Fact Check API query failed:', err);
      }
    }

    // 2. Query Tavily Search API if configured
    if (this.isTavilyConfigured()) {
      for (const query of allQueries) {
        try {
          const tavilyItems = await this.queryTavily(query);
          results.push(...tavilyItems);
        } catch (err) {
          console.warn(`Tavily query failed for "${query}":`, err);
        }
      }
    }

    // 3. If no results yet (or Tavily not configured), execute resilient open web research
    if (results.length === 0) {
      for (const query of allQueries) {
        try {
          const webItems = await this.queryOpenWeb(query);
          results.push(...webItems);
        } catch (err) {
          console.warn(`Open web query failed for "${query}":`, err);
        }
      }
    }

    return this.deduplicateAndPrioritize(results);
  }

  /**
   * Tavily Search API implementation
   */
  private async queryTavily(query: string): Promise<RawSearchResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.getTavilyKey(),
          query,
          search_depth: 'advanced',
          include_domains: [],
          max_results: 6,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Tavily API responded with status ${response.status}`);
      }

      const data = (await response.json()) as {
        results?: Array<{
          title: string;
          url: string;
          content: string;
          published_date?: string;
        }>;
      };

      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map(item => {
        let hostname = '';
        try {
          hostname = new URL(item.url).hostname.replace(/^www\./, '');
        } catch {
          hostname = 'External Web Source';
        }

        return {
          title: item.title || 'Untitled Source',
          url: item.url,
          publisher: hostname,
          publishedAt: item.published_date || null,
          summary: item.content || item.title,
          category: this.classifySourceCategory(item.url),
        };
      });
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Google Fact Check Tools API query
   */
  private async queryGoogleFactCheck(claim: string): Promise<RawSearchResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const url = new URL('https://factchecktools.googleapis.com/v1alpha1/claims:search');
    url.searchParams.set('query', claim);
    url.searchParams.set('key', this.getFactCheckKey());
    url.searchParams.set('pageSize', '5');

    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return [];

      const data = (await res.json()) as {
        claims?: Array<{
          text: string;
          claimReview?: Array<{
            publisher?: { name?: string; site?: string };
            url?: string;
            title?: string;
            reviewDate?: string;
            textualRating?: string;
          }>;
        }>;
      };

      const out: RawSearchResult[] = [];
      for (const c of data.claims || []) {
        for (const review of c.claimReview || []) {
          if (review.url) {
            out.push({
              title: review.title || `Fact Check by ${review.publisher?.name || 'Fact Checkers'}`,
              url: review.url,
              publisher: review.publisher?.name || 'Verified Fact Checker',
              publishedAt: review.reviewDate || null,
              summary: `Claim evaluated: "${c.text}". Rating: ${review.textualRating || 'Evaluated'}`,
              category: 'FACT_CHECK',
            });
          }
        }
      }
      return out;
    } catch {
      clearTimeout(timeout);
      return [];
    }
  }

  /**
   * Resilient fallback open web search parser using live Google News RSS and public indexes
   */
  private async queryOpenWeb(query: string): Promise<RawSearchResult[]> {
    const items: RawSearchResult[] = [];

    // 1. Query Google News RSS for authoritative real-time news articles
    try {
      const newsRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const rssController = new AbortController();
      const rssTimeout = setTimeout(() => rssController.abort(), 6000);

      const rssRes = await fetch(newsRssUrl, {
        signal: rssController.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(rssTimeout);

      if (rssRes.ok) {
        const xml = await rssRes.text();
        const $ = cheerio.load(xml, { xml: true });
        $('item').slice(0, 5).each((_, el) => {
          const rawTitle = $(el).find('title').text().trim();
          const link = $(el).find('link').text().trim();
          const pubDate = $(el).find('pubDate').text().trim();
          const source = $(el).find('source').text().trim() || 'News Publisher';

          if (rawTitle && link) {
            items.push({
              title: rawTitle,
              url: link,
              publisher: source,
              publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
              summary: `Reported by ${source}: ${rawTitle}`,
              category: this.classifySourceCategory(source),
            });
          }
        });
      }
    } catch (err) {
      console.warn('Google News RSS query failed:', err);
    }

    // 2. Query DuckDuckGo HTML index for additional web coverage
    if (items.length < 3) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      try {
        const response = await fetch(searchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        clearTimeout(timeout);

        if (response.ok) {
          const html = await response.text();
          const $ = cheerio.load(html);

          $('.result').each((_, el) => {
            const titleEl = $(el).find('.result__title a');
            const snippetEl = $(el).find('.result__snippet');
            const title = titleEl.text().trim();
            let rawHref = titleEl.attr('href') || '';

            let actualUrl = rawHref;
            if (rawHref.includes('uddg=')) {
              const match = rawHref.match(/uddg=([^&]+)/);
              if (match && match[1]) {
                actualUrl = decodeURIComponent(match[1]);
              }
            }

            if (actualUrl.startsWith('//')) {
              actualUrl = 'https:' + actualUrl;
            }

            if (!actualUrl.startsWith('http')) return;

            let publisher = 'Web Publisher';
            try {
              const urlObj = new URL(actualUrl);
              publisher = urlObj.hostname.replace(/^www\./, '');
            } catch {
              return;
            }

            const snippet = snippetEl.text().trim();

            if (title && actualUrl) {
              items.push({
                title,
                url: actualUrl,
                publisher,
                publishedAt: null,
                summary: snippet || title,
                category: this.classifySourceCategory(actualUrl),
              });
            }
          });
        }
      } catch {
        clearTimeout(timeout);
      }
    }

    return items.slice(0, 8);
  }

  /**
   * Source categorization based on domain credibility
   */
  private classifySourceCategory(rawUrl: string): 'OFFICIAL' | 'FACT_CHECK' | 'NEWS' | 'OTHER' {
    try {
      const host = new URL(rawUrl).hostname.toLowerCase();
      if (host.endsWith('.gov') || host.endsWith('.mil') || host.includes('who.int') || host.includes('un.org')) {
        return 'OFFICIAL';
      }
      if (
        host.includes('snopes') ||
        host.includes('politifact') ||
        host.includes('factcheck') ||
        host.includes('fullfact') ||
        host.includes('reuters.com/fact-check')
      ) {
        return 'FACT_CHECK';
      }
      if (
        host.includes('reuters.com') ||
        host.includes('apnews.com') ||
        host.includes('bbc.com') ||
        host.includes('nytimes.com') ||
        host.includes('wsj.com') ||
        host.includes('theguardian.com') ||
        host.includes('npr.org') ||
        host.includes('bloomberg.com') ||
        host.includes('washingtonpost.com')
      ) {
        return 'NEWS';
      }
      return 'OTHER';
    } catch {
      return 'OTHER';
    }
  }

  /**
   * Deduplicate by URL and prioritize reliable sources
   */
  private deduplicateAndPrioritize(items: RawSearchResult[]): RawSearchResult[] {
    const seen = new Set<string>();
    const unique: RawSearchResult[] = [];

    for (const item of items) {
      try {
        const urlObj = new URL(item.url);
        // Normalize: protocol + host + pathname
        const normalized = `${urlObj.host}${urlObj.pathname}`.toLowerCase().replace(/\/+$/, '');
        if (!seen.has(normalized)) {
          seen.add(normalized);
          unique.push(item);
        }
      } catch {
        // invalid URL format, ignore
      }
    }

    // Sort by source priority
    const priorityWeight: Record<string, number> = {
      OFFICIAL: 4,
      FACT_CHECK: 3,
      NEWS: 2,
      OTHER: 1,
    };

    return unique.sort((a, b) => {
      const weightA = priorityWeight[a.category || 'OTHER'] || 1;
      const weightB = priorityWeight[b.category || 'OTHER'] || 1;
      return weightB - weightA;
    }).slice(0, 10);
  }
}

export const searchService = new SearchService();
