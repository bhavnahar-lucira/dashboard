'use client';

// Curate preview — the Tagalys-style ranked grid of the computed collection
// order. One set of components, two placements: the editor's live rail and
// the list page's full-screen modal. Renders the backend's preview shape
// verbatim; it never re-ranks BY RULE, so the screen cannot disagree with the
// engine.
//
// Each tile carries the position badge, the slot that placed it, movement
// vs the current Shopify order, price/stock, and the 30-day engagement strip
// (views / add-to-carts / orders) — the "why is it here" at a glance that the
// Shopify admin never shows.
//
// Curation happens on the tile itself, from a hover toolbar over the image:
//
//   open   - the product in the Shopify admin
//   info   - the full product report (the Product Information panel) in a
//            drawer, right next to the tile being placed
//   move   - hand-place at an exact position (or drag the tile onto another)
//   pin    - keep at the top of the collection
//   demote - push to the very end
//
// A hand-placed move is re-applied LOCALLY from the engine's automated order
// (`autoPosition` on every product) with the exact same function the engine
// runs, so a drag is instant and still truthful. Pin and demote change which
// products the percentage slots draw from, so those DO need the engine — the
// owner of the curation state re-previews on the server for them.

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, Package, Pin, X, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Eye, Search,
  CornerRightDown, Move, Info, ExternalLink, RotateCcw, Save, GripVertical, CornerLeftUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { baseUrl, API, formatPrice, kindBadge, Note, recomputeCurateOrder, stockState } from './_shared';
import { InsightsBody } from './_insights';

const PAGE_SIZE = 24;

const shopifyAdminUrl = (gid) => 'https://admin.shopify.com/products/' + String(gid).split('/').pop();

