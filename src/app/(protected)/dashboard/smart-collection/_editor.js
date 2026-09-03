'use client';

// The smart-collection workbench: configuration on the left, the live curate
// preview (the computed collection order) on the right, previewing the
// UNSAVED draft as you type — same shape as the from-same-collection editor.
//
// The vocabulary is percentages, not slot counts: "the first 20% of the
// collection is in-stock bestsellers by views" scales with the collection.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ArrowLeft, Loader2, Plus, Trash2, Search, Pin, CornerRightDown,
  AlertTriangle, Eye, RefreshCw, Info, ChevronUp, X, Send, FileClock, Scale,
  Globe, FolderOpen, Check, MoveUp, MoveDown,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  baseUrl, API, emptyForm, ruleToForm, percentTotal, PercentBar, RuleSentence,
  ConditionRow, AttributeChips, Toggle, ProductSearch, ProductRow, Section, Note,
  NEW_SLOT, SLOT_COLORS, fieldCls, smallFieldCls, labelCls,
  upsertPosition, clearPosition,
  WEIGHT_PRESETS, DEFAULT_WEIGHTS, formatDateTime,
  ALL_COLLECTIONS_HANDLE, ALL_COLLECTIONS_TITLE,
} from './_shared';
import { CuratePreview } from './_preview';

