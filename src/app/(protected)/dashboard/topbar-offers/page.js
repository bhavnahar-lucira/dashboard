'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Loader2, Info, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'react-toastify';

export default function TopBarOffersPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/announcements`);
      const data = await res.json();
      setAnnouncements(data.announcements || []);
      setIsVisible(data.isVisible ?? true);
    } catch (err) {
      console.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const addOffer = () => setAnnouncements([...announcements, { text: '', url: '' }]);
  const removeOffer = (index) => setAnnouncements(announcements.filter((_, i) => i !== index));
  const updateOffer = (index, field, val) => {
    const newArr = [...announcements];
    newArr[index][field] = val;
    setAnnouncements(newArr);
  };

  const moveOfferUp = (index) => {
    if (index === 0) return;
    const newArr = [...announcements];
    const temp = newArr[index - 1];
    newArr[index - 1] = newArr[index];
    newArr[index] = temp;
    setAnnouncements(newArr);
  };

  const moveOfferDown = (index) => {
    if (index === announcements.length - 1) return;
    const newArr = [...announcements];
    const temp = newArr[index + 1];
    newArr[index + 1] = newArr[index];
    newArr[index] = temp;
    setAnnouncements(newArr);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/api/settings/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcements: announcements.filter(a => a.text.trim()), isVisible })
      });
      if (res.ok) toast.success('Changes saved successfully');
    } catch (err) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className='flex justify-center py-40'><Loader2 className='animate-spin text-ink-muted' size={40} /></div>;

  return (
    <div className='max-w-6xl mx-auto py-10 px-8'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6'>
        <div className="min-w-0">
          <h1 className='admin-title'>TopBar Offers</h1>
          <p className="admin-subtitle">Manage the sliding announcements in the header</p>
        </div>
        
        <div className='flex items-center gap-4'>
           <div className='flex items-center gap-3 bg-field px-4 py-2 rounded-[8px] border border-hairline'>
              <span className='text-sm font-medium text-ink-soft'>Show TopBar:</span>
              <label className='relative inline-flex items-center cursor-pointer'>
                <input type='checkbox' className='sr-only peer' checked={isVisible} onChange={e => setIsVisible(e.target.checked)} />
                <div className='w-11 h-6 bg-zinc-300 rounded-full peer peer-checked:bg-[#5A413F] transition-all'></div>
              </label>
           </div>

           <button 
             onClick={handleSave} 
             disabled={saving}
             className='flex items-center gap-2 bg-brand-solid hover:bg-brand-solid-hover text-on-brand px-6 py-3 rounded-[8px] font-bold text-sm shadow-lg shadow-zinc-200 transition-all disabled:opacity-70'
           >
             {saving ? <Loader2 size={18} className='animate-spin' /> : <Save size={18} />}
             Save Changes
           </button>
        </div>
      </div>

      {/* Offers List */}
      <div className='space-y-6'>
        {announcements.map((offer, idx) => (
          <div key={idx} className='bg-panel border border-hairline-soft rounded-[8px] p-6 shadow-sm flex items-center gap-6 group hover:border-zinc-200 transition-all'>
            <div className='flex-1 grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-bold text-ink-muted uppercase tracking-widest'>Offer Text</label>
                <input 
                  value={offer.text} 
                  onChange={e => updateOffer(idx, 'text', e.target.value)}
                  placeholder='Enter promotional text...'
                  className='w-full border border-hairline rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#5A413F] transition-all font-medium text-ink'
                />
              </div>
              <div className='space-y-1.5'>
                <label className='text-[10px] font-bold text-ink-muted uppercase tracking-widest'>URL (Optional)</label>
                <input 
                  value={offer.url} 
                  onChange={e => updateOffer(idx, 'url', e.target.value)}
                  placeholder='/collections/all'
                  className='w-full border border-hairline rounded-[8px] px-4 py-3 focus:outline-none focus:border-[#5A413F] transition-all font-medium text-ink'
                />
              </div>
            </div>
            <div className='flex items-center gap-1 flex-col sm:flex-row'>
              <div className='flex flex-col gap-1 mr-2'>
                <button 
                  onClick={() => moveOfferUp(idx)}
                  disabled={idx === 0}
                  className='p-1.5 text-ink-muted hover:text-zinc-800 hover:bg-brand-tint rounded-[6px] transition-all disabled:opacity-30 disabled:cursor-not-allowed'
                >
                  <ChevronUp size={16} />
                </button>
                <button 
                  onClick={() => moveOfferDown(idx)}
                  disabled={idx === announcements.length - 1}
                  className='p-1.5 text-ink-muted hover:text-zinc-800 hover:bg-brand-tint rounded-[6px] transition-all disabled:opacity-30 disabled:cursor-not-allowed'
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              <button 
                onClick={() => removeOffer(idx)}
                className='p-3 text-ink-muted hover:text-rose-500 hover:bg-rose-50 rounded-[8px] transition-all'
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}

        {/* Add Button */}
        <button 
          onClick={addOffer}
          className='w-full py-6 border-2 border-dashed border-hairline rounded-[8px] flex items-center justify-center gap-2 text-ink-muted hover:text-zinc-600 hover:border-zinc-300 hover:bg-row-hover transition-all font-bold text-sm'
        >
          <Plus size={20} />
          Add Another Offer
        </button>
      </div>
    </div>
  );
}
