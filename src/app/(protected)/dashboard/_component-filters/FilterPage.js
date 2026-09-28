'use client';

// Shared page for the component filters (Diamond Filters, Gemstone Filters).
// Each keeps product metafields in step with the product's
// ornaverse.components, for Search & Discovery. The page only reads the
// coverage, syncs one product, starts the background sync of everything, or
// edits the automatic schedule. Nothing here ever deletes a metafield:
// "Stale" rows are only shown.
//
// Backend: lucira-backend routes/componentFilterRoutes.js, mounted once per
// filter (/api/diamond-shape, /api/gemstone); the engine is
// lib/componentFilters.js and each filter's rules are in its own lib file.
//
// `config`:
//   api            backend prefix ('/api/diamond-shape')
//   icon, title, subtitle
//   noun           'diamond' | 'gemstone' — used in labels ("With a diamond")
//   sourceLabel    header of the column showing the raw codes ("Biggest diamond")
//   fields         [{ field, label, fmt }] in table order
//   noneState      { key, label, blurb } — the "nothing of this kind" state
//   unmappedBlurb  what happens to a product with an unknown code
//   breakdownLabel heading for the distribution chips
//   note           closing explanation (JSX)

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Loader2, Play, Search, ExternalLink, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import PageHeader, { StatusPill } from '../../../../components/common/PageHeader';
import { baseUrl, fieldCls, smallFieldCls, labelCls, formatDateTime, Note, Toggle, WEEKDAYS } from '../from-same-collection/_shared';

const SHOPIFY_ADMIN = 'https://admin.shopify.com/store/luciraonline/products/';
const PAGE_SIZE = 50;

const toneCls = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warn: 'bg-amber-50 text-amber-700 border-amber-100',
  error: 'bg-rose-50 text-rose-600 border-rose-100',
  muted: 'bg-zinc-50 text-zinc-500 border-zinc-100',
};

function statesFor(config) {
  const n = config.fields.length;
  return [
    { key: 'missing', label: 'Missing', blurb: `Has a ${config.noun}, one or more of the ${n} values not set yet — the next sync writes them.`, tone: 'warn' },
    { key: 'mismatch', label: 'Different', blurb: 'At least one stored value differs from the components — the next sync overwrites it.', tone: 'warn' },
    { key: 'in_sync', label: 'Present', blurb: `All ${n} values match the components.`, tone: 'ok' },
    { key: 'stale', label: 'Stale', blurb: `Values are stored but the product has no ${config.noun} any more. Left untouched — nothing is ever deleted.`, tone: 'error' },
    { key: 'unmapped', label: 'Unknown code', blurb: config.unmappedBlurb, tone: 'error' },
    { ...config.noneState, tone: 'muted' },
    { key: 'no_components', label: 'No components', blurb: 'The first variant has no ornaverse.components metafield.', tone: 'muted' },
    { key: 'bad_json', label: 'Unreadable', blurb: 'ornaverse.components is not valid JSON.', tone: 'error' },
  ];
}

const has = (v) => v != null && !(Array.isArray(v) && !v.length);

