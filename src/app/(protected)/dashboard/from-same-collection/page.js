'use client';

// "From the Same Collection" — rule list and view switching.
//
// The editor is a VIEW, not a route: AdminAuthGate and AdminSidebar both gate
// on an exact-pathname allowlist, so a real sub-route would need edits in two
// unrelated files to stay reachable. Switching views in place keeps the module
// self-contained.
//
//   _shared.js  — constants, helpers, shared inputs
//   _editor.js  — the rule workbench (config left, live preview right)
//   _preview.js — preview panel + modal
//   _runs.js    — run history modal

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Loader2, Gem, Play, Pencil, Eye, History, Clock, Layers,
  Database, Info, Globe, Package, FolderOpen, ChevronDown,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  baseUrl, SCOPES, scopeOf, isStoreWide, ruleMode, sequencesSummary,
  formatDateTime, Toggle,
} from './_shared';
import { RuleEditor } from './_editor';
import { PreviewModal } from './_preview';
import { RunsModal } from './_runs';

const SCOPE_ICON = { all: Globe, collection: FolderOpen, product: Package };
const SCOPE_BADGE = {
  all: 'text-indigo-600 bg-indigo-50',
  collection: 'text-sky-600 bg-sky-50',
  product: 'text-amber-600 bg-amber-50',
};

