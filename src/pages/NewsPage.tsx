import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Newspaper,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import type { NewsArticleItem } from '../../shared/types/index';

interface NewsPageProps {
  onVerifyArticle: (articleTextOrUrl: string) => void;
}

export const NewsPage: React.FC<NewsPageProps> = ({ onVerifyArticle }) => {
  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Prevent concurrent duplicate requests
  const activeRequestRef = useRef(false);

  const fetchNews = useCallback(async (isRefresh = false, targetPage = 1) => {
    if (activeRequestRef.current) return;
    activeRequestRef.current = true;

    if (isRefresh) {
      setRefreshing(true);
    } else if (targetPage > 1) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const url = new URL('/api/news', window.location.origin);
      if (isRefresh) {
        url.searchParams.set('refresh', 'true');
      }
      url.searchParams.set('page', String(targetPage));
      url.searchParams.set('limit', '10');

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }

      const incomingArticles: NewsArticleItem[] = Array.isArray(data.data) ? data.data : [];

      if (targetPage === 1) {
        setArticles(incomingArticles);
      } else {
        // Append without duplicates
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const existingUrls = new Set(prev.map((a) => a.articleUrl.toLowerCase().replace(/\/+$/, '')));
          const fresh = incomingArticles.filter(
            (item) =>
              !existingIds.has(item.id) &&
              !existingUrls.has(item.articleUrl.toLowerCase().replace(/\/+$/, ''))
          );
          return [...prev, ...fresh];
        });
      }

      setLastUpdated(data.lastUpdated || new Date().toISOString());
      setHasMore(Boolean(data.hasMore));
      setTotalCount(data.total || incomingArticles.length);
      setPage(targetPage);
    } catch (err: any) {
      console.error('Error fetching live news:', err);
      setError(err.message || 'Unable to retrieve live news from external providers.');
      if (targetPage === 1 && !articles.length) {
        setArticles([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      activeRequestRef.current = false;
    }
  }, [articles.length]);

  // Initial load on mount
  useEffect(() => {
    fetchNews(false, 1);
  }, []);

  const handleManualRefresh = () => {
    fetchNews(true, 1);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchNews(false, page + 1);
    }
  };

  const formatPublishDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently published';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatPublishTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatLastUpdated = (isoStr: string | null) => {
    if (!isoStr) return null;
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#172B3A] tracking-tight">Latest News Feed</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time verified developing stories and public reporting, sorted newest first.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 self-start sm:self-auto">
          {lastUpdated && !loading && (
            <div className="text-[11px] font-mono-data text-[#64748B] flex items-center gap-1 bg-[#F5F8F6] px-2.5 py-1 rounded-md border border-[#E5E7EB]">
              <Clock className="w-3 h-3 text-[#087A50]" />
              <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
            </div>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#172B3A] bg-white border border-[#E5E7EB] hover:bg-[#F5F8F6] rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#087A50] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh News'}</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-20 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#087A50] mb-3" />
          <h3 className="text-sm font-semibold text-[#172B3A]">Fetching Live News Stream</h3>
          <p className="text-xs text-[#64748B] mt-1">
            Querying real-time wire feeds and authoritative news publishers...
          </p>
        </div>
      ) : error && articles.length === 0 ? (
        /* Error state with explicit Retry action */
        <div className="p-10 text-center bg-white border border-rose-200 rounded-2xl shadow-2xs space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#172B3A]">Unable to Load Fresh News</h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1 leading-relaxed">
              {error}
            </p>
          </div>
          <button
            onClick={() => fetchNews(true, 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#087A50] hover:bg-[#066240] rounded-lg transition-colors shadow-2xs"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : articles.length === 0 ? (
        /* Empty state */
        <div className="p-12 text-center bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs space-y-2">
          <Newspaper className="w-8 h-8 text-[#64748B] mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-[#172B3A]">No Live Articles Found</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            No fresh articles were returned by news indexing providers. Click refresh to query again.
          </p>
          <button
            onClick={handleManualRefresh}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#087A50] bg-[#E8F4EE] hover:bg-[#d5ede1] rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Feed</span>
          </button>
        </div>
      ) : (
        /* Articles list */
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
              <span>Failed to fetch freshest updates: {error}</span>
              <button
                onClick={() => fetchNews(true, 1)}
                className="underline font-semibold hover:text-rose-950 ml-2"
              >
                Retry
              </button>
            </div>
          )}

          {articles.map((item, index) => (
            <div
              key={item.id || item.articleUrl || index}
              className="p-5 bg-white border border-[#E5E7EB] hover:border-[#087A50]/40 rounded-xl transition-all shadow-2xs space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#087A50]">{item.sourceName}</span>
                  {item.category && (
                    <>
                      <span>·</span>
                      <span className="text-[#64748B]">{item.category}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="flex items-center gap-1 font-mono-data">
                    <Calendar className="w-3 h-3" />
                    {formatPublishDate(item.publishedAt)}
                    {formatPublishTime(item.publishedAt) && (
                      <span className="text-[#64748B]/70">· {formatPublishTime(item.publishedAt)}</span>
                    )}
                  </span>
                </div>

                <a
                  href={item.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-[#087A50] transition-colors"
                >
                  <span>Original Article</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#172B3A] leading-snug">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-xs text-[#64748B] leading-relaxed mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  onClick={() => onVerifyArticle(item.articleUrl || item.title)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#087A50] hover:bg-[#066240] rounded-lg transition-colors shadow-2xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify with TruthLens</span>
                </button>
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-5 py-2 text-xs font-semibold text-[#172B3A] bg-white border border-[#E5E7EB] hover:bg-[#F5F8F6] rounded-xl transition-colors shadow-2xs disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#087A50]" />}
                <span>{loadingMore ? 'Loading More Articles...' : `Load More News (${articles.length} of ${totalCount})`}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
