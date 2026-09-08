'use client';

// Shared constants and helpers for the Smart Collections module — percentage
// slot rules that order the products of a Shopify collection page. The route
// splits like the from-same-collection module it is modeled on:
//   page.js      — rule list, tab + view switching (list / editor / insights)
//   _editor.js   — the rule workbench (config left, curate preview right)
//   _preview.js  — the curate preview grid (editor rail + list modal)
//   _insights.js — the Product Information tab
//   _runs.js     — sync history modal
//
// The generic inputs (ConditionRow, AttributeChips, ProductSearch, Section,
// Note, Toggle...) are imported from the from-same-collection module rather
// than forked — same look, one place to fix.

export {
  baseUrl, OP_LABELS, fieldCls, smallFieldCls, labelCls,
  formatINR, formatDateTime,
  Toggle, ConditionRow, AttributeChips, ProductSearch, ProductRow, Section, Note,
} from '../from-same-collection/_shared';

import { formatINR as inr } from '../from-same-collection/_shared';

export const API = '/api/smart-collections';

// The global rule: one ordering strategy for EVERY collection that has no
// rule of its own. Reserved handle (unique index allows exactly one),
// collectionId null. Per-collection rules always override it.
export const ALL_COLLECTIONS_HANDLE = '__all_collections__';
export const ALL_COLLECTIONS_TITLE = 'All collections';
export const isGlobalRule = (r) => Boolean(r && r.collectionHandle === ALL_COLLECTIONS_HANDLE);

// One muted colour per slot so the percent bar and the preview tiles agree.
export const SLOT_COLORS = ['bg-indigo-400', 'bg-emerald-400', 'bg-amber-400', 'bg-rose-400', 'bg-sky-400', 'bg-violet-400'];
export const SLOT_TEXT_COLORS = ['text-indigo-600 bg-indigo-50', 'text-emerald-600 bg-emerald-50', 'text-amber-600 bg-amber-50', 'text-rose-500 bg-rose-50', 'text-sky-600 bg-sky-50', 'text-violet-600 bg-violet-50'];

// Non-slot placements in the computed order, with their badge styling.
export const KIND_BADGES = {
  pinned:    { label: 'Pinned', cls: 'text-zinc-900 bg-zinc-200' },
  remainder: { label: 'Remaining', cls: 'text-zinc-500 bg-zinc-100' },
  oos:       { label: 'Out of stock', cls: 'text-rose-500 bg-rose-50' },
  removed:   { label: 'Moved to end', cls: 'text-rose-600 bg-rose-100' },
  hidden:    { label: 'Not live', cls: 'text-zinc-400 bg-zinc-100' },
  manual:    { label: 'Hand-placed', cls: 'text-white bg-zinc-900' },
};

export const kindBadge = (p) => {
  // A hand placement is the loudest thing about a tile — it overrides whatever
  // slot would otherwise have claimed it.
  if (p.handPlaced) return KIND_BADGES.manual;
  if (p.kind === 'slot') {
    const n = (p.slotIndex ?? 0) + 1;
    // The word "Slot" is not decoration. Everything after it is the slot's OWN
    // NAME — free text typed in the editor — while every other badge on a tile
    // (Pinned, Out of stock, Not live, Hand-placed) is a computed fact about
    // the product. A bare "1 · In stock, most viewed" was read as "1 in stock"
    // on a product with zero inventory, which is exactly the confusion this
    // prefix has to prevent, so never shorten it back to just the number.
    return {
      label: p.slotLabel ? 'Slot ' + n + ' · ' + p.slotLabel : 'Slot ' + n,
      short: 'Slot ' + n,
      cls: SLOT_TEXT_COLORS[(p.slotIndex ?? 0) % SLOT_TEXT_COLORS.length],
    };
  }
  return KIND_BADGES[p.kind] || KIND_BADGES.remainder;
};

export const NEW_SLOT = () => ({ sizePercent: 20, label: '', conditions: [], sortBy: [{ key: 'views_30d', dir: 'desc' }] });

// ---------------------------------------------------------------------------
// Balanced-score presets — one click gives a sensible recipe, the sliders
// let it be tuned. Weights are relative shares (the engine normalizes by the
// total, so they don't have to sum to 100 — but reading them as % keeps the
// mental model simple).
// ---------------------------------------------------------------------------
export const WEIGHT_PRESETS = [
  {
    key: 'trending', label: 'Trending',
    blurb: 'What shoppers are viewing and carting right now.',
    weights: { views_7d: 45, atc_7d: 35, orders_30d: 20 },
  },
  {
    key: 'revenue', label: 'Revenue driver',
    blurb: 'What actually sells and earns.',
    weights: { revenue_30d: 40, orders_30d: 35, views_30d: 25 },
  },
  {
    key: 'fresh', label: 'Fresh + popular',
    blurb: 'New designs that are already getting attention.',
    weights: { newest: 50, views_30d: 30, atc_30d: 20 },
  },
  {
    key: 'clearance', label: 'Clearance push',
    blurb: 'Discounted pieces with stock to move.',
    weights: { discount_percent: 50, inventory_total: 30, views_30d: 20 },
  },
];

