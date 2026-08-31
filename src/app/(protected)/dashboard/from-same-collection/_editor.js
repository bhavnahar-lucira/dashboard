'use client';

// The rule workbench.
//
// Replaces the old two-tab modal. Two things drove the shape:
//
//   1. CONFIG AND RESULT ON ONE SCREEN. The old editor was a modal and the
//      preview was a SEPARATE modal, so checking your work meant closing the
//      thing you were editing. Every "why isn't this an earring?" question came
//      from that gap. The right rail now previews the UNSAVED draft
//      (POST /preview-draft) as you type.
//   2. THREE SECTIONS, NOT SEVEN BLOCKS. Who gets recommendations / what gets
//      recommended / when it runs. Each collapses, each states what it is for,
//      and each carries its own status so nothing has to be remembered while
//      scrolling.
//
// Wording is deliberately plain: "groups" not sequences, "top up" not backfill,
// "pick from" not pool. The stored shape is unchanged — only the labels moved.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ArrowLeft, Loader2, Plus, Trash2, Search, Pin, Package, Layers,
  AlertTriangle, MoveUp, MoveDown, Check, Eye, RefreshCw, Info, ChevronUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  baseUrl, SCOPES, MODES, MAX_SLOTS, ALL_PRODUCTS_HANDLE, ALL_PRODUCTS_TITLE,
  emptyForm, ruleToForm, formMode, slotPlan, SlotMap, RuleSentence,
  ConditionRow, AttributeChips, Toggle, ProductSearch, ProductRow, Section, Note,
  ATTRIBUTE_LABELS, fieldCls, smallFieldCls, labelCls, formatINR,
} from './_shared';
import { PreviewPanel } from './_preview';

const NEW_GROUP = () => ({ size: 4, label: '', pool: 'collection', conditions: [], sortBy: [{ key: 'score', dir: 'desc' }] });

// One-switch shortcuts for the most-wanted shared conditions. Each manages a
// "<attr> matches source" entry in commonConditions, so it stays visible and
// editable in the list underneath and the two can never disagree.
//
// shop_for reads custom.shop_for ?? ornaverse.shop_for on each product
// (Men / Women / Unisex / Kids), which covers 99.7% of the live catalogue.
const MATCH_TOGGLES = [
  {
    attr: 'product_type',
    title: 'Recommend the same product type only',
    blurb: 'A ring page shows rings, an earring page shows earrings — one rule covers every category.',
  },
  {
    attr: 'shop_for',
    title: 'Recommend the same audience only',
    blurb: "A men's piece recommends men's, a women's piece recommends women's — read from each product's shop-for field.",
  },
];

