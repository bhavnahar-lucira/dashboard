'use client';

import { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
  ArrowRight,
  Link as LinkIcon,
  Tag,
} from 'lucide-react';
import { uploadToShopify } from "@/lib/utils";
import { toast } from 'react-toastify';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

const DEFAULT_CATEGORIES = [
  { id: "1", name: "Rings", image: "https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Rings_cdcd476d-83ad-4bc8-9463-0a13217a051c.jpg?v=1788436552", href: "/collections/rings" },
  { id: "2", name: "Earrings", image: "https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Earrings_15f534ee-2965-489d-bb83-f5293775d792.jpg?v=1788436551", href: "/collections/earrings" },
  { id: "3", name: "Bracelets", image: "https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Tennis-Bracelet.jpg?v=1788436552", href: "/collections/bracelets" },
  { id: "4", name: "Necklaces", image: "https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Necklaces_c3067ae6-14cc-45c4-9d7b-6a66ae6d5f69.jpg?v=1788436552", href: "/collections/necklaces" },
  { id: "5", name: "Nosepins", image: "https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Nosepins.jpg?v=1788436551", href: "/collections/nosepins" },
  { id: "6", name: "Mangalsutra", image: "https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Mangalsutras.jpg?v=1788436552", href: "/collections/mangalsutra" },
  { id: "7", name: "Men's Ring", image: "https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Men_27s-Ring.jpg?v=1788436552", href: "/collections/mens-rings" },
  { id: "8", name: "Men's Stud", image: "https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Men_27s-Stud.jpg?v=1788436552", href: "/collections/mens-stud" },
];