export const DEFAULT_WEIGHTS = WEIGHT_PRESETS[0].weights;

// "40% views (7d) + 35% carts (7d) + ..." — used by the sentence and the slot
// summaries so a weighted rule reads back as its actual recipe.
export const weightSummary = (weights, sortKeys) => {
  const entries = Object.entries(weights || {}).filter(([, w]) => Number(w) > 0);
  const total = entries.reduce((a, [, w]) => a + Number(w), 0) || 1;
  const label = (k) => ((sortKeys || []).find((sk) => sk.key === k)?.label || k).toLowerCase();
  return entries
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([k, w]) => Math.round((Number(w) / total) * 100) + '% ' + label(k))
    .join(' + ');
};

// The starting point mirrors the brief that motivated the module: first 20%
// buyable by views, next 10% by views alone, the rest kept in Shopify order.
//
// The first slot is named for what its condition actually tests — "available
// to buy", NOT "in stock". They are different things in this catalogue: most
// variants sit at inventoryQuantity 0 with inventoryPolicy CONTINUE, so they
// are purchasable made-to-order and the `buyable` condition passes for nearly
// everything (measured on Nakshatra: 46 of 46). A slot named "In stock" here
// promises a filter it does not apply.
export const DEFAULT_SLOTS = [
  { sizePercent: 20, label: 'Available to buy, most viewed', conditions: [{ attr: 'buyable', op: 'eq', value: true }], sortBy: [{ key: 'views_30d', dir: 'desc' }] },
  { sizePercent: 10, label: 'Most viewed', conditions: [], sortBy: [{ key: 'views_30d', dir: 'desc' }] },
];

// ISO/Date -> the value a <input type="datetime-local"> wants, in the
// browser's own timezone (which for this team is IST).
export const toInputDateTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
};

export const emptyForm = () => ({
  scope: 'collection', // 'collection' | 'all' — fixed at creation
  previewCollectionId: '',    // editor-only: the sample a global rule previews with
  previewCollectionTitle: '',
  collectionId: '',
  collectionHandle: '',
  collectionTitle: '',
  collectionProductsCount: null,
  collectionSortOrder: null,
  enabled: true,
  scheduleTime: '02:30',
  slots: DEFAULT_SLOTS.map((s) => ({ ...s, conditions: s.conditions.map((c) => ({ ...c })), sortBy: s.sortBy.map((x) => ({ ...x })) })),
  remainderSortBy: [{ key: 'current', dir: 'desc' }],
  pinned: [],   // [{ id (gid), title, image, price }]
  removed: [],  // [{ id (gid), title, image, price }]
  positions: [], // [{ id (gid), position }] — hand-placed, sparse
  oosToEnd: true,
  // Draft scheduling (v2): editor-only fields, saved onto rule.draft.
  versionLabel: '',
  goLiveAt: '',
  revertAt: '',
});

// The editor edits the DRAFT when one exists — the live fields otherwise.
// `fromDraft` on the result says which one loaded, so the editor can show the
// "you are editing a draft" banner.
export const ruleToForm = (rule) => {
  const d = rule.draft || null;
  const src = d ? { ...rule, ...d, settings: d.settings !== undefined ? d.settings : rule.settings } : rule;
  return {
    scope: isGlobalRule(rule) ? 'all' : 'collection',
    previewCollectionId: '',
    previewCollectionTitle: '',
    collectionId: rule.collectionId || '',
    collectionHandle: rule.collectionHandle || '',
    collectionTitle: rule.collectionTitle || '',
    collectionProductsCount: null,
    collectionSortOrder: null,
    enabled: rule.enabled !== false,
    scheduleTime: src.scheduleTime || '02:30',
    slots: (src.slots || []).map((s) => ({
      sizePercent: s.sizePercent,
      label: s.label || '',
      conditions: (s.conditions || []).map((c) => ({ ...c })),
      sortBy: (s.sortBy && s.sortBy.length ? s.sortBy : [{ key: 'views_30d', dir: 'desc' }]).map((x) => ({ ...x })),
    })),
    remainderSortBy: (src.remainderSortBy && src.remainderSortBy.length ? src.remainderSortBy : [{ key: 'current', dir: 'desc' }]).map((x) => ({ ...x })),
    pinned: (src.pinned || []).map((gid) => ({ id: gid, title: String(gid).split('/').pop(), image: null, price: null })),
    removed: (src.removed || []).map((gid) => ({ id: gid, title: String(gid).split('/').pop(), image: null, price: null })),
    positions: (src.positions || []).map((e) => ({ id: e.id, position: e.position })),
    oosToEnd: (d ? d.settings?.oosToEnd : rule.settings?.oosToEnd) !== false,
    versionLabel: d?.label || '',
    goLiveAt: toInputDateTime(d?.goLiveAt),
    revertAt: toInputDateTime(d?.revertAt),
    fromDraft: Boolean(d),
    draftSavedAt: d?.savedAt || null,
  };
};