// ---------------------------------------------------------------------------
// One circular tile action, with the Tagalys-style label on hover.
// ---------------------------------------------------------------------------
function TileAction({ icon: Icon, label, onClick, href, active, activeCls, size = 13, danger }) {
  const base = 'relative p-1.5 rounded-full shadow-sm transition-colors group/act ' +
    (active
      ? activeCls
      : 'bg-white/95 text-zinc-500 ' + (danger ? 'hover:text-rose-500' : 'hover:text-black'));
  const inner = (
    <>
      <Icon size={size} />
      <span className='pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 rounded-lg bg-zinc-900 text-white text-[9px] font-bold whitespace-nowrap opacity-0 group-hover/act:opacity-100 transition-opacity z-30'>
        {label}
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} target='_blank' rel='noreferrer' className={base} title={label} onClick={(e) => e.stopPropagation()}>
        {inner}
      </a>
    );
  }
  return (
    <button type='button' onClick={onClick} className={base} title={label}>
      {inner}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Move-to-position popover — the exact-position half of curation, and the only
// way to move a product across pages of the grid.
// ---------------------------------------------------------------------------
function MovePopover({ product, total, onMove, onRelease, onClose, dense }) {
  const [value, setValue] = useState(String(product.position));
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const apply = (pos) => {
    const n = Math.round(Number(pos));
    if (!Number.isFinite(n) || n < 1) { toast.error('Position must be 1 or more'); return; }
    onMove(product, Math.min(total, n));
    onClose();
  };

  const quick = (label, pos, disabled) => (
    <button
      type='button'
      disabled={disabled}
      onClick={() => apply(pos)}
      className='px-2 py-1 rounded-lg border border-zinc-200 text-[10px] font-bold text-zinc-600 hover:border-zinc-900 hover:text-black disabled:opacity-30 disabled:hover:border-zinc-200'
    >
      {label}
    </button>
  );

  return (
    <div
      ref={ref}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
      className={'absolute z-40 top-11 w-52 bg-white rounded-2xl shadow-2xl border border-zinc-100 p-3 cursor-default ' +
        // Centred over a full-width tile; anchored left in the narrow editor
        // rail, where the popover is wider than the tile itself.
        (dense ? 'left-0' : 'left-1/2 -translate-x-1/2')}
    >
      <div className='text-[10px] font-black uppercase tracking-widest text-zinc-400'>Move to position</div>
      <div className='flex items-center gap-1.5 mt-2'>
        <span className='text-[11px] text-zinc-400'>#</span>
        <input
          autoFocus
          type='number'
          min={1}
          max={total}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') apply(value); }}
          className='flex-1 min-w-0 px-2 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-black'
        />
        <span className='text-[10px] text-zinc-400 shrink-0'>of {total}</span>
        <button
          type='button'
          onClick={() => apply(value)}
          className='px-2 py-1.5 rounded-lg bg-black text-white text-[10px] font-bold shrink-0'
        >
          Go
        </button>
      </div>
      <div className='flex items-center gap-1.5 flex-wrap mt-2'>
        {quick('To top', 1, product.position === 1)}
        {quick('Up one', product.position - 1, product.position <= 1)}
        {quick('Down one', product.position + 1, product.position >= total)}
        {quick('To end', total, product.position === total)}
      </div>
      {product.handPlaced ? (
        <button
          type='button'
          onClick={() => { onRelease(product); onClose(); }}
          className='mt-2.5 w-full px-2 py-1.5 rounded-lg bg-zinc-100 text-[10px] font-bold text-zinc-600 hover:bg-zinc-200'
        >
          {product.autoPosition
            ? <>Release &mdash; back to #{product.autoPosition} by the rules</>
            : <>Release &mdash; let the rules place it again</>}
        </button>
      ) : (
        <p className='mt-2.5 text-[10px] text-zinc-400 leading-snug'>
          Or drag the tile onto the position you want. Everything else stays automated.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One product tile
// ---------------------------------------------------------------------------
function CurateCard({
  product, dense, total,
  onPin, onRemove, onMove, onRelease, onInfo,
  pinned, removed,
  dragging, dragOver, draggable,
  onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop,
}) {
  const [moveOpen, setMoveOpen] = useState(false);
  const badge = kindBadge(product);
  const moved = product.delta || 0;
  const curatable = Boolean(onPin || onRemove || onMove);
  // A tile with its popover open must not be dragged out from under the input.
  const dragOn = draggable && !moveOpen;

  return (
    <div
      draggable={dragOn}
      onDragStart={dragOn ? onDragStart : undefined}
      onDragEnd={dragOn ? onDragEnd : undefined}
      onDragOver={draggable ? onDragOver : undefined}
      onDragLeave={draggable ? onDragLeave : undefined}
      onDrop={draggable ? onDrop : undefined}
      className={'bg-white border rounded-2xl group relative transition-all ' +
        // The move popover is taller than the image on a small tile, so the
        // card stops clipping while it is open — the image keeps its own
        // rounded clip either way.
        (moveOpen ? '' : 'overflow-hidden ') +
        (dragOver ? 'border-zinc-900 ring-2 ring-zinc-900 ' : 'border-zinc-100 ') +
        (dragging ? 'opacity-40 ' : '') +
        (product.handPlaced ? 'shadow-[0_0_0_1.5px_rgba(24,24,27,0.9)] ' : '') +
        (dragOn ? 'cursor-grab active:cursor-grabbing' : '')}
    >
      <div className='aspect-square bg-zinc-50 relative overflow-hidden rounded-t-2xl'>
        {product.image
          ? <img src={product.image} alt={product.title} className='w-full h-full object-cover pointer-events-none' />
          : <Package size={22} className='absolute inset-0 m-auto text-zinc-200' />}

        {/* Position in the collection page, 1-based. Ringed when hand-placed. */}
        <span className={'absolute top-2 left-2 min-w-5 h-5 px-1 rounded-md flex items-center justify-center text-[9px] font-black ' +
          (product.handPlaced
            ? 'bg-zinc-900 text-white ring-2 ring-white'
            : product.position <= 8 ? 'bg-zinc-900 text-white' : 'bg-white/90 text-zinc-500')}>
          #{product.position}
        </span>

        {/* Movement vs the current Shopify order. */}
        {moved !== 0 && (
          <span className={'absolute bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black ' +
            (moved > 0 ? 'bg-emerald-500/90 text-white' : 'bg-zinc-400/90 text-white')}
            title={'Currently #' + product.oldPosition + ' on Shopify'}>
            {moved > 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}{Math.abs(moved)}
          </span>
        )}

        {/* The curate toolbar, over the image on hover (Tagalys gestures). */}
        {(curatable || onInfo) && (
          <div
            className={'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5 transition-opacity ' +
              (moveOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100')}
          >
            {!dense && (
              <TileAction icon={ExternalLink} label='Open in Shopify' href={shopifyAdminUrl(product.id)} />
            )}
            {!dense && onInfo && (
              <TileAction icon={Info} label='Product information' onClick={() => onInfo(product)} />
            )}
            {onMove && (
              <TileAction
                icon={Move}
                label='Move to position'
                onClick={() => setMoveOpen((v) => !v)}
                active={product.handPlaced}
                activeCls='bg-zinc-900 text-white'
              />
            )}
            {onPin && (
              <TileAction
                icon={Pin}
                label={pinned ? 'Unpin' : 'Pin to the top'}
                onClick={() => onPin(product)}
                active={pinned}
                activeCls='bg-amber-500 text-white'
              />
            )}
            {onRemove && (
              <TileAction
                icon={removed ? CornerLeftUp : CornerRightDown}
                label={removed ? 'Restore — let the rules place it' : 'Move to the end'}
                onClick={() => onRemove(product)}
                active={removed}
                activeCls='bg-rose-500 text-white'
                danger
              />
            )}
          </div>
        )}

        {/* Which rule placed it here. */}
        <span
          className={'absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ' + badge.cls}
          title={product.handPlaced
            ? 'Hand-placed at #' + product.handPosition +
              (product.autoPosition ? ' — the rules alone would put it at #' + product.autoPosition : '')
            : badge.label}
        >
          {dense ? (badge.short || badge.label) : badge.label}
        </span>

        {dragOn && (
          <span className='absolute top-2 right-2 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow'>
            <GripVertical size={13} />
          </span>
        )}
      </div>

      {/* Outside the image box: the popover is free to be taller than it. */}
      {moveOpen && onMove && (
        <MovePopover
          product={product}
          total={total}
          dense={dense}
          onMove={onMove}
          onRelease={onRelease}
          onClose={() => setMoveOpen(false)}
        />
      )}

      <div className={dense ? 'p-2' : 'p-3'}>
        <div className='text-[11px] font-medium text-zinc-800 truncate' title={product.title}>{product.title}</div>
        <div className='flex items-center justify-between mt-1 gap-2'>
          <span className='text-xs font-bold text-zinc-900'>
            {formatPrice(product.price)}
            {product.compareAtPrice > product.price && (
              <span className='ml-1 text-[9px] font-normal text-zinc-400 line-through'>{formatPrice(product.compareAtPrice)}</span>
            )}
          </span>
          {(() => {
            const stock = stockState(product);
            return (
              <span
                className={'text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 ' + stock.cls}
                title={stock.key === 'made'
                  ? 'Purchasable with no inventory on hand — sold made-to-order (Shopify: continue selling when out of stock)'
                  : stock.key === 'stocked' ? stock.qty + ' in inventory' : 'Not purchasable right now'}
              >
                {dense ? stock.short : stock.label}{stock.qty ? ' · ' + stock.qty : ''}
              </span>
            );
          })()}
        </div>
        {!dense && (
          <div className='flex items-center gap-2 mt-1.5 text-[9px] text-zinc-400'>
            <span title='Views, last 30 days'>&#128065; {product.metrics?.views30 ?? 0}</span>
            <span title='Add to carts, last 30 days'>&#128722; {product.metrics?.atc30 ?? 0}</span>
            <span title='Orders, last 30 days'>&#128230; {product.metrics?.orders30 ?? 0}</span>
            {product.metrics?.revenue30 > 0 && (
              <span className='ml-auto truncate' title='Revenue, last 30 days'>{formatPrice(product.metrics.revenue30)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The grid, with paging (Tagalys' "1 of 6") and an in-preview search filter.
//
// preview       - { products, summary, metricSources } from the backend
// pinnedIds / removedIds - current curation state (gids)
// positions     - [{ id, position }] hand placements, re-applied locally
// onPin / onRemove / onMove / onRelease - curation handlers, omitted = read-only
// onInfo        - open the product report drawer
// dense         - editor rail (2 columns, no metric strip)
// ---------------------------------------------------------------------------
export function CuratePreview({
  preview,
  loading,
  slow,
  error,
  pinnedIds = [],
  removedIds = [],
  positions = [],
  onPin,
  onRemove,
  onMove,
  onRelease,
  onInfo,
  dense,
  emptyHint,
}) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  // The id being dragged is read back in handlers that can fire before React
  // has committed the state, so it lives in a ref; `dragId` is only for the
  // visual (the tile dims, the target rings).
  const dragRef = useRef(null);

  // The order as it stands with the current hand placements. Idempotent: when
  // `positions` is exactly what the payload was computed with (a saved rule),
  // this returns the payload's own order.
  const products = useMemo(
    () => recomputeCurateOrder(preview?.products || [], positions),
    [preview, positions]
  );

  const filtering = filter.trim().length > 0;
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.title.toLowerCase().includes(q) || p.handle.includes(q));
  }, [products, filter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  // Dragging reorders by dropping ONTO a tile: the dragged product takes that
  // tile's position. Off while filtering, where the positions on screen are
  // not consecutive positions in the collection.
  const canDrag = Boolean(onMove) && !filtering;
  const handleDrop = useCallback((target, droppedId) => {
    const sourceId = droppedId || dragRef.current;
    dragRef.current = null;
    setOverId(null);
    setDragId(null);
    const dragged = products.find((p) => p.id === sourceId);
    if (!dragged || !target || dragged.id === target.id) return;
    onMove(dragged, target.position);
  }, [products, onMove]);

  if (loading && products.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-20 px-4 text-zinc-300'>
        <Loader2 className='animate-spin' size={dense ? 24 : 36} />
        <span className='text-[11px] text-zinc-400 text-center'>Working out the collection order...</span>
        {slow && (
          <span className='text-[11px] text-zinc-400 text-center max-w-[16rem] leading-snug'>
            First preview since the server restarted — rebuilding the catalogue and analytics data. Later previews are
            near-instant.
          </span>
        )}
      </div>
    );
  }

  if (error) {
    return <div className={dense ? 'py-6' : 'py-10'}><Note kind='warn'>{error}</Note></div>;
  }

  if (products.length === 0) {
    return (
      <div className='text-center py-16 px-4'>
        <Eye size={26} className='mx-auto text-zinc-200 mb-3' />
        <p className='text-xs text-zinc-400'>{emptyHint || 'Pick a collection to see its computed order.'}</p>
      </div>
    );
  }

  const s = preview.summary || {};
  // Recomputed locally: a hand placement moves products without a round trip,
  // so the backend's own counts can be one drag behind.
  const movesCount = products.filter((p) => p.delta !== 0).length;
  const handCount = products.filter((p) => p.handPlaced).length;

  return (
    <div className='space-y-4'>
      {/* Header line: counts, moves, slot fill */}
      <div className='flex items-center gap-2 flex-wrap text-[11px] text-zinc-500'>
        <span className='font-black px-2 py-0.5 rounded-full uppercase text-[10px] text-zinc-600 bg-zinc-100'>
          {s.totalProducts ?? products.length} products
        </span>
        <span className={'font-black px-2 py-0.5 rounded-full uppercase text-[10px] ' +
          (movesCount > 0 ? 'text-sky-600 bg-sky-50' : 'text-emerald-600 bg-emerald-50')}>
          {movesCount > 0 ? movesCount + ' will move' : 'already in this order'}
        </span>
        {handCount > 0 && (
          <span className='font-black px-2 py-0.5 rounded-full uppercase text-[10px] text-white bg-zinc-900'>
            {handCount} hand-placed
          </span>
        )}
        {(s.outOfStock || 0) > 0 && (
          <span className='font-black px-2 py-0.5 rounded-full uppercase text-[10px] text-rose-500 bg-rose-50'>
            {s.outOfStock} out of stock &rarr; end
          </span>
        )}
        {loading && <Loader2 size={12} className='animate-spin text-zinc-400' />}
      </div>

      {/* Slot fill — did each percentage actually find enough products? */}
      {(s.slotFill || []).some((f) => f.filled < f.size) && (
        <Note kind='warn'>
          {(s.slotFill || []).filter((f) => f.filled < f.size)
            .map((f) => `"${f.label}" wanted ${f.size} but matched ${f.filled}`)
            .join('; ')} — the shortfall passes to the next slot / remainder.
        </Note>
      )}

      {preview.metricSources?.skuIndexPending && (
        <Note kind='warn'>
          Google Analytics view data is still loading in the background — metrics shown are first-party for now.
        </Note>
      )}

      {/* Filter + pager */}
      {!dense && (
        <div className='flex items-center gap-2'>
          <div className='relative flex-1'>
            <Search size={13} className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400' />
            <input
              className='w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-black'
              placeholder='Find a product in this order...'
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(0); }}
            />
          </div>
          <Pager page={safePage} pages={pages} setPage={setPage} />
        </div>
      )}

      {onMove && !dense && (
        <p className='text-[10px] text-zinc-400 flex items-center gap-1.5'>
          <Move size={11} className='shrink-0' />
          {filtering
            ? 'Dragging is off while you are filtering — use the move button on a tile to set an exact position.'
            : 'Drag a tile onto the position you want, or use the move button on hover for an exact position. Only the products you place by hand are fixed; the rest stay automated.'}
        </p>
      )}

      <div className={'relative grid gap-3 ' + (dense ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
        {loading && (
          <div className='absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px] rounded-2xl' />
        )}
        {visible.map((p) => (
          <CurateCard
            key={p.id}
            product={p}
            dense={dense}
            total={products.length}
            pinned={pinnedIds.includes(p.id)}
            removed={removedIds.includes(p.id)}
            onPin={onPin}
            onRemove={onRemove}
            onMove={onMove}
            onRelease={onRelease}
            onInfo={onInfo}
            draggable={canDrag}
            dragging={dragId === p.id}
            dragOver={overId === p.id && dragId !== p.id}
            onDragStart={(e) => { dragRef.current = p.id; setDragId(p.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', p.id); }}
            onDragEnd={() => { dragRef.current = null; setDragId(null); setOverId(null); }}
            onDragOver={(e) => { if (!dragRef.current) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overId !== p.id) setOverId(p.id); }}
            onDragLeave={() => setOverId((cur) => (cur === p.id ? null : cur))}
            onDrop={(e) => { e.preventDefault(); handleDrop(p, e.dataTransfer.getData('text/plain')); }}
          />
        ))}
      </div>

      {dense && pages > 1 && (
        <div className='flex justify-center'><Pager page={safePage} pages={pages} setPage={setPage} /></div>
      )}
      {!dense && pages > 1 && (
        <div className='flex justify-end'><Pager page={safePage} pages={pages} setPage={setPage} /></div>
      )}
    </div>
  );
}

function Pager({ page, pages, setPage }) {
  if (pages <= 1) return null;
  return (
    <div className='flex items-center gap-1.5 shrink-0'>
      <button
        type='button'
        onClick={() => setPage(Math.max(0, page - 1))}
        disabled={page === 0}
        className='p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:border-zinc-400 disabled:opacity-30'
      >
        <ChevronLeft size={13} />
      </button>
      <span className='text-[10px] font-bold text-zinc-500 whitespace-nowrap'>{page + 1} of {pages}</span>
      <button
        type='button'
        onClick={() => setPage(Math.min(pages - 1, page + 1))}
        disabled={page >= pages - 1}
        className='p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:border-zinc-400 disabled:opacity-30'
      >
        <ChevronRight size={13} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product report drawer — the same panel as the Product Information page,
// opened from a tile's info button so a placement call can be made without
// leaving the order.
// ---------------------------------------------------------------------------
export function InsightsDrawer({ product, onClose }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!product) { setInsights(null); setError(null); return undefined; }
    let alive = true;
    setLoading(true);
    setError(null);
    setInsights(null);
    fetch(baseUrl + API + '/product-insights/' + encodeURIComponent(String(product.id).split('/').pop()))
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!alive) return;
        if (ok && data.success) setInsights(data);
        else setError(data.error || 'Could not load this product.');
      })
      .catch(() => { if (alive) setError('Could not reach the server.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [product]);

  useEffect(() => {
    if (!product) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [product, onClose]);

  if (!product) return null;

  return (
    <div className='fixed inset-0 z-[60] flex justify-end' onClick={onClose}>
      <div className='absolute inset-0 bg-black/40' />
      <div
        className='relative bg-zinc-50 w-full max-w-3xl h-full overflow-y-auto custom-scrollbar shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='sticky top-0 z-10 px-7 py-4 bg-white/95 backdrop-blur border-b border-zinc-100 flex items-center justify-between gap-4'>
          <div className='min-w-0'>
            <div className='text-[10px] font-black uppercase tracking-widest text-zinc-400'>Product information</div>
            <h3 className='text-sm font-bold text-zinc-900 truncate'>{product.title}</h3>
          </div>
          <div className='flex items-center gap-3 shrink-0'>
            <a
              href={shopifyAdminUrl(product.id)}
              target='_blank'
              rel='noreferrer'
              className='text-[10px] font-bold text-zinc-500 hover:text-black flex items-center gap-1'
            >
              Open in Shopify <ExternalLink size={11} />
            </a>
            <button type='button' onClick={onClose} className='text-zinc-400 hover:text-black'><X size={18} /></button>
          </div>
        </div>
        <div className='px-7 py-6'>
          {loading && <div className='flex justify-center py-32'><Loader2 className='animate-spin text-zinc-300' size={32} /></div>}
          {error && <Note kind='warn'>{error}</Note>}
          {!loading && !error && <InsightsBody insights={insights} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full curate preview, as a modal off the rule list. Curation is editable
// here and saved onto the rule explicitly — nothing reaches Shopify until the
// next sync. Called without the curation props it stays read-only.
// ---------------------------------------------------------------------------
export function CurateModal({
  rule, preview, loading, onClose,
  curation, onPin, onRemove, onMove, onRelease, onResetCuration, onSave, saving, dirty,
}) {
  const [infoProduct, setInfoProduct] = useState(null);

  const close = useCallback(() => {
    if (dirty && !window.confirm('Discard the curation changes you have not saved?')) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    if (!rule || infoProduct) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [rule, close, infoProduct]);

  if (!rule) return null;

  const editable = Boolean(onMove);
  const handCount = (curation?.positions || []).length;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl'>
        <div className='px-8 py-5 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-4'>
          <div className='min-w-0'>
            <h2 className='text-lg font-bold text-zinc-900 truncate'>Curate preview — {rule.collectionTitle || rule.collectionHandle}</h2>
            <p className='text-[11px] text-zinc-400 mt-0.5'>
              {editable
                ? 'Exactly the order the next sync pushes to Shopify. Drag a tile, or use the buttons on hover, to place products by hand.'
                : 'Exactly the order the next sync pushes to Shopify. Pin or demote products from Edit.'}
            </p>
          </div>
          <button type='button' onClick={close} className='text-zinc-400 hover:text-black shrink-0'><X size={20} /></button>
        </div>

        <div className='flex-1 overflow-y-auto px-8 py-6 custom-scrollbar'>
          <CuratePreview
            preview={preview}
            loading={loading}
            pinnedIds={curation?.pinned || []}
            removedIds={curation?.removed || []}
            positions={curation?.positions || []}
            onPin={onPin}
            onRemove={onRemove}
            onMove={onMove}
            onRelease={onRelease}
            onInfo={setInfoProduct}
          />
        </div>

        {editable && (
          <div className='px-8 py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-4 flex-wrap'>
            <div className='text-[11px] text-zinc-500'>
              {dirty
                ? <span className='font-bold text-amber-600'>Unsaved curation changes</span>
                : <span>Curation saved{handCount > 0 ? ' · ' + handCount + ' hand-placed' : ''}</span>}
              <span className='text-zinc-400'> · nothing reaches Shopify until the next sync</span>
            </div>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={onResetCuration}
                disabled={!dirty || saving}
                className='px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:border-zinc-400 disabled:opacity-40 disabled:hover:border-zinc-200'
              >
                <RotateCcw size={13} /> Reset
              </button>
              <button
                type='button'
                onClick={onSave}
                disabled={!dirty || saving}
                className='px-5 py-2.5 rounded-xl bg-black text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:bg-zinc-800 disabled:opacity-40'
              >
                {saving ? <Loader2 size={13} className='animate-spin' /> : <Save size={13} />} Save curation
              </button>
            </div>
          </div>
        )}
      </div>

      <InsightsDrawer product={infoProduct} onClose={() => setInfoProduct(null)} />
    </div>
  );
}