export default function ExploreRangePage() {
  const [title, setTitle] = useState('Explore Our Range');
  const [subtitle, setSubtitle] = useState('Find diamond jewelry pieces that match your style.');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/settings/explore-range`);
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || 'Explore Our Range');
        setSubtitle(data.subtitle || 'Find diamond jewelry pieces that match your style.');
        setCategories(
          Array.isArray(data.categories) && data.categories.length > 0
            ? data.categories
            : DEFAULT_CATEGORIES
        );
      } else {
        toast.error('Failed to load explore range settings');
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
      const res = await fetch(`${BASE_URL}/api/settings/explore-range`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim(),
          categories,
        }),
      });

      if (res.ok) {
        toast.success('Explore Our Range settings saved successfully!');
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

  const handleAddCategory = () => {
    const newCat = {
      id: `cat_${Date.now()}`,
      name: 'New Category',
      image: '',
      href: '/collections/',
    };
    setCategories([...categories, newCat]);
    toast.info('New category added. Upload an image and update the title.');
  };

  const handleRemoveCategory = (index) => {
    const catName = categories[index]?.name || 'category';
    if (confirm(`Are you sure you want to remove "${catName}"?`)) {
      setCategories(categories.filter((_, i) => i !== index));
    }
  };

  const handleMoveCategory = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const next = [...categories];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      setCategories(next);
    } else if (direction === 'down' && index < categories.length - 1) {
      const next = [...categories];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      setCategories(next);
    }
  };

  const handleUpdateField = (index, field, value) => {
    const next = [...categories];
    next[index] = { ...next[index], [field]: value };
    setCategories(next);
  };

  const handleImageUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingIndex(index);
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
      const assetName = `ExploreRange-${Date.now()}-${cleanFileName}`;

      const url = await uploadToShopify(file, assetName);
      if (url) {
        handleUpdateField(index, 'image', url);
        toast.success('Category image uploaded successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadingIndex(null);
      e.target.value = '';
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset categories and titles to Lucira defaults? Any unsaved custom categories will be replaced.')) {
      setTitle('Explore Our Range');
      setSubtitle('Find diamond jewelry pieces that match your style.');
      setCategories(DEFAULT_CATEGORIES);
      toast.info('Reset to defaults. Remember to click "Save Changes" to apply.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 className="animate-spin text-brand-solid" size={40} />
        <span className="text-sm text-ink-muted">Loading Explore Our Range settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Sticky / Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-hairline gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="admin-title text-2xl font-bold text-ink-primary">Explore Our Range</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              Homepage
            </span>
          </div>
          <p className="admin-subtitle text-sm text-ink-muted mt-1">
            Manage category cards, custom images, links, and ordering for the homepage grid.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-hairline text-xs font-semibold text-ink-soft hover:bg-zinc-100 transition-colors"
            title="Reset to default categories"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleAddCategory}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand-solid text-xs font-semibold text-brand-solid hover:bg-brand-solid/5 transition-colors"
          >
            <Plus size={16} />
            Add Category
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#5A413F] hover:bg-[#473331] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md shadow-zinc-200 transition-all disabled:opacity-70"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Section Titles Settings Card */}
      <div className="bg-white rounded-xl border border-hairline p-6 shadow-xs mb-8">
        <h2 className="text-base font-semibold text-ink-primary mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-[#5A413F]" />
          Section Headings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
              Section Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Explore Our Range"
              className="w-full px-3.5 py-2.5 rounded-lg border border-hairline bg-field text-sm text-ink-primary focus:outline-hidden focus:ring-2 focus:ring-[#5A413F]/20 focus:border-[#5A413F]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
              Section Subtitle
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Find diamond jewelry pieces that match your style."
              className="w-full px-3.5 py-2.5 rounded-lg border border-hairline bg-field text-sm text-ink-primary focus:outline-hidden focus:ring-2 focus:ring-[#5A413F]/20 focus:border-[#5A413F]"
            />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink-primary">
            Categories ({categories.length})
          </h2>
          <span className="text-xs text-ink-muted">
            Desktop displays 4 per row. Mobile displays in an interactive 2×2 swipeable carousel.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((cat, index) => {
            const isUploading = uploadingIndex === index;

            return (
              <div
                key={cat.id || index}
                className="bg-white rounded-xl border border-hairline overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Card Header with index and reorder buttons */}
                <div className="px-4 py-3 bg-zinc-50 border-b border-hairline flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-ink-primary truncate max-w-[120px]">
                      {cat.name || 'Untitled'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveCategory(index, 'up')}
                      className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 disabled:opacity-30 disabled:pointer-events-none"
                      title="Move Up"
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === categories.length - 1}
                      onClick={() => handleMoveCategory(index, 'down')}
                      className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 disabled:opacity-30 disabled:pointer-events-none"
                      title="Move Down"
                    >
                      <MoveDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(index)}
                      className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 ml-1"
                      title="Remove Category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Live Card Preview Box */}
                <div className="p-4 pb-0">
                  <div className="relative aspect-[313/362] w-full rounded-lg overflow-hidden bg-zinc-100 border border-hairline group">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
                        <ImageIcon size={36} className="mb-2 stroke-1" />
                        <span className="text-xs">No image uploaded</span>
                      </div>
                    )}

                    {/* Gradient Overlay & Text preview matching storefront */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-white pointer-events-none">
                      <span className="text-sm font-semibold tracking-wide drop-shadow-sm">
                        {cat.name || 'Category'}
                      </span>
                      <div className="w-7 h-7 rounded-full border border-white/50 flex items-center justify-center">
                        <ArrowRight size={13} />
                      </div>
                    </div>

                    {/* Upload Overlay Button */}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white backdrop-blur-[2px]">
                      {isUploading ? (
                        <Loader2 size={24} className="animate-spin text-white mb-2" />
                      ) : (
                        <Upload size={24} className="mb-2" />
                      )}
                      <span className="text-xs font-semibold">
                        {isUploading ? 'Uploading...' : 'Change Image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => handleImageUpload(e, index)}
                      />
                    </label>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="p-4 flex-1 flex flex-col gap-3">
                  {/* Category Name */}
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1 flex items-center gap-1">
                      <Tag size={12} />
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => handleUpdateField(index, 'name', e.target.value)}
                      placeholder="e.g. Rings"
                      className="w-full px-3 py-1.5 rounded-md border border-hairline text-sm text-ink-primary focus:outline-hidden focus:ring-1 focus:ring-[#5A413F]"
                    />
                  </div>

                  {/* Target Link */}
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1 flex items-center gap-1">
                      <LinkIcon size={12} />
                      Link / URL
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={cat.href}
                        onChange={(e) => handleUpdateField(index, 'href', e.target.value)}
                        placeholder="/collections/rings"
                        className="flex-1 px-3 py-1.5 rounded-md border border-hairline text-sm text-ink-primary font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-[#5A413F]"
                      />
                      {cat.href && (
                        <a
                          href={cat.href.startsWith('http') ? cat.href : `https://lucirajewelry.com${cat.href}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-zinc-400 hover:text-zinc-700"
                          title="Open link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Image URL & Upload button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-ink-muted flex items-center gap-1">
                        <ImageIcon size={12} />
                        Image Source
                      </label>
                      <label className="text-xs text-[#5A413F] font-semibold hover:underline cursor-pointer flex items-center gap-1">
                        <Upload size={11} />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => handleImageUpload(e, index)}
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={cat.image}
                      onChange={(e) => handleUpdateField(index, 'image', e.target.value)}
                      placeholder="https://cdn.shopify.com/..."
                      className="w-full px-3 py-1.5 rounded-md border border-hairline text-xs font-mono text-ink-primary focus:outline-hidden focus:ring-1 focus:ring-[#5A413F]"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Category Card */}
          <button
            type="button"
            onClick={handleAddCategory}
            className="rounded-xl border-2 border-dashed border-zinc-200 hover:border-[#5A413F] bg-zinc-50 hover:bg-zinc-100/70 transition-all p-8 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-[#5A413F] min-h-[380px]"
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-zinc-200 flex items-center justify-center">
              <Plus size={22} />
            </div>
            <div className="text-center">
              <span className="font-semibold text-sm block">Add Category</span>
              <span className="text-xs text-zinc-400 mt-0.5 block">Create a new range tile</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