export default function FromSameCollectionDashboard() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ attributes: [], sortKeys: [], availability: null });

  // 'list' | 'editor'
  const [view, setView] = useState('list');
  const [editingRule, setEditingRule] = useState(null);
  const [newScope, setNewScope] = useState('collection');
  const [newOpen, setNewOpen] = useState(false);

  // Card actions
  const [runningId, setRunningId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Preview modal
  const [previewRule, setPreviewRule] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeSource, setActiveSource] = useState(0);
  const [pinSaving, setPinSaving] = useState(false);

  // Runs modal
  const [runsRule, setRunsRule] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);

  // ---- data ----
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
      if (data.success) {
        setMeta({
          attributes: data.attributes || [],
          sortKeys: data.sortKeys || [],
          availability: data.availability || null,
        });
      }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchRules(); fetchMeta(); }, [fetchRules, fetchMeta]);

  const viewsNote = meta.availability
    ? meta.availability.ga4Configured
      ? 'Views: Google Analytics'
      : meta.availability.viewsTrackingSince
        ? 'Views: first-party, since ' + meta.availability.viewsTrackingSince
        : 'Views: collecting starts after the next storefront deploy'
    : null;

  // ---- editor ----
  const openCreate = (scope) => {
    setNewOpen(false);
    setEditingRule(null);
    setNewScope(scope);
    setView('editor');
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setNewScope(scopeOf(rule));
    setView('editor');
  };

  const closeEditor = () => { setView('list'); setEditingRule(null); };
  const afterSave = () => { closeEditor(); fetchRules(); };

  // ---- card actions ----
  const deleteRule = async (rule) => {
    const what = isStoreWide(rule) ? 'the global rule' : '"' + (rule.collectionTitle || rule.collectionHandle) + '"';
    if (!window.confirm('Delete ' + what + '? Its daily refresh stops. Products keep whatever recommendations they already have.')) return;
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
      if (res.ok && data.success) toast.success('Run started — check Runs in a minute for the result');
      else toast.error(data.error || 'Failed to start run');
    } catch (err) { console.error(err); toast.error('Error connecting to server'); }
    finally { setTimeout(() => setRunningId(null), 1500); }
  };

  // ---- preview ----
  const openPreview = async (rule, productId) => {
    setPreviewRule(rule);
    setPreviewLoading(true);
    setActiveSource(0);
    try {
      const res = await fetch(baseUrl + '/api/recommendations/rules/' + rule._id + '/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productId ? { productId } : { limit: 5 }),
      });
      const data = await res.json();
      if (res.ok && data.success) setPreviewData(data.preview || []);
      else { toast.error(data.error || 'Preview failed'); setPreviewData([]); }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
      setPreviewData([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const activePreview = previewData[activeSource] || null;
  const activeSourcePid = activePreview ? String(activePreview.source.id).split('/').pop() : null;
  const activePins = (previewRule?.pins?.perProduct || {})[activeSourcePid] || [];

  const togglePerProductPin = async (product) => {
    if (!previewRule || !activeSourcePid) return;
    const gid = product.id.startsWith('gid://') ? product.id : 'gid://shopify/Product/' + String(product.id).split('/').pop();
    const isPinned = activePins.includes(gid);
    const next = isPinned ? activePins.filter((g) => g !== gid) : [...activePins, gid];
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
        toast.success(isPinned ? 'Pin removed' : 'Pinned to the front');
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

  // =========================================================================
  if (view === 'editor') {
    return (
      <RuleEditor
        key={editingRule?._id || 'new-' + newScope}
        rule={editingRule}
        initialScope={newScope}
        meta={meta}
        viewsNote={viewsNote}
        onCancel={closeEditor}
        onSaved={afterSave}
      />
    );
  }

  const globalTaken = rules.some(isStoreWide);

  return (
    <div className='max-w-7xl mx-auto py-10 px-8'>
      {/* ---------------- Header ---------------- */}
      <div className='flex flex-col md:flex-row md:items-start justify-between mb-6 gap-6'>
        <div>
          <h1 className='text-3xl font-bold text-zinc-900 font-figtree flex items-center gap-3'>
            <Gem className='text-zinc-400' /> From the Same Collection
          </h1>
          <p className='text-zinc-500 mt-1 max-w-2xl'>
            Each rule fills the 16-slot recommendation grid on a product page and refreshes it once a day.
          </p>
        </div>

        {/* One primary action. The scope choice is the first real decision, so
            the choices carry their explanation rather than being three
            equally-weighted buttons with no context. */}
        <div className='relative shrink-0'>
          <button
            type='button'
            onClick={() => setNewOpen((o) => !o)}
            className='bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-colors'
          >
            <Plus size={14} /> New rule
            <ChevronDown size={13} className={'transition-transform ' + (newOpen ? 'rotate-180' : '')} />
          </button>

          {newOpen && (
            <>
              <div className='fixed inset-0 z-30' onClick={() => setNewOpen(false)} />
              <div className='absolute right-0 top-full mt-2 w-[22rem] bg-white border border-zinc-100 rounded-2xl shadow-2xl z-40 overflow-hidden'>
                {['collection', 'product', 'all'].map((key) => {
                  const Icon = SCOPE_ICON[key];
                  const taken = key === 'all' && globalTaken;
                  return (
                    <button
                      key={key}
                      type='button'
                      disabled={taken}
                      onClick={() => openCreate(key)}
                      className='w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed border-b border-zinc-50 last:border-0'
                    >
                      <Icon size={15} className='text-zinc-400 mt-0.5 shrink-0' />
                      <span>
                        <span className='block text-xs font-bold text-zinc-800'>{SCOPES[key].label}</span>
                        <span className='block text-[11px] text-zinc-400 mt-0.5 leading-snug'>
                          {taken ? 'A global rule already exists — edit that one instead.' : SCOPES[key].blurb}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------------- Data sources ---------------- */}
      {meta.availability && (
        <div className='flex flex-wrap items-center gap-x-5 gap-y-1 mb-8 px-4 py-3 bg-white border border-zinc-100 rounded-2xl text-[11px] text-zinc-500'>
          <span className='flex items-center gap-1.5 font-bold text-zinc-600'><Database size={12} /> Data sources</span>
          <span>Orders &amp; revenue: <b className='text-zinc-700'>Shopify (exact)</b></span>
          <span>
            Views: {meta.availability.ga4Configured
              ? <b className='text-emerald-600'>Google Analytics</b>
              : meta.availability.viewsTrackingSince
                ? <b className='text-zinc-700'>first-party beacon since {meta.availability.viewsTrackingSince}</b>
                : <b className='text-amber-600'>collecting starts after the next storefront deploy</b>}
          </span>
          <span>Add to carts: <b className='text-zinc-700'>{meta.availability.ga4Configured ? 'Google Analytics' : 'store carts'}</b></span>
          {!meta.availability.ga4Configured && (
            <span className='flex items-center gap-1 text-zinc-400'>
              <Info size={11} /> Add GA4_PROPERTY_ID + a service account to .env for full GA metrics
            </span>
          )}
        </div>
      )}

      {/* ---------------- Rules ---------------- */}
      {loading ? (
        <div className='flex justify-center py-40'><Loader2 className='animate-spin text-zinc-300' size={40} /></div>
      ) : rules.length === 0 ? (
        // Onboarding: the three scopes ARE the first decision, so state them
        // rather than showing an empty box with a button.
        <div className='bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl p-12'>
          <div className='text-center mb-8'>
            <Layers size={36} className='mx-auto text-zinc-200 mb-4' />
            <h2 className='text-lg font-bold text-zinc-800'>No rules yet</h2>
            <p className='text-sm text-zinc-500 mt-1'>Pick how wide the first rule should reach. You can add the others later.</p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {['collection', 'product', 'all'].map((key) => {
              const Icon = SCOPE_ICON[key];
              return (
                <button
                  key={key}
                  type='button'
                  onClick={() => openCreate(key)}
                  className='text-left p-5 rounded-2xl border border-zinc-200 hover:border-black hover:shadow-md transition-all'
                >
                  <Icon size={18} className='text-zinc-400 mb-3' />
                  <div className='text-sm font-bold text-zinc-900'>{SCOPES[key].label}</div>
                  <p className='text-[11px] text-zinc-400 mt-1 leading-snug'>{SCOPES[key].blurb}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className='flex items-center gap-2 mb-3 text-[11px] text-zinc-400'>
            <Info size={12} />
            When a product is covered by more than one rule, the highest priority wins — so a product rule beats a
            collection rule, and a collection rule beats the global one.
          </div>

          <div className='space-y-4'>
            {rules.map((rule) => {
              const scope = scopeOf(rule);
              const ScopeIcon = SCOPE_ICON[scope];
              const mode = ruleMode(rule);
              const ModeIcon = mode.icon;
              const live = rule.enabled !== false;

              return (
                <div
                  key={rule._id}
                  className={'bg-white rounded-[1.75rem] border shadow-sm hover:shadow-md transition-shadow overflow-hidden ' +
                    (live ? 'border-zinc-100' : 'border-zinc-100 opacity-70')}
                >
                  <div className='px-7 py-5 flex flex-col lg:flex-row lg:items-center gap-4'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2.5 flex-wrap'>
                        <span className={'flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider ' + SCOPE_BADGE[scope]}>
                          <ScopeIcon size={10} />
                          {scope === 'product'
                            ? (rule.source?.productIds || []).length + ' product' + ((rule.source?.productIds || []).length === 1 ? '' : 's')
                            : SCOPES[scope].label.replace(' rule', '')}
                        </span>
                        <h2 className='font-bold text-zinc-900 truncate'>{rule.collectionTitle || rule.collectionHandle}</h2>
                        <span className={'flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full uppercase ' + mode.cls}>
                          <ModeIcon size={10} /> {mode.label}
                        </span>
                        {!live && (
                          <span className='text-[10px] font-black px-2 py-1 rounded-full uppercase text-zinc-400 bg-zinc-100'>Paused</span>
                        )}
                      </div>

                      <div className='text-xs text-zinc-500 mt-2 flex items-center gap-4 flex-wrap'>
                        <span className='flex items-center gap-1'><Clock size={11} /> Daily {rule.scheduleTime} IST</span>
                        <span>Priority {rule.priority}</span>
                        <span className='truncate max-w-md'>{sequencesSummary(rule)}</span>
                      </div>

                      <div className='text-[11px] text-zinc-400 mt-1.5'>
                        Last run {formatDateTime(rule.lastRunAt)}
                        {rule.lastRunStats && (
                          <span>
                            {' · '}{rule.lastRunStats.productsProcessed} products
                            {' · '}{rule.lastRunStats.written} updated
                            {' · '}{rule.lastRunStats.unchanged} already correct
                            {rule.lastRunStats.failed ? <span className='text-rose-500'>{' · '}{rule.lastRunStats.failed} failed</span> : null}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className='flex items-center gap-2 shrink-0 flex-wrap'>
                      {togglingId === rule._id
                        ? <Loader2 size={18} className='animate-spin text-zinc-300' />
                        : <Toggle checked={live} onChange={() => toggleEnabled(rule)} />}
                      <button
                        type='button'
                        onClick={() => openPreview(rule)}
                        className='bg-white border border-zinc-200 text-zinc-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:border-zinc-400 transition-colors'
                      >
                        <Eye size={13} /> Preview
                      </button>
                      <button
                        type='button'
                        onClick={() => openRuns(rule)}
                        className='bg-white border border-zinc-200 text-zinc-600 px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:border-zinc-400 transition-colors'
                      >
                        <History size={13} /> Runs
                      </button>
                      <button
                        type='button'
                        onClick={() => runNow(rule)}
                        disabled={runningId === rule._id}
                        className='bg-black text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:bg-zinc-800 disabled:opacity-50 transition-colors'
                      >
                        {runningId === rule._id ? <Loader2 size={13} className='animate-spin' /> : <Play size={13} />} Run now
                      </button>
                      <button type='button' onClick={() => openEdit(rule)} title='Edit rule' className='p-2.5 text-zinc-400 hover:text-black transition-colors'>
                        <Pencil size={16} />
                      </button>
                      <button type='button' onClick={() => deleteRule(rule)} title='Delete rule' className='p-2.5 text-zinc-400 hover:text-rose-500 transition-colors'>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <PreviewModal
        rule={previewRule}
        data={previewData}
        loading={previewLoading}
        activeIndex={activeSource}
        onSelectSource={setActiveSource}
        perProductPins={activePins}
        onTogglePin={togglePerProductPin}
        pinBusy={pinSaving}
        onPreviewProduct={(pid) => openPreview(previewRule, pid)}
        onClose={() => { setPreviewRule(null); setPreviewData([]); }}
      />

      <RunsModal
        rule={runsRule}
        runs={runs}
        loading={runsLoading}
        onClose={() => { setRunsRule(null); setRuns([]); }}
      />
    </div>
  );
}
