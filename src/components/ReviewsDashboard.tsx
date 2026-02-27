import { useEffect, useState, useCallback } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
const GOOGLE_REVIEW_URL =
  (import.meta as any).env?.VITE_GOOGLE_REVIEW_URL || 'https://g.page/r/CVmpd5dYUfULEBM/review';

interface Feedback {
  id: string;
  rating: number;
  message: string | null;
  created_at: string;
  ip_address: string | null;
}

interface Stats {
  total_feedback: number;
  avg_rating: number;
  total_page_views: number;
  total_google_redirects: number;
  rating_breakdown: { rating: number; count: number }[];
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(v => (
        <svg key={v} width="14" height="14" viewBox="0 0 24 24"
          fill={v <= rating ? '#FBBF24' : '#E5E7EB'}
          stroke={v <= rating ? '#F59E0B' : '#D1D5DB'} strokeWidth="1">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export function ReviewsDashboard() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fbRes, stRes] = await Promise.all([
        fetch(`${API_BASE}/review/admin/feedback`),
        fetch(`${API_BASE}/review/admin/stats`),
      ]);
      if (!fbRes.ok || !stRes.ok) throw new Error('API error');
      const [fb, st] = await Promise.all([fbRes.json(), stRes.json()]);
      setFeedback(fb.data ?? fb ?? []);
      setStats(st.data ?? st);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const paginated = feedback.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(feedback.length / PAGE_SIZE);

  const conversionRate = stats && stats.total_page_views > 0
    ? ((stats.total_google_redirects / stats.total_page_views) * 100).toFixed(1)
    : '—';

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Reviews Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customer feedback &amp; Google review funnel analytics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a
            href="/review/qr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/>
              <rect x="19" y="14" width="2" height="2" rx="0.5"/><rect x="14" y="19" width="2" height="2" rx="0.5"/>
            </svg>
            QR Code &amp; Share
          </a>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold shadow hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"/>
            </svg>
            Google Reviews
          </a>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm font-medium flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Feedback" value={stats.total_feedback} sub="internal submissions" color="text-blue-600" />
          <StatCard
            label="Avg Rating"
            value={stats.avg_rating ? Number(stats.avg_rating).toFixed(1) + ' ⭐' : '—'}
            sub="of 5 stars"
            color="text-amber-500"
          />
          <StatCard label="Page Views" value={stats.total_page_views} sub="total visits" color="text-violet-600" />
          <StatCard label="Google Sends" value={stats.total_google_redirects} sub={`${conversionRate}% conversion`} color="text-green-600" />
        </div>
      ) : null}

      {/* Rating breakdown */}
      {!loading && stats?.rating_breakdown && stats.rating_breakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Rating Breakdown</h2>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(r => {
              const entry = stats.rating_breakdown.find(x => Number(x.rating) === r);
              const count = entry ? Number(entry.count) : 0;
              const max = Math.max(...stats.rating_breakdown.map(x => Number(x.count)), 1);
              const pct = Math.round((count / max) * 100);
              return (
                <div key={r} className="flex items-center gap-3">
                  <StarRow rating={r} />
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: r === 5 ? '#16a34a' : r === 4 ? '#65a30d' : r === 3 ? '#d97706' : r === 2 ? '#ea580c' : '#dc2626',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Internal Feedback
            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">{feedback.length}</span>
          </h2>
          <span className="text-xs text-gray-400">1–4 star submissions only</span>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4 animate-pulse">
                <div className="w-20 h-4 bg-gray-100 rounded" />
                <div className="flex-1 h-4 bg-gray-100 rounded" />
                <div className="w-24 h-4 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : feedback.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="font-medium">No internal feedback yet</p>
            <p className="text-sm">1–4 star submissions will appear here</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {paginated.map(fb => (
                <div key={fb.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="shrink-0 pt-0.5">
                    <StarRow rating={fb.rating} />
                    <span className={`mt-1 inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                      fb.rating <= 2 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {fb.rating}★
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {fb.message?.trim() || <span className="text-gray-400 italic">No message</span>}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-gray-400">
                      {new Date(fb.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(fb.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, feedback.length)} of {feedback.length}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >← Prev</button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
