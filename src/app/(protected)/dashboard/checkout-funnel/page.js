'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  MousePointerClick,
  ShoppingCart,
  CreditCard,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '../../../../components/common/PageHeader';
import {
  STAGES,
  ENTRY,
  CTA_LABELS,
  BREAKDOWN_OPTIONS,
  fmt,
  pct,
  inr,
  rate,
  stageValue,
  funnelRows,
  buildInsights,
  CHECKOUT_PAGES,
  avgValue,
  inrShort,
  duration,
} from './_funnel';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
const BAR = '#5A413F'; // brand — single-series bars
const BAR_SOFT = 'rgba(90,65,63,0.18)';
const TRACKING_CHANGE = '2026-10-03'; // login-before-ATC (1 Oct) + add_to_cart rewiring (3 Oct)

const day = (d) => format(d, 'yyyy-MM-dd');
const SEGMENT_PAGE = 25; // segment rows shown before "Show all"
const FILTER_LABEL = 'w-[86px] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-muted max-md:w-auto';
const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const toDate = (ymd) => new Date(`${ymd}T00:00:00`);
const rangeDays = (s, e) => Math.round((toDate(e) - toDate(s)) / 86400000) + 1;
// Same window the backend compares against: equal length, ending the day before.
const previousWindow = (s, e) => {
  const n = rangeDays(s, e);
  return [day(subDays(toDate(s), n)), day(subDays(toDate(s), 1))];
};
const rangeLabel = (s, e) => (s === e
  ? format(toDate(s), 'd MMM yyyy')
  : `${format(toDate(s), toDate(s).getFullYear() === toDate(e).getFullYear() ? 'd MMM' : 'd MMM yyyy')} – ${format(toDate(e), 'd MMM yyyy')}`);
const PRESETS = [
  { key: 'today', label: 'Today', range: () => [new Date(), new Date()] },
  { key: 'yesterday', label: 'Yesterday', range: () => [subDays(new Date(), 1), subDays(new Date(), 1)] },
  { key: '7d', label: 'Last 7 days', range: () => [subDays(new Date(), 7), subDays(new Date(), 1)] },
  { key: '14d', label: 'Last 14 days', range: () => [subDays(new Date(), 14), subDays(new Date(), 1)] },
  { key: '30d', label: 'Last 30 days', range: () => [subDays(new Date(), 30), subDays(new Date(), 1)] },
  { key: 'month', label: 'This month', range: () => [startOfMonth(new Date()), new Date()] },
  { key: 'lastMonth', label: 'Last month', range: () => [startOfMonth(subMonths(new Date(), 1)), endOfMonth(subMonths(new Date(), 1))] },
];

