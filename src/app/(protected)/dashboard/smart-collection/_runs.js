'use client';

// Activity modal — everything that HAPPENED to one smart sort, in three tabs:
//
//   Syncs        - the push history (smart_sort_runs): when, what trigger,
//                  how many products moved, errors.
//   Versions     - every configuration that ever went live, newest first,
//                  with one-click "Restore to draft" (never straight to live)
//                  and the scheduled-revert banner.
//   Performance  - the daily engagement snapshots (smart_sort_stats): top
//                  rows vs the rest, publish markers, and the per-version
//                  averages that make the time-split A/B comparison readable.

import { useState } from 'react';
import {
  Loader2, X, AlertTriangle, History, GitBranch, TrendingUp, Undo2, RotateCcw,
} from 'lucide-react';
import { formatDateTime, formatPrice, slotsSummary, Note } from './_shared';

const STATUS_CLS = {
  completed: 'text-emerald-600 bg-emerald-50',
  running: 'text-sky-600 bg-sky-50',
  failed: 'text-rose-500 bg-rose-50',
};

const SOURCE_LABELS = {
  created: 'Created',
  edit: 'Live edit',
  publish: 'Published',
  'scheduled-publish': 'Scheduled publish',
  restore: 'Restored',
  revert: 'Auto-revert',
  baseline: 'Saved before a publish',
};

