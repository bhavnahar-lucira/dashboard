'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Trash2, X, Loader2, Gem, Play, Pencil, Eye, History, MoveUp, MoveDown, Clock, Layers, Package, AlertTriangle, Pin, PinOff, Sparkles, Hand, Blend, Info, Database } from 'lucide-react';
import { toast } from 'react-toastify';

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

// ---------------------------------------------------------------------------
// Constants + helpers
// ---------------------------------------------------------------------------

const OP_LABELS = {
  eq: 'is equal to',
  neq: 'is not',
  gt: 'greater than',
  gte: 'greater than or equal to',
  lt: 'less than',
  lte: 'less than or equal to',
  contains: 'contains',
  not_contains: 'does not contain',
  within_percent: 'within % of source',
  within_amount: 'within ₹ of source',
  matches_source: 'matches source',
  has_any: 'has any (more than zero)',
  above_average: 'is above average',
  below_average: 'is below average',
  in: 'is in',
  not_in: 'is not in',
};

const DEFAULT_SEQUENCES = [
  { size: 4, label: 'Same collection picks', pool: 'collection', conditions: [], sortBy: [{ key: 'score', dir: 'desc' }] },
  { size: 4, label: 'Similar price', pool: 'collection', conditions: [{ attr: 'price', op: 'within_percent', value: 20 }], sortBy: [{ key: 'price_proximity', dir: 'desc' }] },
  { size: 4, label: 'Popular + same diamond type', pool: 'collection', conditions: [{ attr: 'stone_type', op: 'matches_source' }], sortBy: [{ key: 'popularity', dir: 'desc' }] },
  { size: 4, label: 'Available to buy', pool: 'collection', conditions: [{ attr: 'buyable', op: 'eq', value: true }], sortBy: [{ key: 'score', dir: 'desc' }] },
];

const DEFAULT_ATTRIBUTE_PRIORITY = ['price', 'collection', 'inventory', 'popularity', 'diamond_type'];

const emptyForm = () => ({
  collectionId: '',
  collectionHandle: '',
  collectionTitle: '',
  enabled: true,
  priority: 10,
  scheduleTime: '03:00',
  attributePriority: [...DEFAULT_ATTRIBUTE_PRIORITY],
  sourceConditions: [],
  commonConditions: [],
  sequences: DEFAULT_SEQUENCES.map((s) => ({ ...s, conditions: s.conditions.map((c) => ({ ...c })), sortBy: s.sortBy.map((x) => ({ ...x })) })),
  pinsGlobal: [], // [{ id (gid), title, image, price }]
  automatedEnabled: true,
  backfill: true,
});

// v1 rules (blocks) editable through the v2 editor — mirror of the backend's
// normalizeRule so what the team sees is exactly what the engine computes.
const ruleToForm = (rule) => {
  const base = {
    collectionId: rule.collectionId || '',
    collectionHandle: rule.collectionHandle || '',
    collectionTitle: rule.collectionTitle || '',
    enabled: rule.enabled !== false,
    priority: rule.priority ?? 10,
    scheduleTime: rule.scheduleTime || '03:00',
    attributePriority: rule.attributePriority || [...DEFAULT_ATTRIBUTE_PRIORITY],
    automatedEnabled: rule.automatedEnabled !== false,
    backfill: rule.backfill !== false,
    pinsGlobal: (rule.pins?.global || []).map((gid) => ({ id: gid, title: gid.split('/').pop(), image: null, price: null })),
    sourceConditions: (rule.source?.conditions || []).map((c) => ({ ...c })),
    commonConditions: (rule.commonConditions || []).map((c) => ({ ...c })),
  };
  if (rule.version === 2 && Array.isArray(rule.sequences)) {
    return {
      ...base,
      sequences: rule.sequences.map((s) => ({
        size: s.size,
        label: s.label || '',
        pool: s.pool === 'catalog' ? 'catalog' : 'collection',
        conditions: (s.conditions || []).map((c) => ({ ...c })),
        sortBy: (s.sortBy && s.sortBy.length ? s.sortBy : [{ key: 'score', dir: 'desc' }]).map((x) => ({ ...x })),
      })),
    };
  }
  // v1 -> editor view (same mapping as backend normalizeRule)
  return {
    ...base,
    sequences: (rule.blocks || []).map((block) => {
      const c = block.conditions || {};
      const conditions = [];
      if (c.priceBandPercent != null) conditions.push({ attr: 'price', op: 'within_percent', value: Number(c.priceBandPercent) });
      if (c.inStock) conditions.push({ attr: 'buyable', op: 'eq', value: true });
      if (c.diamondTypeMatch) conditions.push({ attr: 'stone_type', op: 'matches_source' });
      return {
        size: block.size,
        label: block.label || '',
        pool: 'collection',
        conditions,
        sortBy: c.popularity ? [{ key: 'popularity', dir: 'desc' }] : [{ key: 'score', dir: 'desc' }],
      };
    }),
  };
};

const fieldCls = 'w-full px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black';
const smallFieldCls = 'px-3 py-2 bg-zinc-50 border border-zinc-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-black';
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

const ruleMode = (rule) => {
  const hasPins = (rule.pins?.global?.length || 0) > 0 || Object.keys(rule.pins?.perProduct || {}).length > 0;
  if (rule.automatedEnabled === false) return { label: 'Hand-picked', icon: Hand, cls: 'text-amber-600 bg-amber-50' };
  if (hasPins) return { label: 'Hybrid', icon: Blend, cls: 'text-violet-600 bg-violet-50' };
  return { label: 'Automated', icon: Sparkles, cls: 'text-emerald-600 bg-emerald-50' };
};

const sequencesSummary = (rule) => {
  if (rule.version === 2 && Array.isArray(rule.sequences)) {
    return rule.sequences.map((s) => s.size + ' ' + (s.label || 'sequence').toLowerCase()).join(' · ') || 'pins only';
  }
  return (rule.blocks || []).map((b) => b.size + ' ' + (b.label || 'block').toLowerCase()).join(' · ');
};

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className={'relative inline-flex items-center ' + (disabled ? 'opacity-50' : 'cursor-pointer')}>
      <input type='checkbox' className='sr-only peer' checked={!!checked} disabled={disabled} onChange={onChange} />
      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Condition row — "When [attribute] [operator] [value]" (Tagalys style)
