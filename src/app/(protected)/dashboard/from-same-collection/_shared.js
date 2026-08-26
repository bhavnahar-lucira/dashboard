'use client';

// Shared constants, helpers, and small components for the From the Same
// Collection module. The route is split into:
//   page.js     — rule list + view switching
//   _editor.js  — the rule workbench (config left, live preview right)
//   _preview.js — preview UI (modal on the list; compact rail in the editor)
//   _runs.js    — run history modal
// Everything here is UI-only; the engine lives in the backend.

import { useState, useEffect, useRef } from 'react';
import { Search, X, Info, Package, Sparkles, Hand, Blend, ChevronDown, AlertTriangle, Loader2, Check } from 'lucide-react';

export const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export const OP_LABELS = {
  eq: 'is equal to',
  neq: 'is not',
  gt: 'greater than',
  gte: 'greater than or equal to',
  lt: 'less than',
  lte: 'less than or equal to',
  contains: 'contains',
  not_contains: 'does not contain',
  within_percent: 'within % of source',
  within_amount: 'within ₹ of source',
  matches_source: 'matches source',
  has_any: 'has any (more than zero)',
  above_average: 'is above average',
  below_average: 'is below average',
  in: 'is in',
  not_in: 'is not in',
};

// A store-wide rule has no collection. It keeps a reserved handle so the
// unique index on collectionHandle allows exactly one of them.
export const ALL_PRODUCTS_HANDLE = '__all_products__';
export const ALL_PRODUCTS_TITLE = 'All products';
export const isStoreWide = (r) => r && r.collectionHandle === ALL_PRODUCTS_HANDLE;
export const isProductScoped = (r) => Boolean(r && r.source && (r.source.productIds || []).length);

// The three scopes a rule can have. Each is a distinct starting point rather
// than a setting buried inside one generic "new rule" flow.
export const SCOPES = {
  all:        { label: 'Global rule',     blurb: 'Every product in the store. A default that the other rules override.', priority: 1 },
  collection: { label: 'Collection rule', blurb: 'Every product in one Shopify collection.', priority: 10 },
  product:    { label: 'Product rule',    blurb: 'Only the products you pick. Beats collection and global rules.', priority: 20 },
};
export const scopeOf = (r) => (isProductScoped(r) ? 'product' : isStoreWide(r) ? 'all' : 'collection');

// Slot-map colours, one per sequence, muted so the map reads as data.
export const SLOT_COLORS = ['bg-zinc-800', 'bg-indigo-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400', 'bg-sky-400'];

export const DEFAULT_SEQUENCES = [
  { size: 4, label: 'Same collection picks', pool: 'collection', conditions: [], sortBy: [{ key: 'score', dir: 'desc' }] },
  { size: 4, label: 'Similar price', pool: 'collection', conditions: [{ attr: 'price', op: 'within_percent', value: 20 }], sortBy: [{ key: 'price_proximity', dir: 'desc' }] },
  { size: 4, label: 'Popular + same diamond type', pool: 'collection', conditions: [{ attr: 'stone_type', op: 'matches_source' }], sortBy: [{ key: 'popularity', dir: 'desc' }] },
  { size: 4, label: 'Available to buy', pool: 'collection', conditions: [{ attr: 'buyable', op: 'eq', value: true }], sortBy: [{ key: 'score', dir: 'desc' }] },
];

export const DEFAULT_ATTRIBUTE_PRIORITY = ['price', 'collection', 'inventory', 'popularity', 'diamond_type'];

export const ATTRIBUTE_LABELS = {
  price: 'Price',
  collection: 'Collection',
  inventory: 'Inventory',
  popularity: 'Popularity (orders + carts + wishlist)',
  diamond_type: 'Diamond type',
};

