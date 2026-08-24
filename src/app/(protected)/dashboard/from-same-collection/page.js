'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Save, X, Loader2, Gem, Play, Pencil, Eye, History, MoveUp, MoveDown, Clock, Layers, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

const ATTRIBUTE_LABELS = {
  price: 'Price',
  collection: 'Collection',
  inventory: 'Inventory',
  popularity: 'Popularity (orders + carts + wishlist)',
  diamond_type: 'Diamond type',
};

const DEFAULT_ATTRIBUTE_PRIORITY = ['price', 'collection', 'inventory', 'popularity', 'diamond_type'];

const DEFAULT_BLOCKS = [
  { size: 4, label: 'Same collection', conditions: { sameCollection: true } },
  { size: 4, label: 'Same collection + similar price', conditions: { sameCollection: true, priceBandPercent: 20 } },
  { size: 4, label: 'Popular + same diamond type', conditions: { popularity: true, diamondTypeMatch: true } },
  { size: 4, label: 'In stock', conditions: { inStock: true } },
];

const emptyForm = () => ({
  collectionId: '',
  collectionHandle: '',
  collectionTitle: '',
  enabled: true,
  priority: 10,
  scheduleTime: '03:00',
  attributePriority: [...DEFAULT_ATTRIBUTE_PRIORITY],
  blocks: DEFAULT_BLOCKS.map(b => ({ ...b, conditions: { ...b.conditions } })),
  backfill: true,
});

const fieldCls = 'w-full px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black';
const labelCls = 'text-[10px] font-black uppercase tracking-widest text-zinc-400';

const formatINR = (num) => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(Number(num) || 0));

const formatDateTime = (d) => {
  if (!d) return 'Never';
  try {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) + ' IST';
  } catch (err) {
    return String(d);
  }
};

const blocksSummary = (rule) => (rule.blocks || []).map(b => b.size + ' ' + (b.label || 'block').toLowerCase()).join(' · ');

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className={'relative inline-flex items-center ' + (disabled ? 'opacity-50' : 'cursor-pointer')}>
      <input type='checkbox' className='sr-only peer' checked={!!checked} disabled={disabled} onChange={onChange} />
      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
    </label>
  );
}