export default function FilterPage({ config }) {
  const API = baseUrl + config.api;
  const FIELDS = config.fields;
  const STATES = useMemo(() => statesFor(config), [config]);
  const fieldOf = (f) => FIELDS.find((x) => x.field === f);

  const call = useCallback(async (path, options) => {
    const res = await fetch(API + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }, [API]);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('missing');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [ref, setRef] = useState('');
  const [syncingOne, setSyncingOne] = useState(null); // ref or product id being synced
  const [lastOne, setLastOne] = useState(null);
  const [run, setRun] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const pollRef = useRef(null);

  const describe = (row) => {
    if (row.state === 'in_sync') return `all ${FIELDS.length} values already correct`;
    return (STATES.find((x) => x.key === row.state)?.label || row.state).toLowerCase();
  };

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const data = await call('/status' + (refresh ? '?refresh=1' : ''));
      setStatus(data);
      if (data.lastRun?.status === 'running') setRun(data.lastRun);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [call]);

  useEffect(() => { load(); }, [load]);

  // Poll a running global sync until it settles, then reload the coverage.
  useEffect(() => {
    if (run?.status !== 'running') return undefined;
    pollRef.current = setInterval(async () => {
      try {
        const { run: fresh } = await call('/runs/' + run._id);
        setRun(fresh);
        if (fresh.status !== 'running') {
          clearInterval(pollRef.current);
          if (fresh.status === 'failed') toast.error('Global sync failed: ' + (fresh.error || 'unknown error'));
          else toast.success(`Global sync done — ${fresh.written} products updated`);
          load();
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [run?._id, run?.status, load, call]);

  const syncOne = async (value) => {
    const target = String(value || '').trim();
    if (!target) return;
    setSyncingOne(target);
    try {
      const data = await call('/sync/product', { method: 'POST', body: JSON.stringify({ ref: target }) });
      setLastOne(data);
      const n = data.before.diffs.length;
      if (data.action === 'written') toast.success(`${data.after.title}: ${n} value${n === 1 ? '' : 's'} written`);
      else toast.info(`${data.after.title}: ${describe(data.after)}`);
      // The backend patched its cached scan; re-read it so counts move.
      setStatus(await call('/status'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSyncingOne(null);
    }
  };

  const startAll = async () => {
    setConfirmAll(false);
    try {
      const data = await call('/sync/all', { method: 'POST' });
      setRun(data.run);
      toast.info('Global sync started');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const summary = status?.summary;
  const defined = (status?.definitions || []).filter((d) => d.id).length;
  const rows = useMemo(() => {
    const all = status?.products || [];
    const q = query.trim().toLowerCase();
    return all.filter((r) => r.state === tab && (!q ||
      r.title?.toLowerCase().includes(q) ||
      r.handle?.includes(q) ||
      r.sku?.toLowerCase().includes(q) ||
      String(r.legacyId).includes(q)));
  }, [status, tab, query]);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  useEffect(() => setPage(0), [tab, query]);

  const running = run?.status === 'running';
  const pct = running && run.total ? Math.round((run.done / run.total) * 100) : 0;
  const Icon = config.icon;

  if (loading) {
    return (
      <div className='w-full py-10 px-8 flex items-center gap-3 text-zinc-500'>
        <Loader2 className='animate-spin' size={18} /> Scanning the catalogue — this takes about 30 seconds the first time…
      </div>
    );
  }

  return (
    <div className='w-full py-10 px-8'>
      <PageHeader
        icon={Icon}
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <>
            {defined === FIELDS.length
              ? <StatusPill tone='success'>{FIELDS.length} metafields defined</StatusPill>
              : <StatusPill>{defined} of {FIELDS.length} defined — rest created on first sync</StatusPill>}
            <button
              onClick={() => load(true)}
              disabled={refreshing || running}
              className='inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50'
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Rescan
            </button>
          </>
        }
      />

      {/* Coverage */}
      {summary && (
        <div className='grid grid-cols-2 gap-3 md:grid-cols-4 mb-6'>
          <Stat label='Products' value={summary.total} hint={`scanned ${formatDateTime(status.scannedAt)}`} />
          <Stat label={`With a ${config.noun}`} value={summary.withSource} hint='should carry the values' />
          <Stat label={`All ${FIELDS.length} values present`} value={summary.present} tone='ok' hint={pctOf(summary.present, summary.withSource) + ` of ${config.noun} products`} />
          <Stat label='Needs sync' value={summary.needsSync} tone={summary.needsSync ? 'warn' : 'ok'} hint='missing + different' />
        </div>
      )}

      {/* Actions */}
      <div className='grid gap-4 lg:grid-cols-2 mb-6'>
        <div className='rounded-2xl border border-zinc-100 bg-white p-6'>
          <p className={labelCls}>Sync one product</p>
          <form
            className='mt-3 flex gap-2'
            onSubmit={(e) => { e.preventDefault(); syncOne(ref); }}
          >
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder='Product ID, handle, SKU or Shopify / site URL'
              className={fieldCls}
            />
            <button
              type='submit'
              disabled={!ref.trim() || Boolean(syncingOne)}
              className='shrink-0 inline-flex items-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white disabled:opacity-50'
            >
              {syncingOne === ref.trim() ? <Loader2 size={15} className='animate-spin' /> : <Play size={15} />} Sync
            </button>
          </form>
          {lastOne && <SyncResult result={lastOne} fieldOf={fieldOf} describe={describe} />}
        </div>

        <div className='rounded-2xl border border-zinc-100 bg-white p-6'>
          <p className={labelCls}>Sync all products</p>
          <p className='mt-3 text-sm text-zinc-500'>
            Rescans every product, then writes {FIELDS.map((f) => f.label.toLowerCase()).join(', ')} for
            all <b>{summary?.needsSync ?? 0}</b> products where any of them is missing or different — only the values
            that need it. Products already correct are skipped; nothing is deleted.
          </p>
          {running ? (
            <div className='mt-4'>
              <div className='flex justify-between text-xs font-semibold text-zinc-500 mb-1.5'>
                <span>{run.phase === 'scanning' ? 'Scanning catalogue…' : `Writing ${run.done} / ${run.total}`}</span>
                <span>{pct}%</span>
              </div>
              <div className='h-2 rounded-full bg-zinc-100 overflow-hidden'>
                <div className='h-full bg-black transition-all' style={{ width: (run.phase === 'scanning' ? 5 : pct) + '%' }} />
              </div>
            </div>
          ) : confirmAll ? (
            <div className='mt-4 flex items-center gap-2'>
              <span className='text-sm text-zinc-600'>Write {summary?.needsSync} products in Shopify?</span>
              <button onClick={startAll} className='rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white'>Yes, sync</button>
              <button onClick={() => setConfirmAll(false)} className='rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold'>Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAll(true)}
              disabled={!summary?.needsSync}
              className='mt-4 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50'
            >
              <Play size={15} /> Sync all products
            </button>
          )}
          {run && !running && <RunLine run={run} />}
          {!run && status?.lastRun && <RunLine run={status.lastRun} />}
        </div>
      </div>

      {status?.schedule && (
        <ScheduleCard call={call} initial={status.schedule} onSaved={(schedule) => setStatus((s) => ({ ...s, schedule }))} />
      )}

      {/* Distribution */}
      {summary?.breakdown?.length > 0 && (
        <div className='rounded-2xl border border-zinc-100 bg-white p-6 mb-6'>
          <p className={labelCls}>{config.breakdownLabel}</p>
          <div className='mt-3 flex flex-wrap gap-2'>
            {summary.breakdown.map((s) => (
              <span key={s.value} className='rounded-full border border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700'>
                {s.value} <span className='text-zinc-400'>{s.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Products by state */}
      <div className='rounded-2xl border border-zinc-100 bg-white'>
        <div className='flex flex-wrap gap-1.5 border-b border-zinc-100 p-3'>
          {STATES.filter((s) => (summary?.states?.[s.key] || 0) > 0 || ['missing', 'in_sync'].includes(s.key)).map((s) => (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${tab === s.key ? 'bg-black text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}
            >
              {s.label} <span className={tab === s.key ? 'text-zinc-300' : 'text-zinc-400'}>{summary?.states?.[s.key] || 0}</span>
            </button>
          ))}
        </div>

        <div className='p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <p className='text-sm text-zinc-500'>{STATES.find((s) => s.key === tab)?.blurb}</p>
          <div className='relative md:w-72'>
            <Search size={15} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400' />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Search title, SKU, handle, id' className={fieldCls + ' pl-10'} />
          </div>
        </div>

        {pageRows.length === 0 ? (
          <p className='px-4 pb-8 text-sm text-zinc-400'>No products here.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left text-[10px] font-black uppercase tracking-widest text-zinc-400'>
                  <th className='px-4 py-2'>Product</th>
                  <th className='px-4 py-2'>{config.sourceLabel}</th>
                  {FIELDS.map((f) => <th key={f.field} className='px-4 py-2'>{f.label}</th>)}
                  <th className='px-4 py-2' />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className='border-t border-zinc-50 align-top'>
                    <td className='px-4 py-2.5'>
                      <div className='flex items-center gap-3'>
                        {r.image
                          ? <img src={r.image + '&width=80'} alt='' className='h-10 w-10 rounded-lg object-cover bg-zinc-50' />
                          : <div className='h-10 w-10 rounded-lg bg-zinc-50' />}
                        <div className='min-w-0'>
                          <a href={SHOPIFY_ADMIN + r.legacyId} target='_blank' rel='noreferrer' className='font-semibold text-zinc-800 hover:underline inline-flex items-center gap-1'>
                            {r.title} <ExternalLink size={11} className='text-zinc-400' />
                          </a>
                          <p className='text-xs text-zinc-400'>{r.sku || r.handle}{r.status !== 'ACTIVE' ? ` · ${r.status.toLowerCase()}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-2.5 text-xs text-zinc-500 max-w-[14rem]'>
                      {r.source || '—'}
                      {r.unknown?.length > 0 && <p className='text-rose-600'>unknown: {r.unknown.join(', ')}</p>}
                    </td>
                    {FIELDS.map((f) => <ValueCell key={f.field} row={r} field={f} />)}
                    <td className='px-4 py-2.5 text-right'>
                      {(r.state === 'missing' || r.state === 'mismatch') && (
                        <button
                          onClick={() => syncOne(r.id)}
                          disabled={Boolean(syncingOne) || running}
                          className='inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-50'
                        >
                          {syncingOne === r.id ? <Loader2 size={12} className='animate-spin' /> : <Play size={12} />} Sync
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className='flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500'>
            <span>{page * PAGE_SIZE + 1}–{Math.min(rows.length, (page + 1) * PAGE_SIZE)} of {rows.length}</span>
            <div className='flex gap-2'>
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className='rounded-lg border border-zinc-200 px-3 py-1.5 font-semibold disabled:opacity-40'>Previous</button>
              <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className='rounded-lg border border-zinc-200 px-3 py-1.5 font-semibold disabled:opacity-40'>Next</button>
            </div>
          </div>
        )}
      </div>

      <div className='mt-6'>
        <Note>{config.note}</Note>
      </div>
    </div>
  );
}

const pctOf = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');

function Stat({ label, value, hint, tone }) {
  return (
    <div className={`rounded-2xl border p-5 ${tone ? toneCls[tone] : 'border-zinc-100 bg-white'}`}>
      <p className='text-[10px] font-black uppercase tracking-widest opacity-70'>{label}</p>
      <p className='mt-1 text-2xl font-bold'>{Number(value || 0).toLocaleString('en-IN')}</p>
      {hint && <p className='mt-0.5 text-xs opacity-70'>{hint}</p>}
    </div>
  );
}

// One metafield of one product: the value it should hold (bold) and what is
// stored now underneath — "empty", the differing value, or a check when equal.
function ValueCell({ row, field: { field, fmt } }) {
  const target = row.target?.[field];
  const stored = row.stored?.[field];

  if (!has(target)) {
    // Nothing to derive (or an unknown code): only what is left in Shopify.
    return (
      <td className='px-4 py-2.5'>
        {has(stored)
          ? <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneCls.error}`}>{fmt(stored)}</span>
          : <span className='text-zinc-300'>—</span>}
      </td>
    );
  }

  const differs = row.diffs?.includes(field);
  return (
    <td className='px-4 py-2.5'>
      <p className='font-semibold text-zinc-800'>{fmt(target)}</p>
      {!differs
        ? <p className='text-[11px] text-emerald-600 flex items-center gap-1'><CheckCircle2 size={11} /> saved</p>
        : !has(stored)
          ? <p className='text-[11px] text-zinc-300'>empty</p>
          : <p className='text-[11px] text-amber-600'>now {fmt(stored)}</p>}
    </td>
  );
}

function SyncResult({ result, fieldOf, describe }) {
  const { before, after, action, errors } = result;
  const ok = action === 'written';
  return (
    <div className={`mt-4 rounded-xl border p-4 text-sm ${ok ? toneCls.ok : toneCls.muted}`}>
      <p className='font-semibold flex items-center gap-2'>
        {ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {after.title}
      </p>
      {ok ? (
        <ul className='mt-1 space-y-0.5'>
          {before.diffs.map((f) => (
            <li key={f}>
              {fieldOf(f).label}: <b>{fieldOf(f).fmt(before.target[f])}</b>
              {has(before.stored[f]) ? <> (was {fieldOf(f).fmt(before.stored[f])})</> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className='mt-1'>No change: {describe(after)}{after.source ? ` (${after.source})` : ''}</p>
      )}
      {errors?.length > 0 && <p className='mt-1 text-rose-600'>{errors.map((e) => e.message).join('; ')}</p>}
    </div>
  );
}

function RunLine({ run }) {
  const failed = run.status === 'failed';
  return (
    <p className={`mt-4 text-xs ${failed ? 'text-rose-600' : 'text-zinc-400'}`}>
      Last global sync ({run.trigger === 'schedule' ? 'scheduled' : 'manual'}) {formatDateTime(run.finishedAt || run.startedAt)} —{' '}
      {failed ? `failed: ${run.error}` : `${run.written ?? 0} written${run.errorCount ? `, ${run.errorCount} errors` : ''}`}
    </p>
  );
}

// The automatic "Sync all". Saved to the filter's settings doc; the backend's
// scheduler ticks every minute and runs the same job as the button (rescan,
// write missing/different, never delete).
function ScheduleCard({ call, initial, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = ['enabled', 'syncMode', 'syncWeekday', 'scheduleTime'].some((k) => form[k] !== initial[k]);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const { schedule } = await call('/schedule', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: form.enabled, syncMode: form.syncMode, syncWeekday: Number(form.syncWeekday), scheduleTime: form.scheduleTime,
        }),
      });
      setForm(schedule);
      onSaved(schedule);
      toast.success(schedule.enabled ? 'Automatic sync on — ' + scheduleText(schedule) : 'Automatic sync off');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='rounded-2xl border border-zinc-100 bg-white p-6 mb-6'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className={labelCls + ' flex items-center gap-1.5'}><Clock size={11} /> Automatic sync</p>
          <p className='mt-2 text-sm text-zinc-500'>
            Runs “Sync all” on its own so new products pick up their values without anyone pressing the button.
            {initial.enabled
              ? <> Currently <b className='text-zinc-700'>{scheduleText(initial)}</b>.</>
              : <> Currently <b className='text-zinc-700'>off</b>.</>}
            {initial.lastRunAt && <> Last scheduled run {formatDateTime(initial.lastRunAt)}.</>}
          </p>
        </div>
        <Toggle checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
      </div>

      <div className={`mt-4 flex flex-wrap items-center gap-2 ${form.enabled ? '' : 'opacity-50'}`}>
        <select value={form.syncMode} onChange={(e) => set({ syncMode: e.target.value })} disabled={!form.enabled} className={smallFieldCls}>
          <option value='daily'>Every day</option>
          <option value='weekly'>Once a week</option>
        </select>
        {form.syncMode === 'weekly' && (
          <select value={form.syncWeekday} onChange={(e) => set({ syncWeekday: Number(e.target.value) })} disabled={!form.enabled} className={smallFieldCls}>
            {WEEKDAYS.map((d) => <option key={d.value} value={d.value}>on {d.label}</option>)}
          </select>
        )}
        <span className='text-xs text-zinc-500'>at</span>
        <input type='time' value={form.scheduleTime} onChange={(e) => set({ scheduleTime: e.target.value })} disabled={!form.enabled} className={smallFieldCls} />
        <span className='text-xs text-zinc-500'>IST</span>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className='ml-auto inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-40'
        >
          {saving && <Loader2 size={13} className='animate-spin' />} Save schedule
        </button>
      </div>
    </div>
  );
}

function scheduleText(s) {
  const day = WEEKDAYS.find((d) => d.value === s.syncWeekday)?.label || 'Monday';
  return (s.syncMode === 'weekly' ? `every ${day}` : 'every day') + ` at ${s.scheduleTime} IST`;
}
