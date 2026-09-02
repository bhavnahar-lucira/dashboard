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
  AlertTriangle, Eye, RefreshCw, Info, ChevronUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  baseUrl, API, emptyForm, ruleToForm, percentTotal, PercentBar, RuleSentence,
  ConditionRow, AttributeChips, Toggle, ProductSearch, ProductRow, Section, Note,
  NEW_SLOT, SLOT_COLORS, fieldCls, smallFieldCls, labelCls,
  upsertPosition, clearPosition,
} from './_shared';
import { CuratePreview } from './_preview';

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
  const problems = useMemo(() => {
    const out = [];
    if (!form.collectionId) out.push({ at: 1, msg: 'Pick the Shopify collection to order.' });
    if (form.slots.some((s) => {
      const pct = Number(s.sizePercent);
      return !Number.isFinite(pct) || pct < 1 || pct > 100;
    })) out.push({ at: 2, msg: 'Every slot needs a size between 1% and 100%.' });
    if (total > 100) out.push({ at: 2, msg: 'Slots claim ' + total + '% — the collection only has 100%.' });
    if (!/^\d{2}:\d{2}$/.test(form.scheduleTime)) out.push({ at: 4, msg: 'Daily sync time must be HH:mm.' });
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
    collectionId: form.collectionId,
    collectionHandle: form.collectionHandle,
    collectionTitle: form.collectionTitle,
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
    collectionId: form.collectionId,
    slots: form.slots.map((s) => ({ sizePercent: s.sizePercent, conditions: s.conditions, sortBy: s.sortBy })),
    remainderSortBy: form.remainderSortBy,
    pinned: form.pinned.map((p) => p.id),
    removed: form.removed.map((p) => p.id),
    oosToEnd: form.oosToEnd,
  });

  const runnable = problems.filter((p) => p.at !== 4).length === 0;

  const loadPreview = useCallback(async () => {
    const seq = ++previewSeq.current;
    setPreviewBusy(true);
    setPreviewError(null);
    setPreviewSlow(false);
    const slowTimer = setTimeout(() => {
      if (seq === previewSeq.current) setPreviewSlow(true);
    }, 5000);
    try {
      const res = await fetch(baseUrl + API + '/preview-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
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
  // Save
  // -------------------------------------------------------------------------
  const save = async () => {
    if (problems.length) { toast.error(problems[0].msg); return; }
    setSaving(true);
    try {
      const url = editing ? baseUrl + API + '/rules/' + rule._id : baseUrl + API + '/rules';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(editing
          ? 'Smart sort updated — use Sync now to push the order to Shopify'
          : 'Smart sort created — use Sync now to push the order to Shopify');
        onSaved();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setSaving(false);
    }
  };

  const remainderKey = form.remainderSortBy[0]?.key || 'current';
  const remainderDef = meta.sortKeys.find((sk) => sk.key === remainderKey);
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

          <button
            type='button'
            onClick={save}
            disabled={saving || problems.length > 0}
            title={problems.length ? problems[0].msg : ''}
            className='bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0'
          >
            {saving && <Loader2 size={13} className='animate-spin' />}
            {editing ? 'Save changes' : 'Create smart sort'}
          </button>
        </div>
      </div>

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
            title='Which collection page'
            blurb='The Shopify collection whose product order this rule owns.'
            status={problemsAt(1).length
              ? { label: 'Needs attention', cls: 'text-amber-600 bg-amber-50' }
              : { label: form.collectionHandle, cls: 'text-emerald-600 bg-emerald-50' }}
          >
            {form.collectionId ? (
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
            <Note>
              Only collections with a smart sort here are ever touched — every other collection keeps its normal
              Shopify ordering. Deleting this rule stops the daily sync but leaves the last pushed order in place.
            </Note>

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
                        <select
                          className={smallFieldCls}
                          value={slot.sortBy[0]?.key || 'views_30d'}
                          onChange={(e) => setSlot(i, { sortBy: [{ key: e.target.value, dir: slot.sortBy[0]?.dir || 'desc' }] })}
                        >
                          {meta.sortKeys.map((sk) => <option key={sk.key} value={sk.key}>{sk.label}</option>)}
                        </select>
                        {meta.sortKeys.find((sk) => sk.key === (slot.sortBy[0]?.key || 'views_30d'))?.directional && (
                          <select
                            className={smallFieldCls}
                            value={slot.sortBy[0]?.dir || 'desc'}
                            onChange={(e) => setSlot(i, { sortBy: [{ key: slot.sortBy[0]?.key || 'views_30d', dir: e.target.value }] })}
                          >
                            <option value='desc'>High to low</option>
                            <option value='asc'>Low to high</option>
                          </select>
                        )}
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
                <select
                  className={smallFieldCls}
                  value={remainderKey}
                  onChange={(e) => patch({ remainderSortBy: [{ key: e.target.value, dir: form.remainderSortBy[0]?.dir || 'desc' }] })}
                >
                  {meta.sortKeys.map((sk) => <option key={sk.key} value={sk.key}>{sk.label}</option>)}
                </select>
                {remainderDef?.directional && (
                  <select
                    className={smallFieldCls}
                    value={form.remainderSortBy[0]?.dir || 'desc'}
                    onChange={(e) => patch({ remainderSortBy: [{ key: remainderKey, dir: e.target.value }] })}
                  >
                    <option value='desc'>High to low</option>
                    <option value='asc'>Low to high</option>
                  </select>
                )}
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

          {/* ---------- 3 · Pins & demotions ---------- */}
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
                      onPin={togglePin}
                      onRemove={toggleRemove}
                      onMove={movePosition}
                      onRelease={releasePosition}
                      emptyHint='Pick a collection in section 1 to see its computed order.'
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
