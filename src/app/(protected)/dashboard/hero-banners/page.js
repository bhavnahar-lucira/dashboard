"use client";

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  MoveUp, 
  MoveDown, 
  Loader2, 
  Upload, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Film, 
  Monitor, 
  Smartphone, 
  ExternalLink, 
  Copy, 
  X,
  Layers,
  Clock
} from 'lucide-react';
import { uploadToShopify } from "@/lib/utils";
import { toast } from 'react-toastify';
import Link from 'next/link';

export default function HeroBannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // { index, field }
  const [videoSlideDelay, setVideoSlideDelay] = useState(8);
  const [imageSlideDelay, setImageSlideDelay] = useState(6);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/settings/hero-banners`);
      if (res.ok) {
        const data = await res.json();
        setVideoSlideDelay(data.videoSlideDelay !== undefined ? Number(data.videoSlideDelay) : 8);
        setImageSlideDelay(data.imageSlideDelay !== undefined ? Number(data.imageSlideDelay) : 6);

        const fetchedBanners = (data.banners || []).map((b, i) => {
          const isVideo = b.type === 'video';
          return {
            id: b.id || `banner-${Date.now()}-${i}`,
            type: b.type || 'image',
            name: b.name || '',
            title: b.title || '',
            subtitle: b.subtitle || '',
            alt: b.alt || '',
            url: b.url || '',
            duration: b.duration ? Number(b.duration) : '',
            desktopImage: b.desktopImage || '',
            mobileImage: b.mobileImage || '',
            desktopVideo: b.desktopVideo || (isVideo ? b.desktopImage : '') || '',
            mobileVideo: b.mobileVideo || (isVideo ? b.mobileImage : '') || '',
            desktopPoster: b.desktopPoster || b.desktopPosterImage || b.posterImage || '',
            mobilePoster: b.mobilePoster || b.mobilePosterImage || ''
          };
        });
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
      // Standardize payload for full backward and forward compatibility
      const sanitizedBanners = banners.map(b => {
        const isVideo = b.type === 'video';
        const desktopVideo = isVideo ? (b.desktopVideo || b.desktopImage || '') : '';
        const mobileVideo = isVideo ? (b.mobileVideo || b.mobileImage || '') : '';
        const desktopPoster = isVideo ? (b.desktopPoster || '') : '';
        const mobilePoster = isVideo ? (b.mobilePoster || '') : '';

        return {
          ...b,
          type: b.type || 'image',
          duration: b.duration ? Number(b.duration) : undefined,
          // Only video banners retain overlay title and subtitle
          title: isVideo ? (b.title || '') : '',
          subtitle: isVideo ? (b.subtitle || '') : '',
          desktopImage: isVideo ? desktopVideo : (b.desktopImage || ''),
          mobileImage: isVideo ? (mobileVideo || desktopVideo) : (b.mobileImage || ''),
          desktopVideo,
          mobileVideo,
          desktopPoster,
          mobilePoster,
          desktopPosterImage: desktopPoster,
          posterImage: desktopPoster,
          mobilePosterImage: mobilePoster,
        };
      });

      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/settings/hero-banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          banners: sanitizedBanners,
          videoSlideDelay: Number(videoSlideDelay) || 8,
          imageSlideDelay: Number(imageSlideDelay) || 6,
        })
      });
      if (res.ok) {
        toast.success('Hero banners saved successfully');
      } else {
        toast.error('Failed to save banners');
      }
    } catch (e) {
      toast.error('Error saving banners');
    } finally {
      setSaving(false);
    }
  };

  const addBanner = (type = 'image') => {
    setBanners([
      ...banners,
      {
        id: Date.now().toString(),
        type,
        name: type === 'video' ? 'New Video Banner' : 'New Banner',
        title: '',
        subtitle: '',
        alt: '',
        url: '/',
        desktopImage: '',
        mobileImage: '',
        desktopVideo: '',
        mobileVideo: '',
        desktopPoster: '',
        mobilePoster: ''
      }
    ]);
  };

  const duplicateBanner = (index) => {
    const source = banners[index];
    const copy = {
      ...source,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${source.name || 'Banner'} (Copy)`
    };
    const updated = [...banners];
    updated.splice(index + 1, 0, copy);
    setBanners(updated);
    toast.success('Banner duplicated');
  };

  const updateBannerField = (index, field, value) => {
    const updated = [...banners];
    const b = { ...updated[index], [field]: value };

    // Synchronize video & image fields for backward compatibility
    if (b.type === 'video') {
      if (field === 'desktopVideo') {
        b.desktopImage = value;
      } else if (field === 'mobileVideo') {
        b.mobileImage = value;
      }
    }
    updated[index] = b;
    setBanners(updated);
  };

  const removeBanner = (index) => {
    if (confirm('Are you sure you want to remove this banner?')) {
      setBanners(banners.filter((_, i) => i !== index));
    }
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

  const getFieldLabel = (field) => {
    switch (field) {
      case 'desktopVideo': return 'Desktop Video';
      case 'mobileVideo': return 'Mobile Video';
      case 'desktopPoster': return 'Desktop Poster Image';
      case 'mobilePoster': return 'Mobile Poster Image';
      case 'desktopImage': return 'Desktop Image';
      case 'mobileImage': return 'Mobile Image';
      default: return field;
    }
  };

  const handleUpload = async (e, index, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading({ index, field });
      const isVideoField = field.toLowerCase().includes('video');
      const prefix = isVideoField ? 'Homepage_homeSlider_video' : 'Homepage_homeSlider';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
      const assetName = `${prefix}-${Date.now()}-${cleanFileName}`;
      
      const url = await uploadToShopify(file, assetName);
      if (url) {
        updateBannerField(index, field, url);
        toast.success(`${getFieldLabel(field)} uploaded successfully`);
      }
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="container-main py-10 px-4">
      {/* Header */}
      <div className="mb-9 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="admin-title flex items-center gap-3">
            <Layers className="text-primary" />
            Hero Banners
          </h1>
          <p className="admin-subtitle">
            Manage the homepage hero slider images and video banners. Video banners support responsive videos, poster images, and bottom-center overlay headings and subtitle links.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => addBanner('image')}
            className="border border-hairline-soft bg-panel hover:bg-field text-ink px-4 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 text-sm shadow-sm"
          >
            <ImageIcon size={16} className="text-emerald-600" />
            Add Image Banner
          </button>
          <button
            onClick={() => addBanner('video')}
            className="border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 text-purple-900 px-4 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 text-sm shadow-sm"
          >
            <VideoIcon size={16} className="text-purple-600" />
            Add Video Banner
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 disabled:opacity-50 text-sm shadow-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Slide Timing & Autoplay Settings */}
      <div className="bg-panel border border-hairline-soft rounded-[12px] p-6 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-sm font-bold text-ink flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            Slide Autoplay Timing
          </h2>
          <p className="text-xs text-ink-muted mt-1 max-w-xl">
            Control the duration each slide remains active before automatically transitioning to the next slide. Video slides default to 8 seconds and image slides default to 6 seconds.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 bg-purple-50/70 border border-purple-200/80 px-4 py-2.5 rounded-xl shadow-xs">
            <VideoIcon size={16} className="text-purple-600" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">Video Slide Delay</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={videoSlideDelay}
                  onChange={(e) => setVideoSlideDelay(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 px-2 py-1 text-sm font-bold bg-white border border-purple-200 rounded text-center text-ink focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <span className="text-xs font-semibold text-purple-700">seconds</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-emerald-50/70 border border-emerald-200/80 px-4 py-2.5 rounded-xl shadow-xs">
            <ImageIcon size={16} className="text-emerald-600" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Image Slide Delay</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={imageSlideDelay}
                  onChange={(e) => setImageSlideDelay(Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 px-2 py-1 text-sm font-bold bg-white border border-emerald-200 rounded text-center text-ink focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <span className="text-xs font-semibold text-emerald-700">seconds</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Banner List */}
      <div className="space-y-8">
        {banners.map((banner, index) => {
          const isVideo = banner.type === 'video';
          const desktopVideoSrc = banner.desktopVideo || (isVideo ? banner.desktopImage : '');
          const mobileVideoSrc = banner.mobileVideo || (isVideo ? banner.mobileImage : '');
          const desktopPosterSrc = banner.desktopPoster || banner.desktopPosterImage || banner.posterImage || '';
          const mobilePosterSrc = banner.mobilePoster || banner.mobilePosterImage || '';

          return (
            <div
              key={banner.id || index}
              className={`bg-panel border rounded-[12px] p-6 shadow-sm relative group overflow-hidden transition-all ${
                isVideo ? 'border-purple-200/80 bg-purple-50/10' : 'border-hairline-soft'
              }`}
            >
              {/* Top Banner Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-hairline-soft">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-field flex items-center justify-center font-bold text-ink-soft text-sm">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-lg text-ink flex items-center gap-2">
                      {banner.name || (isVideo ? 'Untitled Video Banner' : 'Untitled Image Banner')}
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          isVideo
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isVideo ? <VideoIcon size={12} /> : <ImageIcon size={12} />}
                        {isVideo ? 'Video Banner' : 'Image Banner'}
                      </span>
                    </h3>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveBanner(index, 'up')}
                    disabled={index === 0}
                    title="Move banner up"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30 transition-colors"
                  >
                    <MoveUp size={14} />
                  </button>
                  <button
                    onClick={() => moveBanner(index, 'down')}
                    disabled={index === banners.length - 1}
                    title="Move banner down"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30 transition-colors"
                  >
                    <MoveDown size={14} />
                  </button>
                  <button
                    onClick={() => duplicateBanner(index)}
                    title="Duplicate banner"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => removeBanner(index)}
                    title="Delete banner"
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 ml-1 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Settings & Content */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-ink-muted">BANNER NAME</label>
                      <input
                        value={banner.name || ''}
                        onChange={(e) => updateBannerField(index, 'name', e.target.value)}
                        placeholder={isVideo ? "e.g. Summer Video" : "e.g. Baarish"}
                        className="w-full px-3 py-2 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-ink-muted">MEDIA TYPE</label>
                      <select
                        value={banner.type || 'image'}
                        onChange={(e) => updateBannerField(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black font-medium"
                      >
                        <option value="image">Image Banner</option>
                        <option value="video">Video Banner</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                        <span>DURATION</span>
                        <span className="text-[9px] text-ink-muted">Optional</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={banner.duration || ''}
                        onChange={(e) => updateBannerField(index, 'duration', e.target.value)}
                        placeholder={isVideo ? `${videoSlideDelay}s` : `${imageSlideDelay}s`}
                        className="w-full px-3 py-2 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black font-medium"
                      />
                    </div>
                  </div>

                  {/* Heading, Subtitle & Overlay Preview: ONLY for Video Banner */}
                  {isVideo ? (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                          <span>OVERLAY HEADING (BOTTOM CENTER)</span>
                          <span className="text-[9px] text-purple-600 font-semibold">Video Banner Only</span>
                        </label>
                        <input
                          value={banner.title || ''}
                          onChange={(e) => updateBannerField(index, 'title', e.target.value)}
                          placeholder="e.g. A NEW CHAPTER"
                          className="w-full px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                          <span>OVERLAY SUBTITLE / CTA (BOTTOM CENTER)</span>
                          <span className="text-[9px] text-purple-600 font-semibold">Underlined Link</span>
                        </label>
                        <input
                          value={banner.subtitle || ''}
                          onChange={(e) => updateBannerField(index, 'subtitle', e.target.value)}
                          placeholder="e.g. DISCOVER THE COLLECTION"
                          className="w-full px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                          <span>LINK URL (GIVEN TO HEADING & SUBTITLE)</span>
                          <ExternalLink size={12} className="text-ink-muted" />
                        </label>
                        <input
                          value={banner.url || ''}
                          onChange={(e) => updateBannerField(index, 'url', e.target.value)}
                          placeholder="/collections/jewelry or https://..."
                          className="w-full px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <p className="text-[11px] text-ink-muted">
                          Clicking the heading, subtitle, or video banner navigates to this URL.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-muted">ALT TEXT (SEO & ACCESSIBILITY)</label>
                        <input
                          value={banner.alt || ''}
                          onChange={(e) => updateBannerField(index, 'alt', e.target.value)}
                          placeholder="Describe the video banner for search engines"
                          className="w-full px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>

                      {/* Visual Overlay Preview Box - Only for Video Banner */}
                      <div className="pt-2">
                        <label className="text-[10px] font-bold text-ink-muted block mb-1.5">
                          BOTTOM-CENTER OVERLAY PREVIEW
                        </label>
                        <div className="w-full bg-zinc-950 text-white rounded-[10px] p-5 text-center relative overflow-hidden shadow-md border border-zinc-800">
                          <div className="space-y-2">
                            <p className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                              POSITION: BOTTOM CENTER
                            </p>
                            <h4 className="text-xl font-serif uppercase tracking-[1px] font-bold text-white drop-shadow">
                              {banner.title || 'HEADING TITLE'}
                            </h4>
                            <p className="text-[11px] uppercase font-bold tracking-[0.25em] underline underline-offset-4 decoration-white/70 text-white">
                              {banner.subtitle || 'SUBTITLE / CTA LINK'}
                            </p>
                            {banner.url && (
                              <div className="pt-2 flex justify-center">
                                <span className="text-[10px] bg-white/10 px-2.5 py-1 rounded text-zinc-300 inline-flex items-center gap-1.5 max-w-full truncate border border-white/5">
                                  <ExternalLink size={10} className="shrink-0" />
                                  <span className="truncate">{banner.url}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Image Banner Fields - Clean & Simple, no overlay heading/subtitle inputs */
                    <>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                          <span>LINK URL</span>
                          <ExternalLink size={12} className="text-ink-muted" />
                        </label>
                        <input
                          value={banner.url || ''}
                          onChange={(e) => updateBannerField(index, 'url', e.target.value)}
                          placeholder="/collections/jewelry or /products/twist-ring"
                          className="w-full px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <p className="text-[11px] text-ink-muted">
                          Clicking anywhere on this image banner navigates to this URL.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-ink-muted">ALT TEXT (SEO & ACCESSIBILITY)</label>
                        <input
                          value={banner.alt || ''}
                          onChange={(e) => updateBannerField(index, 'alt', e.target.value)}
                          placeholder="Describe the image banner for search engines"
                          className="w-full px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Right Column: Media Assets (Video vs Image) */}
                <div className="lg:col-span-7">
                  {isVideo ? (
                    <div className="space-y-6">
                      <div className="bg-purple-50/60 border border-purple-200/60 rounded-[8px] p-3.5 flex items-center justify-between text-xs text-purple-900">
                        <span className="flex items-center gap-2 font-medium">
                          <Film size={16} className="text-purple-600" />
                          Video Banner Assets
                        </span>
                        <span className="text-[11px] text-purple-700">Autoplays muted on loop with poster fallbacks</span>
                      </div>

                      {/* Desktop Video & Poster Asset */}
                      <div className="bg-field/50 border border-hairline-soft rounded-[10px] p-4 space-y-4">
                        <div className="flex items-center gap-2 text-ink font-bold text-xs uppercase tracking-wider">
                          <Monitor size={14} className="text-ink-soft" />
                          Desktop Assets (Recommended: 1920×800)
                        </div>

                        {/* Desktop Video */}
                        <div className="space-y-2 relative">
                          {uploading?.index === index && uploading?.field === 'desktopVideo' && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-[8px]">
                              <Loader2 className="animate-spin text-black" size={24} />
                            </div>
                          )}
                          <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                            <span>DESKTOP VIDEO URL (.mp4 / .webm)</span>
                            <span className="text-ink-muted flex items-center gap-1">
                              <Upload size={10} /> DIRECT UPLOAD
                            </span>
                          </label>

                          {desktopVideoSrc && (
                            <div className="w-full h-32 bg-black rounded-[8px] overflow-hidden relative border border-hairline group/vid">
                              <video
                                src={desktopVideoSrc}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                autoPlay
                                playsInline
                              />
                              <button
                                type="button"
                                onClick={() => updateBannerField(index, 'desktopVideo', '')}
                                className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover/vid:opacity-100 transition-opacity"
                                title="Remove desktop video"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <input
                              value={desktopVideoSrc}
                              onChange={(e) => updateBannerField(index, 'desktopVideo', e.target.value)}
                              placeholder="https://cdn.shopify.com/...desktop-hero.mp4"
                              className="flex-1 px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-xs focus:outline-none focus:ring-2 focus:ring-black"
                            />
                            <label className="shrink-0 px-3 flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-hairline hover:border-black bg-panel transition-all cursor-pointer text-xs font-medium text-ink-soft">
                              <Upload size={14} />
                              <span>Upload</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="video/mp4,video/webm,video/*"
                                onChange={(e) => handleUpload(e, index, 'desktopVideo')}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Desktop Poster Image */}
                        <div className="space-y-2 relative pt-2 border-t border-hairline-soft">
                          {uploading?.index === index && uploading?.field === 'desktopPoster' && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-[8px]">
                              <Loader2 className="animate-spin text-black" size={24} />
                            </div>
                          )}
                          <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                            <span>DESKTOP POSTER IMAGE (PREVENTS BLACK FRAME WHILE BUFFERING)</span>
                            <span className="text-ink-muted flex items-center gap-1">
                              <Upload size={10} /> DIRECT UPLOAD
                            </span>
                          </label>

                          {desktopPosterSrc && (
                            <div className="w-full h-24 bg-field rounded-[8px] overflow-hidden relative border border-hairline group/poster">
                              <img
                                src={desktopPosterSrc}
                                alt="Desktop Poster Preview"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => updateBannerField(index, 'desktopPoster', '')}
                                className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover/poster:opacity-100 transition-opacity"
                                title="Remove desktop poster"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <input
                              value={desktopPosterSrc}
                              onChange={(e) => updateBannerField(index, 'desktopPoster', e.target.value)}
                              placeholder="https://cdn.shopify.com/...desktop-poster.jpg"
                              className="flex-1 px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-xs focus:outline-none focus:ring-2 focus:ring-black"
                            />
                            <label className="shrink-0 px-3 flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-hairline hover:border-black bg-panel transition-all cursor-pointer text-xs font-medium text-ink-soft">
                              <Upload size={14} />
                              <span>Upload</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleUpload(e, index, 'desktopPoster')}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Video & Poster Asset */}
                      <div className="bg-field/50 border border-hairline-soft rounded-[10px] p-4 space-y-4">
                        <div className="flex items-center gap-2 text-ink font-bold text-xs uppercase tracking-wider">
                          <Smartphone size={14} className="text-ink-soft" />
                          Mobile Assets (Recommended: 768×960 or Vertical 9:16)
                        </div>

                        {/* Mobile Video */}
                        <div className="space-y-2 relative">
                          {uploading?.index === index && uploading?.field === 'mobileVideo' && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-[8px]">
                              <Loader2 className="animate-spin text-black" size={24} />
                            </div>
                          )}
                          <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                            <span>MOBILE VIDEO URL (.mp4 / .webm)</span>
                            <span className="text-ink-muted flex items-center gap-1">
                              <Upload size={10} /> DIRECT UPLOAD
                            </span>
                          </label>

                          {mobileVideoSrc && (
                            <div className="w-28 h-40 bg-black rounded-[8px] overflow-hidden relative border border-hairline mx-auto group/mvid">
                              <video
                                src={mobileVideoSrc}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                autoPlay
                                playsInline
                              />
                              <button
                                type="button"
                                onClick={() => updateBannerField(index, 'mobileVideo', '')}
                                className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover/mvid:opacity-100 transition-opacity"
                                title="Remove mobile video"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <input
                              value={mobileVideoSrc}
                              onChange={(e) => updateBannerField(index, 'mobileVideo', e.target.value)}
                              placeholder="https://cdn.shopify.com/...mobile-hero.mp4"
                              className="flex-1 px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-xs focus:outline-none focus:ring-2 focus:ring-black"
                            />
                            <label className="shrink-0 px-3 flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-hairline hover:border-black bg-panel transition-all cursor-pointer text-xs font-medium text-ink-soft">
                              <Upload size={14} />
                              <span>Upload</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="video/mp4,video/webm,video/*"
                                onChange={(e) => handleUpload(e, index, 'mobileVideo')}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Mobile Poster Image */}
                        <div className="space-y-2 relative pt-2 border-t border-hairline-soft">
                          {uploading?.index === index && uploading?.field === 'mobilePoster' && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-[8px]">
                              <Loader2 className="animate-spin text-black" size={24} />
                            </div>
                          )}
                          <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                            <span>MOBILE POSTER IMAGE (PREVENTS BLACK FRAME WHILE BUFFERING)</span>
                            <span className="text-ink-muted flex items-center gap-1">
                              <Upload size={10} /> DIRECT UPLOAD
                            </span>
                          </label>

                          {mobilePosterSrc && (
                            <div className="w-24 h-32 bg-field rounded-[8px] overflow-hidden relative border border-hairline mx-auto group/mposter">
                              <img
                                src={mobilePosterSrc}
                                alt="Mobile Poster Preview"
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => updateBannerField(index, 'mobilePoster', '')}
                                className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover/mposter:opacity-100 transition-opacity"
                                title="Remove mobile poster"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <input
                              value={mobilePosterSrc}
                              onChange={(e) => updateBannerField(index, 'mobilePoster', e.target.value)}
                              placeholder="https://cdn.shopify.com/...mobile-poster.jpg"
                              className="flex-1 px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-xs focus:outline-none focus:ring-2 focus:ring-black"
                            />
                            <label className="shrink-0 px-3 flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-hairline hover:border-black bg-panel transition-all cursor-pointer text-xs font-medium text-ink-soft">
                              <Upload size={14} />
                              <span>Upload</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleUpload(e, index, 'mobilePoster')}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Standard Image Banner Assets */
                    <div className="space-y-6">
                      {/* Desktop Image Asset */}
                      <div className="space-y-2 relative">
                        {uploading?.index === index && uploading?.field === 'desktopImage' && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-[8px]">
                            <Loader2 className="animate-spin text-black" size={24} />
                          </div>
                        )}
                        <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                          <span>DESKTOP IMAGE URL (RECOMMENDED: 1920×800)</span>
                          <span className="text-ink-muted flex items-center gap-1">
                            <Upload size={10} /> DIRECT UPLOAD
                          </span>
                        </label>

                        {banner.desktopImage && (
                          <div className="w-full h-36 bg-field rounded-[8px] overflow-hidden relative border border-hairline group/dimg">
                            <img
                              src={banner.desktopImage}
                              alt="Desktop Preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => updateBannerField(index, 'desktopImage', '')}
                              className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover/dimg:opacity-100 transition-opacity"
                              title="Remove desktop image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            value={banner.desktopImage || ''}
                            onChange={(e) => updateBannerField(index, 'desktopImage', e.target.value)}
                            placeholder="https://cdn.shopify.com/...hero-desktop.jpg"
                            className="flex-1 px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-xs focus:outline-none focus:ring-2 focus:ring-black"
                          />
                          <label className="shrink-0 px-3 flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-hairline hover:border-black bg-panel transition-all cursor-pointer text-xs font-medium text-ink-soft">
                            <Upload size={14} />
                            <span>Upload</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleUpload(e, index, 'desktopImage')}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Mobile Image Asset */}
                      <div className="space-y-2 relative">
                        {uploading?.index === index && uploading?.field === 'mobileImage' && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-[8px]">
                            <Loader2 className="animate-spin text-black" size={24} />
                          </div>
                        )}
                        <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
                          <span>MOBILE IMAGE URL (RECOMMENDED: 768×960)</span>
                          <span className="text-ink-muted flex items-center gap-1">
                            <Upload size={10} /> DIRECT UPLOAD
                          </span>
                        </label>

                        {banner.mobileImage && (
                          <div className="w-28 h-40 bg-field rounded-[8px] overflow-hidden relative border border-hairline mx-auto group/mimg">
                            <img
                              src={banner.mobileImage}
                              alt="Mobile Preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => updateBannerField(index, 'mobileImage', '')}
                              className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded-full opacity-0 group-hover/mimg:opacity-100 transition-opacity"
                              title="Remove mobile image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            value={banner.mobileImage || ''}
                            onChange={(e) => updateBannerField(index, 'mobileImage', e.target.value)}
                            placeholder="https://cdn.shopify.com/...hero-mobile.jpg"
                            className="flex-1 px-3.5 py-2.5 bg-panel-alt border border-hairline-soft rounded-[8px] text-xs focus:outline-none focus:ring-2 focus:ring-black"
                          />
                          <label className="shrink-0 px-3 flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-hairline hover:border-black bg-panel transition-all cursor-pointer text-xs font-medium text-ink-soft">
                            <Upload size={14} />
                            <span>Upload</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleUpload(e, index, 'mobileImage')}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {banners.length === 0 && (
          <div className="text-center py-20 bg-panel-alt border border-hairline-soft rounded-[12px] border-dashed">
            <Layers size={48} className="mx-auto text-ink-muted mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-ink">No Banners Configured</h3>
            <p className="text-ink-muted mb-6 text-sm">Add your first image or video hero banner to get started.</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => addBanner('image')}
                className="bg-black hover:bg-zinc-800 text-white px-5 py-2.5 rounded-full font-medium transition-all inline-flex items-center gap-2 text-sm"
              >
                <ImageIcon size={16} />
                Add Image Banner
              </button>
              <button
                onClick={() => addBanner('video')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-full font-medium transition-all inline-flex items-center gap-2 text-sm"
              >
                <VideoIcon size={16} />
                Add Video Banner
              </button>
            </div>
          </div>
        )}
      </div>

      {banners.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => addBanner('image')}
            className="py-4 border-2 border-dashed border-hairline rounded-[10px] text-ink-soft font-bold hover:bg-row-hover hover:border-zinc-400 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={18} className="text-emerald-600" />
            Add Another Image Banner
          </button>
          <button
            onClick={() => addBanner('video')}
            className="py-4 border-2 border-dashed border-purple-200 rounded-[10px] text-purple-900 bg-purple-50/20 font-bold hover:bg-purple-50/50 hover:border-purple-300 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Plus size={18} className="text-purple-600" />
            Add Another Video Banner
          </button>
        </div>
      )}
    </div>
  );
}