export const slotsSummary = (rule) => {
  const bits = (rule.slots || []).map((s) => s.sizePercent + '% ' + (s.label || 'slot').toLowerCase());
  return bits.length ? bits.join(' · ') : 'no slots — remainder order only';
};

export const percentTotal = (slots) => (slots || []).reduce((a, s) => a + (Number(s.sizePercent) || 0), 0);

// The percent bar: each slot's share of the collection, remainder greyed.
export function PercentBar({ slots, compact }) {
  const total = Math.min(100, percentTotal(slots));
  return (
    <div>
      <div className={'flex w-full rounded-full overflow-hidden bg-zinc-100 ' + (compact ? 'h-2' : 'h-4')}>
        {(slots || []).map((s, i) => {
          const pct = Math.max(0, Math.min(100, Number(s.sizePercent) || 0));
          if (!pct) return null;
          return (
            <div
              key={i}
              className={SLOT_COLORS[i % SLOT_COLORS.length]}
              style={{ width: pct + '%' }}
              title={(s.label || 'Slot ' + (i + 1)) + ' — ' + pct + '%'}
            />
          );
        })}
        <div className='flex-1' title={'Remaining — ' + (100 - total) + '%'} />
      </div>
      {!compact && (
        <div className='flex items-center gap-3 flex-wrap mt-2'>
          {(slots || []).map((s, i) => (
            <span key={i} className='flex items-center gap-1.5 text-[10px] text-zinc-500'>
              <span className={'w-2.5 h-2.5 rounded-sm ' + SLOT_COLORS[i % SLOT_COLORS.length]} />
              {s.sizePercent}% {s.label || 'Slot ' + (i + 1)}
            </span>
          ))}
          <span className='flex items-center gap-1.5 text-[10px] text-zinc-400'>
            <span className='w-2.5 h-2.5 rounded-sm bg-zinc-200' /> {100 - total}% remaining
          </span>
        </div>
      )}
    </div>
  );
}

// Plain-English read-back of the whole rule — if this sentence reads wrong,
// the rule is wrong.
export function RuleSentence({ form, productsCount, sortKeys }) {
  const b = (t) => <b className='text-zinc-800 font-semibold'>{t}</b>;
  const approx = (pct) => (productsCount ? ' (≈' + Math.round((pct / 100) * productsCount) + ' products)' : '');
  const sortLabel = (sortBy) => {
    const entry = sortBy?.[0];
    const key = entry?.key;
    if (key === 'weighted') {
      const mix = weightSummary(entry.weights, sortKeys);
      return 'a balanced score' + (mix ? ' (' + mix + ')' : '');
    }
    const def = (sortKeys || []).find((sk) => sk.key === key);
    return (def?.label || key || 'current order').toLowerCase();
  };
  const isAll = form.scope === 'all';
  return (
    <p className='text-[13px] leading-relaxed text-zinc-500'>
      {isAll
        ? <>{b('Every collection in the store')} (collections with their own smart sort keep it)</>
        : b(form.collectionTitle || 'The collection')}
      {!isAll && productsCount != null && <> ({b(productsCount + ' products')})</>} gets reordered on Shopify:{' '}
      {form.pinned.length > 0 && <>{b(form.pinned.length + ' pinned')} first, then </>}
      {form.slots.length === 0
        ? 'no slots — '
        : form.slots.map((s, i) => (
            <span key={i}>
              {i === 0 ? 'the first ' : 'the next '}
              {b((Number(s.sizePercent) || 0) + '%')}
              {approx(Number(s.sizePercent) || 0)} {s.label ? <>as {b(s.label.toLowerCase())}</> : null}
              {', then '}
            </span>
          ))}
      everything else by {b(sortLabel(form.remainderSortBy))}
      {form.oosToEnd && <>, with {b('out-of-stock pushed to the end')}</>}
      {form.removed.length > 0 && <>, and {b(form.removed.length + ' product' + (form.removed.length === 1 ? '' : 's') + ' moved to the very end')}</>}
      {(form.positions || []).length > 0 && <>. {b(form.positions.length + ' product' + (form.positions.length === 1 ? '' : 's'))} then hold {form.positions.length === 1 ? 'its' : 'their'} hand-placed position whatever the rules compute</>}
      .
    </p>
  );
}