export const emptyForm = () => ({
  scope: 'collection',
  // Editor-only. automatedEnabled + pins are what get saved; see formMode().
  mode: 'automated',
  sourceProducts: [],
  collectionId: '',
  collectionHandle: '',
  collectionTitle: '',
  enabled: true,
  priority: 10,
  scheduleTime: '03:00',
  attributePriority: [...DEFAULT_ATTRIBUTE_PRIORITY],
  sourceConditions: [],
  commonConditions: [],
  sequences: DEFAULT_SEQUENCES.map((s) => ({ ...s, conditions: s.conditions.map((c) => ({ ...c })), sortBy: s.sortBy.map((x) => ({ ...x })) })),
  pinsGlobal: [], // [{ id (gid), title, image, price }]
  automatedEnabled: true,
  backfill: true,
});

// v1 rules (blocks) editable through the v2 editor — mirror of the backend's
// normalizeRule so what the team sees is exactly what the engine computes.
export const ruleToForm = (rule) => {
  const base = {
    scope: scopeOf(rule),
    // Recovered from the saved fields so re-opening a rule lands on the mode it
    // is actually in, not on the default.
    mode: rule.automatedEnabled === false
      ? 'handpicked'
      : (rule.pins?.global?.length || 0) > 0 ? 'hybrid' : 'automated',
    sourceProducts: (rule.source?.productIds || []).map((gid) => ({ id: gid, title: gid.split('/').pop(), image: null, price: null })),
    collectionId: rule.collectionId || '',
    collectionHandle: rule.collectionHandle || '',
    collectionTitle: rule.collectionTitle || '',
    enabled: rule.enabled !== false,
    priority: rule.priority ?? 10,
    scheduleTime: rule.scheduleTime || '03:00',
    attributePriority: rule.attributePriority || [...DEFAULT_ATTRIBUTE_PRIORITY],
    automatedEnabled: rule.automatedEnabled !== false,
    backfill: rule.backfill !== false,
    pinsGlobal: (rule.pins?.global || []).map((gid) => ({ id: gid, title: gid.split('/').pop(), image: null, price: null })),
    sourceConditions: (rule.source?.conditions || []).map((c) => ({ ...c })),
    commonConditions: (rule.commonConditions || []).map((c) => ({ ...c })),
  };
  if (rule.version === 2 && Array.isArray(rule.sequences)) {
    return {
      ...base,
      sequences: rule.sequences.map((s) => ({
        size: s.size,
        label: s.label || '',
        pool: s.pool === 'catalog' ? 'catalog' : 'collection',
        conditions: (s.conditions || []).map((c) => ({ ...c })),
        sortBy: (s.sortBy && s.sortBy.length ? s.sortBy : [{ key: 'score', dir: 'desc' }]).map((x) => ({ ...x })),
      })),
    };
  }
  // v1 -> editor view (same mapping as backend normalizeRule)
  return {
    ...base,
    sequences: (rule.blocks || []).map((block) => {
      const c = block.conditions || {};
      const conditions = [];
      if (c.priceBandPercent != null) conditions.push({ attr: 'price', op: 'within_percent', value: Number(c.priceBandPercent) });
      if (c.inStock) conditions.push({ attr: 'buyable', op: 'eq', value: true });
      if (c.diamondTypeMatch) conditions.push({ attr: 'stone_type', op: 'matches_source' });
      return {
        size: block.size,
        label: block.label || '',
        pool: 'collection',
        conditions,
        sortBy: c.popularity ? [{ key: 'popularity', dir: 'desc' }] : [{ key: 'score', dir: 'desc' }],
      };
    }),
  };
};

export const fieldCls = 'w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black';
export const smallFieldCls = 'px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-black';
export const labelCls = 'text-[10px] font-black uppercase tracking-widest text-zinc-400';

export const formatINR = (num) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(Number(num) || 0));

export const formatDateTime = (d) => {
  if (!d) return 'Never';
  try {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
  } catch (err) {
    return String(d);
  }
};