// ---------------------------------------------------------------------------
function ConditionRow({ cond, attributes, allowDynamic, onChange, onRemove, prefix }) {
  const def = attributes.find((a) => a.key === cond.attr);
  const ops = (def?.ops || []).filter((op) => allowDynamic || !['matches_source', 'within_percent', 'within_amount'].includes(op));

  const [collQuery, setCollQuery] = useState('');
  const [collResults, setCollResults] = useState([]);

  useEffect(() => {
    if (def?.kind !== 'collection' || collQuery.trim().length < 2) { setCollResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(baseUrl + '/api/recommendations/collections/search?q=' + encodeURIComponent(collQuery));
        const data = await res.json();
        if (data.success) setCollResults(data.collections || []);
      } catch (err) { console.error(err); }
    }, 450);
    return () => clearTimeout(t);
  }, [collQuery, def?.kind]);

  // These operators answer for themselves — no threshold to type.
  const VALUE_FREE = ['matches_source', 'has_any', 'above_average', 'below_average'];
  const needsValue = !VALUE_FREE.includes(cond.op) && def?.kind !== 'boolean';

  return (
    <div className='flex flex-wrap items-center gap-2 bg-white border border-zinc-100 rounded-xl px-3 py-2.5'>
      <span className='text-[10px] font-black uppercase tracking-widest text-zinc-400 w-10'>{prefix}</span>
      <select
        className={smallFieldCls + ' min-w-[170px]'}
        value={cond.attr}
        onChange={(e) => {
          const nextDef = attributes.find((a) => a.key === e.target.value);
          const nextOps = (nextDef?.ops || []).filter((op) => allowDynamic || !['matches_source', 'within_percent', 'within_amount'].includes(op));
          onChange({ attr: e.target.value, op: nextOps[0] || 'eq', value: nextDef?.kind === 'boolean' ? true : '' });
        }}
      >
        {['Product details', 'Performance', 'Inventory'].map((group) => (
          <optgroup key={group} label={group}>
            {attributes.filter((a) => a.group === group).map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <select
        className={smallFieldCls}
        value={cond.op}
        onChange={(e) => onChange({ ...cond, op: e.target.value, ...(VALUE_FREE.includes(e.target.value) ? { value: undefined } : {}) })}
      >
        {ops.map((op) => <option key={op} value={op}>{OP_LABELS[op] || op}</option>)}
      </select>

      {def?.kind === 'boolean' ? (
        <select className={smallFieldCls} value={String(cond.value !== false)} onChange={(e) => onChange({ ...cond, value: e.target.value === 'true' })}>
          <option value='true'>Yes</option>
          <option value='false'>No</option>
        </select>
      ) : def?.kind === 'collection' ? (
        <div className='relative flex-1 min-w-[200px]'>
          <input
            className={smallFieldCls + ' w-full'}
            placeholder={cond.valueLabel || (cond.value ? String(cond.value).split('/').pop() : 'Search collection...')}
            value={collQuery}
            onChange={(e) => setCollQuery(e.target.value)}
          />
          {collResults.length > 0 && (
            <div className='absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-zinc-100 rounded-xl shadow-xl max-h-48 overflow-y-auto'>
              {collResults.map((c) => (
                <button
                  key={c.id}
                  className='w-full text-left px-3 py-2 text-xs hover:bg-zinc-50'
                  onClick={() => { onChange({ ...cond, value: c.id, valueLabel: c.title }); setCollQuery(''); setCollResults([]); }}
                >
                  {c.title} <span className='text-zinc-400'>({c.productsCount})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : needsValue ? (
        <input
          type={def?.kind === 'number' ? 'number' : 'text'}
          className={smallFieldCls + ' flex-1 min-w-[110px]'}
          placeholder={cond.op === 'within_percent' ? '% band' : cond.op === 'within_amount' ? '₹ band' : 'Value'}
          value={cond.value ?? ''}
          onChange={(e) => onChange({ ...cond, value: def?.kind === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value })}
        />
      ) : (
        <span className='text-[10px] font-bold text-violet-500 bg-violet-50 px-2 py-1 rounded-full uppercase tracking-wider'>
          {cond.op === 'matches_source' ? 'dynamic' : 'no value needed'}
        </span>
      )}

      <button onClick={onRemove} className='ml-auto text-zinc-300 hover:text-rose-500 transition-colors'><X size={15} /></button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attribute chip cloud — searchable "conditions to add" (Tagalys style)
// ---------------------------------------------------------------------------
function AttributeChips({ attributes, allowDynamic, onAdd, viewsNote }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All');
  const groups = ['All', 'Product details', 'Performance', 'Inventory'];

  const filtered = attributes.filter((a) =>
    (group === 'All' || a.group === group) &&
    (!query.trim() || a.label.toLowerCase().includes(query.trim().toLowerCase()))
  );

  return (
    <div className='bg-zinc-50/70 border border-zinc-100 rounded-2xl p-4'>
      <div className='relative mb-3'>
        <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400' />
        <input
          className='w-full pl-9 pr-3 py-2.5 bg-white border border-zinc-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-black'
          placeholder='Search conditions to add'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className='flex items-center gap-2 mb-3'>
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors ' + (group === g ? 'bg-black text-white' : 'bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-400')}
          >
            {g}
          </button>
        ))}
        {viewsNote && (
          <span className='ml-auto flex items-center gap-1 text-[10px] text-zinc-400'><Info size={11} /> {viewsNote}</span>
        )}
      </div>
      <div className='flex flex-wrap gap-1.5'>
        {filtered.map((a) => (
          <button
            key={a.key}
            onClick={() => {
              const ops = (a.ops || []).filter((op) => allowDynamic || !['matches_source', 'within_percent', 'within_amount'].includes(op));
              onAdd({ attr: a.key, op: ops[0] || 'eq', value: a.kind === 'boolean' ? true : '' });
            }}
            className='text-[11px] font-medium px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-600 hover:border-black hover:text-black transition-colors'
          >
            {a.label}
          </button>
        ))}
        {filtered.length === 0 && <span className='text-xs text-zinc-400 py-1'>No matching conditions.</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function FromSameCollectionDashboard() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ attributes: [], sortKeys: [], availability: null });

  // Card actions
  const [runningId, setRunningId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Editor modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState('source'); // 'source' | 'recommendations'
  const [editingRule, setEditingRule] = useState(null); // null = create
  const [form, setForm] = useState(emptyForm());
  const [savingRule, setSavingRule] = useState(false);
  const [collectionQuery, setCollectionQuery] = useState('');
  const [collectionResults, setCollectionResults] = useState([]);
  const [searchingCollections, setSearchingCollections] = useState(false);

  // Live scope preview (source tab)
  const [scope, setScope] = useState(null);
  const [scopeLoading, setScopeLoading] = useState(false);

  // Pin product search (recommendations tab)
  const [pinQuery, setPinQuery] = useState('');
  const [pinResults, setPinResults] = useState([]);

  // Preview modal
  const [previewRule, setPreviewRule] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [selectedSource, setSelectedSource] = useState(0);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [pinSaving, setPinSaving] = useState(false);

  // Runs modal
  const [runsRule, setRunsRule] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const totalSlots = form.sequences.reduce((acc, s) => acc + (parseInt(s.size, 10) || 0), 0);
  const conditionAttrs = meta.attributes;

  const viewsNote = useMemo(() => {
    const a = meta.availability;
    if (!a) return null;
    if (a.ga4Configured) return 'Views: Google Analytics';
    if (a.viewsTrackingSince) return 'Views: first-party, since ' + a.viewsTrackingSince;
    return 'Views: collecting starts after next storefront deploy';
  }, [meta.availability]);

  // ---- data loading ----
  const fetchRules = useCallback(async () => {
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
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(baseUrl + '/api/recommendations/attributes');
      const data = await res.json();
      if (data.success) setMeta({ attributes: data.attributes || [], sortKeys: data.sortKeys || [], availability: data.availability || null });
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchRules(); fetchMeta(); }, [fetchRules, fetchMeta]);

  // Debounced collection search (editor)
  useEffect(() => {
    if (!editorOpen || collectionQuery.trim().length < 2) { setCollectionResults([]); return; }
    const t = setTimeout(async () => {
      setSearchingCollections(true);
      try {
        const res = await fetch(baseUrl + '/api/recommendations/collections/search?q=' + encodeURIComponent(collectionQuery));
        const data = await res.json();
        if (data.success) setCollectionResults(data.collections || []);
      } catch (err) { console.error(err); }
      finally { setSearchingCollections(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [collectionQuery, editorOpen]);

  // Debounced live scope preview (editor source tab)
  useEffect(() => {
    if (!editorOpen || !form.collectionId) { setScope(null); return; }
    const t = setTimeout(async () => {
      setScopeLoading(true);
      try {
        const res = await fetch(baseUrl + '/api/recommendations/preview-scope', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collectionId: form.collectionId,
            conditions: form.sourceConditions.filter((c) => c.attr && c.op),
          }),
        });
        const data = await res.json();
        setScope(data.success ? data : null);
      } catch (err) { console.error(err); setScope(null); }
      finally { setScopeLoading(false); }
    }, 700);
    return () => clearTimeout(t);
  }, [editorOpen, form.collectionId, JSON.stringify(form.sourceConditions)]);

  // Debounced pin product search (editor)
  useEffect(() => {
    if (!editorOpen || pinQuery.trim().length < 2) { setPinResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/products/search?q=' + encodeURIComponent(pinQuery) + '&limit=6');
        const data = await res.json();
        setPinResults(data.products || []);
      } catch (err) { console.error(err); }
    }, 500);
    return () => clearTimeout(t);
  }, [pinQuery, editorOpen]);

  // Debounced preview-modal product search (per-product preview / pinning)
  useEffect(() => {
    if (!previewRule || productQuery.trim().length < 2) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/products/search?q=' + encodeURIComponent(productQuery) + '&limit=6');
        const data = await res.json();
        setProductResults(data.products || []);
      } catch (err) { console.error(err); }
    }, 500);
    return () => clearTimeout(t);
  }, [productQuery, previewRule]);

  // ---- editor ----
  const openCreate = () => {
    setEditingRule(null);
    setForm(emptyForm());
    setEditorTab('source');
    setCollectionQuery('');
    setCollectionResults([]);
    setPinQuery('');
    setScope(null);
    setEditorOpen(true);
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm(ruleToForm(rule));
    setEditorTab('source');
    setCollectionQuery('');
    setCollectionResults([]);
    setPinQuery('');
    setScope(null);
    setEditorOpen(true);
  };

  const saveRule = async () => {
    if (!form.collectionId) { toast.error('Select a Shopify collection first'); return; }
    if (!/^\d{2}:\d{2}$/.test(form.scheduleTime)) { toast.error('Schedule time must be in HH:mm format'); return; }
    if (form.automatedEnabled && form.sequences.length === 0 && form.pinsGlobal.length === 0) { toast.error('Add at least one sequence or pin'); return; }
    if (form.sequences.some((s) => !parseInt(s.size, 10) || parseInt(s.size, 10) < 1)) { toast.error('Every sequence needs a size of at least 1'); return; }
    if (totalSlots > 16) { toast.error('Total sequence slots cannot exceed 16'); return; }
    for (const c of form.sourceConditions) {
      if (!c.attr || c.op === undefined) { toast.error('Finish or remove the incomplete source condition'); return; }
    }

    setSavingRule(true);
    try {
      const body = {
        version: 2,
        collectionId: form.collectionId,
        collectionHandle: form.collectionHandle,
        collectionTitle: form.collectionTitle,
        enabled: form.enabled,
        priority: Number(form.priority) || 0,
        scheduleTime: form.scheduleTime,
        attributePriority: form.attributePriority,
        source: { collectionId: form.collectionId, conditions: form.sourceConditions },
        commonConditions: form.commonConditions.filter((c) => c.attr && c.op),
        sequences: form.sequences.map((s) => ({
          size: parseInt(s.size, 10),
          label: s.label,
          pool: s.pool,
          conditions: s.conditions.filter((c) => c.attr && c.op),
          sortBy: s.sortBy,
        })),
        pins: {
          global: form.pinsGlobal.map((p) => p.id),
          perProduct: editingRule?.pins?.perProduct || {},
        },
        automatedEnabled: form.automatedEnabled,
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
    if (!window.confirm('Delete the rule for "' + rule.collectionTitle + '"? The daily refresh for this collection stops.')) return;
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + rule._id, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) { toast.success('Rule deleted'); fetchRules(); }
      else toast.error(data.error || 'Failed to delete rule');
    } catch (err) { console.error(err); toast.error('Error connecting to server'); }
  };

  const toggleEnabled = async (rule) => {
    setTogglingId(rule._id);
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + rule._id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !(rule.enabled !== false) }),
      });
      const data = await res.json();
      if (res.ok && data.success) fetchRules();
      else toast.error(data.error || 'Failed to update rule');
    } catch (err) { console.error(err); toast.error('Error connecting to server'); }
    finally { setTogglingId(null); }
  };

  const runNow = async (rule) => {
    setRunningId(rule._id);
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + rule._id + '/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) toast.success('Run started — refresh in a minute to see results');
      else toast.error(data.error || 'Failed to start run');
    } catch (err) { console.error(err); toast.error('Error connecting to server'); }
    finally { setTimeout(() => setRunningId(null), 1500); }
  };

  // ---- preview ----
  const openPreview = async (rule, productId) => {
    setPreviewRule(rule);
    setPreviewLoading(true);
    setSelectedSource(0);
    if (!productId) { setProductQuery(''); setProductResults([]); }
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + rule._id + '/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productId ? { productId } : { limit: 5 }),
      });
      const data = await res.json();
      if (res.ok && data.success) setPreviewData(data.preview || []);
      else { toast.error(data.error || 'Preview failed'); setPreviewData([]); }
    } catch (err) { console.error(err); toast.error('Error connecting to server'); setPreviewData([]); }
    finally { setPreviewLoading(false); }
  };

  const activePreview = previewData[selectedSource] || null;
  const activeSourcePid = activePreview ? String(activePreview.source.id).split('/').pop() : null;
  const activePerProductPins = (previewRule?.pins?.perProduct || {})[activeSourcePid] || [];

  const togglePerProductPin = async (product) => {
    if (!previewRule || !activeSourcePid) return;
    const gid = product.id.startsWith('gid://') ? product.id : 'gid://shopify/Product/' + String(product.id).split('/').pop();
    const isPinned = activePerProductPins.includes(gid);
    const next = isPinned ? activePerProductPins.filter((g) => g !== gid) : [...activePerProductPins, gid];
    if (next.length > 16) { toast.error('A product can hold at most 16 pins'); return; }
    setPinSaving(true);
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + previewRule._id + '/pins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perProduct: { [activeSourcePid]: next } }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewRule(data.rule);
        setRules((prev) => prev.map((r) => (r._id === data.rule._id ? data.rule : r)));
        toast.success(isPinned ? 'Pin removed — regenerating preview' : 'Pinned — regenerating preview');
        openPreview(data.rule, activePreview.source.id);
      } else toast.error(data.error || 'Failed to update pins');
    } catch (err) { console.error(err); toast.error('Error connecting to server'); }
    finally { setPinSaving(false); }
  };

  // ---- runs ----
  const openRuns = async (rule) => {
    setRunsRule(rule);
    setRunsLoading(true);
    try {
      const res = await fetch(baseUrl + '/api/recommendations/runs?ruleId=' + rule._id + '&limit=20');
      const data = await res.json();
      if (res.ok && data.success) setRuns(data.runs || []);
      else { toast.error(data.error || 'Failed to load runs'); setRuns([]); }
    } catch (err) { console.error(err); setRuns([]); }
    finally { setRunsLoading(false); }
  };

  // ---- form mutators ----
  const setSeq = (i, patch) => setForm((f) => ({ ...f, sequences: f.sequences.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  const setSeqCond = (i, j, cond) => setSeq(i, { conditions: form.sequences[i].conditions.map((c, idx) => (idx === j ? cond : c)) });
  const moveAttr = (idx, dir) => {
    setForm((f) => {
      const list = [...f.attributePriority];
      const to = idx + dir;
      if (to < 0 || to >= list.length) return f;
      [list[idx], list[to]] = [list[to], list[idx]];
      return { ...f, attributePriority: list };
    });
  };

  const ATTRIBUTE_LABELS = {
    price: 'Price',
    collection: 'Collection',
    inventory: 'Inventory',
    popularity: 'Popularity (orders + carts + wishlist)',
    diamond_type: 'Diamond type',
  };

  // -------------------------------------------------------------------------
  return (
    <div className='max-w-7xl mx-auto py-10 px-8'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between mb-6 gap-6'>
        <div>
          <h1 className='text-3xl font-bold text-zinc-900 font-figtree flex items-center gap-3'><Gem className='text-zinc-400' /> From the Same Collection</h1>
          <p className='text-zinc-500 mt-1'>Rule-driven product recommendations for the PDP grid — sources, sequences, pins, and a daily refresh.</p>
        </div>
        <button onClick={openCreate} className='bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-colors shrink-0'>
          <Plus size={14} /> New Collection Rule
        </button>
      </div>

      {/* Data availability banner */}
      {meta.availability && (
        <div className='flex flex-wrap items-center gap-x-5 gap-y-1 mb-8 px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-2xl text-[11px] text-zinc-500'>
          <span className='flex items-center gap-1.5 font-bold text-zinc-600'><Database size={12} /> Data sources</span>
          <span>Orders &amp; revenue: <b className='text-zinc-700'>Shopify (exact)</b></span>
          <span>
            Views: {meta.availability.ga4Configured
              ? <b className='text-emerald-600'>Google Analytics</b>
              : meta.availability.viewsTrackingSince
                ? <b className='text-zinc-700'>first-party beacon since {meta.availability.viewsTrackingSince}</b>
                : <b className='text-amber-600'>collecting starts after next storefront deploy</b>}
          </span>
          <span>Add to carts: <b className='text-zinc-700'>{meta.availability.ga4Configured ? 'Google Analytics' : 'store carts'}</b></span>
          {!meta.availability.ga4Configured && (
            <span className='flex items-center gap-1 text-zinc-400'><Info size={11} /> Add GA4_PROPERTY_ID + service account to .env for full GA metrics</span>
          )}
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className='flex justify-center py-40'><Loader2 className='animate-spin text-zinc-300' size={40} /></div>
      ) : rules.length === 0 ? (
        <div className='bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl p-16 text-center'>
          <Layers size={40} className='mx-auto text-zinc-200 mb-4' />
          <h2 className='text-lg font-bold text-zinc-800'>No rules yet</h2>
          <p className='text-sm text-zinc-500 mt-1'>Create the first collection rule to power the recommendation grid.</p>
        </div>
      ) : (
        <div className='space-y-5'>
          {rules.map((rule) => {
            const mode = ruleMode(rule);
            const ModeIcon = mode.icon;
            return (
              <div key={rule._id} className='bg-white rounded-[2rem] border border-zinc-100 shadow-xl overflow-hidden'>
                <div className='px-8 py-5 flex flex-col lg:flex-row lg:items-center gap-4'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-3 flex-wrap'>
                      <h2 className='font-bold text-zinc-900 truncate'>{rule.collectionTitle || rule.collectionHandle}</h2>
                      <span className='text-[10px] text-zinc-400 font-mono'>{rule.collectionHandle}</span>
                      <span className={'flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full uppercase ' + mode.cls}><ModeIcon size={10} /> {mode.label}</span>
                      <span className={'text-[10px] font-black px-2 py-1 rounded-full uppercase ' + (rule.enabled !== false ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-400 bg-zinc-100')}>
                        {rule.enabled !== false ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className='text-xs text-zinc-500 mt-1.5 flex items-center gap-4 flex-wrap'>
                      <span className='flex items-center gap-1'><Clock size={11} /> Daily {rule.scheduleTime} IST</span>
                      <span>Priority {rule.priority}</span>
                      <span className='truncate'>{sequencesSummary(rule)}</span>
                    </div>
                    <div className='text-[11px] text-zinc-400 mt-1'>
                      Last run {formatDateTime(rule.lastRunAt)}
                      {rule.lastRunStats && (
                        <span> · {rule.lastRunStats.productsProcessed} products · {rule.lastRunStats.written} written · {rule.lastRunStats.unchanged} unchanged{rule.lastRunStats.failed ? <span className='text-rose-500'> · {rule.lastRunStats.failed} failed</span> : null}</span>
                      )}
                    </div>
                  </div>
                  <div className='flex items-center gap-2 shrink-0 flex-wrap'>
                    {togglingId === rule._id ? <Loader2 size={18} className='animate-spin text-zinc-300' /> : (
                      <Toggle checked={rule.enabled !== false} onChange={() => toggleEnabled(rule)} />
                    )}
                    <button onClick={() => openPreview(rule)} className='bg-white border border-zinc-200 text-zinc-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:border-zinc-400 transition-colors'>
                      <Eye size={13} /> Preview
                    </button>
                    <button onClick={() => openRuns(rule)} className='bg-white border border-zinc-200 text-zinc-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:border-zinc-400 transition-colors'>
                      <History size={13} /> Runs
                    </button>
                    <button onClick={() => runNow(rule)} disabled={runningId === rule._id} className='bg-black text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:bg-zinc-800 disabled:opacity-50 transition-colors'>
                      {runningId === rule._id ? <Loader2 size={13} className='animate-spin' /> : <Play size={13} />} Run Now
                    </button>
                    <button onClick={() => openEdit(rule)} className='p-2.5 text-zinc-400 hover:text-black transition-colors'><Pencil size={16} /></button>
                    <button onClick={() => deleteRule(rule)} className='p-2.5 text-zinc-400 hover:text-rose-500 transition-colors'><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= EDITOR MODAL ================= */}
      {editorOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div className='bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl'>
            {/* Modal header + tabs */}
            <div className='px-8 pt-6 pb-0 border-b border-zinc-100 bg-zinc-50/50'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-xl font-bold text-zinc-900'>
                  {editingRule ? 'Edit rule' : 'New rule'}
                  {form.collectionTitle && <span className='text-zinc-400 font-normal'> — {form.collectionTitle}</span>}
                </h2>
                <button onClick={() => setEditorOpen(false)} className='text-zinc-400 hover:text-black'><X size={20} /></button>
              </div>
              <div className='flex gap-1'>
                {[['source', '1 · Setup source products'], ['recommendations', '2 · Create recommendations']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setEditorTab(key)}
                    className={'px-5 py-3 rounded-t-xl text-xs font-bold uppercase tracking-wider transition-colors ' + (editorTab === key ? 'bg-white text-black border border-b-0 border-zinc-100' : 'text-zinc-400 hover:text-zinc-600')}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className='flex-1 overflow-y-auto px-8 py-6 custom-scrollbar'>
              {/* ---------- TAB 1: SOURCE ---------- */}
              {editorTab === 'source' && (
                <div className='grid grid-cols-1 lg:grid-cols-5 gap-8'>
                  <div className='lg:col-span-3 space-y-6'>
                    {/* Collection */}
                    <div>
                      <label className={labelCls}>Shopify collection (required)</label>
                      {form.collectionId ? (
                        <div className='mt-2 flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3.5'>
                          <div>
                            <div className='text-sm font-bold text-zinc-800'>{form.collectionTitle}</div>
                            <div className='text-[10px] text-zinc-400 font-mono'>{form.collectionHandle}</div>
                          </div>
                          {!editingRule && (
                            <button onClick={() => setForm((f) => ({ ...f, collectionId: '', collectionHandle: '', collectionTitle: '' }))} className='text-zinc-400 hover:text-rose-500'><X size={16} /></button>
                          )}
                        </div>
                      ) : (
                        <div className='relative mt-2'>
                          <Search size={15} className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400' />
                          <input className={fieldCls + ' pl-10'} placeholder='Search collections by title...' value={collectionQuery} onChange={(e) => setCollectionQuery(e.target.value)} />
                          {searchingCollections && <Loader2 size={15} className='absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-zinc-400' />}
                          {collectionResults.length > 0 && (
                            <div className='absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto'>
                              {collectionResults.map((c) => (
                                <button key={c.id} className='w-full text-left px-5 py-3 hover:bg-zinc-50 flex items-center justify-between' onClick={() => { setForm((f) => ({ ...f, collectionId: c.id, collectionHandle: c.handle, collectionTitle: c.title })); setCollectionQuery(''); setCollectionResults([]); }}>
                                  <span className='text-sm font-medium text-zinc-800'>{c.title}</span>
                                  <span className='text-[10px] text-zinc-400'>{c.productsCount} products</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Source conditions */}
                    <div>
                      <div className='flex items-center justify-between'>
                        <label className={labelCls}>Narrow the source products (optional)</label>
                        <span className='text-[10px] text-zinc-400'>All conditions must match (AND)</span>
                      </div>
                      <div className='space-y-2 mt-2'>
                        {form.sourceConditions.map((cond, i) => (
                          <ConditionRow
                            key={i}
                            prefix={i === 0 ? 'When' : 'and'}
                            cond={cond}
                            attributes={conditionAttrs}
                            allowDynamic={false}
                            onChange={(c) => setForm((f) => ({ ...f, sourceConditions: f.sourceConditions.map((x, idx) => (idx === i ? c : x)) }))}
                            onRemove={() => setForm((f) => ({ ...f, sourceConditions: f.sourceConditions.filter((_, idx) => idx !== i) }))}
                          />
                        ))}
                        {form.sourceConditions.length === 0 && (
                          <p className='text-xs text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl px-4 py-3'>No conditions — every product in the collection receives recommendations. Add conditions below to narrow (e.g. Price ≥ ₹10,000).</p>
                        )}
                      </div>
                      <div className='mt-3'>
                        <AttributeChips
                          attributes={conditionAttrs}
                          allowDynamic={false}
                          viewsNote={viewsNote}
                          onAdd={(c) => setForm((f) => ({ ...f, sourceConditions: [...f.sourceConditions, c] }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Scope preview */}
                  <div className='lg:col-span-2'>
                    <div className='bg-zinc-50/70 border border-zinc-100 rounded-2xl p-5 sticky top-0'>
                      <div className='flex items-center justify-between mb-3'>
                        <span className={labelCls}>Products in scope</span>
                        {scopeLoading && <Loader2 size={13} className='animate-spin text-zinc-400' />}
                      </div>
                      {!form.collectionId ? (
                        <p className='text-xs text-zinc-400'>Pick a collection to see the products this rule will apply to.</p>
                      ) : scope ? (
                        <>
                          <div className='text-3xl font-bold text-zinc-900 mb-3'>{scope.count}</div>
                          <div className='grid grid-cols-4 gap-2'>
                            {(scope.sample || []).map((p) => (
                              <div key={p.id} className='aspect-square bg-white rounded-lg border border-zinc-100 overflow-hidden' title={p.title + ' · ' + formatINR(p.price)}>
                                {p.image ? <img src={p.image} alt={p.title} className='w-full h-full object-cover' /> : <Package size={16} className='m-auto mt-4 text-zinc-200' />}
                              </div>
                            ))}
                          </div>
                          {scope.count === 0 && (
                            <p className='flex items-center gap-1.5 text-[11px] text-amber-600 mt-3'><AlertTriangle size={12} /> No products match — loosen the conditions.</p>
                          )}
                        </>
                      ) : (
                        <p className='text-xs text-zinc-400'>Scope preview loads after you pick a collection.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------- TAB 2: RECOMMENDATIONS ---------- */}
              {editorTab === 'recommendations' && (
                <div className='space-y-8'>
                  {/* Mode */}
                  <div className='flex items-center justify-between bg-zinc-50/70 border border-zinc-100 rounded-2xl px-5 py-4'>
                    <div>
                      <div className='text-sm font-bold text-zinc-800 flex items-center gap-2'><Sparkles size={14} className='text-zinc-400' /> Automated recommendations</div>
                      <p className='text-[11px] text-zinc-400 mt-0.5'>Off = hand-picked only: shoppers see exactly the pinned products, nothing else.</p>
                    </div>
                    <Toggle checked={form.automatedEnabled} onChange={() => setForm((f) => ({ ...f, automatedEnabled: !f.automatedEnabled }))} />
                  </div>

                  {/* Global pins */}
                  <div>
                    <div className='flex items-center justify-between'>
                      <label className={labelCls}>Pinned for every product in scope</label>
                      <span className='text-[10px] text-zinc-400'>Pins always take the first slots · per-product pins live in Preview</span>
                    </div>
                    <div className='mt-2 space-y-2'>
                      {form.pinsGlobal.length > 0 && (
                        <div className='flex flex-wrap gap-2'>
                          {form.pinsGlobal.map((p, i) => (
                            <span key={p.id} className='flex items-center gap-2 bg-white border border-zinc-200 rounded-xl pl-2 pr-1 py-1.5'>
                              {p.image ? <img src={p.image} alt='' className='w-6 h-6 rounded-md object-cover' /> : <Pin size={12} className='text-zinc-400' />}
                              <span className='text-xs font-medium text-zinc-700 max-w-[180px] truncate'>{p.title}</span>
                              <span className='text-[10px] text-zinc-400'>#{i + 1}</span>
                              <button onClick={() => setForm((f) => ({ ...f, pinsGlobal: f.pinsGlobal.filter((x) => x.id !== p.id) }))} className='text-zinc-300 hover:text-rose-500 p-0.5'><X size={12} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className='relative max-w-md'>
                        <Pin size={14} className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400' />
                        <input className={fieldCls + ' pl-10'} placeholder='Search a product to pin...' value={pinQuery} onChange={(e) => setPinQuery(e.target.value)} />
                        {pinResults.length > 0 && (
                          <div className='absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-zinc-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto'>
                            {pinResults.map((p) => {
                              const gid = String(p.id).startsWith('gid://') ? p.id : 'gid://shopify/Product/' + String(p.id).split('/').pop();
                              return (
                                <button
                                  key={p.id}
                                  className='w-full text-left px-4 py-2.5 hover:bg-zinc-50 flex items-center gap-3'
                                  onClick={() => {
                                    if (form.pinsGlobal.some((x) => x.id === gid)) { toast.info('Already pinned'); return; }
                                    if (form.pinsGlobal.length >= 16) { toast.error('At most 16 global pins'); return; }
                                    setForm((f) => ({ ...f, pinsGlobal: [...f.pinsGlobal, { id: gid, title: p.title, image: p.image, price: p.price }] }));
                                    setPinQuery(''); setPinResults([]);
                                  }}
                                >
                                  {p.image ? <img src={p.image} alt='' className='w-8 h-8 rounded-lg object-cover' /> : <Package size={16} className='text-zinc-300' />}
                                  <span className='text-xs font-medium text-zinc-700 flex-1 truncate'>{p.title}</span>
                                  {p.price != null && <span className='text-[10px] text-zinc-400'>{formatINR(p.price)}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Applies to every sequence */}
                  <div>
                    <div className='flex items-center justify-between'>
                      <label className={labelCls}>Applies to every sequence</label>
                      <span className='text-[10px] text-zinc-400'>Backfill obeys these too</span>
                    </div>
                    <p className='text-[11px] text-zinc-400 mt-0.5 mb-2'>
                      Set once here instead of repeating it in each sequence below — e.g. <em>Product type is earrings</em>.
                      Anything added here must also be true for a product to be recommended, including products used to top up the row.
                    </p>
                    <div className='space-y-2'>
                      {form.commonConditions.map((cond, i) => (
                        <ConditionRow
                          key={i}
                          prefix={i === 0 ? 'When' : 'and'}
                          cond={cond}
                          attributes={conditionAttrs}
                          allowDynamic={true}
                          onChange={(c) => setForm((f) => ({ ...f, commonConditions: f.commonConditions.map((x, idx) => (idx === i ? c : x)) }))}
                          onRemove={() => setForm((f) => ({ ...f, commonConditions: f.commonConditions.filter((_, idx) => idx !== i) }))}
                        />
                      ))}
                      {form.commonConditions.length === 0 && (
                        <p className='text-[11px] text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl px-4 py-2.5'>
                          None — each sequence stands on its own conditions, and backfill can pick anything in the collection.
                        </p>
                      )}
                      <details>
                        <summary className='text-[10px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-black inline-flex items-center gap-1'><Plus size={11} /> Add shared condition</summary>
                        <div className='mt-2'>
                          <AttributeChips attributes={conditionAttrs} allowDynamic={true} onAdd={(c) => setForm((f) => ({ ...f, commonConditions: [...f.commonConditions, c] }))} />
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* Sequences */}
                  <div className={form.automatedEnabled ? '' : 'opacity-40 pointer-events-none'}>
                    <div className='flex items-center justify-between mb-2'>
                      <label className={labelCls}>Sequences (filled in order after pins)</label>
                      <span className={'text-[10px] font-bold ' + (totalSlots > 16 ? 'text-rose-500' : 'text-zinc-400')}>Total slots: {totalSlots} / 16</span>
                    </div>
                    <div className='space-y-4'>
                      {form.sequences.map((seq, i) => (
                        <div key={i} className='bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden'>
                          <div className='px-5 py-3 bg-zinc-50/60 border-b border-zinc-100 flex items-center gap-3 flex-wrap'>
                            <span className='w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black shrink-0'>{i + 1}</span>
                            <input className={smallFieldCls + ' flex-1 min-w-[160px] font-bold'} placeholder='Sequence name' value={seq.label} onChange={(e) => setSeq(i, { label: e.target.value })} />
                            <div className='flex items-center gap-1.5'>
                              <span className='text-[10px] text-zinc-400 uppercase font-bold'>Slots</span>
                              <input type='number' min='1' max='16' className={smallFieldCls + ' w-16 text-center'} value={seq.size} onChange={(e) => setSeq(i, { size: e.target.value })} />
                            </div>
                            <select className={smallFieldCls} value={seq.pool} onChange={(e) => setSeq(i, { pool: e.target.value })}>
                              <option value='collection'>From same collection</option>
                              <option value='catalog'>From whole store</option>
                            </select>
                            <div className='flex items-center gap-1.5'>
                              <span className='text-[10px] text-zinc-400 uppercase font-bold'>Sort</span>
                              <select className={smallFieldCls} value={seq.sortBy[0]?.key || 'score'} onChange={(e) => setSeq(i, { sortBy: [{ key: e.target.value, dir: seq.sortBy[0]?.dir || 'desc' }] })}>
                                {meta.sortKeys.map((sk) => <option key={sk.key} value={sk.key}>{sk.label}</option>)}
                              </select>
                              {/* Ranking metrics read both ways; relative sorts
                                  (best match, closest price, newest) do not. */}
                              {meta.sortKeys.find((sk) => sk.key === (seq.sortBy[0]?.key || 'score'))?.directional && (
                                <select
                                  className={smallFieldCls}
                                  value={seq.sortBy[0]?.dir || 'desc'}
                                  onChange={(e) => setSeq(i, { sortBy: [{ key: seq.sortBy[0]?.key || 'score', dir: e.target.value }] })}
                                >
                                  <option value='desc'>High to low</option>
                                  <option value='asc'>Low to high</option>
                                </select>
                              )}
                            </div>
                            <button onClick={() => setForm((f) => ({ ...f, sequences: f.sequences.filter((_, idx) => idx !== i) }))} className='ml-auto text-zinc-300 hover:text-rose-500'><Trash2 size={15} /></button>
                          </div>
                          <div className='px-5 py-4 space-y-2'>
                            {seq.conditions.map((cond, j) => (
                              <ConditionRow
                                key={j}
                                prefix={j === 0 ? 'When' : 'and'}
                                cond={cond}
                                attributes={conditionAttrs}
                                allowDynamic={true}
                                onChange={(c) => setSeqCond(i, j, c)}
                                onRemove={() => setSeq(i, { conditions: seq.conditions.filter((_, idx) => idx !== j) })}
                              />
                            ))}
                            {seq.conditions.length === 0 && (
                              <p className='text-[11px] text-zinc-400'>No conditions — every eligible product qualifies; the sort decides who wins the slots.</p>
                            )}
                            <details className='pt-1'>
                              <summary className='text-[10px] font-bold uppercase tracking-wider text-zinc-400 cursor-pointer hover:text-black inline-flex items-center gap-1'><Plus size={11} /> Add condition</summary>
                              <div className='mt-2'>
                                <AttributeChips attributes={conditionAttrs} allowDynamic={true} onAdd={(c) => setSeq(i, { conditions: [...seq.conditions, c] })} />
                              </div>
                            </details>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setForm((f) => ({ ...f, sequences: [...f.sequences, { size: 4, label: '', pool: 'collection', conditions: [], sortBy: [{ key: 'score', dir: 'desc' }] }] }))}
                      className='mt-3 bg-white border border-dashed border-zinc-300 text-zinc-500 px-5 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:border-black hover:text-black transition-colors'
                    >
                      <Plus size={13} /> Add sequence
                    </button>

                    <div className='flex items-center gap-3 mt-4'>
                      <Toggle checked={form.backfill} onChange={() => setForm((f) => ({ ...f, backfill: !f.backfill }))} />
                      <span className='text-xs text-zinc-600'>Backfill under-filled slots with best-match products so all 16 are always attempted</span>
                    </div>
                  </div>

                  {/* Attribute priority (best-match weighting) */}
                  <div className={form.automatedEnabled ? '' : 'opacity-40 pointer-events-none'}>
                    <label className={labelCls}>Best-match weighting (what matters most)</label>
                    <p className='text-[11px] text-zinc-400 mt-0.5 mb-2'>Used wherever a sequence sorts by "Best match" and for backfill. Top = weighted highest.</p>
                    <div className='space-y-1.5 max-w-md'>
                      {form.attributePriority.map((attr, idx) => (
                        <div key={attr} className='flex items-center gap-3 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2.5'>
                          <span className='w-6 h-6 rounded-full bg-white border border-zinc-200 text-zinc-500 flex items-center justify-center text-[10px] font-black'>{idx + 1}</span>
                          <span className='text-xs font-medium text-zinc-700 flex-1'>{ATTRIBUTE_LABELS[attr] || attr}</span>
                          <button onClick={() => moveAttr(idx, -1)} disabled={idx === 0} className='text-zinc-400 hover:text-black disabled:opacity-20'><MoveUp size={14} /></button>
                          <button onClick={() => moveAttr(idx, 1)} disabled={idx === form.attributePriority.length - 1} className='text-zinc-400 hover:text-black disabled:opacity-20'><MoveDown size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Schedule / priority / enabled */}
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 border-t border-zinc-100'>
                    <div>
                      <label className={labelCls}>Daily refresh time (IST)</label>
                      <input type='time' className={fieldCls + ' mt-2'} value={form.scheduleTime} onChange={(e) => setForm((f) => ({ ...f, scheduleTime: e.target.value }))} />
                    </div>
                    <div>
                      <label className={labelCls}>Rule priority</label>
                      <input type='number' className={fieldCls + ' mt-2'} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
                      <p className='text-[10px] text-zinc-400 mt-1'>Higher priority wins when a product is in several ruled collections.</p>
                    </div>
                    <div>
                      <label className={labelCls}>Enabled</label>
                      <div className='mt-3'><Toggle checked={form.enabled} onChange={() => setForm((f) => ({ ...f, enabled: !f.enabled }))} /></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className='px-8 py-5 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between'>
              <div className='text-[11px] text-zinc-400'>
                {editorTab === 'source' ? 'Step 1 of 2 — who receives recommendations' : 'Step 2 of 2 — what gets recommended'}
              </div>
              <div className='flex items-center gap-3'>
                {editorTab === 'source' ? (
                  <button onClick={() => setEditorTab('recommendations')} className='bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-colors'>
                    Next: Recommendations
                  </button>
                ) : (
                  <>
                    <button onClick={() => setEditorTab('source')} className='bg-white border border-zinc-200 text-zinc-600 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:border-zinc-400 transition-colors'>
                      Back
                    </button>
                    <button onClick={saveRule} disabled={savingRule || totalSlots > 16} className='bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-50 transition-colors'>
                      {savingRule && <Loader2 size={13} className='animate-spin' />} {editingRule ? 'Save changes' : 'Create rule'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PREVIEW MODAL ================= */}
      {previewRule && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div className='bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl'>
            <div className='px-8 py-5 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-4'>
              <div>
                <h2 className='text-lg font-bold text-zinc-900'>Preview — {previewRule.collectionTitle}</h2>
                <p className='text-[11px] text-zinc-400 mt-0.5'>Exactly what the next run writes. Pin products here for the selected source product.</p>
              </div>
              <div className='relative w-72 shrink-0'>
                <Search size={13} className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400' />
                <input className='w-full pl-8 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-black' placeholder='Preview a specific product...' value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
                {productResults.length > 0 && (
                  <div className='absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-zinc-100 rounded-xl shadow-2xl max-h-56 overflow-y-auto'>
                    {productResults.map((p) => (
                      <button key={p.id} className='w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 flex items-center gap-2' onClick={() => { setProductQuery(''); setProductResults([]); openPreview(previewRule, String(p.id).split('/').pop()); }}>
                        {p.image && <img src={p.image} alt='' className='w-6 h-6 rounded-md object-cover' />}
                        <span className='truncate'>{p.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setPreviewRule(null); setPreviewData([]); }} className='text-zinc-400 hover:text-black'><X size={20} /></button>
            </div>

            <div className='flex-1 overflow-y-auto px-8 py-6 custom-scrollbar'>
              {previewLoading ? (
                <div className='flex justify-center py-32'><Loader2 className='animate-spin text-zinc-300' size={36} /></div>
              ) : previewData.length === 0 ? (
                <p className='text-sm text-zinc-400 text-center py-20'>No eligible source products for this rule.</p>
              ) : (
                <>
                  {/* Source selector */}
                  <div className='flex gap-2 flex-wrap mb-6'>
                    {previewData.map((p, i) => (
                      <button key={p.source.id} onClick={() => setSelectedSource(i)} className={'flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl border transition-colors ' + (i === selectedSource ? 'border-black bg-black text-white' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400')}>
                        {p.source.image ? <img src={p.source.image} alt='' className='w-7 h-7 rounded-lg object-cover' /> : <Package size={14} />}
                        <span className='text-xs font-medium max-w-[160px] truncate'>{p.source.title}</span>
                      </button>
                    ))}
                  </div>

                  {activePreview && (
                    <div className='space-y-7'>
                      <div className='flex items-center gap-3 text-xs text-zinc-500'>
                        <span className='font-bold text-zinc-800'>{activePreview.source.title}</span>
                        <span>{formatINR(activePreview.source.price)}</span>
                        <span className={'font-black px-2 py-0.5 rounded-full uppercase text-[10px] ' + (activePreview.totalFilled >= 16 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50')}>{activePreview.totalFilled} / 16 slots</span>
                        {pinSaving && <Loader2 size={12} className='animate-spin text-zinc-400' />}
                        {activePreview.metricSources?.skuIndexPending && (
                          <span className='flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full'>
                            <Loader2 size={10} className='animate-spin' /> Google Analytics view data still loading — reopen in a few minutes
                          </span>
                        )}
                      </div>

                      {activePreview.slots.map((slot) => (
                        <div key={slot.blockIndex + slot.blockLabel} className='space-y-3'>
                          <div className='flex items-center gap-3'>
                            {slot.pinned ? (
                              <span className='flex items-center gap-1 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase'><Pin size={10} /> Pinned</span>
                            ) : (
                              <>
                                <div className='w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-[10px] font-black shrink-0'>{slot.blockIndex + 1}</div>
                                <h3 className='font-bold text-xs uppercase tracking-widest text-zinc-400'>{slot.blockLabel}</h3>
                              </>
                            )}
                            <span className='text-[10px] text-zinc-300'>{slot.products.length} products</span>
                          </div>
                          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                            {slot.products.map((p) => {
                              const gid = p.id;
                              const isPinned = activePerProductPins.includes(gid);
                              return (
                                <div key={p.id} className='bg-white border border-zinc-100 rounded-2xl overflow-hidden group relative'>
                                  <div className='aspect-square bg-zinc-50 relative'>
                                    {p.image ? <img src={p.image} alt={p.title} className='w-full h-full object-cover' /> : <Package size={22} className='absolute inset-0 m-auto text-zinc-200' />}
                                    <button
                                      onClick={() => togglePerProductPin(p)}
                                      disabled={pinSaving}
                                      title={isPinned ? 'Unpin for this product' : 'Pin for this product'}
                                      className={'absolute top-2 right-2 p-1.5 rounded-full shadow transition-colors ' + (isPinned ? 'bg-amber-500 text-white' : 'bg-white/90 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-black')}
                                    >
                                      {isPinned ? <Pin size={13} /> : <Pin size={13} />}
                                    </button>
                                  </div>
                                  <div className='p-3'>
                                    <div className='text-[11px] font-medium text-zinc-800 truncate' title={p.title}>{p.title}</div>
                                    <div className='flex items-center justify-between mt-1'>
                                      <span className='text-xs font-bold text-zinc-900'>{formatINR(p.price)}</span>
                                      <span className={'text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase ' + (p.inStock ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50')}>{p.inStock ? 'Buyable' : 'Unavailable'}</span>
                                    </div>
                                    <div className='flex items-center gap-2 mt-1.5 text-[9px] text-zinc-400'>
                                      <span title='Views, last 30 days'>👁 {p.metrics?.views30 ?? 0}</span>
                                      <span title='Add to carts, last 30 days'>🛒 {p.metrics?.atc30 ?? 0}</span>
                                      <span title='Orders, last 30 days'>📦 {p.metrics?.orders30 ?? 0}</span>
                                      {p.stoneType && <span className='ml-auto text-violet-400'>{p.stoneType}</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {slot.products.length === 0 && <p className='text-[11px] text-zinc-400 col-span-full'>No products matched this sequence for this source.</p>}
                          </div>
                        </div>
                      ))}

                      {activePreview.totalFilled < 16 && (
                        <p className='flex items-center gap-2 text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3'>
                          <AlertTriangle size={13} /> Only {activePreview.totalFilled} of 16 slots filled — loosen sequence conditions, enable backfill, or pin more products.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= RUNS MODAL ================= */}
      {runsRule && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
          <div className='bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl'>
            <div className='px-8 py-5 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between'>
              <h2 className='text-lg font-bold text-zinc-900'>Run history — {runsRule.collectionTitle}</h2>
              <button onClick={() => { setRunsRule(null); setRuns([]); }} className='text-zinc-400 hover:text-black'><X size={20} /></button>
            </div>
            <div className='flex-1 overflow-y-auto px-8 py-6 custom-scrollbar'>
              {runsLoading ? (
                <div className='flex justify-center py-20'><Loader2 className='animate-spin text-zinc-300' size={32} /></div>
              ) : runs.length === 0 ? (
                <p className='text-sm text-zinc-400 text-center py-12'>No runs yet — use Run Now or wait for the daily schedule.</p>
              ) : (
                <table className='w-full text-xs'>
                  <thead>
                    <tr className='text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100'>
                      <th className='py-2 pr-4'>Started</th>
                      <th className='py-2 pr-4'>Trigger</th>
                      <th className='py-2 pr-4'>Status</th>
                      <th className='py-2 pr-4'>Products</th>
                      <th className='py-2 pr-4'>Written</th>
                      <th className='py-2 pr-4'>Unchanged</th>
                      <th className='py-2 pr-4'>Failed</th>
                      <th className='py-2'>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run._id} className='border-b border-zinc-50'>
                        <td className='py-2.5 pr-4 text-zinc-600'>{formatDateTime(run.startedAt)}</td>
                        <td className='py-2.5 pr-4 text-zinc-500 capitalize'>{run.trigger}</td>
                        <td className='py-2.5 pr-4'>
                          <span className={'text-[9px] font-black px-2 py-0.5 rounded-full uppercase ' + (run.status === 'completed' ? 'text-emerald-600 bg-emerald-50' : run.status === 'running' ? 'text-sky-600 bg-sky-50' : 'text-rose-500 bg-rose-50')}>{run.status}</span>
                        </td>
                        <td className='py-2.5 pr-4 text-zinc-600'>{run.productsProcessed}</td>
                        <td className='py-2.5 pr-4 text-zinc-600'>{run.written}</td>
                        <td className='py-2.5 pr-4 text-zinc-600'>{run.unchanged}</td>
                        <td className={'py-2.5 pr-4 ' + (run.failed ? 'text-rose-500 font-bold' : 'text-zinc-600')}>{run.failed}</td>
                        <td className='py-2.5 text-zinc-500'>{run.durationMs != null ? Math.round(run.durationMs / 1000) + 's' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
