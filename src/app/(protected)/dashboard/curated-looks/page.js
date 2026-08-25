'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Save, MoveUp, MoveDown, Package, X, Loader2, Target, ExternalLink, Upload } from 'lucide-react';
import { uploadToShopify } from "../../../../lib/utils";
import { toast } from 'react-toastify';

export default function CuratedLooksDashboard() {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null);
  const [isCapturingCoord, setIsCapturingCoord] = useState(null);

  const fetchLooks = async () => {
    try {
      const res = await fetch('/api/curated-looks');
      const data = await res.json();
      if (data.success) {
        console.log('Fetched:', data.looks);
        setLooks(data.looks || []);
      }
    } catch (err) {
      console.error('Fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLooks(); }, []);

  const searchProducts = async (q) => {
    if (!q) return setSearchResults([]);
    setSearching(true);
    try {
      const res = await fetch('/api/products/search?q=' + encodeURIComponent(q) + '&limit=5');
      const data = await res.json();
      setSearchResults(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (searchTerm) searchProducts(searchTerm); }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/curated-looks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(looks),
      });
      if (res.ok) {
        toast.success('Curated looks saved successfully!');
        fetchLooks(); // Refresh to get clean state
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      toast.error('Error saving looks');
    } finally {
      setSaving(false);
    }
  };

  const addLook = () => setLooks([...looks, { name: '', image: '', assetName: '', href: '', hotspots: [] }]);
  const removeLook = (index) => { if (confirm('Remove look?')) { const nl = [...looks]; nl.splice(index, 1); setLooks(nl); } };
  const updateLook = (index, field, value) => { const nl = [...looks]; nl[index][field] = value; setLooks(nl); };
  const moveLook = (index, dir) => {
    if ((dir === -1 && index === 0) || (dir === 1 && index === looks.length - 1)) return;
    const nl = [...looks];
    const temp = nl[index];
    nl[index] = nl[index + dir];
    nl[index + dir] = temp;
    setLooks(nl);
  };

  const handleUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(index);
      const url = await uploadToShopify(file, looks[index].assetName);
      if (url) {
        console.log('New URL:', url);
        updateLook(index, 'image', url);
        toast.success('Image uploaded successfully');
      }
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(null);
    }
  };

  const handleImageClick = (e, lookIndex) => {
    if (isCapturingCoord !== lookIndex) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const nl = [...looks];
    nl[lookIndex].hotspots.push({ id: Date.now(), x: x.toFixed(2) + '%', y: y.toFixed(2) + '%', product: null });
    setLooks(nl);
    setIsCapturingCoord(null);
    setActiveSlot({ lookIndex, hotspotIndex: nl[lookIndex].hotspots.length - 1 });
  };

  const selectProduct = (product) => {
    if (!activeSlot) return;
    const { lookIndex, hotspotIndex } = activeSlot;
    const nl = [...looks];
    const formatPrice = (num) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(num));
    nl[lookIndex].hotspots[hotspotIndex].product = {
      productId: product.id,
      name: product.title,
      image: product.image || '',
      price: formatPrice(product.price || 0),
      href: '/products/' + product.handle
    };
    setLooks(nl);
    setActiveSlot(null);
    setSearchTerm('');
  };

  if (loading) return <div className='flex justify-center py-40'><Loader2 className='animate-spin text-zinc-300' size={40} /></div>;

  return (
    <div className='max-w-7xl mx-auto px-8 py-10'>
      <div className='flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6'>
        <div><h1 className='text-zinc-900 text-[24px] font-bold font-figtree tracking-[0.1px]'>Curated Looks Management</h1><p className='text-zinc-500 mt-1' style={{ marginTop: '2px', fontSize: '16px', color: '#000' }}>Create Shoppable lookbooks with interactive hotspots.</p></div>
        <div className='flex gap-3'>
          <button onClick={addLook} className='bg-white border border-zinc-200 px-6 py-3 rounded-[8px] font-bold text-[10px] uppercase text-zinc-600'><Plus size={16} /> ADD NEW LOOK</button>
          <button onClick={handleSave} disabled={saving} className='bg-black text-white px-6 py-3 rounded-[8px] font-bold text-[10px] uppercase disabled:opacity-50'>{saving ? <Loader2 size={16} className='animate-spin' /> : <Save size={16} />} SAVE ALL CHANGES</button>
        </div>
      </div>

      <div className='space-y-12'>
        {looks.map((look, lIndex) => (
          <div key={lIndex} className='bg-white rounded-[8px] border border-zinc-100 shadow-xl overflow-hidden flex flex-col group transition-all hover:shadow-2xl'>
            <div className='px-8 py-5 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50'>
              <div className='flex items-center gap-4'>
                <div className='w-10 h-10 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold'>{lIndex + 1}</div>
                <div><h3 className='font-bold text-[10px] uppercase text-zinc-400'>LOOK SETTING</h3><p className='text-sm font-bold text-zinc-900'>{look.name || 'Untitled Look'}</p></div>
              </div>
              <div className='flex items-center gap-2'>
                <button onClick={() => moveLook(lIndex, -1)} disabled={lIndex === 0} className='p-2 hover:bg-white rounded-[8px] disabled:opacity-30'><MoveUp size={16} /></button>
                <button onClick={() => moveLook(lIndex, 1)} disabled={lIndex === looks.length - 1} className='p-2 hover:bg-white rounded-[8px] disabled:opacity-30'><MoveDown size={16} /></button>
                <button onClick={() => removeLook(lIndex)} className='p-2 text-rose-500 hover:bg-rose-50 rounded-[8px]'><Trash2 size={18} /></button>
              </div>
            </div>

            <div className='p-8 grid grid-cols-1 lg:grid-cols-12 gap-10'>
                <div className='lg:col-span-5 space-y-4'>
                  <div className='flex justify-between items-center'><label className='text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-2'><Target size={12} /> INTERACTIVE CANVAS</label><button onClick={() => setIsCapturingCoord(isCapturingCoord === lIndex ? null : lIndex)} className={'text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ' + (isCapturingCoord === lIndex ? 'bg-black text-white animate-pulse' : 'bg-zinc-100 text-zinc-500')}> {isCapturingCoord === lIndex ? 'CLICK ON IMAGE' : 'ADD HOTSPOT'} </button></div>
                  <div className={'relative aspect-[3/4] rounded-[8px] overflow-hidden bg-zinc-50 border border-zinc-100 shadow-inner ' + (isCapturingCoord === lIndex ? 'cursor-crosshair ring-2 ring-black' : '')} onClick={(e) => handleImageClick(e, lIndex)}>
                    {look.image ? (
                        <>
                            <img src={look.image} alt='Look' className='w-full h-full object-cover' key={look.image} />
                            {look.hotspots.map((spot, sIndex) => (
                                <div key={spot.id} className='absolute z-10 -translate-x-1/2 -translate-y-1/2' style={{ left: spot.x, top: spot.y }}>
                                    <div className='w-8 h-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center bg-black/40 backdrop-blur-sm'><span className='text-[10px] font-bold text-white'>{sIndex + 1}</span></div>
                                </div>
                            ))}
                        </>
                    ) : ( <div className='absolute inset-0 flex flex-col items-center justify-center text-zinc-300 gap-4'><Target size={48} strokeWidth={1} /><p className='text-[10px] font-bold uppercase'>NO IMAGE PROVIDED</p></div> )}
                    {uploading === lIndex && <div className='absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center'><Loader2 className='animate-spin text-black' size={40} /></div>}
                  </div>
                </div>

                <div className='lg:col-span-7 space-y-8'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className='space-y-2'><label className='text-[10px] font-bold text-zinc-400'>LOOK NAME</label><input value={look.name || ''} onChange={(e) => updateLook(lIndex, 'name', e.target.value)} placeholder='e.g. Summer Engagement' className='w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black font-bold' /></div>
                    <div className='space-y-2'><label className='text-[10px] font-bold text-zinc-400'>ASSET NAME</label><input value={look.assetName || ''} onChange={(e) => updateLook(lIndex, 'assetName', e.target.value)} placeholder='e.g. engagement-banner' className='w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black' /></div>
                    <div className='space-y-2 md:col-span-2'><label className='text-[10px] font-bold text-zinc-400 flex items-center justify-between'>IMAGE URL <span className='text-zinc-300'><Upload size={10} /> DIRECT UPLOAD</span></label><div className='flex gap-2'><input value={look.image || ''} onChange={(e) => updateLook(lIndex, 'image', e.target.value)} placeholder='/images/curated/...' className='flex-1 px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black' /><label className='shrink-0 w-14 flex items-center justify-center rounded-[8px] border-2 border-dashed border-zinc-200 hover:border-black transition-all cursor-pointer'><Upload size={20} className='text-zinc-300' /><input type='file' className='hidden' accept='image/*' onChange={(e) => handleUpload(e, lIndex)} /></label></div></div>
                    <div className='space-y-2 md:col-span-2'><label className='text-[10px] font-bold text-zinc-400'>COLLECTION LINK</label><input value={look.href || ''} onChange={(e) => updateLook(lIndex, 'href', e.target.value)} placeholder='/collections/...' className='w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black' /></div>
                  </div>
                  <div className='space-y-4'>
                    <label className='text-[10px] font-bold text-zinc-400'>HOTSPOT PRODUCTS ({look.hotspots.length})</label>
                    <div className='grid grid-cols-1 gap-4'>
                      {look.hotspots.map((spot, sIndex) => (
                        <div key={spot.id} className='p-4 rounded-[8px] border border-zinc-100 flex items-center gap-5 bg-white group/spot'>
                            <div className='w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center shrink-0 border border-zinc-100 font-bold text-xs'>{sIndex + 1}</div>
                            <div className='flex-1 flex items-center gap-4 min-w-0'>
                                {spot.product ? (
                                    <>
                                        <div className='w-14 h-14 bg-zinc-50 rounded-[8px] overflow-hidden relative border border-zinc-100 shrink-0'><img src={spot.product.image} className='w-full h-full object-cover' /></div>
                                        <div className='flex-1 min-w-0'><h4 className='text-sm font-bold truncate'>{spot.product.name}</h4><p className='text-xs font-bold'>{spot.product.price}</p></div>
                                    </>
                                ) : ( <div className='flex-1 py-4 flex items-center justify-center border-2 border-dashed border-zinc-100 rounded-[8px]'><button onClick={() => setActiveSlot({ lookIndex: lIndex, hotspotIndex: sIndex })} className='text-[10px] font-bold uppercase text-zinc-400 hover:text-black'>ASSIGN PRODUCT</button></div> )}
                            </div>
                            <div className='flex gap-1 opacity-0 group-hover/spot:opacity-100 transition-opacity'>
                                <button onClick={() => setActiveSlot({ lookIndex: lIndex, hotspotIndex: sIndex })} className='p-2 text-zinc-400 hover:text-black'><Search size={16} /></button>
                                <button onClick={() => { const nl = [...looks]; nl[lIndex].hotspots.splice(sIndex, 1); setLooks(nl); }} className='p-2 text-rose-300 hover:text-rose-500'><Trash2 size={16} /></button>
                            </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            </div>
          </div>
        ))}
      </div>
      {activeSlot !== null && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div className='bg-white w-full max-w-2xl rounded-[8px] shadow-2xl overflow-hidden border border-zinc-100'>
            <div className='p-8 border-b border-zinc-50 flex justify-between items-center bg-zinc-50/50'><h2 className='text-xl font-bold flex items-center gap-3'><Package size={24} className='text-zinc-400' /> TAG PRODUCT</h2><button onClick={() => { setActiveSlot(null); setSearchTerm(''); setSearchResults([]); }} className='p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-zinc-200'><X size={20} /></button></div>
            <div className='p-8 space-y-8'>
              <input type='text' autoFocus placeholder='Search products...' value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className='w-full px-6 py-4 bg-zinc-100/50 border border-transparent focus:border-zinc-200 rounded-[8px] text-sm focus:outline-none focus:ring-4 focus:ring-black/5 font-medium' />
              <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                {searching ? <div className='flex justify-center py-10'><Loader2 className='animate-spin text-zinc-200' /></div> : searchResults.map(p => (
                  <button key={p.id} onClick={() => selectProduct(p)} className='w-full flex items-center gap-5 p-4 rounded-[8px] hover:bg-zinc-50 transition-all text-left border border-transparent hover:border-zinc-100'>
                    <div className='w-16 h-16 bg-white rounded-[8px] border border-zinc-100 overflow-hidden shrink-0'><img src={p.image || p.images?.[0]?.url} className='w-full h-full object-cover' /></div>
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