export function RuleEditor({ rule, initialScope = 'collection', meta, viewsNote, onCancel, onSaved }) {
  const editing = Boolean(rule);

  const [form, setForm] = useState(() => (rule ? ruleToForm(rule) : {
    ...emptyForm(),
    scope: initialScope,
    priority: SCOPES[initialScope].priority,
    ...(initialScope === 'all' ? { collectionHandle: ALL_PRODUCTS_HANDLE, collectionTitle: ALL_PRODUCTS_TITLE } : {}),
  }));
  const [saving, setSaving] = useState(false);

  // Collection picker
  const [collQuery, setCollQuery] = useState('');
  const [collResults, setCollResults] = useState([]);
  const [collBusy, setCollBusy] = useState(false);

  // Scope count ("how many products does this rule cover")
  const [scope, setScope] = useState(null);
  const [scopeBusy, setScopeBusy] = useState(false);

  // Live draft preview (right rail)
  const [preview, setPreview] = useState([]);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [activeSource, setActiveSource] = useState(0);
  // Monotonic token instead of AbortController: aborting a fetch mid-flight
  // trips Next's dev instrumentation into reporting an unhandled AbortError
  // overlay, and cancelling buys little here (draft previews share the
  // backend's scan caches). A superseded request simply completes and its
  // response is ignored — which also fixes the race where the old request's
  // finally{} switched the busy indicator off under the new one.
  const previewSeq = useRef(0);
  // Narrow windows only: the rail becomes a bottom sheet, collapsed by default
  // so it never buries the configuration it is meant to sit beside.
  const [railOpen, setRailOpen] = useState(false);

  const attrs = meta.attributes;
  const plan = useMemo(() => slotPlan(form), [form]);
  const mode = formMode(form);
  const matchOn = (attr) => form.commonConditions.some((c) => c.attr === attr && c.op === 'matches_source');

  const patch = useCallback((p) => setForm((f) => ({ ...f, ...(typeof p === 'function' ? p(f) : p) })), []);
  const setGroup = (i, p) => setForm((f) => ({ ...f, sequences: f.sequences.map((s, idx) => (idx === i ? { ...s, ...p } : s)) }));

  // -------------------------------------------------------------------------
  // Validation — one list, surfaced next to the Save button AND at the section
  // it belongs to. A disabled button with no stated reason is a dead end.
  // -------------------------------------------------------------------------
  const problems = useMemo(() => {
    const out = [];
    if (form.scope === 'collection' && !form.collectionId) out.push({ at: 1, msg: 'Pick a Shopify collection.' });
    if (form.scope === 'product' && !form.sourceProducts.length) out.push({ at: 1, msg: 'Add at least one product this rule covers.' });
    if (!/^\d{2}:\d{2}$/.test(form.scheduleTime)) out.push({ at: 3, msg: 'Daily refresh time must be HH:mm.' });
    if (form.automatedEnabled && !form.sequences.length && !form.pinsGlobal.length) {
      out.push({ at: 2, msg: 'Add a recommendation group, or pin some products.' });
    }
    if (!form.automatedEnabled && !form.pinsGlobal.length) {
      out.push({ at: 2, msg: 'A hand-picked rule needs at least one pinned product.' });
    }
    if (form.sequences.some((s) => !parseInt(s.size, 10) || parseInt(s.size, 10) < 1)) {
      out.push({ at: 2, msg: 'Every group needs a slot count of 1 or more.' });
    }
    if (plan.over) out.push({ at: 2, msg: 'Pins plus group slots come to ' + plan.requested + ' — the grid only holds ' + MAX_SLOTS + '.' });
    for (const c of form.sourceConditions) {
      if (!c.attr || c.op === undefined) out.push({ at: 1, msg: 'Finish or remove the incomplete narrowing condition.' });
    }
    return out;
  }, [form, plan]);

  const problemsAt = (n) => problems.filter((p) => p.at === n);

  // -------------------------------------------------------------------------
  // Collection search
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (collQuery.trim().length < 2) { setCollResults([]); return; }
    const t = setTimeout(async () => {
      setCollBusy(true);
      try {
        const res = await fetch(baseUrl + '/api/recommendations/collections/search?q=' + encodeURIComponent(collQuery));
        const data = await res.json();
        if (data.success) setCollResults(data.collections || []);
      } catch (err) { console.error(err); }
      finally { setCollBusy(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [collQuery]);

  // -------------------------------------------------------------------------
  // Scope count
  // -------------------------------------------------------------------------
  const sourceConditionsKey = JSON.stringify(form.sourceConditions);
  const sourceProductsKey = JSON.stringify(form.sourceProducts.map((p) => p.id));

  useEffect(() => {
    if (form.scope === 'collection' && !form.collectionId) { setScope(null); return; }
    if (form.scope === 'product') {
      setScope({ count: form.sourceProducts.length, sample: form.sourceProducts });
      return;
    }
    const t = setTimeout(async () => {
      setScopeBusy(true);
      try {
        const res = await fetch(baseUrl + '/api/recommendations/preview-scope', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionId: form.scope === 'all' ? null : (form.collectionId || null),
            conditions: form.sourceConditions.filter((c) => c.attr && c.op),
          }),
        });
        const data = await res.json();
        setScope(data.success ? data : null);
      } catch (err) { console.error(err); setScope(null); }
      finally { setScopeBusy(false); }
    }, 700);
    return () => clearTimeout(t);
  }, [form.scope, form.collectionId, sourceProductsKey, sourceConditionsKey]);

  // -------------------------------------------------------------------------
  // The rule as the API wants it. Shared by the draft preview and by save, so
  // what the rail shows is computed from exactly what would be stored.
  // -------------------------------------------------------------------------
  const buildBody = useCallback(() => {
    const isAll = form.scope === 'all';
    const collectionId = isAll ? null : (form.collectionId || null);

    // A product rule has no collection, so it needs an identity of its own:
    // collectionHandle carries the unique index and doubles as the rule key.
    let handle = form.collectionHandle;
    let title = form.collectionTitle;
    if (form.scope === 'product' && !handle) {
      handle = 'products-' + form.sourceProducts.map((x) => x.id.split('/').pop()).join('-').slice(0, 60);
      title = form.sourceProducts.length === 1
        ? form.sourceProducts[0].title
        : form.sourceProducts.length + ' hand-picked products';
    }

    return {
      version: 2,
      collectionId,
      collectionHandle: handle,
      collectionTitle: title,
      enabled: form.enabled,
      priority: Number(form.priority) || 0,
      scheduleTime: form.scheduleTime,
      attributePriority: form.attributePriority,
      source: {
        collectionId,
        productIds: form.scope === 'product' ? form.sourceProducts.map((p) => p.id) : [],
        conditions: form.sourceConditions.filter((c) => c.attr && c.op),
      },
      commonConditions: form.commonConditions.filter((c) => c.attr && c.op),
      sequences: form.sequences.map((s) => ({
        size: parseInt(s.size, 10) || 1,
        label: s.label,
        pool: s.pool,
        conditions: s.conditions.filter((c) => c.attr && c.op),
        sortBy: s.sortBy,
      })),
      pins: {
        global: form.pinsGlobal.map((p) => p.id),
        perProduct: rule?.pins?.perProduct || {},
      },
      automatedEnabled: form.automatedEnabled,
      backfill: form.backfill,
    };
  }, [form, rule]);

  // -------------------------------------------------------------------------
  // Live draft preview
  //
  // Only the fields that change the OUTPUT are watched — retyping a group name
  // or nudging the schedule must not spend a catalogue scan.
  // -------------------------------------------------------------------------
  const previewKey = JSON.stringify({
    scope: form.scope,
    collectionId: form.collectionId,
    productIds: form.sourceProducts.map((p) => p.id),
    sourceConditions: form.sourceConditions,
    commonConditions: form.commonConditions,
    sequences: form.sequences.map((s) => ({ size: s.size, pool: s.pool, conditions: s.conditions, sortBy: s.sortBy })),
    pins: form.pinsGlobal.map((p) => p.id),
    automatedEnabled: form.automatedEnabled,
    backfill: form.backfill,
    attributePriority: form.attributePriority,
  });

  const runnable = problems.filter((p) => p.at !== 3).length === 0;

  // A context build costs seconds (catalogue scan + GA4 + popularity), so the
  // rail NEVER blanks to a spinner once it has something: the previous result
  // stays on screen under a dimming overlay and is replaced when the new one
  // lands. Blanking on every keystroke would make the rail unreadable.
  const loadPreview = useCallback(async () => {
    const seq = ++previewSeq.current;
    setPreviewBusy(true);
    setPreviewError(null);
    try {
      const body = { ...buildBody(), limit: 2 };
      if (!body.collectionHandle) body.collectionHandle = '__draft__';
      if (editing) body.excludeRuleId = rule._id;
      const res = await fetch(baseUrl + '/api/recommendations/preview-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (seq !== previewSeq.current) return; // superseded — a newer edit is being previewed
      if (res.ok && data.success) {
        const next = data.preview || [];
        setPreview(next);
        setActiveSource((i) => (i < next.length ? i : 0));
      } else {
        setPreview([]);
        setPreviewError(data.error || 'Preview failed.');
      }
    } catch (err) {
      if (seq !== previewSeq.current) return;
      setPreview([]);
      setPreviewError('Could not reach the server.');
    } finally {
      if (seq === previewSeq.current) setPreviewBusy(false);
    }
  }, [buildBody, editing, rule]);

  useEffect(() => {
    if (!runnable) { setPreview([]); setPreviewError(null); return; }
    // Long debounce on purpose: one preview is a multi-second catalogue pass,
    // so firing per keystroke would queue work nobody is waiting for.
    const t = setTimeout(loadPreview, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, runnable]);

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------
  const save = async () => {
    if (problems.length) { toast.error(problems[0].msg); return; }
    setSaving(true);
    try {
      const url = editing
        ? baseUrl + '/api/recommendations/rules/' + rule._id
        : baseUrl + '/api/recommendations/rules';
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody()),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(editing ? 'Rule updated' : 'Rule created');
        onSaved();
      } else {
        toast.error(data.error || 'Failed to save rule');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setSaving(false);
    }
  };

  const ModeIcon = mode.icon;
  const scopeCount = scope?.count ?? null;

  // =========================================================================
  return (
    // pb-40 below the two-column breakpoint leaves room for the bottom sheet.
    <div className='max-w-[1600px] mx-auto px-8 py-8 pb-40 min-[1100px]:pb-8'>
      {/* ---------------- Sticky action bar ---------------- */}
      <div className='sticky top-0 z-40 -mx-8 px-8 py-4 bg-zinc-50/90 backdrop-blur border-b border-zinc-100 mb-6'>
        <div className='flex items-center gap-4'>
          <button
            type='button'
            onClick={onCancel}
            className='flex items-center gap-1.5 text-zinc-500 hover:text-black text-[11px] font-bold uppercase tracking-widest shrink-0'
          >
            <ArrowLeft size={14} /> All rules
          </button>

          <div className='flex-1 min-w-0'>
            <h1 className='text-lg font-bold text-zinc-900 truncate'>
              {editing ? 'Edit rule' : 'New ' + SCOPES[form.scope].label.toLowerCase()}
              {form.collectionTitle && <span className='text-zinc-400 font-normal'> — {form.collectionTitle}</span>}
            </h1>
          </div>

          <span className={'flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ' + mode.cls}>
            <ModeIcon size={11} /> {mode.label}
          </span>

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
            {editing ? 'Save changes' : 'Create rule'}
          </button>
        </div>
      </div>

      {/* ---------------- Plain-English read-back ---------------- */}
      <div className='bg-white border border-zinc-100 rounded-[1.75rem] shadow-sm px-6 py-5 mb-6'>
        <div className='flex items-center gap-2 mb-2'>
          <span className={labelCls}>In plain English</span>
          {scopeBusy && <Loader2 size={11} className='animate-spin text-zinc-300' />}
        </div>
        <RuleSentence form={form} scopeCount={scopeCount} plan={plan} />
      </div>

      {/* Two columns from 1100px UP, not Tailwind's xl (1280px). Breakpoints are
          viewport-based but the sidebar is a fixed w-64, so xl left the rail
          stacked underneath on any window that was not near-maximised.

          And NO `items-start` here. A sticky child can only travel inside its
          containing block, and align-items:start shrinks the grid item to the
          rail's own height — zero slack, so the rail scrolled away instead of
          sticking. Grid's default `stretch` gives it the full row height. */}
      <div className='grid grid-cols-1 min-[1100px]:grid-cols-5 gap-6'>
        {/* =================== LEFT: configuration =================== */}
        <div className='min-[1100px]:col-span-3 space-y-5'>

          {/* ---------- 1 · Who ---------- */}
          <Section
            n={1}
            title='Who gets these recommendations'
            blurb='The products whose grid this rule fills in.'
            status={problemsAt(1).length
              ? { label: 'Needs attention', cls: 'text-amber-600 bg-amber-50' }
              : { label: (scopeCount ?? 0) + ' products', cls: 'text-emerald-600 bg-emerald-50' }}
          >
            <div className='flex items-start gap-3 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3'>
              <Layers size={15} className='text-zinc-400 mt-0.5 shrink-0' />
              <div>
                <div className='text-xs font-bold text-zinc-800'>{SCOPES[form.scope].label}</div>
                <div className='text-[11px] text-zinc-400'>{SCOPES[form.scope].blurb}</div>
              </div>
              <span className='ml-auto text-[10px] text-zinc-300 shrink-0'>fixed at creation</span>
            </div>

            {/* Collection picker */}
            {form.scope === 'collection' && (
              <div>
                <label className={labelCls}>Shopify collection</label>
                {form.collectionId ? (
                  <div className='mt-2 flex items-center justify-between bg-white border border-zinc-100 rounded-2xl px-4 py-3'>
                    <div className='min-w-0'>
                      <div className='text-sm font-bold text-zinc-800 truncate'>{form.collectionTitle}</div>
                      <div className='text-[10px] text-zinc-400 font-mono'>{form.collectionHandle}</div>
                    </div>
                    <button
                      type='button'
                      onClick={() => patch({ collectionId: '', collectionHandle: '', collectionTitle: '' })}
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
                              patch({ collectionId: c.id, collectionHandle: c.handle, collectionTitle: c.title });
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
              </div>
            )}

            {/* Explicit product list */}
            {form.scope === 'product' && (
              <div>
                <div className='flex items-center justify-between'>
                  <label className={labelCls}>Products this rule covers</label>
                  <span className='text-[10px] text-zinc-400'>{form.sourceProducts.length} selected</span>
                </div>
                {form.sourceProducts.length > 0 && (
                  <div className='mt-2 space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar'>
                    {form.sourceProducts.map((sp) => (
                      <ProductRow
                        key={sp.id}
                        product={sp}
                        onRemove={() => patch((f) => ({ sourceProducts: f.sourceProducts.filter((x) => x.id !== sp.id) }))}
                      />
                    ))}
                  </div>
                )}
                <div className='mt-2'>
                  <ProductSearch
                    placeholder='Search products to add...'
                    exclude={form.sourceProducts.map((p) => p.id)}
                    onPick={(p) => patch((f) => ({ sourceProducts: [...f.sourceProducts, p] }))}
                  />
                </div>
              </div>
            )}

            {/* Narrowing conditions */}
            <div>
              <label className={labelCls}>Narrow it down (optional)</label>
              <p className='text-[11px] text-zinc-400 mt-0.5 mb-2'>
                Only products matching ALL of these get recommendations. Everything else keeps whatever it already has.
              </p>
              <div className='space-y-2'>
                {form.sourceConditions.map((cond, i) => (
                  <ConditionRow
                    key={i}
                    prefix={i === 0 ? 'Only if' : 'and'}
                    cond={cond}
                    attributes={attrs}
                    allowDynamic={false}
                    onChange={(c) => patch((f) => ({ sourceConditions: f.sourceConditions.map((x, idx) => (idx === i ? c : x)) }))}
                    onRemove={() => patch((f) => ({ sourceConditions: f.sourceConditions.filter((_, idx) => idx !== i) }))}
                  />
                ))}
                {form.sourceConditions.length === 0 && (
                  <p className='text-[11px] text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl px-3.5 py-2.5'>
                    No conditions — {form.scope === 'all' ? 'every product in the store' : form.scope === 'product' ? 'every product you picked' : 'every product in the collection'} is covered.
                  </p>
                )}
              </div>
              <div className='mt-3'>
                <AttributeChips attributes={attrs} allowDynamic={false} onAdd={(c) => patch((f) => ({ sourceConditions: [...f.sourceConditions, c] }))} viewsNote={viewsNote} />
              </div>
            </div>

            {form.scope === 'all' && (
              <Note>
                Collection and product rules take their products back from this one, so the live total will be lower than
                the count above.
              </Note>
            )}

            {/* Scope sample */}
            {scope?.sample?.length > 0 && (
              <div>
                <div className='flex items-center gap-2 mb-2'>
                  <span className={labelCls}>In scope right now</span>
                  <span className='text-[10px] text-zinc-400'>{scope.count} products</span>
                </div>
                <div className='grid grid-cols-6 gap-2'>
                  {scope.sample.slice(0, 12).map((p) => (
                    <div
                      key={p.id}
                      className='aspect-square bg-white rounded-lg border border-zinc-100 overflow-hidden'
                      title={p.title + (p.price != null ? ' · ' + formatINR(p.price) : '')}
                    >
                      {p.image
                        ? <img src={p.image} alt='' className='w-full h-full object-cover' />
                        : <Package size={14} className='w-full h-full p-2 text-zinc-200' />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {problemsAt(1).map((p, i) => <Note key={i} kind='warn'>{p.msg}</Note>)}
          </Section>

          {/* ---------- 2 · What ---------- */}
          <Section
            n={2}
            title='What gets recommended'
            blurb='The 16 slots in the PDP grid, and what fills each one.'
            status={problemsAt(2).length
              ? { label: 'Needs attention', cls: 'text-amber-600 bg-amber-50' }
              : { label: plan.requested + ' of ' + MAX_SLOTS + ' set', cls: 'text-emerald-600 bg-emerald-50' }}
          >
            {/* Mode — three named choices instead of a bare toggle whose
                meaning depended on whether pins happened to exist. */}
            <div>
              <label className={labelCls}>How this rule works</label>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2'>
                {['automated', 'hybrid', 'handpicked'].map((key) => {
                  const m = MODES[key];
                  const Icon = m.icon;
                  const on = mode.key === key;
                  return (
                    <button
                      key={key}
                      type='button'
                      onClick={() => patch({ mode: key, automatedEnabled: key !== 'handpicked' })}
                      className={'text-left px-4 py-3 rounded-2xl border transition-colors ' +
                        (on ? 'border-black bg-zinc-50 ring-1 ring-black' : 'border-zinc-200 hover:border-zinc-300')}
                    >
                      <span className='flex items-center gap-2'>
                        <Icon size={13} className={on ? 'text-black' : 'text-zinc-400'} />
                        <span className='text-xs font-bold text-zinc-800'>{m.label}</span>
                        {on && <Check size={12} className='ml-auto text-black' />}
                      </span>
                      <span className='block text-[11px] text-zinc-400 mt-1 leading-snug'>{m.blurb}</span>
                    </button>
                  );
                })}
              </div>
              {/* The engine applies pins BEFORE it checks automatedEnabled, so
                  pins are never inert. Picking Automated while pins exist would
                  otherwise look like a click that did nothing. */}
              {form.mode === 'automated' && form.pinsGlobal.length > 0 && (
                <div className='mt-2'>
                  <Note kind='warn'>
                    This rule still has {form.pinsGlobal.length} pinned product{form.pinsGlobal.length === 1 ? '' : 's'},
                    and the engine always shows pins first — so it behaves as Hybrid.{' '}
                    <button
                      type='button'
                      onClick={() => patch({ pinsGlobal: [] })}
                      className='underline font-bold hover:no-underline'
                    >
                      Remove all pins
                    </button>{' '}
                    to make it fully automated.
                  </Note>
                </div>
              )}
            </div>

            {/* Pins — only where they mean something */}
            {mode.key !== 'automated' && (
              <div>
                <div className='flex items-center justify-between'>
                  <label className={labelCls}>Always show first</label>
                  <span className='text-[10px] text-zinc-400'>{form.pinsGlobal.length} pinned · per-product pins live in Preview</span>
                </div>
                <p className='text-[11px] text-zinc-400 mt-0.5 mb-2'>
                  These take slots 1 onward for every product in scope, in this order.
                </p>
                {form.pinsGlobal.length > 0 && (
                  <div className='space-y-1.5 mb-2'>
                    {form.pinsGlobal.map((p, i) => (
                      <ProductRow
                        key={p.id}
                        product={p}
                        index={i + 1}
                        onRemove={() => patch((f) => ({ pinsGlobal: f.pinsGlobal.filter((x) => x.id !== p.id) }))}
                      />
                    ))}
                  </div>
                )}
                <ProductSearch
                  icon={Pin}
                  placeholder='Search a product to pin...'
                  exclude={form.pinsGlobal.map((p) => p.id)}
                  onPick={(p) => {
                    if (form.pinsGlobal.length >= MAX_SLOTS) { toast.error('At most ' + MAX_SLOTS + ' pinned products'); return; }
                    patch((f) => ({ pinsGlobal: [...f.pinsGlobal, p] }));
                  }}
                />
              </div>
            )}

            {form.automatedEnabled && (
              <>
                {/* Shared conditions */}
                <div>
                  <label className={labelCls}>True for every recommendation</label>
                  <p className='text-[11px] text-zinc-400 mt-0.5 mb-2'>
                    Set once here instead of repeating it in every group below. The top-up obeys these too.
                  </p>

                  <div className='space-y-2 mb-2'>
                    {MATCH_TOGGLES.map(({ attr, title, blurb }) => {
                      const on = matchOn(attr);
                      return (
                        <button
                          key={attr}
                          type='button'
                          onClick={() => patch((f) => ({
                            commonConditions: on
                              ? f.commonConditions.filter((c) => !(c.attr === attr && c.op === 'matches_source'))
                              : [...f.commonConditions.filter((c) => c.attr !== attr), { attr, op: 'matches_source' }],
                          }))}
                          className={'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors ' +
                            (on ? 'border-black bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300')}
                        >
                          <span className={'relative w-9 h-5 rounded-full transition-colors flex-none ' + (on ? 'bg-black' : 'bg-zinc-200')}>
                            <span className={'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ' + (on ? 'left-[18px]' : 'left-0.5')} />
                          </span>
                          <span>
                            <span className='block text-xs font-bold text-zinc-800'>{title}</span>
                            <span className='block text-[11px] text-zinc-400'>{blurb}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className='space-y-2'>
                    {form.commonConditions.map((cond, i) => (
                      <ConditionRow
                        key={i}
                        prefix={i === 0 ? 'Must' : 'and'}
                        cond={cond}
                        attributes={attrs}
                        allowDynamic
                        onChange={(c) => patch((f) => ({ commonConditions: f.commonConditions.map((x, idx) => (idx === i ? c : x)) }))}
                        onRemove={() => patch((f) => ({ commonConditions: f.commonConditions.filter((_, idx) => idx !== i) }))}
                      />
                    ))}
                    {form.commonConditions.length === 0 && (
                      <p className='text-[11px] text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl px-3.5 py-2.5'>
                        Nothing shared — each group stands on its own conditions.
                      </p>
                    )}
                  </div>
                  <div className='mt-3'>
                    <AttributeChips attributes={attrs} allowDynamic onAdd={(c) => patch((f) => ({ commonConditions: [...f.commonConditions, c] }))} viewsNote={viewsNote} />
                  </div>
                </div>

                {/* The 16 slots */}
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <label className={labelCls}>The 16 slots</label>
                    <span className={'text-[10px] font-bold ' + (plan.over ? 'text-rose-500' : 'text-zinc-400')}>
                      {plan.over ? plan.requested + ' assigned — ' + MAX_SLOTS + ' available' : plan.used + ' of ' + MAX_SLOTS + ' assigned'}
                    </span>
                  </div>
                  <SlotMap plan={plan} />
                  {plan.over
                    ? <div className='mt-2'><Note kind='error'>Reduce a group before saving — everything past slot {MAX_SLOTS} is dropped.</Note></div>
                    : <p className='text-[11px] text-zinc-400 mt-2'>This is the plan. A group that finds fewer products than it has slots passes the rest on — the preview shows what each product actually gets.</p>}
                </div>

                {/* Groups */}
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <label className={labelCls}>Recommendation groups</label>
                    <span className='text-[10px] text-zinc-400'>filled in order, after pins</span>
                  </div>

                  <div className='space-y-3'>
                    {form.sequences.map((seq, i) => {
                      const g = plan.groups[i] || {};
                      return (
                        <div key={i} className='bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden'>
                          <div className='px-4 py-3 bg-zinc-50/60 border-b border-zinc-100 space-y-2.5'>
                            <div className='flex items-center gap-2.5'>
                              <span className={'w-2.5 h-6 rounded-sm shrink-0 ' + (g.color || 'bg-zinc-300')} />
                              <input
                                className={smallFieldCls + ' flex-1 min-w-0 font-bold'}
                                placeholder={'Group ' + (i + 1) + ' name — e.g. "Similar price"'}
                                value={seq.label}
                                onChange={(e) => setGroup(i, { label: e.target.value })}
                              />
                              <span className={'text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ' + (g.cut ? 'text-rose-500 bg-rose-50' : 'text-zinc-500 bg-white border border-zinc-200')}>
                                {g.size > 1 ? 'slots ' + g.from + '-' + g.to : 'slot ' + g.from}
                              </span>
                              <button
                                type='button'
                                onClick={() => patch((f) => ({ sequences: f.sequences.filter((_, idx) => idx !== i) }))}
                                className='text-zinc-300 hover:text-rose-500 shrink-0'
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            <div className='flex items-center gap-2 flex-wrap'>
                              <span className='text-[10px] text-zinc-400 uppercase font-bold'>How many</span>
                              <input
                                type='number' min='1' max={MAX_SLOTS}
                                className={smallFieldCls + ' w-14 text-center'}
                                value={seq.size}
                                onChange={(e) => setGroup(i, { size: e.target.value })}
                              />
                              <span className='text-[10px] text-zinc-400 uppercase font-bold ml-1'>Pick from</span>
                              <select className={smallFieldCls} value={seq.pool} onChange={(e) => setGroup(i, { pool: e.target.value })}>
                                <option value='collection'>{form.scope === 'collection' ? 'This collection' : 'Same collection'}</option>
                                <option value='catalog'>The whole store</option>
                              </select>
                              <span className='text-[10px] text-zinc-400 uppercase font-bold ml-1'>Best of them by</span>
                              <select
                                className={smallFieldCls}
                                value={seq.sortBy[0]?.key || 'score'}
                                onChange={(e) => setGroup(i, { sortBy: [{ key: e.target.value, dir: seq.sortBy[0]?.dir || 'desc' }] })}
                              >
                                {meta.sortKeys.map((sk) => <option key={sk.key} value={sk.key}>{sk.label}</option>)}
                              </select>
                              {/* Ranking metrics read both ways; relative sorts
                                  (best match, closest price, newest) do not. */}
                              {meta.sortKeys.find((sk) => sk.key === (seq.sortBy[0]?.key || 'score'))?.directional && (
                                <select
                                  className={smallFieldCls}
                                  value={seq.sortBy[0]?.dir || 'desc'}
                                  onChange={(e) => setGroup(i, { sortBy: [{ key: seq.sortBy[0]?.key || 'score', dir: e.target.value }] })}
                                >
                                  <option value='desc'>High to low</option>
                                  <option value='asc'>Low to high</option>
                                </select>
                              )}
                            </div>

                            {g.cut && (
                              <p className='flex items-center gap-1.5 text-[11px] text-rose-500'>
                                <AlertTriangle size={11} /> Only {g.placed} of these {g.size} slots fit inside the grid.
                              </p>
                            )}
                          </div>

                          <div className='px-4 py-3 space-y-2'>
                            {seq.conditions.map((cond, j) => (
                              <ConditionRow
                                key={j}
                                prefix={j === 0 ? 'When' : 'and'}
                                cond={cond}
                                attributes={attrs}
                                allowDynamic
                                onChange={(c) => setGroup(i, { conditions: seq.conditions.map((x, idx) => (idx === j ? c : x)) })}
                                onRemove={() => setGroup(i, { conditions: seq.conditions.filter((_, idx) => idx !== j) })}
                              />
                            ))}
                            {seq.conditions.length === 0 && (
                              <p className='text-[11px] text-zinc-400'>
                                No conditions — anything eligible qualifies and the sort above decides who wins these slots.
                              </p>
                            )}
                            <details className='pt-1'>
                              <summary className='text-[10px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-black inline-flex items-center gap-1'>
                                <Plus size={11} /> Add condition
                              </summary>
                              <div className='mt-2'>
                                <AttributeChips attributes={attrs} allowDynamic onAdd={(c) => setGroup(i, { conditions: [...seq.conditions, c] })} viewsNote={viewsNote} />
                              </div>
                            </details>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type='button'
                    onClick={() => patch((f) => ({ sequences: [...f.sequences, NEW_GROUP()] }))}
                    className='mt-3 bg-white border border-dashed border-zinc-300 text-zinc-500 px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:border-black hover:text-black transition-colors'
                  >
                    <Plus size={13} /> Add group
                  </button>
                </div>

                {/* Top-up */}
                <div className='flex items-start gap-3 bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3.5'>
                  <Toggle checked={form.backfill} onChange={() => patch((f) => ({ backfill: !f.backfill }))} />
                  <div>
                    <div className='text-xs font-bold text-zinc-800'>Top up any empty slots</div>
                    <p className='text-[11px] text-zinc-400 mt-0.5'>
                      When the groups come up short, fill the rest with the next best match — the collection first, then
                      the whole store. Shared conditions still apply, so the row stays on-brief. Off means a short row.
                    </p>
                  </div>
                </div>
              </>
            )}

            {problemsAt(2).map((p, i) => <Note key={i} kind='warn'>{p.msg}</Note>)}
          </Section>

          {/* ---------- 3 · When ---------- */}
          <Section
            n={3}
            title='When it runs, and who wins'
            blurb='Daily refresh time, priority against other rules, and tie-breakers.'
            defaultOpen={false}
            status={problemsAt(3).length
              ? { label: 'Needs attention', cls: 'text-amber-600 bg-amber-50' }
              : { label: 'Daily ' + form.scheduleTime + ' IST', cls: 'text-zinc-500 bg-zinc-100' }}
          >
            <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
              <div>
                <label className={labelCls}>Daily refresh (IST)</label>
                <input type='time' className={fieldCls + ' mt-2'} value={form.scheduleTime} onChange={(e) => patch({ scheduleTime: e.target.value })} />
                <p className='text-[10px] text-zinc-400 mt-1'>Prices move with the gold rate, so a daily rebuild keeps the grid honest.</p>
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <input type='number' className={fieldCls + ' mt-2'} value={form.priority} onChange={(e) => patch({ priority: e.target.value })} />
                <p className='text-[10px] text-zinc-400 mt-1'>When a product is covered by several rules, the highest priority writes it. Product {SCOPES.product.priority} &gt; collection {SCOPES.collection.priority} &gt; global {SCOPES.all.priority}.</p>
              </div>
              <div>
                <label className={labelCls}>Rule is live</label>
                <div className='mt-3'><Toggle checked={form.enabled} onChange={() => patch((f) => ({ enabled: !f.enabled }))} /></div>
                <p className='text-[10px] text-zinc-400 mt-2'>Off keeps the rule but stops the daily refresh.</p>
              </div>
            </div>

            {form.automatedEnabled && (
              <details className='border-t border-zinc-100 pt-4'>
                <summary className='text-[10px] font-bold uppercase tracking-widest text-zinc-400 cursor-pointer hover:text-black'>
                  Tie-breakers for &ldquo;best match&rdquo;
                </summary>
                <p className='text-[11px] text-zinc-400 mt-2 mb-2'>
                  Used wherever a group sorts by Best match, and for the top-up. Top of the list counts most.
                </p>
                <div className='space-y-1.5 max-w-md'>
                  {form.attributePriority.map((attr, idx) => (
                    <div key={attr} className='flex items-center gap-3 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2.5'>
                      <span className='w-6 h-6 rounded-full bg-white border border-zinc-200 text-zinc-500 flex items-center justify-center text-[10px] font-black'>{idx + 1}</span>
                      <span className='text-xs font-medium text-zinc-700 flex-1'>{ATTRIBUTE_LABELS[attr] || attr}</span>
                      <button
                        type='button'
                        onClick={() => patch((f) => {
                          const list = [...f.attributePriority];
                          if (idx === 0) return {};
                          [list[idx], list[idx - 1]] = [list[idx - 1], list[idx]];
                          return { attributePriority: list };
                        })}
                        disabled={idx === 0}
                        className='text-zinc-400 hover:text-black disabled:opacity-20'
                      >
                        <MoveUp size={14} />
                      </button>
                      <button
                        type='button'
                        onClick={() => patch((f) => {
                          const list = [...f.attributePriority];
                          if (idx === list.length - 1) return {};
                          [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
                          return { attributePriority: list };
                        })}
                        disabled={idx === form.attributePriority.length - 1}
                        className='text-zinc-400 hover:text-black disabled:opacity-20'
                      >
                        <MoveDown size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {problemsAt(3).map((p, i) => <Note key={i} kind='warn'>{p.msg}</Note>)}
          </Section>
        </div>

        {/* =================== RIGHT: live preview =================== */}
        <div className='min-[1100px]:col-span-2'>
          {/* >=1100px: sticky rail beside the config, pinned under the action bar.
              <1100px: fixed bottom sheet past the w-64 sidebar, collapsed by
              default — a full-width block dumped under the form was dead space. */}
          <div className={'bg-white border border-zinc-100 shadow-sm overflow-hidden ' +
            'min-[1100px]:sticky min-[1100px]:top-[92px] min-[1100px]:rounded-[1.75rem] ' +
            'max-[1099px]:fixed max-[1099px]:bottom-0 max-[1099px]:left-64 max-[1099px]:right-0 ' +
            'max-[1099px]:z-40 max-[1099px]:rounded-t-[1.75rem] max-[1099px]:shadow-2xl'}>
            <div className='px-5 py-4 border-b border-zinc-100 bg-zinc-50/50'>
              <div className='flex items-center gap-2'>
                <Eye size={14} className='text-zinc-400' />
                <span className='text-xs font-bold text-zinc-800'>Live preview</span>
                {previewBusy && <Loader2 size={12} className='animate-spin text-zinc-300' />}
                {/* Filled count is the one number worth seeing while collapsed. */}
                {preview.length > 0 && (
                  <span className={'min-[1100px]:hidden text-[10px] font-black px-2 py-0.5 rounded-full uppercase ' +
                    ((preview[activeSource] || preview[0]).totalFilled >= MAX_SLOTS ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50')}>
                    {(preview[activeSource] || preview[0]).totalFilled} / {MAX_SLOTS}
                  </span>
                )}
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
                What this rule would write, computed from the unsaved draft — a few seconds per change. Nothing is
                stored until you save.
              </p>
              {form.automatedEnabled && (
                <div className='mt-3'><SlotMap plan={plan} compact /></div>
              )}
            </div>

            <div className={'px-5 py-5 overflow-y-auto custom-scrollbar ' +
              'min-[1100px]:max-h-[calc(100vh-260px)] max-[1099px]:max-h-[55vh] ' +
              (railOpen ? '' : 'max-[1099px]:hidden')}>
              {!runnable ? (
                <div className='text-center py-12 px-2'>
                  <Info size={22} className='mx-auto text-zinc-200 mb-3' />
                  <p className='text-[11px] text-zinc-400'>
                    {problems[0]?.msg || 'Finish the sections on the left to see a preview.'}
                  </p>
                </div>
              ) : (
                <div className='relative'>
                  {previewBusy && preview.length > 0 && (
                    <div className='absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex items-start justify-center pt-10'>
                      <span className='flex items-center gap-2 text-[11px] font-bold text-zinc-500 bg-white border border-zinc-200 rounded-full px-3 py-1.5 shadow-sm'>
                        <Loader2 size={11} className='animate-spin' /> Updating
                      </span>
                    </div>
                  )}
                  <div className={previewBusy && preview.length > 0 ? 'opacity-60' : ''}>
                    <PreviewPanel
                      dense
                      data={preview}
                      loading={previewBusy && preview.length === 0}
                      error={previewError}
                      activeIndex={activeSource}
                      onSelectSource={setActiveSource}
                      emptyHint='No product in scope matched — widen the scope or loosen the narrowing conditions.'
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