// ---------------------------------------------------------------------------
// Sort picker — the "ranked by" dropdown, and when "Balanced score" is chosen,
// the weight mixer under it: preset chips for a one-click recipe, then a row
// per metric with its weight. Weights are relative shares; the engine
// normalizes by the total, so 45+35+20 and 90+70+40 mean the same thing.
// ---------------------------------------------------------------------------
function SortByPicker({ value, onChange, sortKeys, weightableKeys }) {
  const entry = value?.[0] || { key: 'views_30d', dir: 'desc' };
  const def = sortKeys.find((sk) => sk.key === entry.key);
  const isWeighted = entry.key === 'weighted';
  const weights = entry.weights || {};
  const setEntry = (p) => onChange([{ ...entry, ...p }]);

  const weightable = sortKeys.filter((sk) => (weightableKeys || []).includes(sk.key));
  const unused = weightable.filter((sk) => weights[sk.key] === undefined);
  const activePreset = WEIGHT_PRESETS.find((p) => JSON.stringify(p.weights) === JSON.stringify(weights));

  return (
    <>
      <select
        className={smallFieldCls}
        value={entry.key}
        onChange={(e) => {
          const key = e.target.value;
          onChange([{
            key,
            dir: entry.dir || 'desc',
            ...(key === 'weighted' ? { weights: Object.keys(weights).length ? weights : { ...DEFAULT_WEIGHTS } } : {}),
          }]);
        }}
      >
        {sortKeys.map((sk) => <option key={sk.key} value={sk.key}>{sk.label}</option>)}
      </select>
      {def?.directional && (
        <select
          className={smallFieldCls}
          value={entry.dir || 'desc'}
          onChange={(e) => setEntry({ dir: e.target.value })}
        >
          <option value='desc'>High to low</option>
          <option value='asc'>Low to high</option>
        </select>
      )}

      {isWeighted && (
        <div className='w-full bg-violet-50/50 border border-violet-100 rounded-xl p-3 space-y-2.5'>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <Scale size={12} className='text-violet-500 shrink-0' />
            <span className='text-[10px] font-black uppercase tracking-widest text-violet-500 mr-1'>The mix</span>
            {WEIGHT_PRESETS.map((p) => (
              <button
                key={p.key}
                type='button'
                title={p.blurb}
                onClick={() => setEntry({ weights: { ...p.weights } })}
                className={'text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ' +
                  (activePreset?.key === p.key
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white border-violet-200 text-violet-600 hover:border-violet-400')}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className='space-y-1.5'>
            {Object.entries(weights).map(([k, w]) => {
              const skDef = sortKeys.find((sk) => sk.key === k);
              return (
                <div key={k} className='flex items-center gap-2'>
                  <span className='flex-1 min-w-0 text-[11px] text-zinc-600 truncate'>{skDef?.label || k}</span>
                  <input
                    type='range' min='5' max='100' step='5'
                    value={Number(w) || 5}
                    onChange={(e) => setEntry({ weights: { ...weights, [k]: Number(e.target.value) } })}
                    className='w-28 accent-violet-600'
                  />
                  <span className='w-8 text-right text-[11px] font-bold text-zinc-700'>{w}</span>
                  <button
                    type='button'
                    onClick={() => {
                      const next = { ...weights };
                      delete next[k];
                      setEntry({ weights: next });
                    }}
                    className='text-zinc-300 hover:text-rose-500'
                  >
                    <X size={13} />
                  </button>
                </div>
              );
            })}
            {Object.keys(weights).length === 0 && (
              <p className='text-[11px] text-zinc-400'>Pick a preset above, or add a metric below.</p>
            )}
          </div>

          {unused.length > 0 && (
            <select
              className={smallFieldCls + ' w-full'}
              value=''
              onChange={(e) => { if (e.target.value) setEntry({ weights: { ...weights, [e.target.value]: 20 } }); }}
            >
              <option value=''>+ Add a metric to the mix...</option>
              {unused.map((sk) => <option key={sk.key} value={sk.key}>{sk.label}</option>)}
            </select>
          )}
          <p className='text-[10px] text-zinc-400 leading-snug'>
            Products are ranked on each metric, the ranks are blended by these weights into one 0-100 score —
            shown on every tile in the preview so you can see why a product placed where it did.
          </p>
        </div>
      )}
    </>
  );
}

export function SmartRuleEditor({ rule, meta, viewsNote, onCancel, onSaved }) {
  const editing = Boolean(rule);

  const [form, setForm] = useState(() => (rule ? ruleToForm(rule) : emptyForm()));
  const [saving, setSaving] = useState(false);

  // Collection picker
  const [collQuery, setCollQuery] = useState('');
  const [collResults, setCollResults] = useState([]);
  const [collBusy, setCollBusy] = useState(false);

  // Live draft preview (right rail)
  const [preview, setPreview] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const previewSeq = useRef(0); // monotonic token, not AbortController (Next dev overlay)
  const [previewSlow, setPreviewSlow] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  const attrs = meta.attributes;
  // The preview payload is the only place the editor has product titles and
  // images for ids curated on a tile (hand-placed positions store ids only).
  const previewById = useMemo(
    () => new Map((preview?.products || []).map((p) => [p.id, p])),
    [preview]
  );
  const patch = useCallback((p) => setForm((f) => ({ ...f, ...(typeof p === 'function' ? p(f) : p) })), []);
  const setSlot = (i, p) => setForm((f) => ({ ...f, slots: f.slots.map((s, idx) => (idx === i ? { ...s, ...p } : s)) }));

  const total = percentTotal(form.slots);

  // -------------------------------------------------------------------------
  // Validation — surfaced next to Save AND inside the owning section.
  // -------------------------------------------------------------------------
  const isAll = form.scope === 'all';

  const problems = useMemo(() => {
    const out = [];
    if (!isAll && !form.collectionId) out.push({ at: 1, msg: 'Pick the Shopify collection to order.' });
    if (form.slots.some((s) => {
      const pct = Number(s.sizePercent);
      return !Number.isFinite(pct) || pct < 1 || pct > 100;
    })) out.push({ at: 2, msg: 'Every slot needs a size between 1% and 100%.' });
    if (total > 100) out.push({ at: 2, msg: 'Slots claim ' + total + '% — the collection only has 100%.' });
    if (!/^\d{2}:\d{2}$/.test(form.scheduleTime)) out.push({ at: 4, msg: 'Daily sync time must be HH:mm.' });
    if (form.goLiveAt && form.revertAt && new Date(form.revertAt) <= new Date(form.goLiveAt)) {
      out.push({ at: 4, msg: 'The revert date must be after the go-live date.' });
    }
    for (const slot of form.slots) {
      for (const c of slot.conditions) {
        if (!c.attr || c.op === undefined) out.push({ at: 2, msg: 'Finish or remove the incomplete slot condition.' });
      }
    }
    return out;
  }, [form, total]);

  const problemsAt = (n) => problems.filter((p) => p.at === n);

  // -------------------------------------------------------------------------
  // Collection search
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (collQuery.trim().length < 2) { setCollResults([]); return; }
    const t = setTimeout(async () => {
      setCollBusy(true);
      try {
        const res = await fetch(baseUrl + API + '/collections/search?q=' + encodeURIComponent(collQuery));
        const data = await res.json();
        if (data.success) setCollResults(data.collections || []);
      } catch (err) { console.error(err); }
      finally { setCollBusy(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [collQuery]);

  // -------------------------------------------------------------------------
  // The rule as the API wants it — shared by draft preview and save.
  // -------------------------------------------------------------------------
  const buildBody = useCallback(() => ({
    collectionId: form.scope === 'all' ? null : form.collectionId,
    collectionHandle: form.scope === 'all' ? ALL_COLLECTIONS_HANDLE : form.collectionHandle,
    collectionTitle: form.scope === 'all' ? ALL_COLLECTIONS_TITLE : form.collectionTitle,
    enabled: form.enabled,
    scheduleTime: form.scheduleTime,
    slots: form.slots.map((s) => ({
      sizePercent: Number(s.sizePercent) || 1,
      label: s.label,
      conditions: s.conditions.filter((c) => c.attr && c.op),
      sortBy: s.sortBy,
    })),
    remainderSortBy: form.remainderSortBy,
    pinned: form.pinned.map((p) => p.id),
    removed: form.removed.map((p) => p.id),
    positions: form.positions,
    settings: { oosToEnd: form.oosToEnd },
  }), [form]);

  // Only output-affecting fields trigger a preview — renaming a slot or
  // nudging the schedule must not spend a collection scan. `positions` is
  // deliberately absent: hand placements are applied AFTER the automated
  // order, so the preview re-applies them locally instead of re-scanning.
  const previewKey = JSON.stringify({
    scope: form.scope,
    previewCollectionId: form.previewCollectionId,
    collectionId: form.collectionId,
    slots: form.slots.map((s) => ({ sizePercent: s.sizePercent, conditions: s.conditions, sortBy: s.sortBy })),
    remainderSortBy: form.remainderSortBy,
    pinned: form.pinned.map((p) => p.id),
    removed: form.removed.map((p) => p.id),
    oosToEnd: form.oosToEnd,
  });

  const runnable = problems.filter((p) => p.at !== 4).length === 0;

  const loadPreview = useCallback(async () => {
    // The global rule previews against a SAMPLE collection the user picks —
    // there is no "one" collection to compute until then.
    if (form.scope === 'all' && !form.previewCollectionId) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    const seq = ++previewSeq.current;
    setPreviewBusy(true);
    setPreviewError(null);
    setPreviewSlow(false);
    const slowTimer = setTimeout(() => {
      if (seq === previewSeq.current) setPreviewSlow(true);
    }, 5000);
    try {
      const body = buildBody();
      if (form.scope === 'all') {
        body.collectionId = form.previewCollectionId;
        body.collectionHandle = '__draft__';
      }
      const res = await fetch(baseUrl + API + '/preview-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (seq !== previewSeq.current) return; // superseded
      if (res.ok && data.success) setPreview(data.preview || null);
      else { setPreview(null); setPreviewError(data.error || 'Preview failed.'); }
    } catch (err) {
      if (seq !== previewSeq.current) return;
      setPreview(null);
      setPreviewError('Could not reach the server.');
    } finally {
      clearTimeout(slowTimer);
      if (seq === previewSeq.current) { setPreviewBusy(false); setPreviewSlow(false); }
    }
  }, [buildBody]);

  useEffect(() => {
    if (!runnable) { setPreview(null); setPreviewError(null); return; }
    const t = setTimeout(loadPreview, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, runnable]);

  // -------------------------------------------------------------------------
  // Curation — pin / demote / hand-place. Shared by the preview tiles and the
  // section lists, and mutually exclusive: one placement decision per product,
  // so the preview can never show two of them fighting over the same tile.
  // -------------------------------------------------------------------------
  const asEntry = (p) => ({ id: p.id, title: p.title, image: p.image, price: p.price });
  const togglePin = (p) => patch((f) => ({
    pinned: f.pinned.some((x) => x.id === p.id) ? f.pinned.filter((x) => x.id !== p.id) : [...f.pinned, asEntry(p)],
    removed: f.removed.filter((x) => x.id !== p.id),
    positions: clearPosition(f.positions, p.id),
  }));
  const toggleRemove = (p) => patch((f) => ({
    removed: f.removed.some((x) => x.id === p.id) ? f.removed.filter((x) => x.id !== p.id) : [...f.removed, asEntry(p)],
    pinned: f.pinned.filter((x) => x.id !== p.id),
    positions: clearPosition(f.positions, p.id),
  }));
  const movePosition = (p, position) => patch((f) => ({
    pinned: f.pinned.filter((x) => x.id !== p.id),
    removed: f.removed.filter((x) => x.id !== p.id),
    positions: upsertPosition(f.positions, p.id, position),
  }));
  const releasePosition = (p) => patch((f) => ({ positions: clearPosition(f.positions, p.id) }));

  // -------------------------------------------------------------------------
  // Save / draft / publish
  //
  // A NEW rule is created live (as before). An EXISTING rule is edited as a
  // DRAFT: "Save draft" stages it (optionally with a go-live and revert
  // date), "Publish & sync" makes it live and pushes to Shopify. The live
  // order never changes just because someone was editing.
  // -------------------------------------------------------------------------
  const [publishing, setPublishing] = useState(false);

  const create = async () => {
    if (problems.length) { toast.error(problems[0].msg); return; }
    setSaving(true);
    try {
      const res = await fetch(baseUrl + API + '/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Smart sort created — use Sync now to push the order to Shopify');
        onSaved();
      } else toast.error(data.error || 'Failed to save');
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setSaving(false);
    }
  };

  const draftBody = () => ({
    ...buildBody(),
    label: form.versionLabel,
    goLiveAt: form.goLiveAt ? new Date(form.goLiveAt).toISOString() : null,
    revertAt: form.revertAt ? new Date(form.revertAt).toISOString() : null,
  });

  const saveDraft = async ({ silent } = {}) => {
    if (problems.length) { toast.error(problems[0].msg); return false; }
    setSaving(true);
    try {
      const res = await fetch(baseUrl + API + '/rules/' + rule._id + '/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftBody()),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (!silent) {
          toast.success(form.goLiveAt
            ? 'Draft saved — it goes live automatically on ' + formatDateTime(form.goLiveAt)
            : 'Draft saved — the live order is unchanged until you publish');
          onSaved();
        }
        return true;
      }
      toast.error(data.error || 'Failed to save the draft');
      return false;
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    if (problems.length) { toast.error(problems[0].msg); return; }
    setPublishing(true);
    try {
      const ok = await saveDraft({ silent: true });
      if (!ok) return;
      const res = await fetch(baseUrl + API + '/rules/' + rule._id + '/draft/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Published — the new order is syncing to Shopify now'
          + (form.revertAt ? '. It reverts automatically on ' + formatDateTime(form.revertAt) : ''));
        onSaved();
      } else toast.error(data.error || 'Failed to publish');
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setPublishing(false);
    }
  };

  const discardDraft = async () => {
    if (!window.confirm('Discard this draft? The editor reloads the live configuration.')) return;
    try {
      const res = await fetch(baseUrl + API + '/rules/' + rule._id + '/draft', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Draft discarded');
        setForm(ruleToForm(data.rule));
      } else toast.error(data.error || 'Failed to discard the draft');
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    }
  };

  const productsCount = form.collectionProductsCount;

  // =========================================================================
  return (
    <div className='max-w-[1600px] mx-auto px-8 py-8 pb-40 min-[1100px]:pb-8'>
      {/* ---------------- Sticky action bar ---------------- */}
      <div className='sticky top-0 z-40 -mx-8 px-8 py-4 bg-zinc-50/90 backdrop-blur border-b border-zinc-100 mb-6'>
        <div className='flex items-center gap-4'>
          <button
            type='button'
            onClick={onCancel}
            className='flex items-center gap-1.5 text-zinc-500 hover:text-black text-[11px] font-bold uppercase tracking-widest shrink-0'
          >
            <ArrowLeft size={14} /> All collections
          </button>

          <div className='flex-1 min-w-0'>
            <h1 className='text-lg font-bold text-zinc-900 truncate'>
              {editing ? 'Edit smart sort' : 'New smart sort'}
              {form.collectionTitle && <span className='text-zinc-400 font-normal'> — {form.collectionTitle}</span>}
            </h1>
          </div>

          {problems.length > 0 && (
            <span className='hidden xl:flex items-center gap-1.5 text-[11px] text-amber-600 max-w-sm truncate'>
              <AlertTriangle size={12} className='shrink-0' /> {problems[0].msg}
            </span>
          )}

          {editing ? (
            <>
              <button
                type='button'
                onClick={() => saveDraft()}
                disabled={saving || publishing || problems.length > 0}
                title={problems.length ? problems[0].msg : 'Stage this change without touching the live order'}
                className='bg-white border border-zinc-300 text-zinc-700 px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:border-black hover:text-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0'
              >
                {saving && !publishing && <Loader2 size={13} className='animate-spin' />}
                <FileClock size={13} /> Save draft
              </button>
              <button
                type='button'
                onClick={publishNow}
                disabled={saving || publishing || problems.length > 0}
                title={problems.length ? problems[0].msg : 'Make this live and push the order to Shopify'}
                className='bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0'
              >
                {publishing ? <Loader2 size={13} className='animate-spin' /> : <Send size={13} />}
                Publish &amp; sync
              </button>
            </>
          ) : (
            <button
              type='button'
              onClick={create}
              disabled={saving || problems.length > 0}
              title={problems.length ? problems[0].msg : ''}
              className='bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0'
            >
              {saving && <Loader2 size={13} className='animate-spin' />}
              Create smart sort
            </button>
          )}
        </div>
      </div>

      {/* Draft banner — the editor loaded staged changes, not what is live. */}
      {form.fromDraft && (
        <div className='mb-6'>
          <Note kind='warn'>
            You are editing a <b>draft</b> saved {formatDateTime(form.draftSavedAt)} — the live order on Shopify has
            not changed. Publish it (or let its schedule publish it), or{' '}
            <button type='button' onClick={discardDraft} className='underline font-bold hover:no-underline'>
              discard the draft
            </button>{' '}
            to go back to the live configuration.
          </Note>
        </div>
      )}

      {/* ---------------- Plain-English read-back ---------------- */}
      <div className='bg-white border border-zinc-100 rounded-[1.75rem] shadow-sm px-6 py-5 mb-6'>
        <span className={labelCls}>In plain English</span>
        <div className='mt-2'>
          <RuleSentence form={form} productsCount={productsCount} sortKeys={meta.sortKeys} />
        </div>
      </div>

      <div className='grid grid-cols-1 min-[1100px]:grid-cols-5 gap-6'>
        {/* =================== LEFT: configuration =================== */}
        <div className='min-[1100px]:col-span-3 space-y-5'>

          {/* ---------- 1 · Which collection ---------- */}
          <Section
            n={1}
            title={isAll ? 'Which collections' : 'Which collection page'}
            blurb={isAll
              ? 'One ordering strategy for every collection in the store.'
              : 'The Shopify collection whose product order this rule owns.'}
            status={problemsAt(1).length
              ? { label: 'Needs attention', cls: 'text-amber-600 bg-amber-50' }
              : { label: isAll ? 'All collections' : form.collectionHandle, cls: 'text-emerald-600 bg-emerald-50' }}
          >
            {/* Scope — the first real decision, fixed after creation. */}
            {!editing && (
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {[
                  { key: 'collection', icon: FolderOpen, label: 'One collection', blurb: 'Order a single collection page, with pins, demotions and hand-placement.' },
                  { key: 'all', icon: Globe, label: 'All collections', blurb: (meta.totalCollections ? '≈' + meta.totalCollections + ' collections. ' : '') + 'One strategy everywhere; collections with their own rule keep it.' },
                ].map(({ key, icon: Icon, label, blurb }) => {
                  const on = form.scope === key;
                  return (
                    <button
                      key={key}
                      type='button'
                      onClick={() => patch({ scope: key })}
                      className={'text-left px-4 py-3 rounded-2xl border transition-colors ' +
                        (on ? 'border-black bg-zinc-50 ring-1 ring-black' : 'border-zinc-200 hover:border-zinc-300')}
                    >
                      <span className='flex items-center gap-2'>
                        <Icon size={13} className={on ? 'text-black' : 'text-zinc-400'} />
                        <span className='text-xs font-bold text-zinc-800'>{label}</span>
                        {on && <Check size={12} className='ml-auto text-black' />}
                      </span>
                      <span className='block text-[11px] text-zinc-400 mt-1 leading-snug'>{blurb}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {isAll ? (
              <>
                <div className='flex items-start gap-3 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3'>
                  <Globe size={15} className='text-zinc-400 mt-0.5 shrink-0' />
                  <div>
                    <div className='text-xs font-bold text-zinc-800'>
                      Every collection{meta.totalCollections ? ' — ≈' + meta.totalCollections + ' with products' : ''}
                    </div>
                    <div className='text-[11px] text-zinc-400 mt-0.5'>
                      Collections that have their own smart sort are skipped — a specific rule always beats this one.
                      Percentages scale per collection, so &ldquo;first 20%&rdquo; means 20% of each page.
                    </div>
                  </div>
                </div>
                <Note kind='warn'>
                  The first global sync switches <b>every covered collection</b> to manual sorting in Shopify and can
                  run for a long time (it works through the store collection by collection — watch progress under
                  Activity). Shopify stops re-sorting them from then on; this rule takes over daily.
                </Note>

                {/* The sample the right-hand preview computes against. */}
                <div>
                  <label className={labelCls}>Preview with a sample collection</label>
                  {form.previewCollectionId ? (
                    <div className='mt-2 flex items-center justify-between bg-white border border-zinc-100 rounded-2xl px-4 py-3'>
                      <div className='text-sm font-bold text-zinc-800 truncate'>{form.previewCollectionTitle}</div>
                      <button
                        type='button'
                        onClick={() => patch({ previewCollectionId: '', previewCollectionTitle: '' })}
                        className='text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-black shrink-0'
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className='relative mt-2'>
                      <Search size={14} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none' />
                      {collBusy && <Loader2 size={13} className='absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-zinc-300' />}
                      <input
                        className={fieldCls + ' pl-9'}
                        placeholder='Search a collection to preview the strategy on...'
                        value={collQuery}
                        onChange={(e) => setCollQuery(e.target.value)}
                      />
                      {collResults.length > 0 && (
                        <div className='absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto'>
                          {collResults.map((c) => (
                            <button
                              key={c.id}
                              type='button'
                              className='w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex items-center justify-between gap-3'
                              onClick={() => {
                                patch({ previewCollectionId: c.id, previewCollectionTitle: c.title });
                                setCollQuery(''); setCollResults([]);
                              }}
                            >
                              <span className='text-xs font-medium text-zinc-700 truncate'>{c.title}</span>
                              <span className='text-[10px] text-zinc-400 shrink-0'>{c.productsCount} products</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className='text-[11px] text-zinc-400 mt-1.5'>
                    The preview on the right shows how this strategy orders the sample — the same rules apply to every
                    collection, scaled to its size.
                  </p>
                </div>
              </>
            ) : form.collectionId ? (
              <div className='flex items-center justify-between bg-white border border-zinc-100 rounded-2xl px-4 py-3'>
                <div className='min-w-0'>
                  <div className='text-sm font-bold text-zinc-800 truncate'>{form.collectionTitle}</div>
                  <div className='text-[10px] text-zinc-400 font-mono'>
                    {form.collectionHandle}
                    {productsCount != null && <span> · {productsCount} products</span>}
                    {form.collectionSortOrder && <span> · currently sorted: {String(form.collectionSortOrder).toLowerCase().replace(/_/g, ' ')}</span>}
                  </div>
                </div>
                {!editing && (
                  <button
                    type='button'
                    onClick={() => patch({ collectionId: '', collectionHandle: '', collectionTitle: '', collectionProductsCount: null, collectionSortOrder: null })}
                    className='text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-black shrink-0'
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div className='relative'>
                <Search size={14} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none' />
                {collBusy && <Loader2 size={13} className='absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-zinc-300' />}
                <input
                  className={fieldCls + ' pl-9'}
                  placeholder='Search collections by name...'
                  value={collQuery}
                  onChange={(e) => setCollQuery(e.target.value)}
                />
                {collResults.length > 0 && (
                  <div className='absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto'>
                    {collResults.map((c) => (
                      <button
                        key={c.id}
                        type='button'
                        className='w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex items-center justify-between gap-3'
                        onClick={() => {
                          patch({
                            collectionId: c.id,
                            collectionHandle: c.handle,
                            collectionTitle: c.title,
                            collectionProductsCount: c.productsCount,
                            collectionSortOrder: c.sortOrder,
                          });
                          setCollQuery(''); setCollResults([]);
                        }}
                      >
                        <span className='text-xs font-medium text-zinc-700 truncate'>{c.title}</span>
                        <span className='text-[10px] text-zinc-400 shrink-0'>{c.productsCount} products</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {form.collectionId && form.collectionSortOrder && form.collectionSortOrder !== 'MANUAL' && (
              <Note>
                This collection is currently sorted by <b>{String(form.collectionSortOrder).toLowerCase().replace(/_/g, ' ')}</b> in
                Shopify. The first sync switches it to <b>manual</b> so the order below can be written; Shopify stops
                re-sorting it from then on, and this rule takes over.
              </Note>
            )}
            {!isAll && (
              <Note>
                Only collections with a smart sort here are ever touched — every other collection keeps its normal
                Shopify ordering. Deleting this rule stops the daily sync but leaves the last pushed order in place.
              </Note>
            )}

            {problemsAt(1).map((p, i) => <Note key={i} kind='warn'>{p.msg}</Note>)}
          </Section>

          {/* ---------- 2 · The order plan ---------- */}
          <Section
            n={2}
            title='The order plan'
            blurb='Percentage slots filled top-down, then how the rest is ordered.'
            status={problemsAt(2).length
              ? { label: 'Needs attention', cls: 'text-amber-600 bg-amber-50' }
              : { label: total + '% in slots', cls: 'text-emerald-600 bg-emerald-50' }}
          >
            <div>
              <div className='flex items-center justify-between mb-2'>
                <label className={labelCls}>The collection, front to back</label>
                <span className={'text-[10px] font-bold ' + (total > 100 ? 'text-rose-500' : 'text-zinc-400')}>
                  {total}% claimed · {Math.max(0, 100 - total)}% remaining
                </span>
              </div>
              <PercentBar slots={form.slots} />
            </div>

            <div className='space-y-3'>
              {form.slots.map((slot, i) => {
                const approx = productsCount ? Math.round(((Number(slot.sizePercent) || 0) / 100) * productsCount) : null;
                return (
                  // No overflow-hidden on the card: the condition dropdowns
                  // inside must be able to extend past it.
                  <div key={i} className='bg-white border border-zinc-100 rounded-2xl shadow-sm'>
                    <div className='px-4 py-3 bg-zinc-50/60 border-b border-zinc-100 space-y-2.5 rounded-t-2xl'>
                      <div className='flex items-center gap-2.5'>
                        <span className={'w-2.5 h-6 rounded-sm shrink-0 ' + SLOT_COLORS[i % SLOT_COLORS.length]} />
                        <span className='text-[10px] font-black uppercase tracking-widest text-zinc-400 shrink-0'>
                          {i === 0 ? 'First' : 'Next'}
                        </span>
                        <input
                          type='number' min='1' max='100'
                          className={smallFieldCls + ' w-16 text-center font-bold'}
                          value={slot.sizePercent}
                          onChange={(e) => setSlot(i, { sizePercent: e.target.value === '' ? '' : Number(e.target.value) })}
                        />
                        <span className='text-[10px] font-black uppercase tracking-widest text-zinc-400 shrink-0'>
                          %{approx != null && <span className='font-bold text-zinc-300'> ≈{approx}</span>}
                        </span>
                        <input
                          className={smallFieldCls + ' flex-1 min-w-0 font-bold'}
                          placeholder={'Slot ' + (i + 1) + ' name — e.g. "In stock bestsellers"'}
                          value={slot.label}
                          onChange={(e) => setSlot(i, { label: e.target.value })}
                        />
                        {/* Slot order IS the strategy — earlier slots pick
                            first — so reordering must not mean rebuilding. */}
                        <button
                          type='button'
                          disabled={i === 0}
                          title='Move this slot earlier — it will pick its products first'
                          onClick={() => patch((f) => {
                            const slots = [...f.slots];
                            [slots[i - 1], slots[i]] = [slots[i], slots[i - 1]];
                            return { slots };
                          })}
                          className='text-zinc-300 hover:text-black disabled:opacity-20 shrink-0'
                        >
                          <MoveUp size={14} />
                        </button>
                        <button
                          type='button'
                          disabled={i === form.slots.length - 1}
                          title='Move this slot later'
                          onClick={() => patch((f) => {
                            const slots = [...f.slots];
                            [slots[i], slots[i + 1]] = [slots[i + 1], slots[i]];
                            return { slots };
                          })}
                          className='text-zinc-300 hover:text-black disabled:opacity-20 shrink-0'
                        >
                          <MoveDown size={14} />
                        </button>
                        <button
                          type='button'
                          onClick={() => patch((f) => ({ slots: f.slots.filter((_, idx) => idx !== i) }))}
                          className='text-zinc-300 hover:text-rose-500 shrink-0'
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className='text-[10px] text-zinc-400 uppercase font-bold'>Ranked by</span>
                        <SortByPicker
                          value={slot.sortBy}
                          onChange={(sortBy) => setSlot(i, { sortBy })}
                          sortKeys={meta.sortKeys}
                          weightableKeys={meta.weightableKeys}
                        />
                      </div>
                    </div>

                    <div className='px-4 py-3 space-y-2'>
                      {slot.conditions.map((cond, j) => (
                        <ConditionRow
                          key={j}
                          prefix={j === 0 ? 'When' : 'and'}
                          cond={cond}
                          attributes={attrs}
                          allowDynamic={false}
                          onChange={(c) => setSlot(i, { conditions: slot.conditions.map((x, idx) => (idx === j ? c : x)) })}
                          onRemove={() => setSlot(i, { conditions: slot.conditions.filter((_, idx) => idx !== j) })}
                        />
                      ))}
                      {slot.conditions.length === 0 && (
                        <p className='text-[11px] text-zinc-400'>
                          No conditions — any product qualifies and the ranking above decides who takes these positions.
                        </p>
                      )}
                      <details className='pt-1'>
                        <summary className='text-[10px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-black inline-flex items-center gap-1'>
                          <Plus size={11} /> Add condition
                        </summary>
                        <div className='mt-2'>
                          <AttributeChips attributes={attrs} allowDynamic={false} onAdd={(c) => setSlot(i, { conditions: [...slot.conditions, c] })} viewsNote={viewsNote} />
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type='button'
              onClick={() => patch((f) => ({ slots: [...f.slots, NEW_SLOT()] }))}
              className='bg-white border border-dashed border-zinc-300 text-zinc-500 px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:border-black hover:text-black transition-colors'
            >
              <Plus size={13} /> Add slot
            </button>

            {/* Remainder */}
            <div className='bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3.5'>
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='w-2.5 h-6 rounded-sm bg-zinc-300 shrink-0' />
                <span className='text-xs font-bold text-zinc-800'>Everything else</span>
                <span className='text-[10px] text-zinc-400'>({Math.max(0, 100 - total)}% of the collection)</span>
                <span className='text-[10px] text-zinc-400 uppercase font-bold ml-2'>ordered by</span>
                <SortByPicker
                  value={form.remainderSortBy}
                  onChange={(remainderSortBy) => patch({ remainderSortBy })}
                  sortKeys={meta.sortKeys}
                  weightableKeys={meta.weightableKeys}
                />
              </div>
              <p className='text-[11px] text-zinc-400 mt-1.5'>
                &ldquo;Current Shopify order&rdquo; keeps their existing sequence — it also means the fewest position
                changes per sync.
              </p>
            </div>

            {/* Guardrail */}
            <div className='flex items-start gap-3 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3.5'>
              <Toggle checked={form.oosToEnd} onChange={() => patch((f) => ({ oosToEnd: !f.oosToEnd }))} />
              <div>
                <div className='text-xs font-bold text-zinc-800'>Push out-of-stock products to the end</div>
                <p className='text-[11px] text-zinc-400 mt-0.5'>
                  Unbuyable products skip every slot and sit at the back of the collection, whatever their metrics say.
                </p>
              </div>
            </div>

            {problemsAt(2).map((p, i) => <Note key={i} kind='warn'>{p.msg}</Note>)}
          </Section>

          {/* ---------- 3 · Pins & demotions (per-collection rules only:
               product-level curation is meaningless across the whole store) ---------- */}
          {!isAll && (
          <Section
            n={3}
            title='Hand-picked exceptions'
            blurb='Pins take the very first positions, demoted products go to the very end, and hand-placed products hold an exact position — everything else stays automated.'
            defaultOpen={form.pinned.length > 0 || form.removed.length > 0 || form.positions.length > 0}
            status={{
              label: form.pinned.length + ' pinned · ' + form.removed.length + ' demoted' +
                (form.positions.length ? ' · ' + form.positions.length + ' hand-placed' : ''),
              cls: 'text-zinc-500 bg-zinc-100',
            }}
          >
            <div>
              <div className='flex items-center justify-between'>
                <label className={labelCls}>Pinned to the top</label>
                <span className='text-[10px] text-zinc-400'>shown in this order, before every slot</span>
              </div>
              {form.pinned.length > 0 && (
                <div className='mt-2 space-y-1.5'>
                  {form.pinned.map((p, i) => (
                    <ProductRow key={p.id} product={p} index={i + 1} onRemove={() => togglePin(p)} />
                  ))}
                </div>
              )}
              <div className='mt-2'>
                <ProductSearch
                  icon={Pin}
                  placeholder='Search a product to pin...'
                  exclude={form.pinned.map((p) => p.id)}
                  onPick={togglePin}
                />
              </div>
              <p className='text-[11px] text-zinc-400 mt-1.5'>
                Tip: hover any tile in the curate preview to pin, demote or hand-place it in position.
              </p>
            </div>

            <div>
              <div className='flex items-center justify-between'>
                <label className={labelCls}>Moved to the end</label>
                <span className='text-[10px] text-zinc-400'>membership stays with Shopify&apos;s collection rules</span>
              </div>
              {form.removed.length > 0 && (
                <div className='mt-2 space-y-1.5'>
                  {form.removed.map((p) => (
                    <ProductRow key={p.id} product={p} onRemove={() => toggleRemove(p)} />
                  ))}
                </div>
              )}
              <div className='mt-2'>
                <ProductSearch
                  icon={CornerRightDown}
                  placeholder='Search a product to move to the end...'
                  exclude={form.removed.map((p) => p.id)}
                  onPick={toggleRemove}
                />
              </div>
            </div>

            {/* Hand-placed positions are only ever created by moving a tile in
                the curate preview, so this list is a review-and-release view,
                not another picker. */}
            {form.positions.length > 0 && (
              <div>
                <div className='flex items-center justify-between'>
                  <label className={labelCls}>Hand-placed positions</label>
                  <button
                    type='button'
                    onClick={() => patch({ positions: [] })}
                    className='text-[10px] font-bold text-zinc-400 hover:text-rose-500'
                  >
                    Release all
                  </button>
                </div>
                <div className='mt-2 space-y-1.5'>
                  {[...form.positions].sort((a, b) => a.position - b.position).map((e) => {
                    const p = previewById.get(e.id);
                    return (
                      <div key={e.id} className='flex items-center gap-2.5 px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl'>
                        <span className='min-w-7 text-center text-[10px] font-black text-white bg-zinc-900 rounded-md px-1 py-0.5'>
                          #{e.position}
                        </span>
                        {p?.image
                          ? <img src={p.image} alt='' className='w-7 h-7 rounded-lg object-cover shrink-0' />
                          : <span className='w-7 h-7 rounded-lg bg-zinc-100 shrink-0' />}
                        <span className='flex-1 min-w-0 text-[11px] text-zinc-700 truncate'>
                          {p?.title || String(e.id).split('/').pop()}
                        </span>
                        {p && (
                          <span className='text-[10px] text-zinc-400 shrink-0'>rules say #{p.autoPosition}</span>
                        )}
                        <button
                          type='button'
                          onClick={() => releasePosition({ id: e.id })}
                          title='Release — let the rules place it again'
                          className='text-zinc-400 hover:text-rose-500 shrink-0'
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <p className='text-[11px] text-zinc-400 mt-1.5'>
                  These positions are held whatever the rules compute. Everything else keeps flowing with the slots.
                </p>
              </div>
            )}
          </Section>
          )}

          {/* ---------- 4 · When it syncs ---------- */}
          <Section
            n={4}
            title='When it syncs'
            blurb='The order is recomputed and pushed to Shopify once a day, plus whenever you press Sync now.'
            defaultOpen={false}
            status={problemsAt(4).length
              ? { label: 'Needs attention', cls: 'text-amber-600 bg-amber-50' }
              : { label: 'Daily ' + form.scheduleTime + ' IST', cls: 'text-zinc-500 bg-zinc-100' }}
          >
            <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
              <div>
                <label className={labelCls}>Daily sync (IST)</label>
                <input type='time' className={fieldCls + ' mt-2'} value={form.scheduleTime} onChange={(e) => patch({ scheduleTime: e.target.value })} />
                <p className='text-[10px] text-zinc-400 mt-1'>
                  Views and stock move every day, so a daily re-sort keeps the page honest. New products entering the
                  collection are placed on the next sync.
                </p>
              </div>
              <div>
                <label className={labelCls}>Rule is live</label>
                <div className='mt-3'><Toggle checked={form.enabled} onChange={() => patch((f) => ({ enabled: !f.enabled }))} /></div>
                <p className='text-[10px] text-zinc-400 mt-2'>Off keeps the rule but stops the daily sync. The last pushed order stays.</p>
              </div>
            </div>

            {/* Draft scheduling — only meaningful on an existing rule, where
                "Save draft" stages the change. The killer use: a festive
                ordering that goes live at midnight and reverts after the sale,
                with nobody awake for either. */}
            {editing && (
              <div className='border-t border-zinc-100 pt-4'>
                <label className={labelCls}>Schedule this change (optional)</label>
                <p className='text-[11px] text-zinc-400 mt-0.5 mb-3'>
                  Save as a draft and it goes live by itself at the date you set — and can revert to the current
                  order afterwards. Leave empty to publish by hand.
                </p>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div>
                    <label className='text-[10px] font-bold uppercase tracking-wider text-zinc-400'>Name this version</label>
                    <input
                      className={smallFieldCls + ' w-full mt-1.5'}
                      placeholder='e.g. "Diwali ordering"'
                      value={form.versionLabel}
                      onChange={(e) => patch({ versionLabel: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className='text-[10px] font-bold uppercase tracking-wider text-zinc-400'>Goes live</label>
                    <input
                      type='datetime-local'
                      className={smallFieldCls + ' w-full mt-1.5'}
                      value={form.goLiveAt}
                      onChange={(e) => patch({ goLiveAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className='text-[10px] font-bold uppercase tracking-wider text-zinc-400'>Revert to today&apos;s order on</label>
                    <input
                      type='datetime-local'
                      className={smallFieldCls + ' w-full mt-1.5'}
                      value={form.revertAt}
                      onChange={(e) => patch({ revertAt: e.target.value })}
                    />
                  </div>
                </div>
                {form.goLiveAt && (
                  <p className='text-[11px] text-emerald-600 mt-2'>
                    Saving the draft schedules it: live {formatDateTime(form.goLiveAt)}
                    {form.revertAt ? ', back to the previous order ' + formatDateTime(form.revertAt) : ''}.
                  </p>
                )}
              </div>
            )}

            {problemsAt(4).map((p, i) => <Note key={i} kind='warn'>{p.msg}</Note>)}
          </Section>
        </div>

        {/* =================== RIGHT: curate preview =================== */}
        <div className='min-[1100px]:col-span-2'>
          <div className={'bg-white border border-zinc-100 shadow-sm overflow-hidden ' +
            'min-[1100px]:sticky min-[1100px]:top-[92px] min-[1100px]:rounded-[1.75rem] ' +
            // left-72 mirrors the fixed sidebar width, same as the reco editor.
            'max-[1099px]:fixed max-[1099px]:bottom-0 max-[1099px]:left-72 max-[1099px]:right-0 ' +
            'max-[1099px]:z-40 max-[1099px]:rounded-t-[1.75rem] max-[1099px]:shadow-2xl'}>
            <div className='px-5 py-4 border-b border-zinc-100 bg-zinc-50/50'>
              <div className='flex items-center gap-2'>
                <Eye size={14} className='text-zinc-400' />
                <span className='text-xs font-bold text-zinc-800'>Curate preview</span>
                {previewBusy && <Loader2 size={12} className='animate-spin text-zinc-300' />}
                <button
                  type='button'
                  onClick={loadPreview}
                  disabled={!runnable || previewBusy}
                  title='Recompute now'
                  className='ml-auto text-zinc-400 hover:text-black disabled:opacity-30'
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  type='button'
                  onClick={() => setRailOpen((o) => !o)}
                  title={railOpen ? 'Collapse preview' : 'Expand preview'}
                  className='min-[1100px]:hidden text-zinc-400 hover:text-black'
                >
                  <ChevronUp size={15} className={'transition-transform ' + (railOpen ? '' : 'rotate-180')} />
                </button>
              </div>
              <p className={'text-[11px] text-zinc-400 mt-1 ' + (railOpen ? '' : 'max-[1099px]:hidden')}>
                The exact order the next sync pushes to Shopify, computed from the unsaved draft. Hover a tile to pin
                or demote. Nothing is written until you save and sync.
              </p>
              <div className='mt-3'><PercentBar slots={form.slots} compact /></div>
            </div>

            <div className={'px-5 py-5 overflow-y-auto custom-scrollbar ' +
              'min-[1100px]:max-h-[calc(100vh-260px)] max-[1099px]:max-h-[55vh] ' +
              (railOpen ? '' : 'max-[1099px]:hidden')}>
              {!runnable ? (
                <div className='text-center py-12 px-2'>
                  <Info size={22} className='mx-auto text-zinc-200 mb-3' />
                  <p className='text-[11px] text-zinc-400'>
                    {problems[0]?.msg || 'Finish the sections on the left to see the computed order.'}
                  </p>
                </div>
              ) : (
                <div className='relative'>
                  {previewBusy && preview && (
                    <div className='absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-start justify-center pt-10'>
                      <span className='flex flex-col items-center gap-1.5 text-[11px] font-bold text-zinc-500 bg-white border border-zinc-200 rounded-2xl px-3.5 py-2 shadow-sm max-w-[15rem] text-center'>
                        <span className='flex items-center gap-2'><Loader2 size={11} className='animate-spin' /> Updating</span>
                        {previewSlow && (
                          <span className='font-normal text-zinc-400 leading-snug'>
                            First run since the server restarted — rebuilding the catalogue and analytics. Later
                            previews are near-instant.
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className={previewBusy && preview ? 'opacity-60' : ''}>
                    <CuratePreview
                      dense
                      preview={preview}
                      loading={previewBusy && !preview}
                      slow={previewSlow}
                      error={previewError}
                      pinnedIds={form.pinned.map((p) => p.id)}
                      removedIds={form.removed.map((p) => p.id)}
                      positions={form.positions}
                      onPin={isAll ? undefined : togglePin}
                      onRemove={isAll ? undefined : toggleRemove}
                      onMove={isAll ? undefined : movePosition}
                      onRelease={isAll ? undefined : releasePosition}
                      emptyHint={isAll
                        ? 'Pick a sample collection in section 1 to see how this strategy orders it.'
                        : 'Pick a collection in section 1 to see its computed order.'}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
