'use client';

// Product Information — look up ANY product by SKU / title / handle and see
// everything that matters for a placement decision on one screen: Shopify
// facts (price, stock, variants, collections, status), engagement across the
// 3 / 7 / 30-day windows (views, add-to-carts from GA4 or the beacon; orders
// and revenue exact from Shopify), recent orders, and which smart sorts
// already cover it.

import { useState, useEffect, useRef } from 'react';
import {
  Search, Loader2, Package, ExternalLink, Layers, Database, Tag, Info,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { baseUrl, API, formatPrice, formatDateTime, labelCls, Note, stockState } from './_shared';

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) { return String(d); }
};

export function ProductInsights() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const seqRef = useRef(0);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const seq = ++seqRef.current;
      setSearching(true);
      try {
        const res = await fetch(baseUrl + API + '/product-insights/search?q=' + encodeURIComponent(query));
        const data = await res.json();
        if (seq !== seqRef.current) return;
        setResults(data.success ? data.products || [] : []);
      } catch (err) {
        if (seq === seqRef.current) setResults([]);
      } finally {
        if (seq === seqRef.current) setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const openProduct = async (id) => {
    setResults([]);
    setQuery('');
    setLoading(true);
    try {
      const res = await fetch(baseUrl + API + '/product-insights/' + encodeURIComponent(String(id).split('/').pop()));
      const data = await res.json();
      if (res.ok && data.success) setInsights(data);
      else { toast.error(data.error || 'Could not load product'); }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  const p = insights?.product;

  return (
    <div>
      {/* Search */}
      <div className='relative'>
        <Search size={16} className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none' />
        {searching && <Loader2 size={14} className='absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-zinc-300' />}
        <input
          className='w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black shadow-sm'
          placeholder='Search by SKU, title, or handle — e.g. LJ-CH0018 or "butterfly pendant"...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <div className='absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl max-h-80 overflow-y-auto'>
            {results.map((r) => (
              <button
                key={r.id}
                type='button'
                className='w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center gap-3'
                onClick={() => openProduct(r.id)}
              >
                {r.image ? <img src={r.image} alt='' className='w-9 h-9 rounded-lg object-cover' /> : <Package size={16} className='text-zinc-300' />}
                <span className='flex-1 min-w-0'>
                  <span className='block text-xs font-medium text-zinc-700 truncate'>{r.title}</span>
                  <span className='block text-[10px] text-zinc-400 font-mono truncate'>{r.sku || r.handle}</span>
                </span>
                <span className='text-[10px] text-zinc-400 shrink-0'>{formatPrice(r.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className='flex justify-center py-32'><Loader2 className='animate-spin text-zinc-300' size={36} /></div>
      )}

      {!loading && !insights && (
        <div className='text-center py-28'>
          <Database size={32} className='mx-auto text-zinc-200 mb-4' />
          <h2 className='text-base font-bold text-zinc-700'>Everything about one product</h2>
          <p className='text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed'>
            Search any product to see its views, add-to-carts, orders and revenue across 3 / 7 / 30 days, stock per
            variant, recent orders, and where it sits in your smart sorts — the full picture behind a placement call.
          </p>
        </div>
      )}

      {!loading && insights && p && (
        <div className='mt-8'><InsightsBody insights={insights} /></div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The product report itself, driven ONLY by a /product-insights/:id payload.
// Split out of the page so the curate preview can open the same report in a
// drawer next to the tile being placed.
// ---------------------------------------------------------------------------
export function InsightsBody({ insights }) {
  const p = insights?.product;
  if (!p) return null;
  return (
    <div className='space-y-6'>
    {/* ----- Header card ----- */}
    <div className='bg-white border border-zinc-100 rounded-[1.75rem] shadow-sm p-6 flex flex-col md:flex-row gap-6'>
      <div className='w-36 h-36 rounded-2xl bg-zinc-50 overflow-hidden shrink-0'>
        {p.image
          ? <img src={p.image} alt={p.title} className='w-full h-full object-cover' />
          : <Package size={28} className='w-full h-full p-10 text-zinc-200' />}
      </div>
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2 flex-wrap'>
          <h2 className='text-lg font-bold text-zinc-900'>{p.title}</h2>
          <span className={'text-[9px] font-black px-2 py-0.5 rounded-full uppercase ' +
            (p.status === 'ACTIVE' && p.live ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50')}>
            {p.status === 'ACTIVE' && p.live ? 'Live' : p.status}
          </span>
          <span
            className={'text-[9px] font-black px-2 py-0.5 rounded-full uppercase ' + stockState(p).cls}
            title={stockState(p).key === 'made'
              ? 'Purchasable with nothing on hand: every variant is inventoryQuantity 0 with "continue selling when out of stock" on, i.e. sold made-to-order'
              : undefined}
          >
            {stockState(p).label}
          </span>
        </div>
        <div className='text-[11px] text-zinc-400 font-mono mt-1'>{p.handle}</div>

        <div className='flex items-center gap-5 flex-wrap mt-3 text-xs text-zinc-600'>
          <span className='text-base font-bold text-zinc-900'>
            {formatPrice(p.price)}
            {p.compareAtPrice > p.price && (
              <>
                <span className='ml-2 text-xs font-normal text-zinc-400 line-through'>{formatPrice(p.compareAtPrice)}</span>
                <span className='ml-1.5 text-[10px] font-black text-emerald-600'>{p.discountPercent}% off</span>
              </>
            )}
          </span>
          <span>
            Inventory: <b>{p.totalInventory}</b>
            {p.totalInventory <= 0 && p.buyable && (
              <span className='text-amber-600'> &mdash; nothing on hand, sold to order</span>
            )}
          </span>
          {p.productType && <span>Type: <b>{p.productType}</b></span>}
          {p.shopFor && <span>Audience: <b>{p.shopFor}</b></span>}
          {p.stoneType && <span>Stone: <b>{p.stoneType}</b></span>}
        </div>

        <div className='flex items-center gap-4 flex-wrap mt-2 text-[11px] text-zinc-400'>
          <span>Created {fmtDate(p.createdAt)}</span>
          <span>Published {fmtDate(p.publishedAt)}</span>
          <span>Popularity score: <b className='text-zinc-600'>{insights.popularity}</b></span>
          <a
            href={'https://admin.shopify.com/products/' + String(p.id).split('/').pop()}
            target='_blank' rel='noreferrer'
            className='flex items-center gap-1 text-zinc-500 hover:text-black font-bold'
          >
            Open in Shopify <ExternalLink size={11} />
          </a>
        </div>

        {p.tags.length > 0 && (
          <div className='flex items-center gap-1.5 flex-wrap mt-3'>
            <Tag size={11} className='text-zinc-300' />
            {p.tags.slice(0, 12).map((t) => (
              <span key={t} className='text-[10px] px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full'>{t}</span>
            ))}
            {p.tags.length > 12 && <span className='text-[10px] text-zinc-400'>+{p.tags.length - 12} more</span>}
          </div>
        )}
      </div>
    </div>

    {/* ----- Engagement windows ----- */}
    <div className='bg-white border border-zinc-100 rounded-[1.75rem] shadow-sm p-6'>
      <div className='flex items-center justify-between flex-wrap gap-2 mb-4'>
        <span className={labelCls}>Engagement &amp; money</span>
        <span className='text-[10px] text-zinc-400 flex items-center gap-1'>
          <Info size={10} />
          views/carts: {insights.metricSources?.views === 'ga4' ? 'Google Analytics' : 'first-party'} · orders/revenue: Shopify (exact)
        </span>
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-xs min-w-[540px]'>
          <thead>
            <tr className='text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100'>
              <th className='py-2 pr-4'>Window</th>
              <th className='py-2 pr-4'>Views</th>
              <th className='py-2 pr-4'>Add to carts</th>
              <th className='py-2 pr-4'>Orders</th>
              <th className='py-2 pr-4'>Revenue</th>
              <th className='py-2 pr-4'>View &rarr; cart</th>
              <th className='py-2'>View &rarr; order</th>
            </tr>
          </thead>
          <tbody>
            {(insights.windows || []).map((w) => (
              <tr key={w.days} className='border-b border-zinc-50'>
                <td className='py-2.5 pr-4 font-bold text-zinc-700'>Last {w.days} days</td>
                <td className='py-2.5 pr-4 text-zinc-600'>{w.views}</td>
                <td className='py-2.5 pr-4 text-zinc-600'>{w.atc}</td>
                <td className='py-2.5 pr-4 text-zinc-600'>{w.orders}</td>
                <td className='py-2.5 pr-4 text-zinc-600'>{formatPrice(w.revenue)}</td>
                <td className='py-2.5 pr-4 text-zinc-600'>{w.atcRate}%</td>
                <td className='py-2.5 text-zinc-600'>{w.viewToOrderRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {insights.metricSources?.skuIndexPending && (
        <div className='mt-3'>
          <Note kind='warn'>
            Google Analytics view data is still loading in the background — views/carts shown are first-party
            for now. Check back in a few minutes.
          </Note>
        </div>
      )}
    </div>

    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      {/* ----- Variants ----- */}
      <div className='bg-white border border-zinc-100 rounded-[1.75rem] shadow-sm p-6'>
        <span className={labelCls}>Variants &amp; stock ({p.variants.length})</span>
        <div className='mt-3 max-h-72 overflow-y-auto custom-scrollbar'>
          <table className='w-full text-xs'>
            <thead>
              <tr className='text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100'>
                <th className='py-2 pr-3'>SKU</th>
                <th className='py-2 pr-3'>Variant</th>
                <th className='py-2 pr-3'>Price</th>
                <th className='py-2'>Stock</th>
              </tr>
            </thead>
            <tbody>
              {p.variants.map((v) => (
                <tr key={v.id} className='border-b border-zinc-50'>
                  <td className='py-2 pr-3 font-mono text-[10px] text-zinc-500'>{v.sku || '—'}</td>
                  <td className='py-2 pr-3 text-zinc-600 truncate max-w-[10rem]' title={v.title}>{v.title}</td>
                  <td className='py-2 pr-3 text-zinc-600'>{formatPrice(v.price)}</td>
                  <td className='py-2'>
                    <span className={'text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ' +
                      (v.availableForSale ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50')}>
                      {v.availableForSale ? (v.inventoryQuantity > 0 ? v.inventoryQuantity + ' units' : 'made to order') : 'unavailable'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----- Recent orders ----- */}
      <div className='bg-white border border-zinc-100 rounded-[1.75rem] shadow-sm p-6'>
        <span className={labelCls}>Recent orders with this product</span>
        {insights.recentOrders.length === 0 ? (
          <p className='text-xs text-zinc-400 mt-3'>No recent orders found for this product&apos;s SKU.</p>
        ) : (
          <div className='mt-3 max-h-72 overflow-y-auto custom-scrollbar'>
            <table className='w-full text-xs'>
              <thead>
                <tr className='text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100'>
                  <th className='py-2 pr-3'>Order</th>
                  <th className='py-2 pr-3'>Date</th>
                  <th className='py-2 pr-3'>Qty</th>
                  <th className='py-2 pr-3'>Amount</th>
                  <th className='py-2'>Status</th>
                </tr>
              </thead>
              <tbody>
                {insights.recentOrders.map((o) => (
                  <tr key={o.name} className='border-b border-zinc-50'>
                    <td className='py-2 pr-3 font-bold text-zinc-700'>{o.name}</td>
                    <td className='py-2 pr-3 text-zinc-500 whitespace-nowrap'>{formatDateTime(o.createdAt)}</td>
                    <td className='py-2 pr-3 text-zinc-600'>{o.quantity}</td>
                    <td className='py-2 pr-3 text-zinc-600'>{formatPrice(o.amount)}</td>
                    <td className='py-2 text-[10px] text-zinc-500 uppercase'>{o.financialStatus || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {/* ----- Collections & smart sorts ----- */}
    <div className='bg-white border border-zinc-100 rounded-[1.75rem] shadow-sm p-6'>
      <div className='flex items-center gap-2 mb-3'>
        <Layers size={13} className='text-zinc-400' />
        <span className={labelCls}>Collections ({p.collections.length})</span>
      </div>
      <div className='flex flex-wrap gap-1.5'>
        {p.collections.map((c) => {
          const smart = (insights.smartRules || []).find((r) => r.collectionHandle === c.handle);
          return (
            <span
              key={c.id}
              className={'text-[10px] px-2.5 py-1 rounded-full border ' +
                (smart
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 font-bold'
                  : 'border-zinc-200 bg-white text-zinc-500')}
              title={smart ? 'This collection has a smart sort' + (smart.enabled ? ' (live)' : ' (paused)') : undefined}
            >
              {c.title}{smart && <span className='ml-1'>· smart sort{smart.enabled ? '' : ' (paused)'}</span>}
            </span>
          );
        })}
        {p.collections.length === 0 && <span className='text-xs text-zinc-400'>Not in any collection.</span>}
      </div>
    </div>
    </div>
  );
}