function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className='inline-flex rounded-lg border border-hairline bg-panel-alt p-0.5'>
      {options.map((o) => (
        <button
          key={o.key}
          type='button'
          onClick={() => onChange(o.key)}
          className={`rounded-md px-3 ${size === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-[13px]'} font-medium transition ${
            value === o.key ? 'bg-panel text-ink shadow-panel font-semibold' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-hairline bg-panel p-5 shadow-panel ${className}`}>
      {(title || actions) && (
        <div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
          <div>
            {title && <h2 className='text-[15px] font-semibold text-ink'>{title}</h2>}
            {subtitle && <p className='mt-0.5 text-xs text-ink-muted'>{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

function Delta({ cur, prev, asPoints = false }) {
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return <span className='text-[11px] text-ink-muted'>—</span>;
  let diff;
  let text;
  if (asPoints) {
    diff = cur - prev;
    text = `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)} pts`;
  } else {
    if (prev === 0) return <span className='text-[11px] text-ink-muted'>new</span>;
    diff = (cur - prev) / prev;
    text = `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}%`;
  }
  const Icon = diff >= 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${diff >= 0 ? 'text-ok-fg' : 'text-bad-fg'}`}>
      <Icon size={12} /> {text}
    </span>
  );
}

function Kpi({ icon: Icon, label, value, cur, prev, sub, points }) {
  return (
    <div className='rounded-xl border border-hairline bg-panel p-4 shadow-panel'>
      <div className='flex items-center gap-2 text-xs font-medium text-ink-muted'>
        <Icon size={14} /> {label}
      </div>
      <div className='mt-2 text-2xl font-bold tracking-tight text-ink'>{value}</div>
      <div className='mt-1 flex items-center gap-2'>
        <Delta cur={cur} prev={prev} asPoints={points} />
        <span className='text-[11px] text-ink-muted'>{sub || 'vs previous period'}</span>
      </div>
    </div>
  );
}

const TONES = {
  bad: { cls: 'bg-bad-bg text-bad-fg', icon: XCircle },
  warn: { cls: 'bg-warn-bg text-warn-fg', icon: AlertTriangle },
  ok: { cls: 'bg-ok-bg text-ok-fg', icon: CheckCircle2 },
  info: { cls: 'bg-panel-alt text-ink-soft', icon: Info },
};

function InsightCard({ insight }) {
  const tone = TONES[insight.tone] || TONES.info;
  const Icon = tone.icon;
  return (
    <div className='flex gap-3 rounded-lg border border-hairline p-3'>
      <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${tone.cls}`}>
        <Icon size={15} />
      </span>
      <div className='min-w-0'>
        <p className='text-[13px] font-semibold text-ink'>{insight.title}</p>
        <p className='mt-0.5 text-xs leading-relaxed text-ink-soft'>{insight.body}</p>
      </div>
    </div>
  );
}

function PathChip({ path }) {
  return <code className='rounded bg-panel-alt px-1.5 py-0.5 font-mono text-[10.5px] text-ink-soft'>{path}</code>;
}

function CtaChip({ cta }) {
  return (
    <span className='inline-flex items-center gap-1 rounded border border-hairline px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wide text-ink-soft'>
      <MousePointerClick size={10} /> {cta}
    </span>
  );
}

// Which event's average `value` prices a drop leaving each stage.
const CART_VALUE_SOURCE = {
  add_to_cart: 'add_to_cart',
  begin_checkout: 'begin_checkout',
  add_shipping_info: 'add_shipping_info',
  add_payment_info: 'add_payment_info',
};

/** Both counts for a stage: what the toggle doesn't show is never hidden. */
function bothCounts(totals, key, orders) {
  if (key === 'purchase' && orders != null) return { sessions: orders, clicks: orders, isOrders: true };
  return { ...(totals?.[key] || { sessions: 0, clicks: 0 }), isOrders: false };
}

/**
 * Horizontal funnel: one bar per stage, scaled to the ATC-click entry. Each
 * row names its page and button; hovering opens the full detail card.
 */
function FunnelChart({ rows, metric, leakKey, totals, prevTotals, values, orders, prevOrders }) {
  const entry = rows.find((r) => r.key === ENTRY)?.value || 1;
  return (
    <div className='space-y-1'>
      {rows.map((r, i) => {
        const isContext = r.key === 'view_item';
        const width = isContext ? 100 : Math.max(0.6, Math.min(100, (r.value / entry) * 100));
        const isLeak = r.key === leakKey;
        const both = bothCounts(totals, r.key, orders);
        const prevBoth = bothCounts(prevTotals, r.key, prevOrders);
        const perSession = rate(both.clicks, both.sessions);
        const prevStage = i > 0 ? rows[i - 1].key : null;
        // Money behind the drop: average cart value at the previous step x the
        // sessions lost. Only meaningful in sessions mode, from add_to_cart on
        // (view_item carries a product price, not a cart).
        const valueFrom = CART_VALUE_SOURCE[prevStage];
        const lostValue = metric === 'sessions' && valueFrom ? r.dropped * avgValue(values, valueFrom) : NaN;
        const value = avgValue(values, r.key);
        return (
          <div key={r.key}>
            {i > 0 && (
              <div className='flex flex-wrap items-center gap-2 py-1 pl-[232px] text-[11px] text-ink-muted max-md:pl-0'>
                <span className={isLeak ? 'font-semibold text-bad-fg' : ''}>
                  ↓ {pct(r.stepRate)} continue · {fmt(r.dropped)} dropped
                  {Number.isFinite(lostValue) && lostValue > 0 && ` · ≈ ${inrShort(lostValue)} in carts`}
                </span>
                {isLeak && <span className='rounded bg-bad-bg px-1.5 py-0.5 text-[10px] font-semibold text-bad-fg'>Biggest leak</span>}
                <Delta cur={r.stepRate} prev={r.prevStepRate} asPoints />
              </div>
            )}
            <div className='group relative flex items-center gap-3 max-md:flex-col max-md:items-stretch max-md:gap-1'>
              <div className='w-[220px] shrink-0'>
                <p className='text-[13px] font-semibold text-ink'>{r.label}</p>
                <div className='mt-1 flex flex-wrap items-center gap-1'>
                  <PathChip path={r.path} />
                  {r.cta && <CtaChip cta={r.cta} />}
                </div>
              </div>
              <div className='relative h-9 flex-1 rounded-md bg-panel-alt'>
                <div
                  className='h-full rounded-md transition-all group-hover:opacity-90'
                  style={{ width: `${width}%`, background: isContext ? BAR_SOFT : BAR }}
                />
              </div>
              <div className='w-[170px] shrink-0 text-right max-md:text-left'>
                <p className='text-[15px] font-bold text-ink'>{fmt(r.value)}</p>
                <p className='text-[11px] text-ink-soft'>
                  {both.isOrders ? 'Shopify orders' : (
                    <>
                      <span className={metric === 'sessions' ? 'font-semibold text-ink' : ''}>{fmt(both.sessions)} sess</span>
                      {' · '}
                      <span className={metric === 'clicks' ? 'font-semibold text-ink' : ''}>{fmt(both.clicks)} {r.cta ? 'clicks' : 'events'}</span>
                    </>
                  )}
                </p>
                <p className='text-[11px] text-ink-muted'>
                  {isContext ? `ATC rate ${pct(rate(entry, r.value), 2)}` : `${pct(r.ofEntry)} of ATC clicks`}
                  {' · '}
                  <Delta cur={r.value} prev={r.prev} />
                </p>
              </div>

              {/* Hover detail */}
              <div className='pointer-events-none absolute left-0 top-full z-20 mt-1 hidden w-[340px] rounded-lg border border-hairline bg-panel p-3 text-xs shadow-lifted group-hover:block'>
                <p className='font-semibold text-ink'>{r.label}</p>
                <p className='mb-2 text-ink-muted'>{r.note}</p>
                <dl className='grid grid-cols-[110px_1fr] gap-x-2 gap-y-1'>
                  <dt className='text-ink-muted'>Page</dt><dd><PathChip path={r.path} /></dd>
                  {r.cta && (<><dt className='text-ink-muted'>Button</dt><dd className='font-semibold text-ink'>{r.cta}</dd></>)}
                  <dt className='text-ink-muted'>Tracked by</dt><dd className='text-ink-soft'>{r.signal}</dd>
                  <dt className='text-ink-muted'>Sessions</dt><dd className='text-ink'>{fmt(both.sessions)} <span className='text-ink-muted'>(prev {fmt(prevBoth.sessions)})</span></dd>
                  {!both.isOrders && (<><dt className='text-ink-muted'>{r.cta ? 'Clicks' : 'Events'}</dt><dd className='text-ink'>{fmt(both.clicks)} <span className='text-ink-muted'>(prev {fmt(prevBoth.clicks)})</span></dd></>)}
                  {!both.isOrders && (<><dt className='text-ink-muted'>Per session</dt><dd className='text-ink'>{Number.isFinite(perSession) ? `${perSession.toFixed(2)}×` : '—'}{perSession >= 1.6 && r.cta ? <span className='ml-1 text-warn-fg'>repeat taps</span> : null}</dd></>)}
                  {Number.isFinite(value) && r.key !== 'view_item' && (<><dt className='text-ink-muted'>Avg cart value</dt><dd className='text-ink'>{inr(value)}</dd></>)}
                  {i > 0 && (<><dt className='text-ink-muted'>From prev step</dt><dd className='text-ink'>{pct(r.stepRate)} <span className='text-ink-muted'>(prev {pct(r.prevStepRate)})</span></dd></>)}
                </dl>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Checkout pages: sessions that opened each page vs sessions that pressed its CTA. */
function CheckoutPagesTable({ pages, prevPages, totals }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[760px] text-left text-xs'>
        <thead>
          <tr className='border-b border-hairline text-[11px] uppercase tracking-wide text-ink-muted'>
            <th className='py-2 pr-3 font-semibold'>Page</th>
            <th className='px-2 py-2 text-right font-semibold'>Sessions opened</th>
            <th className='px-2 py-2 text-right font-semibold'>Page views</th>
            <th className='px-2 py-2 text-right font-semibold'>Views / session</th>
            <th className='px-2 py-2 text-right font-semibold'>Engaged time / session</th>
            <th className='px-2 py-2 font-semibold'>Button on page</th>
            <th className='px-2 py-2 text-right font-semibold'>Sessions pressed</th>
            <th className='px-2 py-2 text-right font-semibold'>Page conversion</th>
          </tr>
        </thead>
        <tbody>
          {CHECKOUT_PAGES.map((pg) => {
            const cur = pages?.[pg.path] || { sessions: 0, views: 0, engagementSec: 0 };
            const prev = prevPages?.[pg.path];
            const pressed = pg.ctaStage ? totals[pg.ctaStage].sessions : NaN;
            const conv = rate(pressed, cur.sessions);
            return (
              <tr key={pg.path} className='border-b border-hairline-soft hover:bg-row-hover'>
                <td className='py-2 pr-3'>
                  <p className='font-semibold text-ink'>{pg.label}</p>
                  <PathChip path={pg.path} />
                </td>
                <td className='px-2 py-2 text-right'>
                  <div className='font-semibold text-ink'>{fmt(cur.sessions)}</div>
                  {prev && <Delta cur={cur.sessions} prev={prev.sessions} />}
                </td>
                <td className='px-2 py-2 text-right text-ink-soft'>{fmt(cur.views)}</td>
                <td className='px-2 py-2 text-right text-ink-soft'>{Number.isFinite(rate(cur.views, cur.sessions)) ? rate(cur.views, cur.sessions).toFixed(1) : '—'}</td>
                <td className='px-2 py-2 text-right text-ink-soft'>{duration(rate(cur.engagementSec, cur.sessions))}</td>
                <td className='px-2 py-2'>{pg.cta ? <CtaChip cta={pg.cta} /> : <span className='text-ink-muted'>—</span>}</td>
                <td className='px-2 py-2 text-right font-semibold text-ink'>{pg.ctaStage ? fmt(pressed) : '—'}</td>
                <td className='px-2 py-2 text-right'>
                  {pg.ctaStage ? (
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${conv < 0.4 ? 'bg-bad-bg text-bad-fg' : conv < 0.6 ? 'bg-warn-bg text-warn-fg' : 'bg-ok-bg text-ok-fg'}`}>
                      {pct(conv, 0)}
                    </span>
                  ) : <span className='text-ink-muted'>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Product-level funnel: ATC clicks joined by name to GA4 item metrics. */
function ProductsTable({ products }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[820px] text-left text-xs'>
        <thead>
          <tr className='border-b border-hairline text-[11px] uppercase tracking-wide text-ink-muted'>
            <th className='py-2 pr-3 font-semibold'>Product</th>
            <th className='px-2 py-2 text-right font-semibold'>PDP views</th>
            <th className='px-2 py-2 text-right font-semibold'>ATC clicks</th>
            <th className='px-2 py-2 text-right font-semibold'>Added to cart</th>
            <th className='px-2 py-2 text-right font-semibold'>Checked out</th>
            <th className='px-2 py-2 text-right font-semibold'>Purchased (GA4)</th>
          </tr>
        </thead>
        <tbody>
          {products.map((pr) => {
            const addRate = rate(pr.added, pr.atcClicks);
            const dead = pr.atcClicks >= 20 && pr.added === 0;
            return (
              <tr key={pr.name} className='border-b border-hairline-soft hover:bg-row-hover'>
                <td className='max-w-[320px] py-2 pr-3'>
                  <span className='font-medium text-ink'>{pr.name}</span>
                  {dead && <span className='ml-2 rounded bg-bad-bg px-1.5 py-0.5 text-[10px] font-semibold text-bad-fg'>No adds</span>}
                </td>
                <td className='px-2 py-2 text-right text-ink-soft'>{fmt(pr.views)}</td>
                <td className='px-2 py-2 text-right'>
                  <div className='font-semibold text-ink'>{fmt(pr.atcClicks)}</div>
                  <div className='text-[10px] text-ink-muted'>{pct(rate(pr.atcClicks, pr.views), 1)} of views</div>
                </td>
                <td className='px-2 py-2 text-right'>
                  <div className='font-semibold text-ink'>{fmt(pr.added)}</div>
                  <div className={`text-[10px] ${addRate < 0.1 && pr.atcClicks >= 20 ? 'font-semibold text-bad-fg' : 'text-ink-muted'}`}>
                    {Number.isFinite(addRate) ? `${pct(addRate, 0)} of clicks` : '—'}
                  </div>
                </td>
                <td className='px-2 py-2 text-right text-ink'>{fmt(pr.checkedOut)}</td>
                <td className='px-2 py-2 text-right text-ink'>{fmt(pr.purchased)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Daily volume of one stage — single-series bars with a hover tooltip. */
function DailyChart({ daily, stageKey, metric, ordersDaily }) {
  const [hover, setHover] = useState(null);
  const points = daily.map((d, i) => {
    const value = stageKey === 'purchase' && ordersDaily
      ? ordersDaily[d.date]?.orders || 0
      : d.stages[stageKey]?.[metric] || 0;
    const idx = STAGES.findIndex((s) => s.key === stageKey);
    const before = idx > 0 ? d.stages[STAGES[idx - 1].key]?.[metric] || 0 : NaN;
    return { date: d.date, value, step: idx > 0 ? rate(value, before) : NaN, i };
  });
  const max = Math.max(1, ...points.map((p) => p.value));
  const W = 760;
  const H = 220;
  const pad = { l: 40, r: 8, t: 10, b: 26 };
  const bw = (W - pad.l - pad.r) / Math.max(1, points.length);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const labelEvery = Math.ceil(points.length / 10);

  return (
    <div className='relative'>
      <svg viewBox={`0 0 ${W} ${H}`} className='h-[240px] w-full' role='img' aria-label='Daily volume chart'>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke='currentColor' className='text-hairline' strokeWidth='1' />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor='end' className='fill-ink-muted text-[10px]'>{fmt(t)}</text>
          </g>
        ))}
        {points.map((p) => {
          const x = pad.l + p.i * bw;
          const h = Math.max(0, H - pad.b - y(p.value));
          const barW = Math.max(2, bw - 2);
          return (
            <g key={p.date} onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)}>
              <rect x={x} y={pad.t} width={bw} height={H - pad.t - pad.b} fill='transparent' />
              <path
                d={`M${x + 1},${H - pad.b} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${Math.max(0, barW - 8)} q4,0 4,4 v${Math.max(0, h - 4)} z`}
                fill={BAR}
                opacity={hover && hover.date !== p.date ? 0.45 : 1}
              />
              {p.i % labelEvery === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor='middle' className='fill-ink-muted text-[10px]'>
                  {format(new Date(`${p.date}T00:00:00`), 'd MMM')}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div
          className='pointer-events-none absolute top-2 z-10 rounded-lg border border-hairline bg-panel px-3 py-2 text-xs shadow-lifted'
          style={{ left: `${Math.min(80, (hover.i / Math.max(1, points.length)) * 100)}%` }}
        >
          <p className='font-semibold text-ink'>{format(new Date(`${hover.date}T00:00:00`), 'EEE, d MMM yyyy')}</p>
          <p className='text-ink-soft'>{fmt(hover.value)} {stageKey === 'purchase' && ordersDaily ? 'orders' : metric}</p>
          {Number.isFinite(hover.step) && <p className='text-ink-muted'>{pct(hover.step)} of previous step</p>}
        </div>
      )}
    </div>
  );
}

// Segment table columns: Signups sits beside the funnel (not a step of it),
// then product views and the funnel steps in order.
const FUNNEL_COLS = STAGES.filter((s) => s.key !== 'view_item');
const SEGMENT_COLS = [
  { key: 'signup', label: 'Signups' },
  { key: 'view_item', label: 'Product views' },
  ...FUNNEL_COLS.map((s) => ({ key: s.key, label: s.label })),
];
// The step each funnel column converts from ("vs previous step" mode).
const STEP_BASE = Object.fromEntries(STAGES.map((s, i) => [s.key, i === 0 ? null : STAGES[i - 1].key]));

const RATE_MODES = [
  { key: 'step', label: 'vs previous step' },
  { key: 'atc', label: '% of ATC clicks' },
  { key: 'sessions', label: '% of sessions' },
  { key: 'off', label: 'Hide' },
];

/**
 * The small rate under a segment-table number. Signups are always a share of
 * the segment's sessions; product views too in step mode (they have no
 * previous step). Returns { r, base, of } or null when the mode has no rate
 * for that column.
 */
function segmentRate(stages, sessions, key, mode, metric) {
  if (mode === 'off') return null;
  const of = (base, label) => ({ r: rate(stages[key]?.[metric] || 0, base), base, of: label });
  if (key === 'signup' || mode === 'sessions') return of(sessions, 'of sessions');
  if (mode === 'atc') {
    return key === 'view_item' || key === 'atc_click' ? null : of(stages.atc_click[metric], 'of ATC clicks');
  }
  const prevKey = STEP_BASE[key];
  if (!prevKey) return of(sessions, 'of sessions');
  const prevLabel = STAGES.find((st) => st.key === prevKey)?.label.toLowerCase();
  return of(stages[prevKey][metric], `of ${prevLabel}`);
}

function rateCellTone(r, overall, base) {
  if (!Number.isFinite(r) || !Number.isFinite(overall) || base < 20) return '';
  if (r < overall * 0.5) return 'bg-bad-bg text-bad-fg';
  if (r > overall * 1.5) return 'bg-ok-bg text-ok-fg';
  return '';
}

// Column sums for the "rows shown" footer. Session-scoped segments (channel,
// source, device...) don't overlap, so their sessions add up.
function sumRows(rows) {
  const stages = {};
  for (const col of SEGMENT_COLS) {
    stages[col.key] = {
      sessions: rows.reduce((n, r) => n + (r.stages[col.key]?.sessions || 0), 0),
      clicks: rows.reduce((n, r) => n + (r.stages[col.key]?.clicks || 0), 0),
    };
  }
  return { stages, sessions: rows.reduce((n, r) => n + (r.sessions || 0), 0) };
}

/**
 * Segment x stage matrix with a Signups column, a choice of what the small
 * rate under each number means, and totals at the foot: the sum of the rows
 * shown, the exact all-traffic totals, and the database signup count.
 */
function BreakdownTable({ rows, allRows, totals, traffic, metric, label, rateMode, dbSignups }) {
  const site = { stages: totals, sessions: traffic?.sessions || 0 };
  const overall = Object.fromEntries(SEGMENT_COLS.map((c) => [c.key, segmentRate(site.stages, site.sessions, c.key, rateMode, metric)?.r]));

  // Segments whose ATC clicks almost never become adds — same rule as the
  // "low-quality" insight. Their high ATC-click rate is not a good sign, so it
  // is never tinted green.
  const siteAdd = rate(totals.add_to_cart[metric], totals.atc_click[metric]);
  const minBase = Math.max(30, (totals.atc_click[metric] || 0) * 0.03);
  const isLowQuality = (row) => row.stages.atc_click[metric] >= minBase
    && rate(row.stages.add_to_cart[metric], row.stages.atc_click[metric]) < siteAdd * 0.4;

  const cell = (stages, sessions, key, { muted = false, lowQuality = false } = {}) => {
    const v = stages[key]?.[metric] || 0;
    const rr = segmentRate(stages, sessions, key, rateMode, metric);
    let tone = rr ? rateCellTone(rr.r, overall[key], rr.base) : '';
    if (lowQuality && key === 'atc_click' && tone.startsWith('bg-ok')) tone = '';
    return (
      <td key={key} className={`px-2 py-1.5 text-right ${key === 'signup' ? 'border-r border-hairline-soft' : ''}`}>
        <div className={`font-semibold ${muted ? 'text-ink-soft' : 'text-ink'}`}>{fmt(v)}</div>
        {rr && (
          <div
            title={Number.isFinite(rr.r) ? `${pct(rr.r, 2)} ${rr.of} (${fmt(v)} / ${fmt(rr.base)})` : `No base: 0 ${rr.of.replace('of ', '')}`}
            className={`ml-auto inline-block rounded px-1 text-[10px] ${tone || 'text-ink-muted'}`}
          >
            {pct(rr.r, rr.r > 0 && rr.r < 0.001 ? 3 : rr.r < 0.1 ? 2 : 0)}
          </div>
        )}
      </td>
    );
  };
  const finalRate = (stages) => pct(rate(stages.add_payment_info[metric], stages.atc_click[metric]));

  const shown = sumRows(rows);
  const truncated = allRows.length > rows.length;

  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[1080px] text-left text-xs'>
        <thead>
          <tr className='border-b border-hairline text-[11px] uppercase tracking-wide text-ink-muted'>
            <th className='py-2 pr-3 font-semibold'>{label}</th>
            {SEGMENT_COLS.map((c) => (
              <th key={c.key} className={`px-2 py-2 text-right font-semibold ${c.key === 'signup' ? 'border-r border-hairline-soft' : ''}`}>{c.label}</th>
            ))}
            <th className='px-2 py-2 text-right font-semibold'>ATC → Pay now</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const lowQuality = isLowQuality(row);
            return (
              <tr key={row.key} className='border-b border-hairline-soft hover:bg-row-hover'>
                <td className='max-w-[260px] py-2 pr-3'>
                  <div className='flex items-center gap-1.5'>
                    <span className='truncate font-medium text-ink' title={row.key}>{row.key || '(not set)'}</span>
                    {lowQuality && (
                      <span title='Clicks ATC but almost never adds — likely accidental or bot-like traffic' className='shrink-0 rounded bg-bad-bg px-1 text-[9.5px] font-semibold text-bad-fg'>
                        Low quality
                      </span>
                    )}
                  </div>
                  <div className='text-[10.5px] text-ink-muted'>{fmt(row.sessions)} sessions</div>
                </td>
                {SEGMENT_COLS.map((c) => cell(row.stages, row.sessions, c.key, { muted: c.key === 'view_item', lowQuality }))}
                <td className='px-2 py-2 text-right font-semibold text-ink'>{finalRate(row.stages)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          {truncated && (
            <tr className='border-t-2 border-hairline'>
              <td className='py-2 pr-3'>
                <div className='font-semibold text-ink'>Sum of {rows.length} rows shown</div>
                <div className='text-[10.5px] text-ink-muted'>{fmt(shown.sessions)} sessions</div>
              </td>
              {SEGMENT_COLS.map((c) => cell(shown.stages, shown.sessions, c.key, { muted: true }))}
              <td className='px-2 py-2 text-right font-semibold text-ink-soft'>{finalRate(shown.stages)}</td>
            </tr>
          )}
          <tr className={`bg-panel-alt ${truncated ? '' : 'border-t-2 border-hairline'}`}>
            <td className='py-2 pr-3'>
              <div className='font-bold text-ink'>All traffic</div>
              <div className='text-[10.5px] text-ink-muted'>{fmt(site.sessions)} sessions · site total</div>
            </td>
            {SEGMENT_COLS.map((c) => cell(site.stages, site.sessions, c.key))}
            <td className='px-2 py-2 text-right font-bold text-ink'>{finalRate(site.stages)}</td>
          </tr>
          {dbSignups != null && (
            <tr className='bg-panel-alt'>
              <td className='py-2 pr-3'>
                <div className='font-semibold text-ink'>Website signups (database)</div>
                <div className='text-[10.5px] text-ink-muted'>REGISTER records · no source / device</div>
              </td>
              <td className='border-r border-hairline-soft px-2 py-2 text-right'>
                <div className='font-semibold text-ink'>{fmt(dbSignups)}</div>
                <div className='text-[10px] text-ink-muted' title='GA4 signup events ÷ database signups'>
                  GA4 has {pct(rate(totals.signup?.clicks || 0, dbSignups), 0)}
                </div>
              </td>
              <td colSpan={SEGMENT_COLS.length} className='px-2 py-2 text-[10.5px] text-ink-muted'>
                Exact count from the storefront&apos;s own tracking. Per-segment signups above come from GA4&apos;s signup event, which captures {pct(rate(totals.signup?.clicks || 0, dbSignups), 0)} of these.
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
}

export default function CheckoutFunnelPage() {
  const [preset, setPreset] = useState('7d');
  const [startDate, setStartDate] = useState(day(subDays(new Date(), 7)));
  const [endDate, setEndDate] = useState(day(subDays(new Date(), 1)));
  const [metric, setMetric] = useState('sessions');
  const [purchaseSource, setPurchaseSource] = useState('shopify');
  const [breakdown, setBreakdown] = useState('channel');
  const [segmentRateMode, setSegmentRateMode] = useState('step');
  const [showAllSegments, setShowAllSegments] = useState(false);
  const [dailyStage, setDailyStage] = useState('atc_click');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const forceFresh = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const url = `${BACKEND_URL}/api/admin/funnel?start=${startDate}&end=${endDate}&breakdown=${breakdown}${forceFresh.current ? '&refresh=1' : ''}`;
        forceFresh.current = false;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || `Request failed (${res.status})`);
        if (!cancelled) setData(json.data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [startDate, endDate, breakdown, reloadKey]);

  const applyPreset = (key) => {
    const p = PRESETS.find((x) => x.key === key);
    const [s, e] = p.range();
    setPreset(key);
    setStartDate(day(s));
    setEndDate(day(e));
  };

  const useShopify = purchaseSource === 'shopify' && !!data?.orders;
  const rows = useMemo(() => (data
    ? funnelRows(data.totals, metric, useShopify ? data.orders.orders : undefined, data.previousTotals, useShopify ? data.previousOrders?.orders : undefined)
    : []), [data, metric, useShopify]);
  const insights = useMemo(() => buildInsights(data, { metric, useShopify }), [data, metric, useShopify]);
  const leakKey = useMemo(() => {
    const entryIdx = rows.findIndex((r) => r.key === ENTRY);
    return rows.filter((_, i) => i > entryIdx).reduce((a, b) => (b.dropped > (a?.dropped ?? 0) ? b : a), null)?.key;
  }, [rows]);

  const t = data?.totals;
  const p = data?.previousTotals;
  const orders = data?.orders;
  const purchases = t ? stageValue(t, 'purchase', metric, useShopify ? orders.orders : undefined) : 0;
  const prevPurchases = p ? stageValue(p, 'purchase', metric, useShopify ? data.previousOrders?.orders : undefined) : 0;
  const ctaTotal = data ? Object.values(data.ctas).reduce((s, v) => s + v.clicks, 0) : 0;

  return (
    <div className='mx-auto max-w-[1400px] p-6 max-md:p-4'>
      <PageHeader
        icon={Filter}
        title='Checkout Funnel'
        subtitle='Where shoppers drop between the Add to Cart click and the order — GA4 events with Shopify website orders as the true purchase count.'
        actions={
          <button
            type='button'
            onClick={() => { forceFresh.current = true; setReloadKey(Date.now()); }}
            className='inline-flex items-center gap-2 rounded-lg border border-hairline bg-panel px-3 py-2 text-[13px] font-medium text-ink shadow-panel hover:bg-row-hover'
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {/* Filters — above everything they control. Row 1 picks the window,
          row 2 how it is counted, with the comparison window spelled out. */}
      <div className='mb-6 rounded-xl border border-hairline bg-panel shadow-panel'>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3'>
          <span className={FILTER_LABEL}>Date range</span>
          <Segmented size='sm' options={PRESETS} value={preset} onChange={applyPreset} />
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-1 text-xs transition ${
              preset === 'custom' ? 'border-ink bg-panel' : 'border-hairline bg-panel-alt'
            }`}
          >
            <Calendar size={14} className='shrink-0 text-ink-muted' />
            <input
              type='date'
              aria-label='Start date'
              value={startDate}
              max={endDate}
              onChange={(e) => { setPreset('custom'); setStartDate(e.target.value); }}
              className='bg-transparent text-ink outline-none'
            />
            <ArrowRight size={13} className='shrink-0 text-ink-muted' />
            <input
              type='date'
              aria-label='End date'
              value={endDate}
              min={startDate}
              max={day(new Date())}
              onChange={(e) => { setPreset('custom'); setEndDate(e.target.value); }}
              className='bg-transparent text-ink outline-none'
            />
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-hairline-soft px-4 py-3'>
          <div className='flex items-center gap-3'>
            <span className={FILTER_LABEL}>Count by</span>
            <Segmented
              size='sm'
              options={[{ key: 'sessions', label: 'Sessions' }, { key: 'clicks', label: 'Clicks' }]}
              value={metric}
              onChange={setMetric}
            />
          </div>
          <div className='flex items-center gap-3'>
            <span className={FILTER_LABEL}>Orders from</span>
            <Segmented
              size='sm'
              options={[{ key: 'shopify', label: 'Shopify' }, { key: 'ga4', label: 'GA4' }]}
              value={purchaseSource}
              onChange={setPurchaseSource}
            />
          </div>
          {/* A cleared date input gives '' — skip the summary rather than format an invalid date */}
          {isDay(startDate) && isDay(endDate) && startDate <= endDate && (
            <p className='ml-auto text-xs text-ink-muted max-md:ml-0'>
              <span className='font-semibold text-ink'>{rangeLabel(startDate, endDate)}</span>
              {' · '}{rangeDays(startDate, endDate)} day{rangeDays(startDate, endDate) === 1 ? '' : 's'}
              {' · vs '}{rangeLabel(...previousWindow(startDate, endDate))}
            </p>
          )}
        </div>
      </div>

      {startDate < TRACKING_CHANGE && (
        <div className='mb-4 flex items-start gap-2 rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn-fg'>
          <AlertTriangle size={14} className='mt-0.5 shrink-0' />
          Login-before-ATC went live on 1 Oct 2026 and the add_to_cart event was rewired on 3 Oct, so days before 3 Oct are not comparable.
        </div>
      )}
      {error && (
        <div className='mb-4 rounded-lg bg-bad-bg px-3 py-2 text-sm text-bad-fg'>Could not load the funnel: {error}</div>
      )}
      {loading && !data && <div className='py-24 text-center text-sm text-ink-muted'>Loading GA4 funnel…</div>}

      {data && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className='grid grid-cols-2 gap-4 lg:grid-cols-5'>
            <Kpi icon={MousePointerClick} label={`ATC clicks (${metric})`} value={fmt(t.atc_click[metric])} cur={t.atc_click[metric]} prev={p.atc_click[metric]} />
            <Kpi icon={ShoppingCart} label={`Proceed to checkout (${metric})`} value={fmt(t.begin_checkout[metric])} cur={t.begin_checkout[metric]} prev={p.begin_checkout[metric]} />
            <Kpi icon={CreditCard} label={`Pay now (${metric})`} value={fmt(t.add_payment_info[metric])} cur={t.add_payment_info[metric]} prev={p.add_payment_info[metric]} />
            <Kpi
              icon={Receipt}
              label={useShopify ? 'Orders (Shopify website)' : 'Purchases (GA4)'}
              value={fmt(purchases)}
              cur={purchases}
              prev={prevPurchases}
              sub={useShopify ? `${inr(orders.revenue)} revenue` : undefined}
            />
            <Kpi
              icon={TrendingUp}
              label='ATC click → order'
              value={pct(rate(purchases, t.atc_click[metric]), 2)}
              cur={rate(purchases, t.atc_click[metric])}
              prev={rate(prevPurchases, p.atc_click[metric])}
              points
            />
          </div>

          <div className='grid gap-6 xl:grid-cols-[1fr_380px]'>
            <Card
              title='Funnel'
              subtitle={`Bars = ${metric === 'sessions' ? 'sessions in which each step happened' : 'total clicks / events'} (toggle above), scaled to ATC clicks. Each row shows its page and button, plus both sessions and clicks — hover a row for details.`}
            >
              <FunnelChart
                rows={rows}
                metric={metric}
                leakKey={leakKey}
                totals={t}
                prevTotals={p}
                values={data.values}
                orders={useShopify ? orders.orders : undefined}
                prevOrders={useShopify ? data.previousOrders?.orders : undefined}
              />
            </Card>
            {/* Side-by-side (xl), the list is taken out of flow so the funnel card
                alone sets the row height; extra insights scroll inside it. */}
            <Card
              title='Where to work'
              subtitle={`${insights.length} insight${insights.length === 1 ? '' : 's'} from this range, the previous period and the breakdown below`}
              className='flex flex-col'
            >
              <div className='xl:relative xl:min-h-[240px] xl:flex-1'>
                <div className='space-y-2.5 xl:absolute xl:inset-0 xl:-mr-3 xl:overflow-y-auto xl:pr-3 xl:[scrollbar-width:thin]'>
                  {insights.length ? insights.map((ins) => <InsightCard key={ins.title} insight={ins} />) : (
                    <p className='text-xs text-ink-muted'>Not enough data in this range.</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {data.pages && (
            <Card
              title='Checkout pages'
              subtitle='Sessions that opened each page (page_view) vs sessions that pressed its button — the true per-page conversion. Engaged time = active time on the page per session. Cart sessions include opens from the header cart icon, so they are not part of the funnel above.'
            >
              <CheckoutPagesTable pages={data.pages} prevPages={data.previousPages} totals={t} />
            </Card>
          )}

          <div className='grid gap-6 lg:grid-cols-2'>
            <Card title='Add to cart button split' subtitle='Which of the three PDP buttons shoppers use (promoClick promo_id)'>
              <div className='space-y-3'>
                {Object.keys(CTA_LABELS).map((key) => {
                  const v = data.ctas[key] || { clicks: 0, sessions: 0 };
                  const pv = data.previousCtas[key] || { clicks: 0, sessions: 0 };
                  const share = rate(v.clicks, ctaTotal);
                  return (
                    <div key={key}>
                      <div className='mb-1 flex items-baseline justify-between gap-2 text-xs'>
                        <span className='font-semibold text-ink'>{CTA_LABELS[key]}</span>
                        <span className='text-ink-soft'>
                          {fmt(v[metric])} {metric} · {pct(share, 0)} of clicks · <Delta cur={v[metric]} prev={pv[metric]} />
                        </span>
                      </div>
                      <div className='h-2.5 rounded-full bg-panel-alt'>
                        <div className='h-full rounded-full' style={{ width: `${(share || 0) * 100}%`, background: BAR }} />
                      </div>
                    </div>
                  );
                })}
                <p className='pt-1 text-[11px] text-ink-muted'>
                  A click is counted before the login gate; only {pct(rate(t.add_to_cart[metric], t.atc_click[metric]))} of ATC-click {metric} end with the item in cart.
                </p>
              </div>
            </Card>
            <Card title='Website orders by payment method' subtitle='Shopify, paid & not cancelled (same filter as the Orders page)'>
              {orders ? (
                <div className='space-y-2'>
                  {Object.entries(orders.gateways).sort((a, b) => b[1].orders - a[1].orders).map(([gw, v]) => (
                    <div key={gw} className='flex items-center justify-between rounded-lg border border-hairline-soft px-3 py-2 text-xs'>
                      <span className='font-semibold text-ink'>{gw}</span>
                      <span className='text-ink-soft'>{fmt(v.orders)} orders · {inr(v.revenue)}</span>
                    </div>
                  ))}
                  <div className='flex items-center justify-between px-3 pt-1 text-xs'>
                    <span className='text-ink-muted'>Total · AOV {inr(rate(orders.revenue, orders.orders))}</span>
                    <span className='font-semibold text-ink'>{fmt(orders.orders)} orders · {inr(orders.revenue)}</span>
                  </div>
                </div>
              ) : (
                <p className='text-xs text-ink-muted'>Shopify orders unavailable — purchase falls back to GA4.</p>
              )}
            </Card>
          </div>

          <Card
            title='Daily trend'
            subtitle='Pick a step to see its daily volume; the table has every step per day'
            actions={
              <select
                value={dailyStage}
                onChange={(e) => setDailyStage(e.target.value)}
                className='rounded-md border border-hairline bg-field px-2 py-1.5 text-xs text-ink'
              >
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            }
          >
            <DailyChart daily={data.daily} stageKey={dailyStage} metric={metric} ordersDaily={useShopify ? orders.daily : null} />
            <div className='mt-4 overflow-x-auto'>
              <table className='w-full min-w-[900px] text-left text-xs'>
                <thead>
                  <tr className='border-b border-hairline text-[11px] uppercase tracking-wide text-ink-muted'>
                    <th className='py-2 pr-3 font-semibold'>Date</th>
                    {STAGES.map((s) => <th key={s.key} className='px-2 py-2 text-right font-semibold'>{s.label}</th>)}
                    <th className='px-2 py-2 text-right font-semibold'>ATC → order</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.daily].reverse().map((d) => {
                    const o = useShopify ? orders.daily[d.date]?.orders || 0 : undefined;
                    return (
                      <tr key={d.date} className='border-b border-hairline-soft hover:bg-row-hover'>
                        <td className='py-2 pr-3 font-medium text-ink'>{format(new Date(`${d.date}T00:00:00`), 'EEE, d MMM')}</td>
                        {STAGES.map((s, i) => {
                          const v = stageValue(d.stages, s.key, metric, o);
                          const before = i > 1 ? stageValue(d.stages, STAGES[i - 1].key, metric, o) : NaN;
                          return (
                            <td key={s.key} className='px-2 py-2 text-right'>
                              <span className='font-semibold text-ink'>{fmt(v)}</span>
                              {i > 1 && <span className='ml-1 text-[10px] text-ink-muted'>{pct(rate(v, before), 0)}</span>}
                            </td>
                          );
                        })}
                        <td className='px-2 py-2 text-right font-semibold text-ink'>
                          {pct(rate(stageValue(d.stages, 'purchase', metric, o), d.stages.atc_click[metric]), 2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {data.products?.length > 0 && (
            <Card
              title='Products in the funnel'
              subtitle='Top products by ATC clicks (plus top by adds). "No adds" = 20+ ATC clicks and not one real add — check that product page. Item counts include repeat events.'
            >
              <ProductsTable products={data.products.slice(0, 20)} />
            </Card>
          )}

          <Card
            title='Funnel by segment'
            subtitle={`Signups (GA4) beside the funnel for each segment, with totals at the foot. Small % under each number: ${RATE_MODES.find((m) => m.key === segmentRateMode)?.label}${segmentRateMode === 'off' ? '' : ' (hover it for the exact base)'}. Red = under half the all-traffic rate, green = over 1.5× (min. 20 in the base). Purchase here is the GA4 event.`}
            actions={
              <div className='flex flex-wrap items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-[11px] font-semibold uppercase tracking-wide text-ink-muted'>Rate</span>
                  <Segmented size='sm' options={RATE_MODES} value={segmentRateMode} onChange={setSegmentRateMode} />
                </div>
                <select
                  value={breakdown}
                  onChange={(e) => { setBreakdown(e.target.value); setShowAllSegments(false); }}
                  className='rounded-md border border-hairline bg-field px-2 py-1.5 text-xs text-ink'
                >
                  {BREAKDOWN_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
            }
          >
            <BreakdownTable
              rows={showAllSegments ? data.breakdown.rows : data.breakdown.rows.slice(0, SEGMENT_PAGE)}
              allRows={data.breakdown.rows}
              totals={t}
              traffic={data.traffic}
              metric={metric}
              rateMode={segmentRateMode}
              dbSignups={data.signups?.db}
              label={BREAKDOWN_OPTIONS.find((o) => o.key === data.breakdown.key)?.label}
            />
            <div className='mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink-muted'>
              <span>
                Showing {showAllSegments ? data.breakdown.rows.length : Math.min(SEGMENT_PAGE, data.breakdown.rows.length)} of {data.breakdown.totalRows} segments, ranked by ATC-click sessions
                {data.breakdown.totalRows > data.breakdown.rows.length ? ` (top ${data.breakdown.rows.length} loaded)` : ''}.
                {' '}Use &quot;All traffic&quot; as the reference total: GA4 estimates session counts, so a row sum can differ from it by ~1%.
              </span>
              {data.breakdown.rows.length > SEGMENT_PAGE && (
                <button type='button' onClick={() => setShowAllSegments((v) => !v)} className='font-semibold text-ink underline underline-offset-2'>
                  {showAllSegments ? `Show top ${SEGMENT_PAGE}` : `Show all ${data.breakdown.rows.length}`}
                </button>
              )}
            </div>
          </Card>

          <p className='pb-4 text-[11px] leading-relaxed text-ink-muted'>
            GA4 data lags a few hours, so today is partial. Sessions are distinct counts and are not summed across days. ATC clicks come from the
            &quot;add to cart cta&quot; promoClick (GA4 select_promotion) and fire before the login gate; Proceed to checkout is begin_checkout, Continue
            to payment is add_shipping_info, Pay now is add_payment_info. Generated {format(new Date(data.generatedAt), 'd MMM, h:mm a')} (cached 10 min).
          </p>
        </div>
      )}
    </div>
  );
}
