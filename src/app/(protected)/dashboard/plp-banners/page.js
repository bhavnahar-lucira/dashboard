"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Save, MoveUp, MoveDown, Loader2, Upload,
  Image as ImageIcon, X, Search, LayoutTemplate,
} from 'lucide-react';
import { uploadToShopify } from "@/lib/utils";
import { toast } from 'react-toastify';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

const EMPTY_DEFAULT = { desktopImage: '', mobileImage: '', alt: '' };

const blankOverride = () => ({
  id: `ov_${Date.now()}`,
  handles: [],
  layout: 'strip',
  desktopImage: '',
  mobileImage: '',
  alt: '',
});

const blankInpage = () => ({
  id: `ip_${Date.now()}`,
  src: '',
  alt: 'Promo',
  href: '/',
});

export default function PlpBannersPage() {
  const [topDefault, setTopDefault] = useState(EMPTY_DEFAULT);
  const [overrides, setOverrides] = useState([]);
  const [inpageBanners, setInpageBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // { scope: 'default' | 'override' | 'inpage', index, field }
  const [uploading, setUploading] = useState(null);

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/settings/plp-banners`);
      if (res.ok) {
        const data = await res.json();
        setTopDefault({ ...EMPTY_DEFAULT, ...(data.topBanner?.default || {}) });
        setOverrides((data.topBanner?.overrides || []).map((o, i) => ({
          ...blankOverride(), ...o, id: o.id || `ov-${Date.now()}-${i}`,
        })));
        setInpageBanners((data.inpageBanners || []).map((b, i) => ({
          ...blankInpage(), ...b, id: b.id || `ip-${Date.now()}-${i}`,
        })));
      } else {
        toast.error('Failed to load PLP banners');
      }
    } catch {
      toast.error('Failed to load PLP banners');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/settings/plp-banners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topBanner: { default: topDefault, overrides },
          inpageBanners,
        }),
      });
      if (res.ok) {
        toast.success('PLP banners saved — collection pages are refreshing');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save');
      }
    } catch {
      toast.error('Error saving PLP banners');
    } finally {
      setSaving(false);
    }
  };

  const doUpload = async (file, scope, index, field, onDone) => {
    if (!file) return;
    try {
      setUploading({ scope, index, field });
      const assetName = `PLP-Banner-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      const url = await uploadToShopify(file, assetName);
      if (url) {
        onDone(url);
        toast.success('Image uploaded');
      }
    } catch (e) {
      toast.error('Upload failed: ' + e.message);
    } finally {
      setUploading(null);
    }
  };

  /* ------- top default ------- */
  const setDefaultField = (field, value) => setTopDefault((d) => ({ ...d, [field]: value }));

  /* ------- overrides ------- */
  const updateOverride = (index, patch) =>
    setOverrides((list) => list.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  const removeOverride = (index) => setOverrides((list) => list.filter((_, i) => i !== index));
  const moveOverride = (index, dir) => setOverrides((list) => {
    const next = [...list];
    const to = dir === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= next.length) return list;
    [next[index], next[to]] = [next[to], next[index]];
    return next;
  });

  /* ------- inpage ------- */
  const updateInpage = (index, patch) =>
    setInpageBanners((list) => list.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  const removeInpage = (index) => setInpageBanners((list) => list.filter((_, i) => i !== index));
  const moveInpage = (index, dir) => setInpageBanners((list) => {
    const next = [...list];
    const to = dir === 'up' ? index - 1 : index + 1;
    if (to < 0 || to >= next.length) return list;
    [next[index], next[to]] = [next[to], next[index]];
    return next;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  return (
    <div className="container-main py-10 px-4">
      {/* Header */}
      <div className="mb-9 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="admin-title flex items-center gap-3">
            <LayoutTemplate className="text-primary" />
            PLP Banners
          </h1>
          <p className="admin-subtitle">
            Manage the collection-page top banner (with per-collection overrides) and the promo
            banners shown inside the product grid.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 disabled:opacity-50 h-fit"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* ===================== SECTION A — TOP BANNER ===================== */}
      <section className="mb-12">
        <h2 className="admin-section-label mb-3.5 px-1">Top Banner</h2>

        {/* Default */}
        <div className="bg-panel border border-hairline-soft rounded-[8px] p-6 shadow-sm mb-6">
          <h3 className="font-bold text-lg text-ink mb-1">Default banner</h3>
          <p className="text-sm text-ink-muted mb-6">
            Shown on every collection page that has no override below. Rendered as the pink strip
            layout (collection title + trust badges + image on the right).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AssetField
              label="DESKTOP IMAGE"
              value={topDefault.desktopImage}
              onChange={(v) => setDefaultField('desktopImage', v)}
              onUpload={(file) => doUpload(file, 'default', 0, 'desktopImage', (url) => setDefaultField('desktopImage', url))}
              busy={uploading?.scope === 'default' && uploading?.field === 'desktopImage'}
              ratio="wide"
            />
            <AssetField
              label="MOBILE IMAGE"
              value={topDefault.mobileImage}
              onChange={(v) => setDefaultField('mobileImage', v)}
              onUpload={(file) => doUpload(file, 'default', 0, 'mobileImage', (url) => setDefaultField('mobileImage', url))}
              busy={uploading?.scope === 'default' && uploading?.field === 'mobileImage'}
              ratio="tall"
            />
          </div>
          <div className="mt-4 max-w-sm">
            <FieldLabel>ALT TEXT</FieldLabel>
            <TextInput value={topDefault.alt} onChange={(v) => setDefaultField('alt', v)} placeholder="Describe the banner for SEO" />
          </div>
        </div>

        {/* Overrides */}
        <div className="flex items-center justify-between px-1 mb-3">
          <h3 className="font-bold text-ink">Collection overrides</h3>
          <span className="text-xs text-ink-muted">{overrides.length} override{overrides.length === 1 ? '' : 's'}</span>
        </div>

        <div className="space-y-5">
          {overrides.map((ov, index) => (
            <div key={ov.id} className="bg-panel border border-hairline-soft rounded-[8px] p-6 shadow-sm relative group">
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveOverride(index, 'up')} disabled={index === 0} className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30"><MoveUp size={14} /></button>
                <button onClick={() => moveOverride(index, 'down')} disabled={index === overrides.length - 1} className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30"><MoveDown size={14} /></button>
                <button onClick={() => removeOverride(index)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 ml-2"><Trash2 size={14} /></button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span className="w-8 h-8 rounded-full bg-field flex items-center justify-center font-bold text-ink-soft text-sm">{index + 1}</span>
                <h4 className="font-bold text-ink">{ov.handles.length ? ov.handles.join(', ') : 'No collections selected'}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <FieldLabel>COLLECTIONS</FieldLabel>
                    <CollectionPicker
                      selected={ov.handles}
                      onChange={(handles) => updateOverride(index, { handles })}
                    />
                  </div>
                  <div>
                    <FieldLabel>LAYOUT</FieldLabel>
                    <select
                      value={ov.layout}
                      onChange={(e) => updateOverride(index, { layout: e.target.value })}
                      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="strip">Strip — pink layout, image on the right</option>
                      <option value="fullwidth">Full width — edge-to-edge image, replaces pink layout</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>ALT TEXT</FieldLabel>
                    <TextInput value={ov.alt} onChange={(v) => updateOverride(index, { alt: v })} placeholder="Describe the banner for SEO" />
                  </div>
                </div>

                <div className="space-y-4">
                  <AssetField
                    label="DESKTOP IMAGE"
                    value={ov.desktopImage}
                    onChange={(v) => updateOverride(index, { desktopImage: v })}
                    onUpload={(file) => doUpload(file, 'override', index, 'desktopImage', (url) => updateOverride(index, { desktopImage: url }))}
                    busy={uploading?.scope === 'override' && uploading?.index === index && uploading?.field === 'desktopImage'}
                    ratio="wide"
                  />
                  <AssetField
                    label="MOBILE IMAGE"
                    value={ov.mobileImage}
                    onChange={(v) => updateOverride(index, { mobileImage: v })}
                    onUpload={(file) => doUpload(file, 'override', index, 'mobileImage', (url) => updateOverride(index, { mobileImage: url }))}
                    busy={uploading?.scope === 'override' && uploading?.index === index && uploading?.field === 'mobileImage'}
                    ratio="tall"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setOverrides((list) => [...list, blankOverride()])}
          className="mt-5 w-full py-4 border-2 border-dashed border-hairline rounded-[8px] text-ink-soft font-bold hover:bg-row-hover hover:border-zinc-300 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Add collection override
        </button>
      </section>

      {/* ===================== SECTION B — INPAGE BANNERS ===================== */}
      <section>
        <h2 className="admin-section-label mb-1.5 px-1">Inpage Banners</h2>
        <p className="text-sm text-ink-muted px-1 mb-4">
          Injected into the product grid after the 6th product, then every 10 products, shown in this
          order and cycling.
        </p>

        <div className="space-y-5">
          {inpageBanners.map((b, index) => (
            <div key={b.id} className="bg-panel border border-hairline-soft rounded-[8px] p-6 shadow-sm relative group">
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveInpage(index, 'up')} disabled={index === 0} className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30"><MoveUp size={14} /></button>
                <button onClick={() => moveInpage(index, 'down')} disabled={index === inpageBanners.length - 1} className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30"><MoveDown size={14} /></button>
                <button onClick={() => removeInpage(index)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 ml-2"><Trash2 size={14} /></button>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span className="w-8 h-8 rounded-full bg-field flex items-center justify-center font-bold text-ink-soft text-sm">{index + 1}</span>
                <h4 className="font-bold text-ink">Creative {String.fromCharCode(65 + index)}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AssetField
                  label="BANNER IMAGE"
                  value={b.src}
                  onChange={(v) => updateInpage(index, { src: v })}
                  onUpload={(file) => doUpload(file, 'inpage', index, 'src', (url) => updateInpage(index, { src: url }))}
                  busy={uploading?.scope === 'inpage' && uploading?.index === index && uploading?.field === 'src'}
                  ratio="wide"
                />
                <div className="space-y-4">
                  <div>
                    <FieldLabel>ALT TEXT</FieldLabel>
                    <TextInput value={b.alt} onChange={(v) => updateInpage(index, { alt: v })} placeholder="Promo" />
                  </div>
                  <div>
                    <FieldLabel>LINK URL</FieldLabel>
                    <TextInput value={b.href} onChange={(v) => updateInpage(index, { href: v })} placeholder="/collections/rakhi" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setInpageBanners((list) => [...list, blankInpage()])}
          className="mt-5 w-full py-4 border-2 border-dashed border-hairline rounded-[8px] text-ink-soft font-bold hover:bg-row-hover hover:border-zinc-300 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Add inpage banner
        </button>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function FieldLabel({ children }) {
  return <label className="text-[10px] font-bold text-ink-muted block mb-2">{children}</label>;
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
    />
  );
}

function AssetField({ label, value, onChange, onUpload, busy, ratio }) {
  const previewClass = ratio === 'tall' ? 'w-28 h-40 mx-auto' : 'w-full h-28';
  return (
    <div className="space-y-2 relative">
      {busy && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-[8px]">
          <Loader2 className="animate-spin text-black" size={24} />
        </div>
      )}
      <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
        {label}
        <span className="text-ink-muted flex items-center gap-1"><Upload size={10} /> DIRECT UPLOAD</span>
      </label>

      {value && (
        <div className={`${previewClass} bg-field rounded-[8px] overflow-hidden relative mb-2 border border-hairline`}>
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://cdn.shopify.com/...jpg"
          className="flex-1 px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <label className="shrink-0 w-12 flex items-center justify-center rounded-[8px] border-2 border-dashed border-hairline hover:border-black transition-all cursor-pointer">
          <Upload size={16} className="text-ink-muted" />
          <input type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUpload(f); }} />
        </label>
      </div>
    </div>
  );
}

/**
 * Collection multi-select backed by the same admin search endpoint the
 * product-discounts picker uses. Stores selected collection *handles* (that's
 * what the storefront matches on).
 */
function CollectionPicker({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef(null);
  const debounce = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const runSearch = (q) => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        const res = await fetch(`${BASE_URL}/api/products/admin-collections-search?${params.toString()}`);
        const data = await res.json();
        setResults(data.collections || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const toggleHandle = (handle) => {
    onChange(selected.includes(handle) ? selected.filter((h) => h !== handle) : [...selected, handle]);
  };

  return (
    <div className="relative" ref={boxRef}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((h) => (
            <span key={h} className="inline-flex items-center gap-1 bg-field text-ink-soft text-xs font-medium px-2 py-1 rounded-full">
              {h}
              <button onClick={() => toggleHandle(h)} className="hover:text-red-500"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      <div
        className="flex items-center gap-2 px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] cursor-text"
        onClick={() => { setOpen(true); if (!results.length) runSearch(''); }}
      >
        <Search size={14} className="text-ink-muted shrink-0" />
        <input
          value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); runSearch(e.target.value); }}
          placeholder="Browse or search collections"
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-panel border border-hairline rounded-[8px] shadow-lg">
          {searching && <div className="px-4 py-3 text-sm text-ink-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Searching…</div>}
          {!searching && results.length === 0 && <div className="px-4 py-3 text-sm text-ink-muted">No collections found</div>}
          {!searching && results.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleHandle(c.handle)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-row-hover transition-colors"
            >
              <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${selected.includes(c.handle) ? 'bg-black border-black text-white' : 'border-hairline'}`}>
                {selected.includes(c.handle) && '✓'}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink truncate">{c.title}</span>
                <span className="block text-[11px] text-ink-muted truncate">{c.handle}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