export const sequencesSummary = (rule) => {
  if (rule.version === 2 && Array.isArray(rule.sequences)) {
    return rule.sequences.map((s) => s.size + ' ' + (s.label || 'sequence').toLowerCase()).join(' · ') || 'pins only';
  }
  return (rule.blocks || []).map((b) => b.size + ' ' + (b.label || 'block').toLowerCase()).join(' · ');
};

export function Toggle({ checked, onChange, disabled }) {
  return (
    <label className={'relative inline-flex items-center ' + (disabled ? 'opacity-50' : 'cursor-pointer')}>
      <input type='checkbox' className='sr-only peer' checked={!!checked} disabled={disabled} onChange={onChange} />
      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Condition row — "When [attribute] [operator] [value]"
// ---------------------------------------------------------------------------
export function ConditionRow({ cond, attributes, allowDynamic, onChange, onRemove, prefix }) {
  const def = attributes.find((a) => a.key === cond.attr);
  const ops = (def?.ops || []).filter((op) => allowDynamic || !['matches_source', 'within_percent', 'within_amount'].includes(op));

  const [collQuery, setCollQuery] = useState('');
  const [collResults, setCollResults] = useState([]);

  useEffect(() => {
    if (def?.kind !== 'collection' || collQuery.trim().length < 2) { setCollResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(baseUrl + '/api/recommendations/collections/search?q=' + encodeURIComponent(collQuery));
        const data = await res.json();
        if (data.success) setCollResults(data.collections || []);
      } catch (err) { console.error(err); }
    }, 450);
    return () => clearTimeout(t);
  }, [collQuery, def?.kind]);

  // These operators answer for themselves — no threshold to type.
  const VALUE_FREE = ['matches_source', 'has_any', 'above_average', 'below_average'];
  const needsValue = !VALUE_FREE.includes(cond.op) && def?.kind !== 'boolean';

  return (
    <div className='flex flex-wrap items-center gap-2 bg-white border border-zinc-100 rounded-xl px-3 py-2.5'>
      <span className='text-[10px] font-black uppercase tracking-widest text-zinc-400 w-10'>{prefix}</span>
      <select
        className={smallFieldCls + ' min-w-[170px]'}
        value={cond.attr}
        onChange={(e) => {
          const nextDef = attributes.find((a) => a.key === e.target.value);
          const nextOps = (nextDef?.ops || []).filter((op) => allowDynamic || !['matches_source', 'within_percent', 'within_amount'].includes(op));
          onChange({ attr: e.target.value, op: nextOps[0] || 'eq', value: nextDef?.kind === 'boolean' ? true : '' });
        }}
      >
        {['Product details', 'Performance', 'Inventory'].map((group) => (
          <optgroup key={group} label={group}>
            {attributes.filter((a) => a.group === group).map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <select
        className={smallFieldCls}
        value={cond.op}
        onChange={(e) => onChange({ ...cond, op: e.target.value, ...(VALUE_FREE.includes(e.target.value) ? { value: undefined } : {}) })}
      >
        {ops.map((op) => <option key={op} value={op}>{OP_LABELS[op] || op}</option>)}
      </select>

      {def?.kind === 'boolean' ? (
        <select className={smallFieldCls} value={String(cond.value !== false)} onChange={(e) => onChange({ ...cond, value: e.target.value === 'true' })}>
          <option value='true'>Yes</option>
          <option value='false'>No</option>
        </select>
      ) : def?.kind === 'collection' ? (
        <div className='relative flex-1 min-w-[200px]'>
          <input
            className={smallFieldCls + ' w-full'}
            placeholder={cond.valueLabel || (cond.value ? String(cond.value).split('/').pop() : 'Search collection...')}
            value={collQuery}
            onChange={(e) => setCollQuery(e.target.value)}
          />
          {collResults.length > 0 && (
            <div className='absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-zinc-100 rounded-xl shadow-xl max-h-48 overflow-y-auto'>
              {collResults.map((c) => (
                <button
                  key={c.id}
                  className='w-full text-left px-3 py-2 text-xs hover:bg-zinc-50'
                  onClick={() => { onChange({ ...cond, value: c.id, valueLabel: c.title }); setCollQuery(''); setCollResults([]); }}
                >
                  {c.title} <span className='text-zinc-400'>({c.productsCount})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : needsValue && def?.options?.length ? (
        // The attribute has a known set of values (product type, vendor, stone
        // type...), so offer them rather than a text box a typo can silently
        // break. The saved value is kept as an option even if it is no longer
        // in the list, so editing an old rule never loses it.
        <select
          className={smallFieldCls + ' flex-1 min-w-[140px]'}
          value={cond.value ?? ''}
          onChange={(e) => onChange({ ...cond, value: e.target.value })}
        >
          <option value=''>Choose {def.label.toLowerCase()}...</option>
          {def.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          {cond.value && !def.options.some((opt) => opt.toLowerCase() === String(cond.value).toLowerCase()) && (
            <option value={cond.value}>{cond.value} (not in catalogue)</option>
          )}
        </select>
      ) : needsValue ? (
        <input
          type={def?.kind === 'number' ? 'number' : 'text'}
          className={smallFieldCls + ' flex-1 min-w-[110px]'}
          placeholder={cond.op === 'within_percent' ? '% band' : cond.op === 'within_amount' ? '₹ band' : 'Value'}
          value={cond.value ?? ''}
          onChange={(e) => onChange({ ...cond, value: def?.kind === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })}
        />
      ) : (
        <span className='text-[10px] font-bold text-violet-500 bg-violet-50 px-2 py-1 rounded-full uppercase tracking-wider'>
          {cond.op === 'matches_source' ? 'dynamic' : 'no value needed'}
        </span>
      )}

      <button onClick={onRemove} className='ml-auto text-zinc-300 hover:text-rose-500 transition-colors'><X size={15} /></button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attribute picker — collapsed to a search box by default. The ~20-chip wall
// dominated the panel; now chips render only while searching or after "Browse".
// ---------------------------------------------------------------------------
export function AttributeChips({ attributes, allowDynamic, onAdd, viewsNote }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All');
  const [browsing, setBrowsing] = useState(false);
  const groups = ['All', 'Product details', 'Performance', 'Inventory'];

  const open = browsing || query.trim().length > 0;
  const filtered = attributes.filter((a) =>
    (group === 'All' || a.group === group) &&
    (!query.trim() || a.label.toLowerCase().includes(query.trim().toLowerCase()))
  );

  return (
    <div className='bg-zinc-50/70 border border-zinc-100 rounded-2xl p-4'>
      <div className='flex items-center gap-2'>
        <div className='relative flex-1'>
          <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400' />
          <input
            className='w-full pl-9 pr-3 py-2.5 bg-white border border-zinc-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-black'
            placeholder='Search conditions — price, views, product type...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setBrowsing((b) => !b)}
          className={'text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 rounded-xl border transition-colors ' + (open ? 'bg-black text-white border-black' : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-400')}
        >
          {open ? 'Hide' : 'Browse all'}
        </button>
      </div>

      {open && (
        <>
          <div className='flex items-center gap-2 mt-3 mb-3'>
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors ' + (group === g ? 'bg-black text-white' : 'bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-400')}
              >
                {g}
              </button>
            ))}
            {viewsNote && (
              <span className='ml-auto flex items-center gap-1 text-[10px] text-zinc-400'><Info size={11} /> {viewsNote}</span>
            )}
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {filtered.map((a) => (
              <button
                key={a.key}
                onClick={() => {
                  const ops = (a.ops || []).filter((op) => allowDynamic || !['matches_source', 'within_percent', 'within_amount'].includes(op));
                  onAdd({ attr: a.key, op: ops[0] || 'eq', value: a.kind === 'boolean' ? true : '' });
                  setQuery('');
                }}
                className='text-[11px] font-medium px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-600 hover:border-black hover:text-black transition-colors'
              >
                {a.label}
              </button>
            ))}
            {filtered.length === 0 && <span className='text-xs text-zinc-400 py-1'>No matching conditions.</span>}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode — Automated / Hybrid / Hand-picked
//
// The mode is not a stored field: it FALLS OUT of automatedEnabled + whether
// pins exist. That was unguessable from a bare toggle, so the editor picks the
// mode explicitly and derives the two fields from it.
// ---------------------------------------------------------------------------
export const MODES = {
  automated: {
    key: 'automated',
    label: 'Automated',
    blurb: 'The engine fills all 16 slots from your groups below.',
    icon: Sparkles,
    cls: 'text-emerald-600 bg-emerald-50',
  },
  hybrid: {
    key: 'hybrid',
    label: 'Hybrid',
    blurb: 'Your pinned products come first, the engine fills the rest.',
    icon: Blend,
    cls: 'text-violet-600 bg-violet-50',
  },
  handpicked: {
    key: 'handpicked',
    label: 'Hand-picked',
    blurb: 'Shoppers see only the products you pin. Nothing automatic.',
    icon: Hand,
    cls: 'text-amber-600 bg-amber-50',
  },
};

// Mode of a SAVED rule (list cards).
export const ruleMode = (rule) => {
  const hasPins = (rule.pins?.global?.length || 0) > 0 || Object.keys(rule.pins?.perProduct || {}).length > 0;
  if (rule.automatedEnabled === false) return MODES.handpicked;
  return hasPins ? MODES.hybrid : MODES.automated;
};

// Mode of the rule being EDITED. `form.mode` is editor-only state so a rule can
// be put into Hybrid and THEN have pins added — deriving purely from pin count
// would flip the choice back to Automated the moment the last pin came off.
export const formMode = (form) => {
  if (!form.automatedEnabled) return MODES.handpicked;
  return form.mode === 'hybrid' || form.pinsGlobal.length > 0 ? MODES.hybrid : MODES.automated;
};

export const MAX_SLOTS = 16;

// ---------------------------------------------------------------------------
// Slot plan — the 16 slots in the order the engine fills them, plus the exact
// slot RANGE each group owns. Groups carry their range so a group can say
// "slots 5-8" in its own header instead of leaving the reader to add up sizes.
// ---------------------------------------------------------------------------
export const slotPlan = (form) => {
  const cells = [];
  const legend = [];
  const groups = [];

  const pinCount = Math.min(form.pinsGlobal.length, MAX_SLOTS);
  if (pinCount > 0) {
    legend.push({ label: 'Pinned', color: 'bg-zinc-900' });
    for (let i = 0; i < pinCount; i++) cells.push({ color: 'bg-zinc-900', label: 'Pinned product' });
  }

  if (form.automatedEnabled) {
    form.sequences.forEach((seq, i) => {
      const color = SLOT_COLORS[i % SLOT_COLORS.length];
      const size = parseInt(seq.size, 10) || 0;
      const label = seq.label || 'Group ' + (i + 1);
      const from = cells.length + 1;
      const placed = Math.max(0, Math.min(size, MAX_SLOTS - cells.length));
      for (let n = 0; n < placed; n++) cells.push({ color, label });
      groups.push({ index: i, color, label, size, from, to: from + Math.max(size, 1) - 1, placed, cut: placed < size });
      if (size > 0) legend.push({ label, color });
    });
  }

  const used = cells.length;
  const requested = pinCount + (form.automatedEnabled
    ? form.sequences.reduce((a, s) => a + (parseInt(s.size, 10) || 0), 0)
    : 0);

  if (cells.length < MAX_SLOTS) {
    const fillsRest = form.automatedEnabled && form.backfill;
    if (fillsRest) legend.push({ label: 'Topped up', color: 'bg-zinc-300' });
    while (cells.length < MAX_SLOTS) {
      cells.push(fillsRest
        ? { color: 'bg-zinc-300', label: 'Topped up with the next best match' }
        : { color: 'bg-zinc-100 border border-dashed border-zinc-300', label: 'Empty - nothing will fill this slot' });
    }
    if (!fillsRest) legend.push({ label: 'Left empty', color: 'bg-zinc-100 border border-dashed border-zinc-300' });
  }

  return { cells, legend, groups, used, requested, over: requested > MAX_SLOTS, pinCount };
};

// The 16 slots as a bar. `compact` drops the legend for the preview rail.
export function SlotMap({ plan, compact }) {
  return (
    <div>
      <div className='flex gap-[3px]'>
        {plan.cells.map((c, i) => (
          <div
            key={i}
            title={'Slot ' + (i + 1) + ' - ' + c.label}
            className={'flex-1 rounded ' + (compact ? 'h-2' : 'h-8') + ' ' + c.color + (i === 3 ? ' mr-2' : '')}
          />
        ))}
      </div>
      {!compact && (
        <div className='flex items-center gap-3 flex-wrap mt-2'>
          <span className='text-[10px] text-zinc-400'>Slots 1-4 are seen without scrolling</span>
          {plan.legend.map((l) => (
            <span key={l.label} className='flex items-center gap-1.5 text-[10px] text-zinc-500'>
              <span className={'w-2.5 h-2.5 rounded-sm ' + l.color} /> {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plain-English read-back of the whole rule.
//
// The most self-explaining thing on the page: whatever combination of scope,
// mode, pins, groups and top-up is set, this says what it MEANS in one
// sentence. If the sentence reads wrong, the rule is wrong.
// ---------------------------------------------------------------------------
export function RuleSentence({ form, scopeCount, plan }) {
  const b = (t) => <b className='text-zinc-800 font-semibold'>{t}</b>;
  const narrowed = form.sourceConditions.filter((c) => c.attr && c.op).length;

  const who = form.scope === 'all'
    ? b('Every product in the store')
    : form.scope === 'product'
      ? b(form.sourceProducts.length + (form.sourceProducts.length === 1 ? ' hand-picked product' : ' hand-picked products'))
      : <>Every product in {b(form.collectionTitle || 'the collection')}</>;

  const mode = formMode(form);
  const groupBits = form.automatedEnabled
    ? plan.groups
      .filter((g) => g.size > 0)
      .map((g) => g.size + ' ' + (form.sequences[g.index].label || 'by best match').toLowerCase())
    : [];

  return (
    <p className='text-[13px] leading-relaxed text-zinc-500'>
      {who}
      {narrowed > 0 && <> that match {b(narrowed + (narrowed === 1 ? ' condition' : ' conditions'))}</>}
      {scopeCount != null && <> ({b(scopeCount)} right now)</>}
      {' gets '}
      {mode.key === 'handpicked'
        ? <>only the {b(form.pinsGlobal.length + ' pinned product' + (form.pinsGlobal.length === 1 ? '' : 's'))} you chose.</>
        : (
          <>
            up to {b('16 recommendations')}
            {' — '}
            {plan.pinCount > 0 && <>{b(plan.pinCount + ' pinned')}{groupBits.length ? ', then ' : ''}</>}
            {groupBits.length > 0 ? groupBits.join(', then ') : 'nothing yet — add a group below'}
            {form.backfill
              ? <>, and any slot still empty is {b('topped up')} with the next best match.</>
              : <>. Slots left over stay {b('empty')}.</>}
          </>
        )}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Product search — one component for the three places that search products
// (source products, global pins, "preview this product"). Debounced, aborts
// the in-flight request, and hides anything already chosen.
// ---------------------------------------------------------------------------
export function ProductSearch({ placeholder, icon: Icon = Search, exclude = [], onPick, small }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      try {
        const res = await fetch('/api/products/search?q=' + encodeURIComponent(query) + '&limit=8', { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.products || data.results || []);
      } catch (err) {
        if (err.name !== 'AbortError') setResults([]);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const excluded = new Set(exclude.map((g) => String(g).split('/').pop()));
  const visible = results.filter((p) => !excluded.has(String(p.id).split('/').pop()));

  return (
    <div className='relative'>
      <Icon size={14} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none' />
      {busy && <Loader2 size={13} className='absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-zinc-300' />}
      <input
        className={(small ? smallFieldCls : fieldCls) + ' w-full pl-9'}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {visible.length > 0 && (
        <div className='absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto'>
          {visible.map((p) => {
            const gid = String(p.id).startsWith('gid://') ? p.id : 'gid://shopify/Product/' + String(p.id).split('/').pop();
            return (
              <button
                key={p.id}
                type='button'
                className='w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex items-center gap-3'
                onClick={() => { onPick({ id: gid, title: p.title, image: p.image, price: p.price }); setQuery(''); setResults([]); }}
              >
                {p.image ? <img src={p.image} alt='' className='w-8 h-8 rounded-lg object-cover' /> : <Package size={16} className='text-zinc-300' />}
                <span className='text-xs font-medium text-zinc-700 flex-1 truncate'>{p.title}</span>
                {p.price != null && <span className='text-[10px] text-zinc-400'>{formatINR(p.price)}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// A chosen product, as a removable row.
export function ProductRow({ product, index, onRemove }) {
  return (
    <div className='flex items-center gap-3 bg-white border border-zinc-100 rounded-xl px-3 py-2'>
      {index != null && (
        <span className='w-5 h-5 rounded-md bg-zinc-900 text-white flex items-center justify-center text-[9px] font-black shrink-0'>{index}</span>
      )}
      {product.image
        ? <img src={product.image} alt='' className='w-7 h-7 rounded-lg object-cover' />
        : <Package size={14} className='text-zinc-300' />}
      <span className='text-xs font-medium text-zinc-700 flex-1 truncate' title={product.title}>{product.title}</span>
      {product.price != null && <span className='text-[10px] text-zinc-400'>{formatINR(product.price)}</span>}
      <button type='button' onClick={onRemove} className='text-zinc-300 hover:text-rose-500'><X size={14} /></button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible numbered section. Progressive disclosure: a section states what
// it is FOR and carries its own status, so nothing has to be held in memory
// while scrolling.
// ---------------------------------------------------------------------------
export function Section({ n, title, blurb, status, children, defaultOpen = true, right }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className='bg-white border border-zinc-100 rounded-[1.75rem] shadow-sm overflow-hidden'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        className='w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-zinc-50/60 transition-colors'
      >
        <span className='w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[11px] font-black shrink-0'>{n}</span>
        <span className='flex-1 min-w-0'>
          <span className='block text-sm font-bold text-zinc-900'>{title}</span>
          {blurb && <span className='block text-[11px] text-zinc-400 mt-0.5'>{blurb}</span>}
        </span>
        {right}
        {status && (
          <span className={'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ' + status.cls}>
            {status.label}
          </span>
        )}
        <ChevronDown size={16} className={'text-zinc-400 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && <div className='px-6 pb-6 pt-1 space-y-6'>{children}</div>}
    </section>
  );
}

// Inline note, so a hint or a problem is stated where it happens.
export function Note({ kind = 'info', children }) {
  const cls = kind === 'warn'
    ? 'text-amber-700 bg-amber-50 border-amber-100'
    : kind === 'error'
      ? 'text-rose-600 bg-rose-50 border-rose-100'
      : kind === 'ok'
        ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
        : 'text-zinc-500 bg-zinc-50 border-zinc-100';
  const Icon = kind === 'info' ? Info : kind === 'ok' ? Check : AlertTriangle;
  return (
    <p className={'flex items-start gap-2 text-[11px] border rounded-xl px-3.5 py-2.5 ' + cls}>
      <Icon size={12} className='mt-0.5 shrink-0' /> <span>{children}</span>
    </p>
  );
}
