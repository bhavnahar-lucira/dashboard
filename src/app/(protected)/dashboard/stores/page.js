'use client';

import { useState, useEffect } from 'react';
import { Store as StoreIcon, MapPin, Phone, CheckCircle2, Navigation, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://webuat.lucirajewelry.com';

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/stores`);
      const data = await res.json();
      setStores(data.stores || []);
    } catch (e) {
      console.error('Failed to fetch stores', e);
      toast.error('Failed to load stores from database');
    } finally {
      setLoading(false);
    }
  };

  const syncFromShopify = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/stores/sync-shopify`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Successfully synced ' + data.count + ' locations from Shopify');
        fetchStores();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (e) {
      toast.error('Shopify Sync Error: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { fetchStores(); }, []);

  if (loading) return <div className='flex justify-center py-40'><Loader2 className='animate-spin text-zinc-300' size={40} /></div>;

  return (
    <div className='max-w-7xl mx-auto py-10 px-8'>
      <div className='flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6'>
        <div className='flex items-start gap-4'>
           <div className='bg-zinc-100 p-3 rounded-2xl'><StoreIcon size={24} className='text-zinc-400' /></div>
           <div>
             <h1 className='text-3xl font-bold text-zinc-900 font-figtree'>Store Locations</h1>
             <p className='text-zinc-500 mt-1'>Manage your physical store locations and contact information.</p>
           </div>
        </div>
        
        <div className='flex items-center gap-3'>
           <button 
             onClick={syncFromShopify}
             disabled={syncing}
             className='flex items-center gap-2 bg-zinc-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50'
           >
             {syncing ? <Loader2 size={16} className='animate-spin' /> : <Navigation size={16} />}
             Fetch Stores From Shopify
           </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
        {stores.map((store) => (
          <div key={store.shopifyId || store.id} className='bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-xl shadow-zinc-100/50 flex flex-col group hover:border-zinc-200 transition-all'>
            {store.image && (
              <div className='aspect-video w-full relative overflow-hidden'>
                <img src={store.image} alt={store.name} className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500' />
              </div>
            )}
            <div className='p-8 flex-1 space-y-6'>
              <div className='flex items-start justify-between'>
                <div>
                  <h3 className='font-black text-zinc-900 text-2xl'>{store.name}</h3>
                  <p className='text-[10px] text-zinc-400 font-bold uppercase tracking-tight mt-1'>ID: {store.shopifyId || store.id}</p>
                </div>
                <span className={'bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full border border-emerald-100 uppercase flex items-center gap-1 ' + (store.isActive ? '' : 'grayscale opacity-50')}>
                  <CheckCircle2 size={10} /> {store.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className='space-y-4 text-sm'>
                <div className='flex gap-3 text-zinc-500 leading-relaxed'>
                  <MapPin size={18} className='shrink-0 mt-0.5 text-zinc-300' />
                  <p>{store.address}</p>
                </div>
                <div className='flex gap-3 text-zinc-500'>
                  <Phone size={18} className='shrink-0 text-zinc-300' />
                  <p className='font-medium text-zinc-800'>{store.phone || 'No phone listed'}</p>
                </div>
              </div>
            </div>

            <div className='bg-zinc-50 px-8 py-5 flex items-center justify-between border-t border-zinc-100'>
               <div className='space-y-1'>
                  <label className='text-[9px] font-black text-zinc-400 uppercase tracking-widest'>Pincode</label>
                  <p className='text-sm font-black text-zinc-900'>{store.zip || '-'}</p>
               </div>
               <div className='space-y-1 text-right'>
                  <label className='text-[9px] font-black text-zinc-400 uppercase tracking-widest'>Coordinates</label>
                  <p className='text-sm font-black text-zinc-900'>{(store.latitude || '0') + ', ' + (store.longitude || '0')}</p>
               </div>
            </div>
          </div>
        ))}
      </div>

      {stores.length === 0 && (
        <div className='text-center py-20 bg-white rounded-3xl border-2 border-dashed border-zinc-100'>
           <StoreIcon size={48} className='mx-auto text-zinc-200 mb-4' />
           <p className='text-zinc-400 font-medium'>No stores synced yet. Click the button above to pull data from Shopify.</p>
        </div>
      )}
    </div>
  );
}
