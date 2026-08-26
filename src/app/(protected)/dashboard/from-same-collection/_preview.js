'use client';

// Preview UI for the From the Same Collection module.
//
// One set of components, two placements:
//   <PreviewPanel>  — the body: source switcher + slot groups + product cards.
//                     Used inside the editor's live rail AND the list's modal,
//                     so what you see while configuring is what you see after.
//   <PreviewModal>  — full-screen wrapper for the rule list.
//
// Everything here renders the backend's preview shape verbatim; it never
// re-ranks or re-filters, so the screen cannot disagree with the engine.

import { Loader2, Package, Pin, X, Search, Eye } from 'lucide-react';
import { formatINR, ProductSearch, Note, MAX_SLOTS } from './_shared';

// ---------------------------------------------------------------------------
// One recommended product
// ---------------------------------------------------------------------------
function PreviewCard({ product, slotNumber, pinned, onTogglePin, pinBusy, dense }) {
  return (
    <div className='bg-white border border-zinc-100 rounded-2xl overflow-hidden group relative'>
      <div className='aspect-square bg-zinc-50 relative'>
        {product.image
          ? <img src={product.image} alt={product.title} className='w-full h-full object-cover' />
          : <Package size={22} className='absolute inset-0 m-auto text-zinc-200' />}

        {/* Slot number: the shopper sees these in this order, and slots 1-4 are
            above the fold. Saying which slot a product lands in is the whole
            reason the preview is worth reading. */}
        {slotNumber != null && (
          <span className={'absolute top-2 left-2 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ' +
            (slotNumber <= 4 ? 'bg-zinc-900 text-white' : 'bg-white/90 text-zinc-500')}>
            {slotNumber}
          </span>
        )}

        {onTogglePin && (
          <button
            type='button'
            onClick={() => onTogglePin(product)}
            disabled={pinBusy}
            title={pinned ? 'Unpin for this product' : 'Pin to the front for this product'}
            className={'absolute top-2 right-2 p-1.5 rounded-full shadow transition-colors ' +
              (pinned ? 'bg-amber-500 text-white' : 'bg-white/90 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-black')}
          >
            <Pin size={13} />
          </button>
        )}
      </div>

      <div className={dense ? 'p-2' : 'p-3'}>
        <div className='text-[11px] font-medium text-zinc-800 truncate' title={product.title}>{product.title}</div>
        <div className='flex items-center justify-between mt-1 gap-2'>
          <span className='text-xs font-bold text-zinc-900'>{formatINR(product.price)}</span>
          <span className={'text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 ' +
            (product.inStock ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50')}>
            {product.inStock ? 'Buyable' : 'Unavailable'}
          </span>
        </div>
        {!dense && (
          <div className='flex items-center gap-2 mt-1.5 text-[9px] text-zinc-400'>
            <span title='Views, last 30 days'>&#128065; {product.metrics?.views30 ?? 0}</span>
            <span title='Add to carts, last 30 days'>&#128722; {product.metrics?.atc30 ?? 0}</span>
            <span title='Orders, last 30 days'>&#128230; {product.metrics?.orders30 ?? 0}</span>
            {product.stoneType && <span className='ml-auto text-violet-400 truncate'>{product.stoneType}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview body
//
// data          - array of { source, slots, totalFilled, metricSources }
// activeIndex   - which source product is on screen
// onPick*       - optional: source switching, per-product pinning
// dense         - the editor rail (2 columns, no 30d metrics)
// ---------------------------------------------------------------------------
export function PreviewPanel({
  data,
  loading,
  error,
  activeIndex = 0,
  onSelectSource,
  perProductPins = [],
  onTogglePin,
  pinBusy,
  dense,
  emptyHint,
}) {
  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-20 text-zinc-300'>
        <Loader2 className='animate-spin' size={dense ? 24 : 36} />
        <span className='text-[11px] text-zinc-400'>Working out what the run would write...</span>
      </div>
    );
  }

  if (error) {
    return <div className={dense ? 'py-6' : 'py-10'}><Note kind='warn'>{error}</Note></div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className='text-center py-16 px-4'>
        <Eye size={26} className='mx-auto text-zinc-200 mb-3' />
        <p className='text-xs text-zinc-400'>{emptyHint || 'No eligible source products for this rule yet.'}</p>
      </div>
    );
  }

  const active = data[activeIndex] || data[0];

  // Slot numbers are assigned across the whole list, in fill order, so the
  // numbers on the cards line up with the slot map above.
  let slotCursor = 0;

  return (
    <div className='space-y-5'>
      {/* Source switcher — only meaningful when several sources were computed */}
      {data.length > 1 && onSelectSource && (
        <div className='flex gap-2 flex-wrap'>
          {data.map((p, i) => (
            <button
              key={p.source.id}
              type='button'
              onClick={() => onSelectSource(i)}
              className={'flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl border transition-colors ' +
                (i === activeIndex ? 'border-black bg-black text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400')}
            >
              {p.source.image
                ? <img src={p.source.image} alt='' className='w-7 h-7 rounded-lg object-cover' />
                : <Package size={14} />}
              <span className='text-xs font-medium max-w-[140px] truncate'>{p.source.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* What is being previewed, and how full it came out */}
      <div className='flex items-center gap-3 flex-wrap text-xs text-zinc-500'>
        <span className='font-bold text-zinc-800 truncate max-w-[240px]' title={active.source.title}>{active.source.title}</span>
        <span>{formatINR(active.source.price)}</span>
        <span className={'font-black px-2 py-0.5 rounded-full uppercase text-[10px] ' +
          (active.totalFilled >= MAX_SLOTS ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50')}>
          {active.totalFilled} / {MAX_SLOTS} slots
        </span>
        {pinBusy && <Loader2 size={12} className='animate-spin text-zinc-400' />}
      </div>

      {active.metricSources?.skuIndexPending && (
        <Note kind='warn'>
          Google Analytics view data is still loading in the background. Metrics shown are first-party for now — reopen
          in a few minutes for the full picture.
        </Note>
      )}

      {/* Slot groups, in fill order */}
      {active.slots.map((slot) => {
        const from = slotCursor + 1;
        slotCursor += slot.products.length;
        return (
          <div key={slot.blockIndex + '-' + slot.blockLabel} className='space-y-2.5'>
            <div className='flex items-center gap-2.5 flex-wrap'>
              {slot.pinned ? (
                <span className='flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase'>
                  <Pin size={10} /> Pinned
                </span>
              ) : (
                <h3 className='font-bold text-[11px] uppercase tracking-widest text-zinc-500'>{slot.blockLabel}</h3>
              )}
              {slot.products.length > 0 && (
                <span className='text-[10px] text-zinc-400'>
                  {slot.products.length === 1 ? 'slot ' + from : 'slots ' + from + '-' + (from + slot.products.length - 1)}
                </span>
              )}
            </div>

            {slot.products.length === 0 ? (
              <p className='text-[11px] text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl px-3.5 py-2.5'>
                Nothing matched — these slots pass to the next group or the top-up.
              </p>
            ) : (
              <div className={'grid gap-3 ' + (dense ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
                {slot.products.map((p, i) => (
                  <PreviewCard
                    key={p.id}
                    product={p}
                    slotNumber={from + i}
                    dense={dense}
                    pinned={perProductPins.includes(p.id)}
                    onTogglePin={onTogglePin}
                    pinBusy={pinBusy}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {active.totalFilled < MAX_SLOTS && (
        <Note kind='warn'>
          Only {active.totalFilled} of {MAX_SLOTS} slots filled. Loosen a group&apos;s conditions, switch a group to the
          whole store, turn on top-up, or pin more products.
        </Note>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full preview, as a modal off the rule list
// ---------------------------------------------------------------------------
export function PreviewModal({
  rule,
  data,
  loading,
  activeIndex,
  onSelectSource,
  perProductPins,
  onTogglePin,
  pinBusy,
  onPreviewProduct,
  onClose,
}) {
  if (!rule) return null;
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl'>
        <div className='px-8 py-5 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-4'>
          <div className='min-w-0'>
            <h2 className='text-lg font-bold text-zinc-900 truncate'>Preview — {rule.collectionTitle || rule.collectionHandle}</h2>
            <p className='text-[11px] text-zinc-400 mt-0.5'>
              Exactly what the next run writes. Hover a product to pin it to the front for the selected source.
            </p>
          </div>
          <div className='w-72 shrink-0'>
            <ProductSearch
              small
              icon={Search}
              placeholder='Preview a specific product...'
              onPick={(p) => onPreviewProduct(String(p.id).split('/').pop())}
            />
          </div>
          <button type='button' onClick={onClose} className='text-zinc-400 hover:text-black shrink-0'><X size={20} /></button>
        </div>

        <div className='flex-1 overflow-y-auto px-8 py-6 custom-scrollbar'>
          <PreviewPanel
            data={data}
            loading={loading}
            activeIndex={activeIndex}
            onSelectSource={onSelectSource}
            perProductPins={perProductPins}
            onTogglePin={onTogglePin}
            pinBusy={pinBusy}
          />
        </div>
      </div>
    </div>
  );
}