export default function FromSameCollectionDashboard() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Card actions
  const [runningId, setRunningId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Create / edit modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null); // null = create
  const [form, setForm] = useState(emptyForm());
  const [savingRule, setSavingRule] = useState(false);
  const [collectionQuery, setCollectionQuery] = useState('');
  const [collectionResults, setCollectionResults] = useState([]);
  const [searchingCollections, setSearchingCollections] = useState(false);

  // Preview modal
  const [previewRule, setPreviewRule] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [selectedSource, setSelectedSource] = useState(0);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Runs modal
  const [runsRule, setRunsRule] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const totalSlots = form.blocks.reduce((acc, b) => acc + (parseInt(b.size, 10) || 0), 0);

  const fetchRules = async () => {
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules');
      const data = await res.json();
      if (data.success) setRules(data.rules || []);
      else toast.error(data.error || 'Failed to load rules');
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRules(); }, []);

  // Debounced collection search (create mode only)
  useEffect(() => {
    if (!editorOpen || !collectionQuery) { setCollectionResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingCollections(true);
      try {
        const res = await fetch(baseUrl + '/api/recommendations/collections/search?q=' + encodeURIComponent(collectionQuery));
        const data = await res.json();
        setCollectionResults(data.collections || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingCollections(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [collectionQuery, editorOpen]);

  // Debounced product search (preview modal)
  useEffect(() => {
    if (!previewRule || !productQuery) { setProductResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await fetch('/api/products/search?q=' + encodeURIComponent(productQuery) + '&limit=5');
        const data = await res.json();
        setProductResults(data.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingProducts(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [productQuery, previewRule]);

  // ---------- Rule CRUD ----------

  const openCreate = () => {
    setForm(emptyForm());
    setEditingRule(null);
    setCollectionQuery('');
    setCollectionResults([]);
    setEditorOpen(true);
  };

  const openEdit = (rule) => {
    setForm({
      collectionId: rule.collectionId || '',
      collectionHandle: rule.collectionHandle || '',
      collectionTitle: rule.collectionTitle || '',
      enabled: rule.enabled !== false,
      priority: rule.priority ?? 10,
      scheduleTime: rule.scheduleTime || '03:00',
      attributePriority: rule.attributePriority?.length ? [...rule.attributePriority] : [...DEFAULT_ATTRIBUTE_PRIORITY],
      blocks: (rule.blocks?.length ? rule.blocks : DEFAULT_BLOCKS).map(b => ({ size: b.size, label: b.label || '', conditions: { ...(b.conditions || {}) } })),
      backfill: rule.backfill !== false,
    });
    setEditingRule(rule);
    setCollectionQuery('');
    setCollectionResults([]);
    setEditorOpen(true);
  };

  const saveRule = async () => {
    if (!form.collectionId) { toast.error('Select a Shopify collection first'); return; }
    if (!/^\d{2}:\d{2}$/.test(form.scheduleTime)) { toast.error('Schedule time must be in HH:mm format'); return; }
    if (!form.blocks.length) { toast.error('Add at least one block'); return; }
    if (form.blocks.some(b => !parseInt(b.size, 10) || parseInt(b.size, 10) < 1)) { toast.error('Every block needs a size of at least 1'); return; }
    if (totalSlots > 16) { toast.error('Total slots cannot exceed 16'); return; }

    setSavingRule(true);
    try {
      const body = {
        collectionId: form.collectionId,
        collectionHandle: form.collectionHandle,
        collectionTitle: form.collectionTitle,
        enabled: form.enabled,
        priority: Number(form.priority) || 0,
        scheduleTime: form.scheduleTime,
        attributePriority: form.attributePriority,
        blocks: form.blocks.map(b => ({ size: parseInt(b.size, 10), label: b.label, conditions: b.conditions })),
        backfill: form.backfill,
      };
      const url = editingRule
        ? baseUrl + '/api/recommendations/rules/' + editingRule._id
        : baseUrl + '/api/recommendations/rules';
      const res = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(editingRule ? 'Rule updated' : 'Rule created');
        setEditorOpen(false);
        fetchRules();
      } else {
        toast.error(data.error || 'Failed to save rule');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (rule) => {
    if (!confirm('Delete the rule for "' + rule.collectionTitle + '"? Its daily refresh will stop.')) return;
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + rule._id, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Rule deleted');
        fetchRules();
      } else {
        toast.error(data.error || 'Failed to delete rule');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    }
  };

  const toggleEnabled = async (rule) => {
    setTogglingId(rule._id);
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + rule._id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRules(rules.map(r => (r._id === rule._id ? data.rule : r)));
        toast.success(data.rule.enabled ? 'Rule enabled' : 'Rule disabled');
      } else {
        toast.error(data.error || 'Failed to update rule');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setTogglingId(null);
    }
  };

  const runNow = async (rule) => {
    setRunningId(rule._id);
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + rule._id + '/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Run started for ' + rule.collectionTitle + '. Check run history for progress.');
      } else {
        toast.error(data.error || 'Failed to start run');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setRunningId(null);
    }
  };

  // ---------- Editor helpers ----------

  const selectCollection = (c) => {
    setForm({ ...form, collectionId: c.id, collectionHandle: c.handle, collectionTitle: c.title });
    setCollectionQuery('');
    setCollectionResults([]);
  };

  const clearCollection = () => setForm({ ...form, collectionId: '', collectionHandle: '', collectionTitle: '' });

  const moveAttribute = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === form.attributePriority.length - 1)) return;
    const na = [...form.attributePriority];
    const temp = na[index];
    na[index] = na[index + direction];
    na[index + direction] = temp;
    setForm({ ...form, attributePriority: na });
  };

  const updateBlock = (index, patch) => {
    const nb = [...form.blocks];
    nb[index] = { ...nb[index], ...patch };
    setForm({ ...form, blocks: nb });
  };

  const toggleCondition = (index, key) => {
    const conditions = { ...form.blocks[index].conditions };
    if (key === 'priceBandPercent') {
      if (conditions.priceBandPercent != null) delete conditions.priceBandPercent;
      else conditions.priceBandPercent = 20;
    } else {
      if (conditions[key]) delete conditions[key];
      else conditions[key] = true;
    }
    updateBlock(index, { conditions });
  };

  const addBlock = () => setForm({ ...form, blocks: [...form.blocks, { size: 1, label: '', conditions: {} }] });

  const removeBlock = (index) => setForm({ ...form, blocks: form.blocks.filter((_, i) => i !== index) });

  // ---------- Preview ----------

  const openPreview = async (rule) => {
    setPreviewRule(rule);
    setPreviewData([]);
    setSelectedSource(0);
    setProductQuery('');
    setProductResults([]);
    setPreviewLoading(true);
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + rule._id + '/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewData(data.preview || []);
      } else {
        toast.error(data.error || 'Preview failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewSpecificProduct = async (product) => {
    if (!previewRule) return;
    setProductQuery('');
    setProductResults([]);
    setPreviewLoading(true);
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + previewRule._id + '/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const incoming = data.preview || [];
        setPreviewData([...incoming, ...previewData.filter(e => !incoming.some(n => n.source?.id === e.source?.id))]);
        setSelectedSource(0);
      } else {
        toast.error(data.error || 'Preview failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ---------- Runs ----------

  const openRuns = async (rule) => {
    setRunsRule(rule);
    setRuns([]);
    setRunsLoading(true);
    try {
      const res = await fetch(baseUrl + '/api/recommendations/runs?ruleId=' + rule._id + '&limit=20');
      const data = await res.json();
      if (res.ok && data.success) setRuns(data.runs || []);
      else toast.error(data.error || 'Failed to load runs');
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setRunsLoading(false);
    }
  };

  const runStatusPill = (status) => {
    if (status === 'completed') return 'text-emerald-600 bg-emerald-50';
    if (status === 'failed') return 'text-rose-600 bg-rose-50';
    return 'text-amber-600 bg-amber-50';
  };

  const condPill = (on) => 'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ' + (on ? 'bg-black text-white border-black' : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300');

  const activePreview = previewData[selectedSource] || null;

  if (loading) return <div className='flex justify-center py-40'><Loader2 className='animate-spin text-zinc-300' size={40} /></div>;

  return (
    <div className='max-w-7xl mx-auto py-10 px-8'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6'>
        <div className='flex items-start gap-4'>
          <div className='bg-zinc-100 p-3 rounded-2xl'><Gem size={24} className='text-zinc-400' /></div>
          <div>
            <h1 className='text-3xl font-bold text-zinc-900 font-figtree'>From the Same Collection</h1>
            <p className='text-zinc-500 mt-1'>Rules that compute the recommendation grid shown on product pages. Picks are refreshed daily and written to the product metafield.</p>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <button onClick={openCreate} className='flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest disabled:opacity-50'>
            <Plus size={16} /> NEW COLLECTION RULE
          </button>
        </div>
      </div>

      {/* Rules list */}
      <div className='space-y-8'>
        {rules.map((rule) => (
          <div key={rule._id} className='bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl overflow-hidden'>
            <div className='px-8 py-4 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50/50'>
              <div className='flex items-center gap-4 min-w-0'>
                <div className='w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shrink-0'><Layers size={14} /></div>
                <div className='min-w-0'>
                  <h3 className='font-black text-zinc-900 truncate'>{rule.collectionTitle}</h3>
                  <p className='text-[10px] text-zinc-400 font-bold uppercase tracking-widest'>{rule.collectionHandle}</p>
                </div>
                <span className={'text-[10px] font-black px-2 py-1 rounded-full uppercase shrink-0 ' + (rule.enabled ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-400 bg-zinc-100')}>
                  {rule.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className='flex items-center gap-3 shrink-0'>
                <span className={labelCls}>Enabled</span>
                <Toggle checked={rule.enabled} disabled={togglingId === rule._id} onChange={() => toggleEnabled(rule)} />
              </div>
            </div>

            <div className='p-8 grid grid-cols-2 md:grid-cols-4 gap-6'>
              <div className='space-y-1'>
                <label className={labelCls}>Daily refresh (IST)</label>
                <p className='text-sm font-black text-zinc-900 flex items-center gap-2'><Clock size={14} className='text-zinc-300' /> {rule.scheduleTime}</p>
              </div>
              <div className='space-y-1'>
                <label className={labelCls}>Priority</label>
                <p className='text-sm font-black text-zinc-900'>{rule.priority}</p>
              </div>
              <div className='space-y-1'>
                <label className={labelCls}>Slots</label>
                <p className='text-sm font-black text-zinc-900'>{(rule.blocks || []).reduce((acc, b) => acc + (b.size || 0), 0)} / 16</p>
              </div>
              <div className='space-y-1'>
                <label className={labelCls}>Last run</label>
                <p className='text-sm font-black text-zinc-900'>{formatDateTime(rule.lastRunAt)}</p>
              </div>
            </div>

            <div className='px-8 pb-6 space-y-2'>
              <p className='text-xs text-zinc-500 font-medium'><span className='font-black text-zinc-400 uppercase tracking-widest text-[10px] mr-2'>Blocks</span>{blocksSummary(rule)}</p>
              {rule.lastRunStats && (
                <p className='text-xs text-zinc-500 font-medium'>
                  <span className='font-black text-zinc-400 uppercase tracking-widest text-[10px] mr-2'>Last run stats</span>
                  {rule.lastRunStats.productsProcessed} processed · {rule.lastRunStats.written} written · {rule.lastRunStats.unchanged} unchanged · {rule.lastRunStats.failed} failed
                </p>
              )}
            </div>

            <div className='bg-zinc-50 px-8 py-5 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100'>
              <div className='flex flex-wrap items-center gap-3'>
                <button onClick={() => openEdit(rule)} className='flex items-center gap-2 bg-white border border-zinc-200 px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-zinc-600'>
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => openPreview(rule)} className='flex items-center gap-2 bg-white border border-zinc-200 px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-zinc-600'>
                  <Eye size={14} /> Preview
                </button>
                <button onClick={() => openRuns(rule)} className='flex items-center gap-2 bg-white border border-zinc-200 px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest text-zinc-600'>
                  <History size={14} /> Runs
                </button>
              </div>
              <div className='flex items-center gap-3'>
                <button
                  onClick={() => runNow(rule)}
                  disabled={runningId === rule._id}
                  className='flex items-center gap-2 bg-zinc-900 hover:bg-black text-white px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50'
                >
                  {runningId === rule._id ? <Loader2 size={14} className='animate-spin' /> : <Play size={14} />}
                  Run Now
                </button>
                <button onClick={() => deleteRule(rule)} className='p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100'>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className='text-center py-20 bg-white rounded-3xl border-2 border-dashed border-zinc-100'>
          <Gem size={48} className='mx-auto text-zinc-200 mb-4' />
          <p className='text-zinc-400 font-medium'>No collection rules yet. Create one to start computing recommendations.</p>
        </div>
      )}

      {/* Create / Edit modal */}
      {editorOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div className='bg-white w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-100 flex flex-col'>
            <div className='p-8 border-b border-zinc-50 flex justify-between items-center bg-zinc-50/50 shrink-0'>
              <h2 className='text-xl font-black flex items-center gap-3'><Gem size={24} className='text-zinc-400' /> {editingRule ? 'EDIT RULE' : 'NEW COLLECTION RULE'}</h2>
              <button onClick={() => setEditorOpen(false)} className='p-2 hover:bg-white rounded-full border border-transparent hover:border-zinc-200'><X size={20} /></button>
            </div>

            <div className='p-8 space-y-10 overflow-y-auto custom-scrollbar'>
              {/* Collection picker */}
              <div className='space-y-3'>
                <label className={labelCls + ' flex items-center gap-2'}><Layers size={12} /> SHOPIFY COLLECTION</label>
                {form.collectionId ? (
                  <div className='flex items-center justify-between px-5 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl'>
                    <div className='min-w-0'>
                      <p className='text-sm font-bold text-zinc-900 truncate'>{form.collectionTitle}</p>
                      <p className='text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5'>{form.collectionHandle}</p>
                    </div>
                    {!editingRule && (
                      <button onClick={clearCollection} className='p-2 hover:bg-white rounded-lg text-zinc-400 shrink-0'><X size={16} /></button>
                    )}
                  </div>
                ) : (
                  <div className='space-y-3'>
                    <div className='relative'>
                      <Search className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400' size={18} />
                      <input
                        type='text'
                        autoFocus
                        placeholder='Search collections by title...'
                        value={collectionQuery}
                        onChange={e => setCollectionQuery(e.target.value)}
                        className='w-full pl-12 pr-6 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black'
                      />
                    </div>
                    {(searchingCollections || collectionResults.length > 0) && (
                      <div className='border border-zinc-100 rounded-2xl overflow-hidden divide-y divide-zinc-50 max-h-60 overflow-y-auto custom-scrollbar'>
                        {searchingCollections ? (
                          <div className='flex justify-center py-6'><Loader2 className='animate-spin text-zinc-200' size={20} /></div>
                        ) : (
                          collectionResults.map(c => (
                            <button key={c.id} onClick={() => selectCollection(c)} className='w-full flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-zinc-50 text-left'>
                              <div className='min-w-0'>
                                <p className='text-sm font-bold text-zinc-900 truncate'>{c.title}</p>
                                <p className='text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5'>{c.handle}</p>
                              </div>
                              <span className='text-[10px] font-black text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full shrink-0'>{c.productsCount} products</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Blocks builder */}
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <label className={labelCls + ' flex items-center gap-2'}><Package size={12} /> SLOT BLOCKS</label>
                  <span className={'text-[10px] font-black uppercase tracking-widest ' + (totalSlots > 16 ? 'text-rose-500' : 'text-zinc-400')}>Total slots: {totalSlots} / 16</span>
                </div>
                <div className='space-y-4'>
                  {form.blocks.map((block, bIndex) => (
                    <div key={bIndex} className='bg-zinc-50/50 border border-zinc-100 rounded-[1.5rem] p-5 space-y-4'>
                      <div className='flex items-center gap-4'>
                        <div className='w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black shrink-0'>{bIndex + 1}</div>
                        <input
                          type='number'
                          min='1'
                          max='16'
                          value={block.size}
                          onChange={e => updateBlock(bIndex, { size: e.target.value })}
                          className='w-20 px-3 py-2.5 bg-white border border-zinc-100 rounded-xl text-sm text-center font-black focus:outline-none focus:ring-2 focus:ring-black'
                        />
                        <input
                          type='text'
                          value={block.label}
                          onChange={e => updateBlock(bIndex, { label: e.target.value })}
                          placeholder='Block label, e.g. Same collection'
                          className='flex-1 px-4 py-2.5 bg-white border border-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black'
                        />
                        <button onClick={() => removeBlock(bIndex)} className='p-2 text-rose-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg shrink-0'><Trash2 size={16} /></button>
                      </div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <button onClick={() => toggleCondition(bIndex, 'sameCollection')} className={condPill(!!block.conditions.sameCollection)}>Same collection</button>
                        <button onClick={() => toggleCondition(bIndex, 'priceBandPercent')} className={condPill(block.conditions.priceBandPercent != null)}>Similar price</button>
                        {block.conditions.priceBandPercent != null && (
                          <span className='flex items-center gap-1 bg-white border border-zinc-200 rounded-full pl-3 pr-2 py-1'>
                            <input
                              type='number'
                              min='1'
                              max='100'
                              value={block.conditions.priceBandPercent}
                              onChange={e => updateBlock(bIndex, { conditions: { ...block.conditions, priceBandPercent: Number(e.target.value) } })}
                              className='w-12 bg-transparent text-xs font-black text-center focus:outline-none'
                            />
                            <span className='text-[10px] font-black text-zinc-400'>% band</span>
                          </span>
                        )}
                        <button onClick={() => toggleCondition(bIndex, 'inStock')} className={condPill(!!block.conditions.inStock)}>In stock only</button>
                        <button onClick={() => toggleCondition(bIndex, 'diamondTypeMatch')} className={condPill(!!block.conditions.diamondTypeMatch)}>Match diamond type</button>
                        <button onClick={() => toggleCondition(bIndex, 'popularity')} className={condPill(!!block.conditions.popularity)}>Rank by popularity</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addBlock} className='w-full border-2 border-dashed border-zinc-100 rounded-[1.5rem] p-4 flex items-center justify-center gap-2 text-zinc-300 hover:text-black hover:border-zinc-300 transition-all bg-zinc-50/30'>
                  <Plus size={16} /><span className='text-[9px] font-black uppercase tracking-widest'>ADD BLOCK</span>
                </button>
              </div>

              {/* Attribute priority */}
              <div className='space-y-3'>
                <label className={labelCls}>ATTRIBUTE PRIORITY (MOST IMPORTANT FIRST)</label>
                <div className='space-y-2'>
                  {form.attributePriority.map((attr, aIndex) => (
                    <div key={attr} className='flex items-center justify-between px-5 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl'>
                      <div className='flex items-center gap-3 min-w-0'>
                        <span className='w-6 h-6 rounded-full bg-black text-white text-[10px] font-black flex items-center justify-center shrink-0'>{aIndex + 1}</span>
                        <span className='text-sm font-bold text-zinc-800 truncate'>{ATTRIBUTE_LABELS[attr] || attr}</span>
                      </div>
                      <div className='flex items-center gap-1 shrink-0'>
                        <button onClick={() => moveAttribute(aIndex, -1)} disabled={aIndex === 0} className='p-2 hover:bg-white rounded-lg disabled:opacity-30'><MoveUp size={14} /></button>
                        <button onClick={() => moveAttribute(aIndex, 1)} disabled={aIndex === form.attributePriority.length - 1} className='p-2 hover:bg-white rounded-lg disabled:opacity-30'><MoveDown size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule + priority + toggles */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-3'>
                  <label className={labelCls + ' flex items-center gap-2'}><Clock size={12} /> DAILY REFRESH TIME (IST)</label>
                  <input type='time' value={form.scheduleTime} onChange={e => setForm({ ...form, scheduleTime: e.target.value })} className={fieldCls} />
                </div>
                <div className='space-y-3'>
                  <label className={labelCls}>PRIORITY</label>
                  <input type='number' value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className={fieldCls} />
                  <p className='text-[11px] text-zinc-400 font-medium'>Higher priority wins when a product is in several ruled collections.</p>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='flex items-center justify-between px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl'>
                  <div>
                    <p className='text-sm font-bold text-zinc-900'>Rule enabled</p>
                    <p className='text-[11px] text-zinc-400 font-medium mt-0.5'>Included in the daily scheduler when on.</p>
                  </div>
                  <Toggle checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
                </div>
                <div className='flex items-center justify-between px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl'>
                  <div>
                    <p className='text-sm font-bold text-zinc-900'>Backfill remaining slots</p>
                    <p className='text-[11px] text-zinc-400 font-medium mt-0.5'>Fill under-filled slots from ranked leftovers so 16 are always attempted.</p>
                  </div>
                  <Toggle checked={form.backfill} onChange={e => setForm({ ...form, backfill: e.target.checked })} />
                </div>
              </div>
            </div>

            <div className='px-8 py-6 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end gap-3 shrink-0'>
              <button onClick={() => setEditorOpen(false)} className='flex items-center gap-2 bg-white border border-zinc-200 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest text-zinc-600'>Cancel</button>
              <button
                onClick={saveRule}
                disabled={savingRule || totalSlots > 16}
                className='flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest disabled:opacity-50'
              >
                {savingRule ? <Loader2 size={16} className='animate-spin' /> : <Save size={16} />} {editingRule ? 'SAVE CHANGES' : 'CREATE RULE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewRule && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div className='bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-100 flex flex-col'>
            <div className='p-8 border-b border-zinc-50 flex justify-between items-center bg-zinc-50/50 shrink-0'>
              <div>
                <h2 className='text-xl font-black flex items-center gap-3'><Eye size={24} className='text-zinc-400' /> PREVIEW — {previewRule.collectionTitle}</h2>
                <p className='text-[11px] text-zinc-400 font-medium mt-1'>Dry run only. Nothing is written to Shopify.</p>
              </div>
              <button onClick={() => setPreviewRule(null)} className='p-2 hover:bg-white rounded-full border border-transparent hover:border-zinc-200'><X size={20} /></button>
            </div>

            <div className='p-8 space-y-8 overflow-y-auto custom-scrollbar'>
              {/* Specific product search */}
              <div className='space-y-3'>
                <label className={labelCls}>PREVIEW A SPECIFIC PRODUCT</label>
                <div className='relative'>
                  <Search className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400' size={18} />
                  <input
                    type='text'
                    placeholder='Search products by title...'
                    value={productQuery}
                    onChange={e => setProductQuery(e.target.value)}
                    className='w-full pl-12 pr-6 py-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black'
                  />
                </div>
                {(searchingProducts || productResults.length > 0) && (
                  <div className='border border-zinc-100 rounded-2xl overflow-hidden divide-y divide-zinc-50 max-h-60 overflow-y-auto custom-scrollbar'>
                    {searchingProducts ? (
                      <div className='flex justify-center py-6'><Loader2 className='animate-spin text-zinc-200' size={20} /></div>
                    ) : (
                      productResults.map(p => (
                        <button key={p.id} onClick={() => previewSpecificProduct(p)} className='w-full flex items-center gap-4 px-5 py-3 hover:bg-zinc-50 text-left'>
                          <div className='w-10 h-10 bg-zinc-50 rounded-xl border border-zinc-100 overflow-hidden shrink-0'>
                            {p.image ? <img src={p.image} className='w-full h-full object-cover' /> : null}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-bold truncate'>{p.title}</p>
                            <p className='text-xs font-black mt-0.5'>{formatINR(p.price)}</p>
                          </div>
                          <Plus size={14} className='text-zinc-300 shrink-0' />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {previewLoading ? (
                <div className='flex justify-center py-20'><Loader2 className='animate-spin text-zinc-200' size={32} /></div>
              ) : previewData.length === 0 ? (
                <div className='text-center py-16 text-zinc-400'>
                  <Package size={40} className='mx-auto mb-4' />
                  <p className='text-sm font-bold uppercase tracking-widest text-[10px]'>No preview data returned</p>
                </div>
              ) : (
                <>
                  {/* Source product chips */}
                  <div className='space-y-3'>
                    <label className={labelCls}>SOURCE PRODUCTS</label>
                    <div className='flex gap-3 overflow-x-auto pb-2 custom-scrollbar'>
                      {previewData.map((entry, i) => (
                        <button
                          key={entry.source?.id || i}
                          onClick={() => setSelectedSource(i)}
                          className={'flex items-center gap-3 px-3 py-2 rounded-2xl border shrink-0 transition-all text-left ' + (selectedSource === i ? 'border-black bg-zinc-50 shadow-sm' : 'border-zinc-100 bg-white hover:border-zinc-300')}
                        >
                          <div className='w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 overflow-hidden shrink-0'>
                            {entry.source?.image ? <img src={entry.source.image} className='w-full h-full object-cover' /> : null}
                          </div>
                          <div className='min-w-0 max-w-[160px]'>
                            <p className='text-[11px] font-bold truncate'>{entry.source?.title}</p>
                            <p className='text-[10px] font-black text-zinc-500'>{formatINR(entry.source?.price)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {activePreview && (
                    <div className='space-y-8'>
                      {activePreview.totalFilled < 16 && (
                        <div className='flex items-center gap-3 px-5 py-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-xs font-bold'>
                          <AlertTriangle size={16} className='shrink-0' />
                          Only {activePreview.totalFilled} of 16 slots filled for this product.
                        </div>
                      )}

                      {(activePreview.slots || []).map((slot) => (
                        <div key={slot.blockIndex} className='space-y-4'>
                          <div className='flex items-center gap-3'>
                            <div className='w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black shrink-0'>{slot.blockIndex + 1}</div>
                            <h3 className='font-bold text-xs uppercase tracking-widest text-zinc-400'>{slot.blockLabel}</h3>
                            <span className='text-[10px] font-black text-zinc-500 bg-zinc-100 px-2 py-1 rounded-full'>{slot.products?.length || 0}</span>
                          </div>
                          {slot.products?.length ? (
                            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                              {slot.products.map((p) => (
                                <div key={p.id} className='bg-white rounded-[1.5rem] border border-zinc-100 overflow-hidden hover:shadow-md transition-all'>
                                  <div className='aspect-square bg-zinc-50'>
                                    {p.image ? <img src={p.image} className='w-full h-full object-cover' /> : <div className='w-full h-full flex items-center justify-center text-zinc-200'><Package size={24} strokeWidth={1} /></div>}
                                  </div>
                                  <div className='p-3 space-y-2'>
                                    <p className='text-[11px] font-bold truncate leading-tight' title={p.title}>{p.title}</p>
                                    <p className='text-xs font-black'>{formatINR(p.price)}</p>
                                    <div className='flex flex-wrap gap-1'>
                                      <span className={'text-[9px] font-black px-2 py-0.5 rounded-full uppercase ' + (p.inStock ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50')}>
                                        {p.inStock ? 'In stock' : 'Out of stock'}
                                      </span>
                                      <span className='text-[9px] font-black px-2 py-0.5 rounded-full uppercase text-zinc-500 bg-zinc-100'>Pop {p.popularity ?? 0}</span>
                                      {p.stoneType && <span className='text-[9px] font-black px-2 py-0.5 rounded-full uppercase text-amber-700 bg-amber-50'>{p.stoneType}</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className='text-xs text-zinc-400 font-medium pl-10'>No products matched this block.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Runs history modal */}
      {runsRule && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div className='bg-white w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-zinc-100 flex flex-col'>
            <div className='p-8 border-b border-zinc-50 flex justify-between items-center bg-zinc-50/50 shrink-0'>
              <h2 className='text-xl font-black flex items-center gap-3'><History size={24} className='text-zinc-400' /> RUN HISTORY — {runsRule.collectionTitle}</h2>
              <button onClick={() => setRunsRule(null)} className='p-2 hover:bg-white rounded-full border border-transparent hover:border-zinc-200'><X size={20} /></button>
            </div>
            <div className='p-8 overflow-y-auto custom-scrollbar'>
              {runsLoading ? (
                <div className='flex justify-center py-20'><Loader2 className='animate-spin text-zinc-200' size={32} /></div>
              ) : runs.length === 0 ? (
                <div className='text-center py-16 text-zinc-400'>
                  <History size={40} className='mx-auto mb-4' />
                  <p className='text-sm font-bold uppercase tracking-widest text-[10px]'>No runs recorded yet</p>
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b border-zinc-100'>
                        <th className='text-left py-3 pr-4 text-[10px] font-black uppercase tracking-widest text-zinc-400'>Trigger</th>
                        <th className='text-left py-3 pr-4 text-[10px] font-black uppercase tracking-widest text-zinc-400'>Status</th>
                        <th className='text-left py-3 pr-4 text-[10px] font-black uppercase tracking-widest text-zinc-400'>Started</th>
                        <th className='text-right py-3 pr-4 text-[10px] font-black uppercase tracking-widest text-zinc-400'>Duration</th>
                        <th className='text-right py-3 pr-4 text-[10px] font-black uppercase tracking-widest text-zinc-400'>Processed</th>
                        <th className='text-right py-3 pr-4 text-[10px] font-black uppercase tracking-widest text-zinc-400'>Written</th>
                        <th className='text-right py-3 pr-4 text-[10px] font-black uppercase tracking-widest text-zinc-400'>Unchanged</th>
                        <th className='text-right py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400'>Failed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run) => (
                        <tr key={run._id} className='border-b border-zinc-50' title={run.errors?.length ? run.errors.join('\n') : undefined}>
                          <td className='py-3 pr-4 font-bold text-zinc-700 uppercase text-[11px] tracking-widest'>{run.trigger}</td>
                          <td className='py-3 pr-4'>
                            <span className={'text-[10px] font-black px-2 py-1 rounded-full uppercase ' + runStatusPill(run.status)}>{run.status}</span>
                          </td>
                          <td className='py-3 pr-4 font-medium text-zinc-500'>{formatDateTime(run.startedAt)}</td>
                          <td className='py-3 pr-4 text-right font-black text-zinc-900'>{run.durationMs != null ? (run.durationMs / 1000).toFixed(1) + 's' : '—'}</td>
                          <td className='py-3 pr-4 text-right font-black text-zinc-900'>{run.productsProcessed ?? '—'}</td>
                          <td className='py-3 pr-4 text-right font-black text-emerald-600'>{run.written ?? '—'}</td>
                          <td className='py-3 pr-4 text-right font-black text-zinc-500'>{run.unchanged ?? '—'}</td>
                          <td className='py-3 text-right font-black text-rose-500'>{run.failed ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
