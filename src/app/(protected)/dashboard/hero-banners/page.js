"use client";

import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Save, MoveUp, MoveDown, Package, X, Loader2, Target, ExternalLink, Upload, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { uploadToShopify } from "@/lib/utils";
import { toast } from 'react-toastify';
import Link from 'next/link';

export default function HeroBannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // format: { index, field } e.g. { index: 0, field: 'desktopImage' }

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/settings/hero-banners`);
      if (res.ok) {
        const data = await res.json();
        const fetchedBanners = (data.banners || []).map((b, i) => ({
          ...b,
          id: b.id || `banner-${Date.now()}-${i}`
        }));
        setBanners(fetchedBanners);
      }
    } catch (e) {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/settings/hero-banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banners })
      });
      if (res.ok) {
        toast.success('Banners saved successfully');
      } else {
        toast.error('Failed to save banners');
      }
    } catch (e) {
      toast.error('Error saving banners');
    } finally {
      setSaving(false);
    }
  };

  const addBanner = () => {
    setBanners([...banners, {
      id: Date.now().toString(),
      type: 'image',
      name: 'New Banner',
      title: '',
      subtitle: '',
      alt: '',
      url: '/',
      desktopImage: '',
      mobileImage: ''
    }]);
  };

  const updateBanner = (index, field, value) => {
    const updated = [...banners];
    updated[index][field] = value;
    setBanners(updated);
  };

  const removeBanner = (index) => {
    setBanners(banners.filter((_, i) => i !== index));
  };

  const moveBanner = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const updated = [...banners];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      setBanners(updated);
    } else if (direction === 'down' && index < banners.length - 1) {
      const updated = [...banners];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      setBanners(updated);
    }
  };

  const handleUpload = async (e, index, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading({ index, field });
      const assetName = `Homepage_homeSlider-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const url = await uploadToShopify(file, assetName);
      if (url) {
        updateBanner(index, field, url);
        toast.success(`${field.replace('Image', '')} uploaded successfully`);
      }
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="container-main py-10 px-4">
      {/* Header */}
      <div className="mb-9 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="admin-title flex items-center gap-3">
            <ImageIcon className="text-primary" />
            Hero Banners
          </h1>
          <p className="admin-subtitle">Manage the homepage hero slider images and videos.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Banner List */}
      <div className="space-y-6">
        {banners.map((banner, index) => (
          <div key={banner.id} className="bg-panel border border-hairline-soft rounded-[8px] p-6 shadow-sm relative group overflow-hidden">
            {/* Action Bar */}
            <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => moveBanner(index, 'up')} disabled={index === 0} className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30"><MoveUp size={14} /></button>
              <button onClick={() => moveBanner(index, 'down')} disabled={index === banners.length - 1} className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30"><MoveDown size={14} /></button>
              <button onClick={() => removeBanner(index)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 ml-2"><Trash2 size={14} /></button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <span className="w-8 h-8 rounded-full bg-field flex items-center justify-center font-bold text-ink-soft text-sm">
                {index + 1}
              </span>
              <h3 className="font-bold text-lg text-ink">{banner.name || 'Untitled Banner'}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Col - Basic Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-ink-muted">BANNER NAME</label>
                    <input
                      value={banner.name || ''}
                      onChange={(e) => updateBanner(index, 'name', e.target.value)}
                      placeholder="e.g. Baarish"
                      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-ink-muted">MEDIA TYPE</label>
                    <select
                      value={banner.type || 'image'}
                      onChange={(e) => updateBanner(index, 'type', e.target.value)}
                      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-ink-muted">OVERLAY TITLE</label>
                    <input
                      value={banner.title || ''}
                      onChange={(e) => updateBanner(index, 'title', e.target.value)}
                      placeholder="e.g. A NEW CHAPTER"
                      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-ink-muted">OVERLAY SUBTITLE / CTA</label>
                    <input
                      value={banner.subtitle || ''}
                      onChange={(e) => updateBanner(index, 'subtitle', e.target.value)}
                      placeholder="e.g. DISCOVER THE COLLECTION"
                      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-ink-muted">ALT TEXT</label>
                  <input
                    value={banner.alt || ''}
                    onChange={(e) => updateBanner(index, 'alt', e.target.value)}
                    placeholder="Describe the image/video for SEO"
                    className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-ink-muted">LINK URL</label>
                  <input
                    value={banner.url || ''}
                    onChange={(e) => updateBanner(index, 'url', e.target.value)}
                    placeholder="/collections/jewelry"
                    className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              {/* Right Col - Assets */}
              <div className="space-y-4">
                {/* Desktop Asset */}
                <div className="space-y-2 relative">
                  {uploading?.index === index && uploading?.field === 'desktopImage' && <div className='absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-[8px]'><Loader2 className='animate-spin text-black' size={24} /></div>}
                  <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                    DESKTOP {banner.type === 'video' ? 'VIDEO' : 'IMAGE'} URL
                    <span className="text-ink-muted flex items-center gap-1"><Upload size={10} /> DIRECT UPLOAD</span>
                  </label>

                  {banner.desktopImage && (
                    <div className="w-full h-28 bg-field rounded-[8px] overflow-hidden relative mb-2 border border-hairline">
                      {banner.type === 'video' ? (
                        <video src={banner.desktopImage} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                      ) : (
                        <img src={banner.desktopImage} alt="Desktop Preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      value={banner.desktopImage || ''}
                      onChange={(e) => updateBanner(index, 'desktopImage', e.target.value)}
                      placeholder={`https://cdn.shopify.com/...${banner.type === 'video' ? '.mp4' : '.jpg'}`}
                      className="flex-1 px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <label className="shrink-0 w-12 flex items-center justify-center rounded-[8px] border-2 border-dashed border-hairline hover:border-black transition-all cursor-pointer">
                      <Upload size={16} className="text-ink-muted" />
                      <input type="file" className="hidden" accept={banner.type === 'video' ? 'video/*' : 'image/*'} onChange={(e) => handleUpload(e, index, 'desktopImage')} />
                    </label>
                  </div>
                </div>

                {/* Mobile Asset */}
                <div className="space-y-2 relative">
                  {uploading?.index === index && uploading?.field === 'mobileImage' && <div className='absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-[8px]'><Loader2 className='animate-spin text-black' size={24} /></div>}
                  <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                    MOBILE {banner.type === 'video' ? 'VIDEO' : 'IMAGE'} URL
                    <span className="text-ink-muted flex items-center gap-1"><Upload size={10} /> DIRECT UPLOAD</span>
                  </label>

                  {banner.mobileImage && (
                    <div className="w-28 h-40 bg-field rounded-[8px] overflow-hidden relative mb-2 border border-hairline mx-auto">
                      {banner.type === 'video' ? (
                        <video src={banner.mobileImage} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                      ) : (
                        <img src={banner.mobileImage} alt="Mobile Preview" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      value={banner.mobileImage || ''}
                      onChange={(e) => updateBanner(index, 'mobileImage', e.target.value)}
                      placeholder={`https://cdn.shopify.com/...${banner.type === 'video' ? '.mp4' : '.jpg'}`}
                      className="flex-1 px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <label className="shrink-0 w-12 flex items-center justify-center rounded-[8px] border-2 border-dashed border-hairline hover:border-black transition-all cursor-pointer">
                      <Upload size={16} className="text-ink-muted" />
                      <input type="file" className="hidden" accept={banner.type === 'video' ? 'video/*' : 'image/*'} onChange={(e) => handleUpload(e, index, 'mobileImage')} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div className="text-center py-20 bg-panel-alt border border-hairline-soft rounded-[8px] border-dashed">
            <ImageIcon size={48} className="mx-auto text-ink-muted mb-4" />
            <h3 className="text-lg font-bold text-ink-soft">No Banners Found</h3>
            <p className="text-ink-muted mb-6">Add your first hero banner to get started.</p>
            <button
              onClick={addBanner}
              className="bg-black hover:bg-zinc-800 text-white px-6 py-2.5 rounded-full font-medium transition-all inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Add First Banner
            </button>
          </div>
        )}
      </div>

      {banners.length > 0 && (
        <div className="mt-8">
          <button
            onClick={addBanner}
            className="w-full py-4 border-2 border-dashed border-hairline rounded-[8px] text-ink-soft font-bold hover:bg-row-hover hover:border-zinc-300 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Another Banner
          </button>
        </div>
      )}
    </div>
  );
}
