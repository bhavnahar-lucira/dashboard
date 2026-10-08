'use client';

import { useState, useEffect } from 'react';
import { Sparkles, UserPlus, LogIn, Clock, Eye } from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format } from 'date-fns';

// Same buckets as the User Activity page.
const getPageType = (path) => {
  const p = (path || '').replace(/^https?:\/\/[^/]+/, '') || '/';
  if (path === 'unknown' || !path) return 'Unknown Source';
  if (p === '/') return 'Homepage';
  if (p.includes('/collections/')) return 'Collection Page';
  if (p.includes('/products/')) return 'Product Page';
  if (p.includes('/cart')) return 'Cart Page';
  if (p.includes('/pages/')) return 'Information Page';
  if (p.includes('/search')) return 'Search Page';
  if (p.includes('/checkout')) return 'Checkout Page';
  return 'Other Page';
};

export default function ScratchCardPage() {
  const [rawRows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('ALL');
  const [pageFilter, setPageFilter] = useState('ALL');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const res = await fetch(`${baseUrl}/api/admin/scratch-card?start_date=${startDate}&end_date=${endDate}&t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success) setRows(data.data);
      } catch (err) {
        console.error('Failed to fetch scratch-card activity:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [startDate, endDate]);

  const rows = pageFilter === 'ALL' ? rawRows : rawRows.filter((r) => getPageType(r.sourcePage) === pageFilter);

  // Seconds the card was on screen, summed per browser session.
  const secsBySession = {};
  rows.filter((r) => r.type === 'scratch_card_view').forEach((r) => {
    secsBySession[r.sessionId] = (secsBySession[r.sessionId] || 0) + (r.metadata?.durationSeconds || 0);
  });
  const convertedSessions = new Set(rows.filter((r) => r.type !== 'scratch_card_view').map((r) => r.sessionId));
  // One row per session that saw the card but never signed up / logged in.
  const viewedOnly = Object.entries(secsBySession)
    .filter(([sid]) => !convertedSessions.has(sid))
    .map(([sid, seconds]) => ({
      type: 'VIEWED', sessionId: sid, viewSeconds: seconds,
      timestamp: rows.find((r) => r.sessionId === sid)?.timestamp,
      sourcePage: rows.find((r) => r.sessionId === sid)?.sourcePage,
    }));
  const all = [
    ...rows.filter((r) => r.type !== 'scratch_card_view').map((r) => ({ ...r, viewSeconds: secsBySession[r.sessionId] })),
    ...viewedOnly,
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const shown = type === 'ALL' ? all : all.filter((r) => r.type === type);
  const fmtSecs =(n) => (n >= 60 ? `${Math.floor(n / 60)}m ${n % 60}s` : `${n}s`);

  const columns = [
    {
      header: 'User',
      accessorKey: 'email',
      cell: ({ row }) => {
        const r = row.original;
        const name = `${r.firstName || ''} ${r.lastName || ''}`.trim();
        if (r.type === 'VIEWED') {
          return (
            <div className="flex flex-col gap-0.5 max-w-[260px]">
              <span className="text-xs font-bold text-ink">Visitor (not signed in)</span>
              <span className="text-[10px] text-ink-muted font-mono break-all select-all">Session ID: {r.sessionId}</span>
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            <div className="font-bold text-ink text-sm capitalize">{name || 'Unknown'}</div>
            <div className="text-[11px] text-ink-soft font-medium">{r.email}</div>
            <div className="text-[10px] text-ink-muted font-bold tracking-wider">{r.phone !== 'unknown' ? r.phone : ''}</div>
          </div>
        );
      },
    },
    {
      header: 'Activity',
      accessorKey: 'type',
      cell: ({ row }) => {
        if (row.original.type === 'VIEWED') {
          return (
            <Badge className="bg-field text-ink-soft border-hairline flex items-center gap-1.5 px-2.5 py-1 border font-bold text-[10px] uppercase tracking-widest w-fit">
              <Eye size={12} />Viewed only
            </Badge>
          );
        }
        const signup = row.original.type === 'REGISTER';
        const Icon = signup ? UserPlus : LogIn;
        return (
          <Badge className={`${signup ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-ok-bg text-ok-fg border-transparent'} flex items-center gap-1.5 px-2.5 py-1 border font-bold text-[10px] uppercase tracking-widest w-fit`}>
            <Icon size={12} />
            {signup ? 'Signup' : 'Login'}
          </Badge>
        );
      },
    },
    {
      header: 'Reward',
      accessorKey: 'reward',
      cell: ({ row }) =>
        row.original.reward ? (
          <span className="font-bold text-ink">{row.original.reward}</span>
        ) : (
          <span className="text-ink-muted">No reward</span>
        ),
    },
    {
      header: 'Page',
      accessorKey: 'sourcePage',
      cell: ({ row }) => {
        const page = row.original.sourcePage;
        return (
          <div className="flex flex-col gap-0.5 max-w-[220px]">
            <span className="text-xs font-bold text-ink">{getPageType(page)}</span>
            <span className="text-[10px] text-ink-soft truncate" title={page}>{(page || '').replace(/^https?:\/\/[^/]+/, '') || '/'}</span>
          </div>
        );
      },
    },
    {
      header: 'Time on card',
      accessorKey: 'viewSeconds',
      cell: ({ row }) =>
        row.original.viewSeconds ? (
          <span className="font-bold text-ink">{fmtSecs(row.original.viewSeconds)}</span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      header: 'Time',
      accessorKey: 'timestamp',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-xs text-ink-soft font-medium">
          <Clock size={12} />
          {row.original.timestamp ? format(new Date(row.original.timestamp), 'MMM dd, yyyy HH:mm') : 'N/A'}
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col items-start gap-5">
        <div className="min-w-0">
          <h1 className="admin-title flex items-center gap-3">
            <Sparkles className="text-brand" size={32} />
            Scratch Card
          </h1>
          <p className="admin-subtitle">Signups and logins through the scratch-card popup, and the reward each user got.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-4">
          <div className="bg-panel px-4 py-2 rounded-[8px] border border-hairline-soft shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Activity</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="text-xs font-bold bg-transparent outline-none cursor-pointer">
              <option value="ALL">All</option>
              <option value="REGISTER">Signups</option>
              <option value="LOGIN">Logins</option>
              <option value="VIEWED">Viewed only</option>
            </select>
          </div>
          <div className="bg-panel px-4 py-2 rounded-[8px] border border-hairline-soft shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Page</span>
            <select value={pageFilter} onChange={(e) => setPageFilter(e.target.value)} className="text-xs font-bold bg-transparent outline-none cursor-pointer max-w-[160px]">
              <option value="ALL">All Pages</option>
              {['Homepage', 'Collection Page', 'Product Page', 'Cart Page', 'Information Page', 'Search Page', 'Checkout Page', 'Other Page', 'Unknown Source'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-panel px-4 py-2 rounded-[8px] border border-hairline-soft shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Start Date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs font-bold bg-transparent outline-none" />
            </div>
            <div className="h-8 w-px bg-field mx-2" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">End Date</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} className="text-xs font-bold bg-transparent outline-none" />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      ) : (
        <DataTable columns={columns} data={shown} />
      )}
    </div>
  );
}
