"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Save, MoveUp, MoveDown, Loader2, Upload,
  Image as ImageIcon, X, Search, LayoutTemplate, Copy, Check, Sparkles,
} from 'lucide-react';
import { uploadToShopify } from "@/lib/utils";
import { toast } from 'react-toastify';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

const PRESET_PLP_BANNERS = [
  {
    name: '100% Making Discount (Studs)',
    handles: ['100-making-discount'],
    url: 'https://cdn.shopify.com/s/files/1/0739/8516/3482/files/studs_plp.jpg?v=1792042102',
  },
  {
    name: '50% Making Discount (Diamond Rings)',
    handles: ['50-making-discount'],
    url: 'https://cdn.shopify.com/s/files/1/0739/8516/3482/files/diamond_ring_PLP.jpg?v=1792042102',
  },
  {
    name: '20% Making Discount (Gold Rings)',
    handles: ['20-making-discount'],
    url: 'https://cdn.shopify.com/s/files/1/0739/8516/3482/files/gold_ring_plp.jpg?v=1792042102',
  },
];

const EMPTY_DEFAULT = { desktopImage: '', mobileImage: '', alt: '' };

const EMPTY_PLAIN_GOLD = {
  desktopImage: 'https://cdn.shopify.com/s/files/1/0739/8516/3482/files/gold_ring_plp.jpg?v=1792042102&width=1920',
  mobileImage: 'https://cdn.shopify.com/s/files/1/0739/8516/3482/files/gold_ring_plp.jpg?v=1792042102&width=1920',
  alt: 'Plain Gold Jewellery Offers',
  handles: [
    'plain-gold-rings', 'plain-gold-earrings', 'plain-gold-chains', 'plain-gold-necklaces', 'plain-gold-coins', 'plain-gold-nose-rings',
    'gold-jewelry', 'gold-rings', 'gold-chains', 'gold-earrings', 'gold-bracelets', 'gold-necklaces', 'gold-coins',
    '1-gram-gold-jewellery', '10-gram-gold-jewellery', '14k-gold-jewellery', '18k-gold-jewellery', '22k-gold-jewellery'
  ],
};

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
  mobileSrc: '',
  alt: 'Promo',
  href: '/',
  handles: [],
  after: '',
  size: 'tile',
});

