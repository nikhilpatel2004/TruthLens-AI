import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';
import { config } from '../config/env';
import type { NewsArticleItem } from '../../../shared/types/index';

interface CachedNews {
  articles: NewsArticleItem[];
  fetchedAt: number;
}

export class NewsService {
  private cache: CachedNews | null = null;
  private readonly CACHE_TTL_MS = 90 * 1000; // 90 seconds TTL for background freshness
  private isFetching = false;

  /**
   * Retrieve latest news articles, with optional force refresh and pagination
   */
  public async getLatestNews(options?: {
    forceRefresh?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    articles: NewsArticleItem[];
    lastUpdated: string;
    total: number;
    hasMore: boolean;
    page: number;
  }> {
    const forceRefresh = options?.forceRefresh ?? false;
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.max(1, Math.min(50, options?.limit ?? 10));

    const now = Date.now();
    const isCacheExpired = !this.cache || now - this.cache.fetchedAt > this.CACHE_TTL_MS;

    if (forceRefresh || isCacheExpired) {
      // Prevent multiple concurrent fetches
      if (!this.isFetching) {
        this.isFetching = true;
        try {
          const freshArticles = await this.fetchFreshArticlesFromProviders();
          if (freshArticles.length > 0) {
            this.cache = {
              articles: freshArticles,
              fetchedAt: now,
            };
          } else if (!this.cache) {
            throw new Error('No news articles could be retrieved from real-time news providers.');
          }
        } finally {
          this.isFetching = false;
        }
      }
    }

    if (!this.cache || this.cache.articles.length === 0) {
      throw new Error('News service temporarily unavailable. Please try again.');
    }

    // Sort strictly newest first by actual publication date
    const sorted = [...this.cache.articles].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    const startIndex = (page - 1) * limit;
    const paginated = sorted.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < sorted.length;

    return {
      articles: paginated,
      lastUpdated: new Date(this.cache.fetchedAt).toISOString(),
      total: sorted.length,
      hasMore,
      page,
    };
  }

  /**
   * Fetch from real-time news providers: Google News RSS feeds + Tavily News API (if enabled)
   */
  private async fetchFreshArticlesFromProviders(): Promise<NewsArticleItem[]> {
    const rawArticles: NewsArticleItem[] = [];

    // 1. Fetch live top & world news from Google News RSS
    const rssFeeds = [
      { url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en', category: 'Top Stories' },
      { url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en', category: 'World' },
      { url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en', category: 'Technology' },
      { url: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en', category: 'Science' },
    ];

    for (const feed of rssFeeds) {
      try {
        const feedArticles = await this.fetchGoogleNewsRss(feed.url, feed.category);
        rawArticles.push(...feedArticles);
      } catch (err: any) {
        console.warn(`Failed to fetch RSS feed (${feed.category}):`, err.message);
      }
    }

    // 2. Fetch Tavily news if configured
    if (config.research.tavilyApiKey) {
      try {
        const tavilyArticles = await this.fetchTavilyNews();
        rawArticles.push(...tavilyArticles);
      } catch (err: any) {
        console.warn('Tavily news query failed:', err.message);
      }
    }

    // 3. Deduplicate by canonical URL and normalized headline
    const deduplicated = this.deduplicateArticles(rawArticles);

    // 4. Sort newest first
    return deduplicated.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  /**
   * Parse live Google News RSS feed
   */
  private async fetchGoogleNewsRss(feedUrl: string, defaultCategory: string): Promise<NewsArticleItem[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from news feed`);
      }

      const xml = await response.text();
      const $ = cheerio.load(xml, { xml: true });
      const articles: NewsArticleItem[] = [];

      $('item').each((_, el) => {
        const rawTitle = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const pubDateStr = $(el).find('pubDate').text().trim();
        const sourceName = $(el).find('source').text().trim() || 'News Publisher';
        const rawDesc = $(el).find('description').text().trim();

        if (!rawTitle || !link) return;

        // Strip publisher suffix from title if present (e.g. "Headline - Reuters")
        let title = rawTitle;
        const sourceIndex = title.lastIndexOf(` - ${sourceName}`);
        if (sourceIndex > 0) {
          title = title.slice(0, sourceIndex).trim();
        }

        // Clean HTML tags from description
        const cleanDesc = rawDesc
          ? cheerio.load(rawDesc).text().replace(/\s+/g, ' ').trim()
          : `Live reporting from ${sourceName}. Click verify to examine factual claims and corroboration.`;

        // Parse publishedAt timestamp safely
        let publishedAt = new Date().toISOString();
        if (pubDateStr) {
          const parsedDate = new Date(pubDateStr);
          if (!isNaN(parsedDate.getTime())) {
            publishedAt = parsedDate.toISOString();
          }
        }

        const stableId = 'art-' + createHash('sha256').update(link).digest('hex').slice(0, 16);

        articles.push({
          id: stableId,
          title,
          description: cleanDesc.length > 20 ? cleanDesc : `Developing story reported by ${sourceName}.`,
          sourceName,
          articleUrl: link,
          publishedAt,
          category: defaultCategory,
        });
      });

      return articles;
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Query Tavily News if configured
   */
  private async fetchTavilyNews(): Promise<NewsArticleItem[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: config.research.tavilyApiKey,
          query: 'breaking world news headlines today',
          topic: 'news',
          search_depth: 'basic',
          max_results: 8,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!response.ok) return [];

      const data = (await response.json()) as any;
      if (!data.results || !Array.isArray(data.results)) return [];

      return data.results.map((r: any) => {
        let hostname = 'Web Publisher';
        try {
          hostname = new URL(r.url).hostname.replace(/^www\./, '');
        } catch {}

        const stableId = 'tav-' + createHash('sha256').update(r.url).digest('hex').slice(0, 16);

        return {
          id: stableId,
          title: r.title || 'Breaking News Report',
          description: r.content || `Reported by ${hostname}`,
          sourceName: hostname,
          articleUrl: r.url,
          publishedAt: r.published_date ? new Date(r.published_date).toISOString() : new Date().toISOString(),
          category: 'World News',
        };
      });
    } catch {
      clearTimeout(timeout);
      return [];
    }
  }

  /**
   * Deduplicate articles by canonical URL and title similarity
   */
  private deduplicateArticles(items: NewsArticleItem[]): NewsArticleItem[] {
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const unique: NewsArticleItem[] = [];

    for (const item of items) {
      // Normalize URL
      const cleanUrl = item.articleUrl.split('?')[0].toLowerCase().replace(/\/+$/, '');
      // Normalize Title for near-duplicate detection
      const cleanTitle = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 40);

      if (!seenUrls.has(cleanUrl) && !seenTitles.has(cleanTitle)) {
        seenUrls.add(cleanUrl);
        seenTitles.add(cleanTitle);
        unique.push(item);
      }
    }

    return unique;
  }
}

export const newsService = new NewsService();
