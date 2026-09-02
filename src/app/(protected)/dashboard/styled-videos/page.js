'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Save, MoveUp, MoveDown, Video, Package, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-toastify';
import SafeVideo from '../../../../components/common/SafeVideo';

export default function StyledVideosDashboard() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeSlot, setActiveSlot] = useState(null); // { videoIndex, productIndex }

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/styled-videos');
      const data = await res.json();
      if (data.success) setVideos(data.videos || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVideos(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/styled-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videos),
      });
      if (res.ok) toast.success('Videos saved successfully!');
    } catch (err) {
      toast.error('Error saving videos');
    } finally {
      setSaving(false);
    }
  };

  const addVideo = () => setVideos([...videos, { video: '', products: [], totalPrice: '₹0' }]);
  
  const removeVideo = (index) => {
    if (confirm('Are you sure you want to remove this video?')) {
      const nv = [...videos];
      nv.splice(index, 1);
      setVideos(nv);
    }
  };

  const updateVideoUrl = (index, url) => {
    const nv = [...videos];
    nv[index].video = url;
    setVideos(nv);
  };

  const moveVideo = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === videos.length - 1)) return;
    const nv = [...videos];
    const temp = nv[index];
    nv[index] = nv[index + direction];
    nv[index + direction] = temp;
    setVideos(nv);
  };

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

  const selectProduct = (product) => {
    if (!activeSlot) return;
    const { videoIndex, productIndex } = activeSlot;
    const nv = [...videos];
    const video = nv[videoIndex];
    const formatPrice = (num) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(num));

    const productData = {
      productId: product.id,
      image: product.image || '',
      title: product.title,
      price: formatPrice(product.price || 0),
      url: '/products/' + product.handle
    };

    if (productIndex === -1) {
      if (video.products.length >= 5) alert('Maximum 5 products allowed per video');
      else video.products.push(productData);
    } else {
      video.products[productIndex] = productData;
    }

    const total = video.products.reduce((acc, p) => acc + (parseInt(p.price.replace(/[^\d]/g, '')) || 0), 0);
    video.totalPrice = formatPrice(total);

    setVideos(nv);
    setActiveSlot(null);
    setSearchTerm('');
  };

  if (loading) return <div className='flex justify-center py-40'><Loader2 className='animate-spin text-ink-muted' size={40} /></div>;

  return (
    <div className='max-w-7xl mx-auto py-10 px-8'>
      <div className='flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6'>
        <div className="min-w-0">
          <h1 className='admin-title'>Styled By Lucira Videos</h1>
          <p className="admin-subtitle">Manage the video carousel and tagged products on the homepage.</p>
        </div>
        <div className='flex gap-3'>
          <button onClick={addVideo} className='flex items-center gap-2 bg-panel border border-hairline px-6 py-3 rounded-[8px] font-bold text-[10px] uppercase tracking-widest text-ink-soft'><Plus size={16} /> ADD VIDEO</button>
          <button onClick={handleSave} disabled={saving} className='flex items-center gap-2 bg-black text-white px-6 py-3 rounded-[8px] font-bold text-[10px] uppercase tracking-widest disabled:opacity-50'>{saving ? <Loader2 size={16} className='animate-spin' /> : <Save size={16} />} SAVE CHANGES</button>
        </div>
      </div>

      <div className='space-y-12'>
        {videos.map((video, vIndex) => (
          <div key={vIndex} className='bg-panel rounded-3xl border border-hairline shadow-modal overflow-hidden flex flex-col'>
            <div className='px-8 py-4 border-b border-hairline-soft flex items-center justify-between bg-zinc-50/50'>
              <div className='flex items-center gap-4'>
                <div className='w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold'>{vIndex + 1}</div>
                <h3 className='font-bold text-xs uppercase tracking-widest text-ink-muted'>VIDEO CONTENT</h3>
              </div>
              <div className='flex items-center gap-6'>
                <div className='text-right'><span className='text-[10px] font-bold uppercase text-ink-muted tracking-tighter'>TOTAL VALUE</span><p className='text-sm font-bold text-ink tracking-tight'>{video.totalPrice || '?0'}</p></div>
                <div className='h-8 w-px bg-zinc-200' />
                <div className='flex items-center gap-1'>
                  <button onClick={() => moveVideo(vIndex, -1)} disabled={vIndex === 0} className='p-2 hover:bg-panel rounded-[8px] disabled:opacity-30'><MoveUp size={16} /></button>
                  <button onClick={() => moveVideo(vIndex, 1)} disabled={vIndex === videos.length - 1} className='p-2 hover:bg-panel rounded-[8px] disabled:opacity-30'><MoveDown size={16} /></button>
                  <button onClick={() => removeVideo(vIndex)} className='p-2 text-rose-500 hover:bg-rose-50 rounded-[8px]'><Trash2 size={16} /></button>
                </div>
              </div>
            </div>

            <div className='p-8 flex flex-col md:flex-row gap-8'>
                <div className='w-32 shrink-0 space-y-3'>
                  <label className='text-[10px] font-bold uppercase tracking-widest text-ink-muted'>PREVIEW</label>
                  <div className='aspect-[9/16] bg-panel-alt rounded-[8px] border border-hairline-soft overflow-hidden flex flex-col items-center justify-center text-ink-muted relative shadow-inner'>
                    {video.video ? <SafeVideo src={video.video} className='w-full h-full object-cover' muted loop /> : <Video size={24} strokeWidth={1} />}
                  </div>
                </div>
                <div className='flex-1 space-y-8'>
                  <div className='space-y-3'><label className='text-[10px] font-bold uppercase tracking-widest text-ink-muted flex items-center gap-2'><Video size={12} /> SHOPIFY VIDEO URL</label><input value={video.video || ''} onChange={e => updateVideoUrl(vIndex, e.target.value)} className='w-full px-5 py-3.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black' placeholder='Paste Shopify CDN URL here...' /></div>
                  <div className='space-y-4'>
                    <label className='text-[10px] font-bold uppercase tracking-widest text-ink-muted flex items-center gap-2'><Package size={12} /> TAGGED PRODUCTS ({video.products?.length || 0}/5)</label>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                      {video.products?.map((p, pIndex) => (
                        <div key={pIndex} className='bg-panel p-3 rounded-[8px] border border-hairline-soft flex gap-4 relative group hover:shadow-md transition-all'>
                          <div className='w-14 h-14 bg-panel-alt rounded-[8px] overflow-hidden shrink-0 border border-zinc-50'><img src={p.image} className='w-full h-full object-cover' /></div>
                          <div className='flex-1 min-w-0 py-1'><h4 className='text-[11px] font-bold truncate leading-tight pr-6'>{p.title}</h4><span className='text-xs font-bold mt-1 inline-block'>{p.price}</span></div>
                          <div className='absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                            <button onClick={() => setActiveSlot({ videoIndex: vIndex, productIndex: pIndex })} className='p-1.5 hover:bg-row-hover rounded-[8px] text-ink-muted'><Search size={14} /></button>
                            <button onClick={() => { const nv = [...videos]; nv[vIndex].products.splice(pIndex, 1); setVideos(nv); }} className='p-1.5 hover:bg-rose-50 text-rose-300 hover:text-rose-500 rounded-[8px]'><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                      {(video.products?.length || 0) < 5 && <button onClick={() => setActiveSlot({ videoIndex: vIndex, productIndex: -1 })} className='border-2 border-dashed border-hairline-soft rounded-[8px] p-4 flex flex-col items-center justify-center gap-2 text-ink-muted hover:text-black hover:border-zinc-300 transition-all bg-zinc-50/30 min-h-[82px]'><Plus size={18} /><span className='text-[9px] font-bold uppercase tracking-widest'>ADD PRODUCT</span></button>}
                    </div>
                  </div>
                </div>
            </div>
          </div>
        ))}
      </div>

      {activeSlot !== null && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div className='bg-panel w-full max-w-2xl rounded-[8px] shadow-2xl overflow-hidden border border-hairline-soft'>
            <div className='p-8 border-b border-zinc-50 flex justify-between items-center bg-zinc-50/50'><h2 className='text-xl font-bold flex items-center gap-3'><Package size={24} className='text-ink-muted' /> SELECT PRODUCT</h2><button onClick={() => {setActiveSlot(null); setSearchTerm(''); setSearchResults([]);}} className='p-2 hover:bg-panel rounded-full border border-transparent hover:border-zinc-200'><X size={20} /></button></div>
            <div className='p-8 space-y-8'>
              <div className='relative group'><Search className='absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted' size={20} /><input type='text' autoFocus placeholder='Search products by title...' value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className='w-full pl-12 pr-6 py-4 bg-zinc-100/50 border border-transparent focus:border-zinc-200 rounded-[8px] text-sm focus:outline-none focus:ring-4 focus:ring-black/5 font-medium' /></div>
              <div className='space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar'>
                {searching ? <div className='flex justify-center py-16'><Loader2 className='animate-spin text-zinc-200' size={32} /></div> : searchResults.length > 0 ? (
                  searchResults.map(p => (
                    <button key={p.id} onClick={() => selectProduct(p)} className='w-full flex items-center gap-5 p-4 rounded-[8px] hover:bg-row-hover transition-all text-left border border-transparent hover:border-zinc-100'>
                      <div className='w-16 h-16 bg-panel rounded-[8px] border border-hairline-soft overflow-hidden relative shrink-0'><img src={p.image || p.images?.[0]?.url} className='w-full h-full object-cover' /></div>
                      <div className='flex-1 min-w-0'><p className='font-bold text-sm truncate'>{p.title}</p><p className='text-xs font-bold mt-1'>?{new Intl.NumberFormat('en-IN').format(p.price)}</p></div>
                      <Plus size={16} className='text-ink-muted' />
                    </button>
                  ))
                ) : (
                  <div className='text-center py-16 text-ink-muted'><Search size={40} className='mx-auto mb-4' /><p className='text-sm font-bold uppercase tracking-widest text-[10px]'>Start searching above</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
