'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Save, MoveUp, MoveDown, Package, X, Loader2, Target, Upload, Crosshair, AlertTriangle } from 'lucide-react';
import { uploadToShopify } from "../../../../lib/utils";
import { toast } from 'react-toastify';

const EMPTY_LOOK = {
  name: '',
  image: '',
  assetName: '',
  href: '',
  showHotspots: false,
  autoSwitchSeconds: 0,
  products: [],
};

const DEFAULT_INTERVAL = 5;

export default function CuratedLooksDashboard() {
  const [look, setLook] = useState(EMPTY_LOOK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // When set, the next click on the image assigns a position to this product index.
  const [placingIndex, setPlacingIndex] = useState(null);

  const fetchLook = async () => {
    try {
      const res = await fetch('/api/curated-looks');
      const data = await res.json();
      if (data.success) setLook({ ...EMPTY_LOOK, ...(data.look || {}) });
    } catch (err) {
      console.error('Fetch error', err);
      toast.error('Could not load the curated look');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLook(); }, []);

  useEffect(() => {
    if (!searchTerm) return setSearchResults([]);
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch('/api/products/search?q=' + encodeURIComponent(searchTerm) + '&limit=8');
        const data = await res.json();
        setSearchResults(data.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const patch = (fields) => setLook((prev) => ({ ...prev, ...fields }));

  const patchProducts = (fn) => setLook((prev) => ({ ...prev, products: fn(prev.products) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/curated-looks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(look),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Curated look saved successfully!');
      fetchLook();
    } catch (err) {
      toast.error('Error saving the look');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      // Same shape hero-banners uses: a sanitised, unique name that keeps the
      // original extension. Falls back to it whenever Asset Name is blank.
      const assetName = look.assetName?.trim()
        ? look.assetName.trim()
        : `CuratedLooks-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const url = await uploadToShopify(file, assetName);
      if (url) {
        patch({ image: url });
        toast.success('Image uploaded successfully');
      }
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleImageClick = (e) => {
    if (placingIndex === null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    patchProducts((products) =>
      products.map((p, i) => (i === placingIndex ? { ...p, x: x.toFixed(2) + '%', y: y.toFixed(2) + '%' } : p))
    );
    setPlacingIndex(null);
  };

  const selectProduct = (product) => {
    const formatPrice = (num) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(num));
    patchProducts((products) => [...products, {
      id: Date.now(),
      productId: product.id,
      handle: product.handle,
      name: product.title,
      image: product.image || '',
      price: formatPrice(product.price || 0),
      href: '/products/' + product.handle,
      x: null,
      y: null,
    }]);
    setSearchOpen(false);
    setSearchTerm('');
    setSearchResults([]);
  };

  const moveProduct = (index, dir) => {
    if ((dir === -1 && index === 0) || (dir === 1 && index === look.products.length - 1)) return;
    patchProducts((products) => {
      const next = [...products];
      [next[index], next[index + dir]] = [next[index + dir], next[index]];
      return next;
    });
  };

  const removeProduct = (index) => {
    patchProducts((products) => products.filter((_, i) => i !== index));
    setPlacingIndex(null);
  };

  const positionedProducts = look.products.filter((p) => p.x && p.y);
  const missingPositions = look.showHotspots ? look.products.length - positionedProducts.length : 0;

  if (loading) return <div className='flex justify-center py-40'><Loader2 className='animate-spin text-zinc-300' size={40} /></div>;

  return (
    <div className='max-w-7xl mx-auto px-8 py-10'>
      <div className='flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6'>
        <div>
          <h1 className='text-zinc-900 text-[24px] font-bold font-figtree tracking-[0.1px]'>Curated Looks Management</h1>
          <p style={{ marginTop: '2px', fontSize: '16px', color: '#000' }}>One look image, with its shoppable products shown alongside it on the homepage.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className='bg-black text-white px-6 py-3 rounded-[8px] font-bold text-[10px] uppercase disabled:opacity-50 flex items-center gap-2 justify-center'>
          {saving ? <Loader2 size={16} className='animate-spin' /> : <Save size={16} />} SAVE CHANGES
        </button>
      </div>

      <div className='bg-white rounded-[8px] border border-zinc-100 shadow-xl overflow-hidden'>
        <div className='p-8 grid grid-cols-1 lg:grid-cols-12 gap-10'>

          {/* ---------- Image canvas ---------- */}
          <div className='lg:col-span-5 space-y-4'>
            <div className='flex justify-between items-center min-h-[30px]'>
              <label className='text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-2'><Target size={12} /> LOOK IMAGE (860&times;860)</label>
              {placingIndex !== null && (
                <span className='text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-black text-white animate-pulse'>
                  CLICK IMAGE FOR #{placingIndex + 1}
                </span>
              )}
            </div>

            <div
              // Square, matching the storefront: hotspot x/y are percentages of
              // the rendered box, so a different ratio here would drift every pin.
              className={'relative aspect-square rounded-[8px] overflow-hidden bg-zinc-50 border border-zinc-100 shadow-inner ' + (placingIndex !== null ? 'cursor-crosshair ring-2 ring-black' : '')}
              onClick={handleImageClick}
            >
              {look.image ? (
                <>
                  <img src={look.image} alt='Look' className='w-full h-full object-cover' key={look.image} />
                  {look.showHotspots && look.products.map((p, i) => (
                    p.x && p.y ? (
                      <div key={p.id ?? i} className='absolute z-10 -translate-x-1/2 -translate-y-1/2' style={{ left: p.x, top: p.y }}>
                        <div className='w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center bg-black/40 backdrop-blur-sm'>
                          <span className='text-[10px] font-bold text-white'>{i + 1}</span>
                        </div>
                      </div>
                    ) : null
                  ))}
                </>
              ) : (
                <div className='absolute inset-0 flex flex-col items-center justify-center text-zinc-300 gap-4'>
                  <Target size={48} strokeWidth={1} />
                  <p className='text-[10px] font-bold uppercase'>NO IMAGE PROVIDED</p>
                </div>
              )}
              {uploading && <div className='absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center'><Loader2 className='animate-spin text-black' size={40} /></div>}
            </div>

            {look.showHotspots && (
              <p className='text-[11px] text-zinc-400 leading-relaxed'>
                Pins mark where each product sits on the image. Use <span className='font-bold text-zinc-600'>Set position</span> on a product below, then click the image.
              </p>
            )}
          </div>

          {/* ---------- Settings ---------- */}
          <div className='lg:col-span-7 space-y-8'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-2'>
                <label className='text-[10px] font-bold text-zinc-400'>LOOK NAME</label>
                <input value={look.name || ''} onChange={(e) => patch({ name: e.target.value })} placeholder='e.g. Summer Engagement' className='w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black font-bold' />
              </div>
              <div className='space-y-2'>
                <label className='text-[10px] font-bold text-zinc-400'>ASSET NAME</label>
                <input value={look.assetName || ''} onChange={(e) => patch({ assetName: e.target.value })} placeholder='e.g. engagement-banner' className='w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black' />
              </div>
              <div className='space-y-2 md:col-span-2'>
                <label className='text-[10px] font-bold text-zinc-400 flex items-center justify-between'>IMAGE URL <span className='text-zinc-300 flex items-center gap-1'><Upload size={10} /> DIRECT UPLOAD</span></label>
                <div className='flex gap-2'>
                  <input value={look.image || ''} onChange={(e) => patch({ image: e.target.value })} placeholder='https://cdn.shopify.com/...' className='flex-1 px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black' />
                  <label className='shrink-0 w-14 flex items-center justify-center rounded-[8px] border-2 border-dashed border-zinc-200 hover:border-black transition-all cursor-pointer'>
                    <Upload size={20} className='text-zinc-300' />
                    <input type='file' className='hidden' accept='image/*' onChange={handleUpload} />
                  </label>
                </div>
              </div>
              <div className='space-y-2 md:col-span-2'>
                <label className='text-[10px] font-bold text-zinc-400'>COLLECTION LINK</label>
                <input value={look.href || ''} onChange={(e) => patch({ href: e.target.value })} placeholder='/collections/...' className='w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black' />
              </div>
            </div>

            {/* Display options */}
            <div className='space-y-3'>
              <label className='text-[10px] font-bold text-zinc-400'>DISPLAY OPTIONS</label>

              <button
                type='button'
                onClick={() => { patch({ showHotspots: !look.showHotspots }); setPlacingIndex(null); }}
                className={'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors ' + (look.showHotspots ? 'border-black bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300')}
              >
                <span className={'relative w-9 h-5 rounded-full transition-colors flex-none ' + (look.showHotspots ? 'bg-black' : 'bg-zinc-200')}>
                  <span className={'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ' + (look.showHotspots ? 'left-[18px]' : 'left-0.5')} />
                </span>
                <span>
                  <span className='block text-xs font-bold text-zinc-800'>Show hotspots on the image</span>
                  <span className='block text-[11px] text-zinc-400'>Pins appear on the photo and jump the carousel to that product. Off means a plain photo.</span>
                </span>
              </button>

              <button
                type='button'
                onClick={() => patch({ autoSwitchSeconds: look.autoSwitchSeconds > 0 ? 0 : DEFAULT_INTERVAL })}
                className={'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors ' + (look.autoSwitchSeconds > 0 ? 'border-black bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300')}
              >
                <span className={'relative w-9 h-5 rounded-full transition-colors flex-none ' + (look.autoSwitchSeconds > 0 ? 'bg-black' : 'bg-zinc-200')}>
                  <span className={'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ' + (look.autoSwitchSeconds > 0 ? 'left-[18px]' : 'left-0.5')} />
                </span>
                <span>
                  <span className='block text-xs font-bold text-zinc-800'>Auto-switch products</span>
                  <span className='block text-[11px] text-zinc-400'>Advance to the next product on a timer. Pauses while a shopper is interacting.</span>
                </span>
              </button>

              {look.autoSwitchSeconds > 0 && (
                <div className='flex items-center gap-3 pl-4'>
                  <label className='text-[11px] font-bold text-zinc-500'>Switch every</label>
                  <input
                    type='number'
                    min='1'
                    max='60'
                    value={look.autoSwitchSeconds}
                    onChange={(e) => patch({ autoSwitchSeconds: Math.max(1, Math.min(60, Number(e.target.value) || 1)) })}
                    className='w-20 px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-[8px] text-sm text-center focus:outline-none focus:ring-2 focus:ring-black font-bold'
                  />
                  <span className='text-[11px] font-bold text-zinc-500'>seconds</span>
                </div>
              )}
            </div>

            {/* Products */}
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <label className='text-[10px] font-bold text-zinc-400'>PRODUCTS ({look.products.length})</label>
                <button onClick={() => setSearchOpen(true)} className='bg-white border border-zinc-200 px-4 py-2 rounded-[8px] font-bold text-[10px] uppercase text-zinc-600 flex items-center gap-2 hover:border-black transition-colors'>
                  <Plus size={14} /> ADD PRODUCT
                </button>
              </div>

              {missingPositions > 0 && (
                <div className='flex items-start gap-3 p-3 rounded-[8px] bg-amber-50 border border-amber-100'>
                  <AlertTriangle size={16} className='text-amber-500 shrink-0 mt-0.5' />
                  <p className='text-[11px] text-amber-700 leading-relaxed'>
                    {missingPositions} product{missingPositions > 1 ? 's have' : ' has'} no position yet, so {missingPositions > 1 ? 'they' : 'it'} won&apos;t show a pin on the image. The carousel still lists {missingPositions > 1 ? 'them' : 'it'}.
                  </p>
                </div>
              )}

              {look.products.length === 0 ? (
                <div className='py-10 flex items-center justify-center border-2 border-dashed border-zinc-100 rounded-[8px]'>
                  <p className='text-[10px] font-bold uppercase text-zinc-300'>NO PRODUCTS ADDED</p>
                </div>
              ) : (
                <div className='grid grid-cols-1 gap-4'>
                  {look.products.map((p, i) => (
                    <div key={p.id ?? i} className='p-4 rounded-[8px] border border-zinc-100 flex items-center gap-5 bg-white group/spot'>
                      <div className='w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100 font-bold text-xs'>{i + 1}</div>
                      <div className='w-14 h-14 bg-zinc-50 rounded-[8px] overflow-hidden relative border border-zinc-100 shrink-0'>
                        <img src={p.image} alt='' className='w-full h-full object-cover' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <h4 className='text-sm font-bold truncate'>{p.name}</h4>
                        <p className='text-xs font-bold text-zinc-500'>{p.price}</p>
                        {look.showHotspots && (
                          <p className='text-[10px] font-bold uppercase mt-1 text-zinc-400'>
                            {p.x && p.y ? `PIN AT ${p.x} / ${p.y}` : 'NO PIN PLACED'}
                          </p>
                        )}
                      </div>
                      <div className='flex items-center gap-1'>
                        {look.showHotspots && (
                          <button
                            onClick={() => setPlacingIndex(placingIndex === i ? null : i)}
                            title='Set position on the image'
                            className={'p-2 rounded-[8px] transition-colors ' + (placingIndex === i ? 'bg-black text-white' : 'text-zinc-400 hover:text-black')}
                          >
                            <Crosshair size={16} />
                          </button>
                        )}
                        <button onClick={() => moveProduct(i, -1)} disabled={i === 0} className='p-2 text-zinc-400 hover:text-black disabled:opacity-30'><MoveUp size={16} /></button>
                        <button onClick={() => moveProduct(i, 1)} disabled={i === look.products.length - 1} className='p-2 text-zinc-400 hover:text-black disabled:opacity-30'><MoveDown size={16} /></button>
                        <button onClick={() => removeProduct(i)} className='p-2 text-rose-300 hover:text-rose-500'><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div className='bg-white w-full max-w-2xl rounded-[8px] shadow-2xl overflow-hidden border border-zinc-100'>
            <div className='p-8 border-b border-zinc-50 flex justify-between items-center bg-zinc-50/50'>
              <h2 className='text-xl font-bold flex items-center gap-3'><Package size={24} className='text-zinc-400' /> ADD PRODUCT</h2>
              <button onClick={() => { setSearchOpen(false); setSearchTerm(''); setSearchResults([]); }} className='p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-zinc-200'><X size={20} /></button>
            </div>
            <div className='p-8 space-y-8'>
              <input type='text' autoFocus placeholder='Search products...' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className='w-full px-6 py-4 bg-zinc-100/50 border border-transparent focus:border-zinc-200 rounded-[8px] text-sm focus:outline-none focus:ring-4 focus:ring-black/5 font-medium' />
              <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                {searching ? (
                  <div className='flex justify-center py-10'><Loader2 className='animate-spin text-zinc-200' /></div>
                ) : searchResults.map((p) => (
                  <button key={p.id} onClick={() => selectProduct(p)} className='w-full flex items-center gap-5 p-4 rounded-[8px] hover:bg-zinc-50 transition-all text-left border border-transparent hover:border-zinc-100'>
                    <div className='w-16 h-16 bg-white rounded-[8px] border border-zinc-100 overflow-hidden shrink-0'><img src={p.image || p.images?.[0]?.url} alt='' className='w-full h-full object-cover' /></div>
                    <div className='flex-1'><p className='font-bold text-sm'>{p.title}</p><p className='text-xs font-bold'>₹{new Intl.NumberFormat('en-IN').format(p.price)}</p></div>
                    <Plus size={16} className='text-zinc-300' />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
