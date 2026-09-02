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
    return {
      label: p.slotLabel || 'Slot ' + ((p.slotIndex ?? 0) + 1),
      cls: SLOT_TEXT_COLORS[(p.slotIndex ?? 0) % SLOT_TEXT_COLORS.length],
    };
  }
  return KIND_BADGES[p.kind] || KIND_BADGES.remainder;
};

export const NEW_SLOT = () => ({ sizePercent: 20, label: '', conditions: [], sortBy: [{ key: 'views_30d', dir: 'desc' }] });

// The starting point mirrors the brief that motivated the module: first 20%
// in stock by views, next 10% by views alone, the rest kept in Shopify order.
export const DEFAULT_SLOTS = [
  { sizePercent: 20, label: 'In stock, most viewed', conditions: [{ attr: 'buyable', op: 'eq', value: true }], sortBy: [{ key: 'views_30d', dir: 'desc' }] },
  { sizePercent: 10, label: 'Most viewed', conditions: [], sortBy: [{ key: 'views_30d', dir: 'desc' }] },
];

export const emptyForm = () => ({
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
});

export const ruleToForm = (rule) => ({
  collectionId: rule.collectionId || '',
  collectionHandle: rule.collectionHandle || '',
  collectionTitle: rule.collectionTitle || '',
  collectionProductsCount: null,
  collectionSortOrder: null,
  enabled: rule.enabled !== false,
  scheduleTime: rule.scheduleTime || '02:30',
  slots: (rule.slots || []).map((s) => ({
    sizePercent: s.sizePercent,
    label: s.label || '',
    conditions: (s.conditions || []).map((c) => ({ ...c })),
    sortBy: (s.sortBy && s.sortBy.length ? s.sortBy : [{ key: 'views_30d', dir: 'desc' }]).map((x) => ({ ...x })),
  })),
  remainderSortBy: (rule.remainderSortBy && rule.remainderSortBy.length ? rule.remainderSortBy : [{ key: 'current', dir: 'desc' }]).map((x) => ({ ...x })),
  pinned: (rule.pinned || []).map((gid) => ({ id: gid, title: gid.split('/').pop(), image: null, price: null })),
  removed: (rule.removed || []).map((gid) => ({ id: gid, title: gid.split('/').pop(), image: null, price: null })),
  positions: (rule.positions || []).map((e) => ({ id: e.id, position: e.position })),
  oosToEnd: rule.settings?.oosToEnd !== false,
});

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
    const key = sortBy?.[0]?.key;
    const def = (sortKeys || []).find((sk) => sk.key === key);
    return (def?.label || key || 'current order').toLowerCase();
  };
  return (
    <p className='text-[13px] leading-relaxed text-zinc-500'>
      {b(form.collectionTitle || 'The collection')}
      {productsCount != null && <> ({b(productsCount + ' products')})</>} gets reordered on Shopify:{' '}
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