export const formatPrice = (n) => inr(n);

// ---------------------------------------------------------------------------
// Stock, in the three states this catalogue actually has. "Buyable" and
// "stocked" are not the same thing here: most variants sit at
// inventoryQuantity 0 with inventoryPolicy CONTINUE, so a shopper can buy
// them made-to-order. Calling those "in stock" next to "Inventory: 0" reads
// as a bug, and it hides how few products have real stock — measured on the
// Nakshatra collection, 45 of 46.
//
// Takes either a preview product ({ inStock, inventory }) or an insights
// product ({ buyable, totalInventory }).
// ---------------------------------------------------------------------------
export const stockState = (p) => {
  const buyable = p.inStock ?? p.buyable;
  const qty = p.inventory ?? p.totalInventory ?? 0;
  if (!buyable) return { key: 'out', label: 'Out of stock', short: 'Out', cls: 'text-rose-500 bg-rose-50' };
  if (qty > 0) return { key: 'stocked', label: 'In stock', short: 'In stock', qty, cls: 'text-emerald-600 bg-emerald-50' };
  return { key: 'made', label: 'Made to order', short: 'To order', cls: 'text-amber-600 bg-amber-50' };
};

// ---------------------------------------------------------------------------
// Hand-placed positions — the client twin of the engine's last ordering step.
//
// `positions` is the SPARSE [{ id, position }] list of products moved by hand
// in the curate preview. This is a byte-for-byte port of
// lucira-backend/lib/smartCollections.js#applyManualPositions so a drag can be
// shown instantly, without a round trip, and still be exactly what the next
// sync pushes. If one side changes, change both.
// ---------------------------------------------------------------------------
export function applyManualPositions(ordered, positions) {
  const list = Array.isArray(positions) ? positions : [];
  if (!list.length) return { ordered, placements: new Map() };

  const present = new Set(ordered.map((p) => p.id));
  const seen = new Set();
  const wanted = [];
  list.forEach((entry, seq) => {
    const id = entry && entry.id ? String(entry.id) : null;
    const position = Math.round(Number(entry && entry.position));
    if (!id || !present.has(id) || seen.has(id)) return;
    if (!Number.isFinite(position) || position < 1) return;
    seen.add(id);
    wanted.push({ id, position, seq });
  });
  if (!wanted.length) return { ordered, placements: new Map() };

  wanted.sort((a, b) => a.position - b.position || a.seq - b.seq);

  const byId = new Map(ordered.map((p) => [p.id, p]));
  const out = ordered.filter((p) => !seen.has(p.id));
  const done = new Set();
  for (const w of wanted) {
    let idx = Math.max(0, Math.min(w.position - 1, out.length));
    while (idx < out.length && done.has(out[idx].id)) idx += 1;
    out.splice(idx, 0, byId.get(w.id));
    done.add(w.id);
  }

  return { ordered: out, placements: new Map(wanted.map((w) => [w.id, w.position])) };
}

// Re-rank a preview payload for a curation change. `autoPosition` is where the
// rules alone put each product, so the hand placements are always re-applied
// from the automated order rather than stacked on the last visible order —
// which is what makes dragging idempotent and undoable.
export function recomputeCurateOrder(products, positions) {
  const auto = [...(products || [])].sort((a, b) => (a.autoPosition || 0) - (b.autoPosition || 0));
  const { ordered, placements } = applyManualPositions(auto, positions);
  return ordered.map((p, i) => ({
    ...p,
    position: i + 1,
    delta: (p.oldPosition ?? i + 1) - (i + 1),
    handPlaced: placements.has(p.id),
    handPosition: placements.get(p.id) ?? null,
  }));
}

// Curation edits. Each keeps ONE placement decision per product: hand-placing
// clears a pin/demotion, and pinning or demoting clears a hand placement, so
// the preview can never show two rules fighting over the same tile.
export const upsertPosition = (positions, id, position) => {
  const next = (positions || []).filter((e) => e.id !== id);
  next.push({ id, position: Math.max(1, Math.round(position)) });
  return next;
};

export const clearPosition = (positions, id) => (positions || []).filter((e) => e.id !== id);

// Total products in the order, used to clamp "move to position" and to render
// "of N".
export const previewCount = (preview) => (preview?.products || []).length;