// ---------------------------------------------------------------------------
// Syncs tab
// ---------------------------------------------------------------------------
function SyncsTab({ runs }) {
  if (!runs.length) {
    return <p className='text-sm text-zinc-400 text-center py-12'>No syncs yet — use Sync now, or wait for the daily schedule.</p>;
  }
  return (
    <div className='space-y-4'>
      <table className='w-full text-xs'>
        <thead>
          <tr className='text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100'>
            <th className='py-2 pr-4'>Started</th>
            <th className='py-2 pr-4'>Trigger</th>
            <th className='py-2 pr-4'>Status</th>
            <th className='py-2 pr-4'>Products</th>
            <th className='py-2 pr-4'>Moved</th>
            <th className='py-2'>Duration</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run._id} className='border-b border-zinc-50'>
              <td className='py-2.5 pr-4 text-zinc-600 whitespace-nowrap'>{formatDateTime(run.startedAt)}</td>
              <td className='py-2.5 pr-4 text-zinc-500 capitalize'>{run.trigger}</td>
              <td className='py-2.5 pr-4'>
                <span className={'text-[9px] font-black px-2 py-0.5 rounded-full uppercase ' + (STATUS_CLS[run.status] || STATUS_CLS.failed)}>
                  {run.status}
                </span>
              </td>
              <td className='py-2.5 pr-4 text-zinc-600'>
                {run.collectionsTotal != null
                  ? run.collectionsDone + ' / ' + run.collectionsTotal + ' collections'
                  : run.totalProducts}
              </td>
              <td className='py-2.5 pr-4 text-zinc-600'>
                {run.moves}{run.sortOrderChanged ? ' · switched to manual' : ''}
              </td>
              <td className='py-2.5 text-zinc-500 whitespace-nowrap'>{run.durationMs != null ? Math.round(run.durationMs / 1000) + 's' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {runs.filter((r) => (r.errors || []).length > 0).map((run) => (
        <div key={'err-' + run._id} className='bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3'>
          <div className='flex items-center gap-2 text-[11px] font-bold text-rose-600'>
            <AlertTriangle size={12} /> {formatDateTime(run.startedAt)} — {run.errors.length} error{run.errors.length === 1 ? '' : 's'}
          </div>
          <ul className='mt-1.5 space-y-1'>
            {run.errors.map((e, i) => (
              <li key={i} className='text-[11px] text-rose-500 font-mono break-all'>{e}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Versions tab
// ---------------------------------------------------------------------------
function VersionsTab({ rule, versions, onRestore, restoringId, onCancelRevert }) {
  return (
    <div className='space-y-4'>
      {rule.scheduledRevert && (
        <div className='flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3'>
          <Undo2 size={14} className='text-amber-500 shrink-0' />
          <div className='flex-1 text-[11px] text-amber-700'>
            <b>Scheduled revert:</b> the pre-publish order comes back automatically on{' '}
            <b>{formatDateTime(rule.scheduledRevert.at)}</b>.
          </div>
          {onCancelRevert && (
            <button
              type='button'
              onClick={onCancelRevert}
              className='text-[10px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200 bg-white px-3 py-1.5 rounded-lg hover:border-amber-400 shrink-0'
            >
              Keep the new order
            </button>
          )}
        </div>
      )}

      {rule.draft && (
        <Note>
          A draft is staged{rule.draft.label ? <> (&ldquo;{rule.draft.label}&rdquo;)</> : null}
          {rule.draft.goLiveAt
            ? <> — it goes live automatically on <b>{formatDateTime(rule.draft.goLiveAt)}</b>.</>
            : <> — open Edit to review and publish it.</>}
        </Note>
      )}

      {!versions.length ? (
        <p className='text-sm text-zinc-400 text-center py-12'>No versions yet — the history starts with the next publish or edit.</p>
      ) : (
        <div className='space-y-2'>
          {versions.map((v) => {
            const isLive = String(rule.liveVersionId || '') === String(v._id);
            const cfg = v.config || {};
            return (
              <div key={v._id} className={'flex items-center gap-3 px-4 py-3 rounded-2xl border ' + (isLive ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-100 bg-white')}>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    {isLive && <span className='text-[9px] font-black px-2 py-0.5 rounded-full uppercase text-white bg-zinc-900'>Live now</span>}
                    <span className='text-xs font-bold text-zinc-800 truncate'>
                      {v.label || SOURCE_LABELS[v.source] || v.source}
                    </span>
                    {v.label && (
                      <span className='text-[10px] text-zinc-400'>{SOURCE_LABELS[v.source] || v.source}</span>
                    )}
                  </div>
                  <div className='text-[11px] text-zinc-400 mt-0.5 truncate'>
                    {formatDateTime(v.publishedAt)} · {slotsSummary(cfg)}
                    {(cfg.pinned || []).length > 0 && <> · {cfg.pinned.length} pinned</>}
                    {(cfg.positions || []).length > 0 && <> · {cfg.positions.length} hand-placed</>}
                  </div>
                </div>
                {!isLive && onRestore && (
                  <button
                    type='button'
                    onClick={() => onRestore(v)}
                    disabled={Boolean(restoringId)}
                    className='text-[10px] font-bold uppercase tracking-wider text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-lg hover:border-black hover:text-black disabled:opacity-40 shrink-0 flex items-center gap-1'
                  >
                    {restoringId === v._id ? <Loader2 size={11} className='animate-spin' /> : <RotateCcw size={11} />}
                    Restore to draft
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <p className='text-[11px] text-zinc-400'>
        Restoring never touches the live order directly — it copies the version into a draft you can review, schedule
        and publish.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Performance tab
// ---------------------------------------------------------------------------
const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : (a > 0 ? 100 : 0));

function Delta({ now, before }) {
  const d = pct(now, before);
  if (before === 0 && now === 0) return <span className='text-[10px] text-zinc-400'>—</span>;
  return (
    <span className={'text-[10px] font-bold ' + (d > 0 ? 'text-emerald-600' : d < 0 ? 'text-rose-500' : 'text-zinc-400')}>
      {d > 0 ? '+' : ''}{d}%
    </span>
  );
}

function PerformanceTab({ rule, stats, versions }) {
  if (!stats.length) {
    return (
      <Note>
        No performance data yet. The history builds itself on the first sync (15 days back-filled from Google
        Analytics and Shopify) and refreshes after every sync and nightly at 23:30 IST — engagement of the top 24
        positions vs the rest of the collection.
      </Note>
    );
  }

  const last7 = stats.slice(-7);
  const prev7 = stats.slice(-14, -7);
  const sumOf = (rows, part, key) => rows.reduce((a, s) => a + ((s[part] || {})[key] || 0), 0);
  const headline = ['views', 'atc', 'orders', 'revenue'].map((key) => ({
    key,
    label: { views: 'Top-row views', atc: 'Top-row add-to-carts', orders: 'Top-row orders', revenue: 'Top-row revenue' }[key],
    now: sumOf(last7, 'top', key),
    before: sumOf(prev7, 'top', key),
  }));

  // Publish markers: the IST date of each version that went live in range.
  const markerDates = new Map();
  for (const v of versions || []) {
    const d = new Date(v.publishedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (!markerDates.has(d)) markerDates.set(d, v.label || SOURCE_LABELS[v.source] || v.source);
  }

  const maxViews = Math.max(...stats.map((s) => (s.top?.views || 0) + (s.rest?.views || 0)), 1);

  // Per-version averages — the time-split comparison. Days are grouped by the
  // version that was live when the snapshot was taken.
  const byVersion = new Map();
  for (const s of stats) {
    const k = s.liveVersionId || 'unknown';
    if (!byVersion.has(k)) byVersion.set(k, []);
    byVersion.get(k).push(s);
  }
  // Totals are the truthful number ("1 order, ₹30,042"); the per-day rate
  // underneath is what makes unequal periods comparable. Showing ONLY the
  // average produced nonsense-looking values like "0.1 orders" and a revenue
  // figure matching no real product.
  const versionRows = [...byVersion.entries()].map(([vid, rows]) => {
    const v = (versions || []).find((x) => String(x._id) === String(vid));
    const total = (key) => rows.reduce((a, s) => a + (s.top?.[key] || 0), 0);
    const perDay = (key) => Math.round((total(key) / rows.length) * 10) / 10;
    return {
      vid,
      label: v ? (v.label || SOURCE_LABELS[v.source] || v.source) : 'Earlier configuration',
      publishedAt: v?.publishedAt,
      days: rows.length,
      lastDate: rows[rows.length - 1].date,
      views: total('views'), atc: total('atc'), orders: total('orders'), revenue: total('revenue'),
      viewsDay: perDay('views'), atcDay: perDay('atc'), ordersDay: perDay('orders'), revenueDay: perDay('revenue'),
      isLive: String(rule.liveVersionId || '') === String(vid),
    };
  }).sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));

  return (
    <div className='space-y-6'>
      {/* Headline: this week vs last, for the rows the sort controls */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        {headline.map((h) => (
          <div key={h.key} className='bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3'>
            <div className='text-[10px] font-black uppercase tracking-widest text-zinc-400'>{h.label}</div>
            <div className='flex items-baseline gap-2 mt-1'>
              <span className='text-lg font-bold text-zinc-900'>
                {h.key === 'revenue' ? formatPrice(h.now) : h.now}
              </span>
              <Delta now={h.now} before={h.before} />
            </div>
            <div className='text-[10px] text-zinc-400 mt-0.5'>last 7 days vs the 7 before</div>
          </div>
        ))}
      </div>

      {/* Daily views, top rows vs the rest, with publish markers */}
      <div>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-[10px] font-black uppercase tracking-widest text-zinc-400'>Daily views — top {stats[0].topN} positions vs the rest</span>
          <span className='flex items-center gap-3 text-[10px] text-zinc-400'>
            <span className='flex items-center gap-1'><span className='w-2.5 h-2.5 rounded-sm bg-violet-500' /> top rows</span>
            <span className='flex items-center gap-1'><span className='w-2.5 h-2.5 rounded-sm bg-zinc-200' /> rest</span>
            <span className='flex items-center gap-1'><span className='w-2 h-2 rounded-full bg-zinc-900' /> publish</span>
          </span>
        </div>
        <div className='flex items-end gap-[3px] h-28 bg-zinc-50/60 border border-zinc-100 rounded-2xl px-3 pt-3 pb-6 relative'>
          {stats.map((s) => {
            const top = s.top?.views || 0;
            const rest = s.rest?.views || 0;
            const marker = markerDates.get(s.date);
            return (
              <div
                key={s.date}
                className='flex-1 min-w-0 h-full flex flex-col justify-end relative'
                title={s.date + ' — top rows: ' + top + ' views, rest: ' + rest +
                  (s.backfilled ? ' (before tracking began — split estimated from the current order)' : '') +
                  (marker ? ' · published: ' + marker : '')}
              >
                <div className='w-full bg-zinc-200 rounded-t-[2px]' style={{ height: (rest / maxViews) * 100 + '%' }} />
                <div className='w-full bg-violet-500 rounded-t-[2px]' style={{ height: (top / maxViews) * 100 + '%' }} />
                {marker && <span className='absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-900' />}
              </div>
            );
          })}
        </div>
        <p className='text-[10px] text-zinc-400 mt-3'>
          True per-day numbers — views and carts from Google Analytics, orders and revenue from Shopify. The violet
          share is what your ordering directly controls. Days from before this smart sort existed use today&apos;s
          product order for the top-vs-rest split, so treat that part of the split as an estimate.
        </p>
      </div>

      {/* Per-version comparison — the time-split A/B readout */}
      {versionRows.length > 1 && (
        <div>
          <span className='text-[10px] font-black uppercase tracking-widest text-zinc-400'>Version comparison — top rows, totals for each version&apos;s days (per-day rate below)</span>
          <table className='w-full text-xs mt-2'>
            <thead>
              <tr className='text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100'>
                <th className='py-2 pr-4'>Version</th>
                <th className='py-2 pr-4'>Days</th>
                <th className='py-2 pr-4'>Views</th>
                <th className='py-2 pr-4'>Carts</th>
                <th className='py-2 pr-4'>Orders</th>
                <th className='py-2'>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {versionRows.map((r) => (
                <tr key={r.vid} className='border-b border-zinc-50'>
                  <td className='py-2.5 pr-4'>
                    <span className='font-bold text-zinc-800'>{r.label}</span>
                    {r.isLive && <span className='ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase text-white bg-zinc-900'>Live</span>}
                    {r.publishedAt && <div className='text-[10px] text-zinc-400'>{formatDateTime(r.publishedAt)}</div>}
                  </td>
                  <td className='py-2.5 pr-4 text-zinc-600'>{r.days}</td>
                  <td className='py-2.5 pr-4 text-zinc-600'>
                    {r.views}<div className='text-[10px] text-zinc-400'>{r.viewsDay}/day</div>
                  </td>
                  <td className='py-2.5 pr-4 text-zinc-600'>
                    {r.atc}<div className='text-[10px] text-zinc-400'>{r.atcDay}/day</div>
                  </td>
                  <td className='py-2.5 pr-4 text-zinc-600'>
                    {r.orders}<div className='text-[10px] text-zinc-400'>{r.ordersDay}/day</div>
                  </td>
                  <td className='py-2.5 text-zinc-600'>
                    {formatPrice(r.revenue)}<div className='text-[10px] text-zinc-400'>{formatPrice(r.revenueDay)}/day</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className='text-[10px] text-zinc-400 mt-2'>
            A fair comparison needs similar periods (festivals and sales move every number). For a clean test, run
            each version for at least a week — restore the other one from Versions to alternate.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The modal
// ---------------------------------------------------------------------------
const TABS = [
  { key: 'syncs', label: 'Syncs', icon: History },
  { key: 'versions', label: 'Versions', icon: GitBranch },
  { key: 'performance', label: 'Performance', icon: TrendingUp },
];

export function ActivityModal({ rule, data, loading, onClose, onRestore, restoringId, onCancelRevert }) {
  const [tab, setTab] = useState('syncs');
  if (!rule) return null;

  const { runs = [], versions = [], stats = [] } = data || {};

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl'>
        <div className='px-8 py-5 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-4'>
          <div className='min-w-0'>
            <h2 className='text-lg font-bold text-zinc-900 truncate'>Activity — {rule.collectionTitle || rule.collectionHandle}</h2>
            <p className='text-[11px] text-zinc-400 mt-0.5'>Sync history, every version that went live, and how the ordering performs.</p>
          </div>
          <button type='button' onClick={onClose} className='text-zinc-400 hover:text-black shrink-0'><X size={20} /></button>
        </div>

        <div className='px-8 pt-4 flex items-center gap-2'>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type='button'
              onClick={() => setTab(key)}
              className={'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-colors ' +
                (tab === key ? 'bg-black text-white border-black' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400')}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        <div className='flex-1 overflow-y-auto px-8 py-6 custom-scrollbar'>
          {loading ? (
            <div className='flex justify-center py-20'><Loader2 className='animate-spin text-zinc-300' size={32} /></div>
          ) : tab === 'syncs' ? (
            <SyncsTab runs={runs} />
          ) : tab === 'versions' ? (
            <VersionsTab rule={rule} versions={versions} onRestore={onRestore} restoringId={restoringId} onCancelRevert={onCancelRevert} />
          ) : (
            <PerformanceTab rule={rule} stats={stats} versions={versions} />
          )}
        </div>
      </div>
    </div>
  );
}
