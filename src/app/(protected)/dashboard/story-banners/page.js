'use client';

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
  ExternalLink,
  Sparkles,
  Link as LinkIcon,
  RotateCcw,
  Check,
  Eye,
  Smartphone,
  Monitor
} from 'lucide-react';
import { uploadToShopify } from "@/lib/utils";
import { toast } from 'react-toastify';
import Link from 'next/link';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

const DEFAULT_STORY_BANNERS = [
  {
    id: "story_toi_et_moi",
    title: "Toi et Moi",
    alt: "Toi et Moi Collection",
    url: "/collections/toi-et-moi",
    desktopImage: "https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Toi-et-moi_1089cd29-732d-419f-bfd3-99cf290db7a2.jpg?v=1793254010",
    mobileImage: "https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Toi-et-moi-Mobile.jpg?v=1793254010",
    active: true,
  },
];

const Toggle = ({ checked, onChange, disabled }) => (
  <span className="relative inline-flex items-center">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={!!checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></span>
  </span>
);

export default function StoryBannersPage() {
  const [enabled, setEnabled] = useState(true);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null); // { index, field }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/settings/story-banners`);
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled !== false);
        setBanners(
          Array.isArray(data.banners) && data.banners.length > 0
            ? data.banners
            : DEFAULT_STORY_BANNERS
        );
      } else {
        toast.error('Failed to load story banner settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/settings/story-banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          banners,
        }),
      });

      if (res.ok) {
        toast.success('Story banners saved successfully!');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBanner = () => {
    const newBanner = {
      id: `story_${Date.now()}`,
      title: 'New Story Banner',
      alt: 'Story Banner',
      url: '/collections/all',
      desktopImage: '',
      mobileImage: '',
      active: true,
    };
    setBanners([...banners, newBanner]);
  };

  const handleRemoveBanner = (index) => {
    if (confirm('Are you sure you want to delete this story banner?')) {
      const next = banners.filter((_, i) => i !== index);
      setBanners(next);
    }
  };

  const handleMove = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const next = [...banners];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      setBanners(next);
    } else if (direction === 'down' && index < banners.length - 1) {
      const next = [...banners];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      setBanners(next);
    }
  };

  const handleUpdateField = (index, field, value) => {
    const next = [...banners];
    next[index] = { ...next[index], [field]: value };
    setBanners(next);
  };

  const handleImageUpload = async (e, index, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading({ index, field });
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
      const assetName = `StoryBanner-${field}-${Date.now()}-${cleanFileName}`;

      const url = await uploadToShopify(file, assetName);
      if (url) {
        handleUpdateField(index, field, url);
        toast.success(`${field === 'desktopImage' ? 'Desktop' : 'Mobile'} image uploaded!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(null);
      e.target.value = '';
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset to Lucira default Toi et Moi banner? Any unsaved changes will be replaced.')) {
      setEnabled(true);
      setBanners(DEFAULT_STORY_BANNERS);
      toast.info('Reset to defaults. Remember to click "Save Changes" to apply.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 className="animate-spin text-primary" size={40} />
        <span className="text-sm text-ink-muted">Loading Story Banners settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Sticky / Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-hairline gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-ink">Story Banners</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              Homepage
            </span>
          </div>
          <p className="text-sm text-ink-soft mt-1">
            Manage the story banner section placed right after Bestsellers on the homepage. Contains full-bleed banners and click redirection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-hairline text-xs font-semibold text-ink-soft hover:bg-zinc-100 transition-colors"
            title="Reset to default Toi et Moi banner"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleAddBanner}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary text-primary hover:bg-primary/5 text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus size={15} />
            Add Banner
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-[#8F5D5D] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Global Section Status Toggle */}
      <div className="bg-panel border border-hairline rounded-xl p-5 mb-8 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Enable Story Section on Homepage</h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Turn this section on or off on the homepage. When off, the section will be hidden from shoppers.
            </p>
          </div>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      {/* Banners List */}
      <div className="space-y-6">
        {banners.length === 0 ? (
          <div className="text-center py-16 bg-panel border border-dashed border-hairline rounded-xl">
            <ImageIcon className="mx-auto h-12 w-12 text-ink-muted/50" />
            <h3 className="mt-2 text-sm font-semibold text-ink">No Story Banners</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Get started by adding a new banner with desktop and mobile creative.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleAddBanner}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-[#8F5D5D]"
              >
                <Plus size={15} /> Add First Banner
              </button>
            </div>
          </div>
        ) : (
          banners.map((banner, index) => {
            const isFirst = index === 0;
            const isLast = index === banners.length - 1;
            const isUploadingDesktop = uploading?.index === index && uploading?.field === 'desktopImage';
            const isUploadingMobile = uploading?.index === index && uploading?.field === 'mobileImage';

            return (
              <div
                key={banner.id || index}
                className="bg-panel border border-hairline rounded-xl p-6 shadow-sm relative transition-all"
              >
                {/* Banner Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-hairline-soft gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-100 text-xs font-bold text-ink">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-ink">{banner.title || 'Untitled Banner'}</h4>
                      <p className="text-xs text-ink-soft">
                        Redirects to: <code className="text-primary font-mono text-[11px] bg-amber-50/80 px-1.5 py-0.5 rounded">{banner.url || 'No URL configured'}</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer mr-3">
                      <span className="text-xs font-medium text-ink-soft">Active</span>
                      <Toggle
                        checked={banner.active !== false}
                        onChange={(val) => handleUpdateField(index, 'active', val)}
                      />
                    </label>

                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMove(index, 'up')}
                      className="p-1.5 rounded-lg border border-hairline text-ink-soft hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move Up"
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMove(index, 'down')}
                      className="p-1.5 rounded-lg border border-hairline text-ink-soft hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move Down"
                    >
                      <MoveDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveBanner(index)}
                      className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                      title="Delete Banner"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Banner Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">
                      Banner Title / Alt Text <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={banner.title || ''}
                      onChange={(e) => handleUpdateField(index, 'title', e.target.value)}
                      placeholder="e.g. Toi et Moi"
                      className="w-full border border-hairline rounded-lg px-3.5 py-2 text-sm text-ink bg-panel focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-[11px] text-ink-muted mt-1">Used for accessibility (alt) and administrative tracking.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">
                      Redirection URL <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="text"
                          value={banner.url || ''}
                          onChange={(e) => handleUpdateField(index, 'url', e.target.value)}
                          placeholder="e.g. /collections/rings or /collections/toi-et-moi"
                          className="w-full border border-hairline rounded-lg pl-9 pr-3.5 py-2 text-sm text-ink bg-panel focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-xs"
                        />
                      </div>
                      {banner.url && (
                        <a
                          href={banner.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center px-3 py-2 border border-hairline rounded-lg hover:bg-zinc-100 text-ink-soft"
                          title="Test Link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-muted mt-1">Clicking this banner takes the customer to this page.</p>
                  </div>
                </div>

                {/* Responsive Image Creative Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-hairline-soft">
                  {/* Desktop Image Column */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor size={15} className="text-primary" />
                        <span className="text-xs font-bold text-ink">Desktop Banner Image</span>
                      </div>
                      <span className="text-[11px] text-ink-muted font-mono">1920 × 823 px</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={banner.desktopImage || ''}
                        onChange={(e) => handleUpdateField(index, 'desktopImage', e.target.value)}
                        placeholder="https://cdn.shopify.com/...desktop.jpg"
                        className="flex-1 border border-hairline rounded-lg px-3 py-2 text-xs text-ink bg-panel focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                      />
                      <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary text-primary hover:bg-primary/5 text-xs font-semibold cursor-pointer shrink-0">
                        {isUploadingDesktop ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, index, 'desktopImage')}
                          disabled={isUploadingDesktop}
                        />
                      </label>
                    </div>

                    {/* Desktop Preview */}
                    <div className="w-full aspect-[1920/823] bg-zinc-100 border border-hairline rounded-lg overflow-hidden relative group">
                      {banner.desktopImage ? (
                        <>
                          <img
                            src={banner.desktopImage}
                            alt="Desktop Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateField(index, 'desktopImage', '')}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove desktop image"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-ink-muted gap-1">
                          <ImageIcon size={24} className="opacity-40" />
                          <span className="text-xs">No desktop image selected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mobile Image Column */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone size={15} className="text-primary" />
                        <span className="text-xs font-bold text-ink">Mobile Banner Image</span>
                      </div>
                      <span className="text-[11px] text-ink-muted font-mono">1080 × 1350 px (4:5)</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={banner.mobileImage || ''}
                        onChange={(e) => handleUpdateField(index, 'mobileImage', e.target.value)}
                        placeholder="https://cdn.shopify.com/...mobile.jpg"
                        className="flex-1 border border-hairline rounded-lg px-3 py-2 text-xs text-ink bg-panel focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                      />
                      <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary text-primary hover:bg-primary/5 text-xs font-semibold cursor-pointer shrink-0">
                        {isUploadingMobile ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, index, 'mobileImage')}
                          disabled={isUploadingMobile}
                        />
                      </label>
                    </div>

                    {/* Mobile Preview */}
                    <div className="w-full max-w-[240px] mx-auto aspect-[1080/1350] bg-zinc-100 border border-hairline rounded-lg overflow-hidden relative group">
                      {banner.mobileImage ? (
                        <>
                          <img
                            src={banner.mobileImage}
                            alt="Mobile Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateField(index, 'mobileImage', '')}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove mobile image"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-ink-muted gap-1">
                          <ImageIcon size={24} className="opacity-40" />
                          <span className="text-xs">No mobile image selected</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