export default function PlpBannersPage() {
  const [topDefault, setTopDefault] = useState(EMPTY_DEFAULT);
  const [topPlainGold, setTopPlainGold] = useState(EMPTY_PLAIN_GOLD);
  const [overrides, setOverrides] = useState([]);
  const [inpageBanners, setInpageBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(null);

  const handleCopyPreset = (url) => {
    navigator.clipboard?.writeText(url);
    setCopiedUrl(url);
    toast.success('Shopify CDN image URL copied!');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleAddPresetOverride = (preset) => {
    const newOv = {
      id: `ov_${Date.now()}`,
      handles: preset.handles,
      layout: 'strip',
      desktopImage: preset.url,
      mobileImage: preset.url,
      alt: `${preset.name} Collection`,
    };
    setOverrides((list) => [...list, newOv]);
    toast.success(`Added ${preset.name} override banner!`);
  };
  // { scope: 'default' | 'override' | 'inpage', index, field }
  const [uploading, setUploading] = useState(null);
  const [tab, setTab] = useState('top'); // 'top' | 'inpage'
  const [group, setGroup] = useState('');  // inpage sub-tab: sorted handles joined by ',' ('' = all collections)
  const [newGroup, setNewGroup] = useState(null); // handles being picked for a new group, or null

  // Inpage banners are grouped by the collections they target.
  const groupKey = (b) => [...(b.handles || [])].sort().join(',');
  const groupKeys = ['', ...new Set(inpageBanners.map(groupKey).filter(Boolean))];
  const groupLabel = (k) => (k ? k.split(',').join(' + ') : 'Common');
  // Changing a group's collections retargets every banner in it and follows it.
  const retargetGroup = (handles) => {
    setInpageBanners((list) => list.map((b) => (groupKey(b) === group ? { ...b, handles } : b)));
    setGroup([...handles].sort().join(','));
  };

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/settings/plp-banners`);
      if (res.ok) {
        const data = await res.json();
        setTopDefault({ ...EMPTY_DEFAULT, ...(data.topBanner?.default || {}) });
        setTopPlainGold({ ...EMPTY_PLAIN_GOLD, ...(data.topBanner?.plainGold || {}) });
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
          topBanner: { default: topDefault, plainGold: topPlainGold, overrides },
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

  /* ------- top default & plain gold ------- */
  const setDefaultField = (field, value) => setTopDefault((d) => ({ ...d, [field]: value }));
  const setPlainGoldField = (field, value) => setTopPlainGold((d) => ({ ...d, [field]: value }));

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

      {/* Tabs — one Save button covers both, state lives in this page */}
      <div className="flex gap-2 border-b border-hairline-soft mb-8">
        {[
          { key: 'top', label: 'Top Banner', count: overrides.length + 1 },
          { key: 'inpage', label: 'Inpage Banners', count: inpageBanners.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-bold -mb-px border-b-2 transition-colors ${
              tab === t.key ? 'border-black text-ink' : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t.label} <span className="ml-1 text-xs font-medium text-ink-muted">({t.count})</span>
          </button>
        ))}
      </div>

      {/* ===================== SECTION A — TOP BANNER ===================== */}
      <section className={`mb-12 ${tab === 'top' ? '' : 'hidden'}`}>
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

        {/* Plain Gold Default */}
        <div className="bg-panel border border-amber-300/80 bg-gradient-to-br from-amber-50/25 via-white to-amber-50/10 rounded-[8px] p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"></span>
              <h3 className="font-bold text-lg text-ink">Plain Gold default banner</h3>
            </div>
            <span className="text-[11px] bg-amber-100 text-amber-900 font-semibold px-2.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">
              Plain Gold PLP
            </span>
          </div>
          <p className="text-sm text-ink-muted mb-6">
            Default banner for all plain gold collections without a custom override below. Rendered as the strip layout with collection title, trust badges, and this creative.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AssetField
              label="DESKTOP IMAGE"
              value={topPlainGold.desktopImage}
              onChange={(v) => setPlainGoldField('desktopImage', v)}
              onUpload={(file) => doUpload(file, 'plainGold', 0, 'desktopImage', (url) => setPlainGoldField('desktopImage', url))}
              busy={uploading?.scope === 'plainGold' && uploading?.field === 'desktopImage'}
              ratio="wide"
            />
            <AssetField
              label="MOBILE IMAGE"
              value={topPlainGold.mobileImage}
              onChange={(v) => setPlainGoldField('mobileImage', v)}
              onUpload={(file) => doUpload(file, 'plainGold', 0, 'mobileImage', (url) => setPlainGoldField('mobileImage', url))}
              busy={uploading?.scope === 'plainGold' && uploading?.field === 'mobileImage'}
              ratio="tall"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <FieldLabel>ALT TEXT</FieldLabel>
              <TextInput value={topPlainGold.alt} onChange={(v) => setPlainGoldField('alt', v)} placeholder="Describe the plain gold banner for SEO" />
            </div>
            <div>
              <FieldLabel>TARGET PLAIN GOLD COLLECTIONS</FieldLabel>
              <CollectionPicker
                selected={topPlainGold.handles || []}
                onChange={(handles) => setPlainGoldField('handles', handles)}
              />
              <p className="text-[11px] text-ink-muted mt-1.5">
                Automatically applies to these handles, plus any collection matching <code>plain-gold-*</code> or <code>gold-*</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Preset CDN Assets Quick Bar */}
        <div className="bg-[#FAF9F8] border border-hairline-soft rounded-[8px] p-5 shadow-2xs mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-[#5A413F]" />
            <h3 className="font-bold text-sm text-ink">Shopify CDN Creative Presets</h3>
            <span className="text-xs text-ink-muted">(Provided 960x335 PLP strip banners)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESET_PLP_BANNERS.map((preset, idx) => (
              <div key={idx} className="bg-white border border-hairline-soft rounded-lg p-2.5 flex flex-col justify-between space-y-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-14 h-8 shrink-0 rounded overflow-hidden border border-zinc-200 bg-zinc-100">
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-ink truncate">{preset.name}</p>
                    <p className="text-[10px] text-ink-muted truncate font-mono">{preset.handles.join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => handleCopyPreset(preset.url)}
                    className="flex-1 py-1 px-2 text-[11px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded flex items-center justify-center gap-1 transition-colors"
                  >
                    {copiedUrl === preset.url ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUrl === preset.url ? 'Copied' : 'Copy URL'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddPresetOverride(preset)}
                    className="py-1 px-2 text-[11px] font-semibold text-white bg-[#5A413F] hover:bg-[#463230] rounded flex items-center justify-center gap-1 transition-colors shrink-0"
                    title="Add as collection override"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}
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
      <section className={tab === 'inpage' ? '' : 'hidden'}>
        <h2 className="admin-section-label mb-1.5 px-1">Inpage Banners</h2>
        <p className="text-sm text-ink-muted px-1 mb-4">
          Banners with no collections are injected after the 6th product, then 10 later, in this order.
          Banners with collections set appear only on those collections, each once, at its
          &quot;after N products&quot; position; if any are set for a collection, they replace the global ones there.
        </p>

        {/* Group sub-tabs: one per set of collections */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {groupKeys.map((k) => (
            <button
              key={k || 'all'}
              onClick={() => { setGroup(k); setNewGroup(null); }}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                group === k && !newGroup ? 'bg-black text-white' : 'bg-field text-ink-soft hover:bg-zinc-200'
              }`}
            >
              {groupLabel(k)} <span className="opacity-60 font-medium">({inpageBanners.filter((b) => groupKey(b) === k).length})</span>
            </button>
          ))}
          <button
            onClick={() => setNewGroup([])}
            className="px-4 py-2 rounded-full text-sm font-bold border-2 border-dashed border-hairline text-ink-soft hover:border-black flex items-center gap-1"
          >
            <Plus size={14} /> New group
          </button>
        </div>

        {newGroup ? (
          <div className="bg-panel border border-hairline-soft rounded-[8px] p-6 shadow-sm mb-5 max-w-xl">
            <FieldLabel>PICK THE COLLECTIONS THIS GROUP APPLIES TO</FieldLabel>
            <CollectionPicker selected={newGroup} onChange={setNewGroup} />
            <button
              disabled={!newGroup.length}
              onClick={() => {
                setInpageBanners((list) => [...list, { ...blankInpage(), handles: newGroup, after: 0 }]);
                setGroup([...newGroup].sort().join(','));
                setNewGroup(null);
              }}
              className="mt-4 bg-primary text-white px-5 py-2 rounded-full text-sm font-medium disabled:opacity-40"
            >
              Create group with first banner
            </button>
          </div>
        ) : (
          <>
            {group ? (
              <div className="bg-panel border border-hairline-soft rounded-[8px] p-6 shadow-sm mb-5">
                <FieldLabel>THIS GROUP SHOWS ONLY ON THESE COLLECTIONS (EDITING THEM MOVES EVERY BANNER IN THE GROUP)</FieldLabel>
                <CollectionPicker selected={group.split(',')} onChange={(h) => h.length && retargetGroup(h)} />
              </div>
            ) : (
              <p className="text-xs text-ink-muted px-1 mb-4">
                Common banners — shown on every collection that has no group of its own, in this order after the 6th product, then 10 later.
              </p>
            )}
        <div className="space-y-5">
          {inpageBanners.map((b, index) => groupKey(b) !== group ? null : (
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
                <div className="space-y-6">
                  <AssetField
                    label="DESKTOP BANNER IMAGE"
                    value={b.src}
                    onChange={(v) => updateInpage(index, { src: v })}
                    onUpload={(file) => doUpload(file, 'inpage', index, 'src', (url) => updateInpage(index, { src: url }))}
                    busy={uploading?.scope === 'inpage' && uploading?.index === index && uploading?.field === 'src'}
                    ratio="wide"
                  />
                  <AssetField
                    label="MOBILE BANNER IMAGE"
                    value={b.mobileSrc}
                    onChange={(v) => updateInpage(index, { mobileSrc: v })}
                    onUpload={(file) => doUpload(file, 'inpage', index, 'mobileSrc', (url) => updateInpage(index, { mobileSrc: url }))}
                    busy={uploading?.scope === 'inpage' && uploading?.index === index && uploading?.field === 'mobileSrc'}
                    ratio="tall"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <FieldLabel>ALT TEXT</FieldLabel>
                    <TextInput value={b.alt} onChange={(v) => updateInpage(index, { alt: v })} placeholder="Promo" />
                  </div>
                  <div>
                    <FieldLabel>LINK URL</FieldLabel>
                    <TextInput value={b.href} onChange={(v) => updateInpage(index, { href: v })} placeholder="/collections/rakhi" />
                  </div>
                  <div>
                    <FieldLabel>DESKTOP SIZE</FieldLabel>
                    <select
                      value={b.size || 'tile'}
                      onChange={(e) => updateInpage(index, { size: e.target.value })}
                      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="tile">Tile — 1 column, same as a product card</option>
                      <option value="wide">Wide — 2 columns x 2 rows (use a 2:3 image)</option>
                      <option value="double">Double — 2 columns x 1 row (use a landscape image)</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel>SHOW AFTER N PRODUCTS (0 = FIRST; ONLY WHEN COLLECTIONS ARE SET)</FieldLabel>
                    <input
                      type="number"
                      min="0"
                      value={b.after ?? ''}
                      onChange={(e) => updateInpage(index, { after: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="e.g. 5"
                      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setInpageBanners((list) => [...list, { ...blankInpage(), handles: group ? group.split(',') : [] }])}
          className="mt-5 w-full py-4 border-2 border-dashed border-hairline rounded-[8px] text-ink-soft font-bold hover:bg-row-hover hover:border-zinc-300 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Add inpage banner{group ? ` to ${groupLabel(group)}` : ''}
        </button>
          </>
        )}
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
