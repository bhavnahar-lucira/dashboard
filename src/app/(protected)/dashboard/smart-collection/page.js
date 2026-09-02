'use client';

// Smart Collections — order the products of Shopify collection pages from
// percentage rules over our own data (stock, price, GA views/carts, Shopify
// orders), Tagalys-style. The computed order is PUSHED INTO SHOPIFY
// (collection switched to manual sort + collectionReorderProducts), so the
// headless storefront picks it up with no frontend change.
//
// Like from-same-collection, the editor is a VIEW, not a route (AdminAuthGate
// and AdminSidebar gate on exact pathnames).
//
//   _shared.js   — constants, helpers (generic inputs re-exported from
//                  ../from-same-collection/_shared)
//   _editor.js   — the workbench
//   _preview.js  — curate preview grid + modal
//   _insights.js — the Product Information lookup (rendered by its OWN
//                  sidebar page, /dashboard/product-insights; kept in this
//                  folder because it shares this module's backend endpoints)
//   _runs.js     — sync history modal

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, Loader2, ListOrdered, Play, Pencil, Eye, History, Clock,
  Layers, Database, Info,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  baseUrl, API, slotsSummary, formatDateTime, Toggle, upsertPosition, clearPosition,
} from './_shared';
import { SmartRuleEditor } from './_editor';
import { CurateModal } from './_preview';
import { SyncsModal } from './_runs';

export default function SmartCollectionsDashboard() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ attributes: [], sortKeys: [], availability: null });

  // 'list' | 'editor'
  const [view, setView] = useState('list');
  const [editingRule, setEditingRule] = useState(null);

  // Card actions
  const [syncingId, setSyncingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Curate preview modal. Curation (pins, demotions, hand-placed positions) is
  // editable in the modal and saved onto the rule explicitly — `savedCuration`
  // is what the rule holds, `curation` what is on screen.
  const [previewRule, setPreviewRule] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [curation, setCuration] = useState(null);
  const [savedCuration, setSavedCuration] = useState(null);
  const [savingCuration, setSavingCuration] = useState(false);

  // Syncs modal
  const [runsRule, setRunsRule] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);

  // ---- data ----
  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch(baseUrl + API + '/rules');
      const data = await res.json();
      if (data.success) setRules(data.rules || []);
      else toast.error(data.error || 'Failed to load smart sorts');
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(baseUrl + API + '/attributes');
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
  const openCreate = () => { setEditingRule(null); setView('editor'); };
  const openEdit = (rule) => { setEditingRule(rule); setView('editor'); };
  const closeEditor = () => { setView('list'); setEditingRule(null); };
  const afterSave = () => { closeEditor(); fetchRules(); };

  // ---- card actions ----
  const deleteRule = async (rule) => {
    if (!window.confirm('Delete the smart sort for "' + (rule.collectionTitle || rule.collectionHandle) +
      '"? The daily sync stops; the collection keeps its last pushed order (and stays on manual sorting in Shopify).')) return;
    try {
      const res = await fetch(baseUrl + API + '/rules/' + rule._id, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) { toast.success('Smart sort deleted'); fetchRules(); }
      else toast.error(data.error || 'Failed to delete');
    } catch (err) { console.error(err); toast.error('Error connecting to server'); }
  };

  const toggleEnabled = async (rule) => {
    setTogglingId(rule._id);
    try {
      const res = await fetch(baseUrl + API + '/rules/' + rule._id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !(rule.enabled !== false) }),
      });
      const data = await res.json();
      if (res.ok && data.success) fetchRules();
      else toast.error(data.error || 'Failed to update');
    } catch (err) { console.error(err); toast.error('Error connecting to server'); }
    finally { setTogglingId(null); }
  };

  const syncNow = async (rule) => {
    setSyncingId(rule._id);
    try {
      const res = await fetch(baseUrl + API + '/rules/' + rule._id + '/run', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) toast.success('Sync started — the new order lands on Shopify in a minute. Check Syncs for the result.');
      else toast.error(data.error || 'Failed to start sync');
    } catch (err) { console.error(err); toast.error('Error connecting to server'); }
    finally { setTimeout(() => setSyncingId(null), 1500); }
  };

  // ---- preview ----
  const ruleCuration = (rule) => ({
    pinned: [...(rule.pinned || [])],
    removed: [...(rule.removed || [])],
    positions: (rule.positions || []).map((e) => ({ id: e.id, position: e.position })),
  });

  const openPreview = async (rule) => {
    setPreviewRule(rule);
    setPreviewLoading(true);
    setPreviewData(null);
    setCuration(ruleCuration(rule));
    setSavedCuration(ruleCuration(rule));
    try {
      const res = await fetch(baseUrl + API + '/rules/' + rule._id + '/preview', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) setPreviewData(data.preview || null);
      else { toast.error(data.error || 'Preview failed'); setPreviewData(null); }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewRule(null);
    setPreviewData(null);
    setCuration(null);
    setSavedCuration(null);
  };

  const curationDirty = useMemo(
    () => Boolean(curation && savedCuration) && JSON.stringify(curation) !== JSON.stringify(savedCuration),
    [curation, savedCuration]
  );

  // Pins and demotions change WHICH products the percentage slots draw from,
  // so the whole order has to come back from the engine. Hand-placed positions
  // don't — the preview re-applies those locally from the automated order.
  const repreviewWithCuration = async (rule, next) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(baseUrl + API + '/preview-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: rule.collectionId,
          collectionHandle: rule.collectionHandle,
          collectionTitle: rule.collectionTitle,
          scheduleTime: rule.scheduleTime,
          slots: rule.slots || [],
          remainderSortBy: rule.remainderSortBy || [],
          settings: { oosToEnd: rule.settings?.oosToEnd !== false },
          ...next,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) setPreviewData(data.preview || null);
      else toast.error(data.error || 'Preview failed');
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setPreviewLoading(false);
    }
  };

  // One placement decision per product: hand-placing clears a pin/demotion,
  // and pinning or demoting clears a hand placement.
  const curateMove = (product, position) => {
    setCuration((c) => ({
      pinned: c.pinned.filter((id) => id !== product.id),
      removed: c.removed.filter((id) => id !== product.id),
      positions: upsertPosition(c.positions, product.id, position),
    }));
  };

  const curateRelease = (product) => {
    setCuration((c) => ({ ...c, positions: clearPosition(c.positions, product.id) }));
  };

  const curateToggle = (field) => (product) => {
    const other = field === 'pinned' ? 'removed' : 'pinned';
    const next = {
      ...curation,
      [field]: curation[field].includes(product.id)
        ? curation[field].filter((id) => id !== product.id)
        : [...curation[field], product.id],
      [other]: curation[other].filter((id) => id !== product.id),
      positions: clearPosition(curation.positions, product.id),
    };
    setCuration(next);
    repreviewWithCuration(previewRule, next);
  };

  const saveCuration = async () => {
    if (!previewRule || !curation) return;
    setSavingCuration(true);
    try {
      const res = await fetch(baseUrl + API + '/rules/' + previewRule._id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(curation),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedCuration(JSON.parse(JSON.stringify(curation)));
        if (data.rule) setPreviewRule(data.rule);
        toast.success('Curation saved — the next sync pushes this order to Shopify');
        fetchRules();
      } else {
        toast.error(data.error || 'Failed to save the curation');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to server');
    } finally {
      setSavingCuration(false);
    }
  };

  const resetCuration = () => {
    if (!savedCuration) return;
    const restored = JSON.parse(JSON.stringify(savedCuration));
    const pinsChanged = JSON.stringify(curation?.pinned) !== JSON.stringify(restored.pinned) ||
      JSON.stringify(curation?.removed) !== JSON.stringify(restored.removed);
    setCuration(restored);
    if (pinsChanged) repreviewWithCuration(previewRule, restored);
  };

  // ---- runs ----
  const openRuns = async (rule) => {
    setRunsRule(rule);
    setRunsLoading(true);
    try {
      const res = await fetch(baseUrl + API + '/runs?ruleId=' + rule._id + '&limit=20');
      const data = await res.json();
      if (res.ok && data.success) setRuns(data.runs || []);
      else { toast.error(data.error || 'Failed to load syncs'); setRuns([]); }
    } catch (err) { console.error(err); setRuns([]); }
    finally { setRunsLoading(false); }
  };

  // =========================================================================
  if (view === 'editor') {
    return (
      <SmartRuleEditor
        key={editingRule?._id || 'new'}
        rule={editingRule}
        meta={meta}
        viewsNote={viewsNote}
        onCancel={closeEditor}
        onSaved={afterSave}
      />
    );
  }

  return (
    <div className='max-w-7xl mx-auto py-10 px-8'>
      {/* ---------------- Header ---------------- */}
      <div className='flex flex-col md:flex-row md:items-start justify-between mb-6 gap-6'>
        <div>
          <h1 className='text-3xl font-bold text-zinc-900 font-figtree flex items-center gap-3'>
            <ListOrdered className='text-zinc-400' /> Smart Collections
          </h1>
          <p className='text-zinc-500 mt-1 max-w-2xl'>
            Order collection pages from your own data — stock, views, carts, sales — and push the sequence straight
            into Shopify. Only collections added here are touched.
          </p>
        </div>

        <button
          type='button'
          onClick={openCreate}
          className='bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-colors shrink-0'
        >
          <Plus size={14} /> New smart sort
        </button>
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
            </div>
          )}

          {/* ---------------- Rules ---------------- */}
          {loading ? (
            <div className='flex justify-center py-40'><Loader2 className='animate-spin text-zinc-300' size={40} /></div>
          ) : rules.length === 0 ? (
            <div className='bg-white rounded-[2.5rem] border border-zinc-100 shadow-xl p-12 text-center'>
              <Layers size={36} className='mx-auto text-zinc-200 mb-4' />
              <h2 className='text-lg font-bold text-zinc-800'>No smart sorts yet</h2>
              <p className='text-sm text-zinc-500 mt-1 max-w-lg mx-auto'>
                Pick a collection, claim percentages of it — &ldquo;first 20% in stock by views, next 10% most
                viewed&rdquo; — preview the exact order, then sync it to Shopify.
              </p>
              <button
                type='button'
                onClick={openCreate}
                className='mt-6 bg-black text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest inline-flex items-center gap-2 hover:bg-zinc-800 transition-colors'
              >
                <Plus size={14} /> Create the first one
              </button>
            </div>
          ) : (
            <>
              <div className='flex items-center gap-2 mb-3 text-[11px] text-zinc-400'>
                <Info size={12} />
                Each sync recomputes the order and pushes only the positions that changed. The first sync switches the
                collection to manual sorting in Shopify.
              </div>

              <div className='space-y-4'>
                {rules.map((rule) => {
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
                            <h2 className='font-bold text-zinc-900 truncate'>{rule.collectionTitle || rule.collectionHandle}</h2>
                            {!live && (
                              <span className='text-[10px] font-black px-2 py-1 rounded-full uppercase text-zinc-400 bg-zinc-100'>Paused</span>
                            )}
                            {(rule.pinned || []).length > 0 && (
                              <span className='text-[10px] font-black px-2 py-1 rounded-full uppercase text-amber-600 bg-amber-50'>
                                {rule.pinned.length} pinned
                              </span>
                            )}
                            {(rule.removed || []).length > 0 && (
                              <span className='text-[10px] font-black px-2 py-1 rounded-full uppercase text-rose-500 bg-rose-50'>
                                {rule.removed.length} demoted
                              </span>
                            )}
                            {(rule.positions || []).length > 0 && (
                              <span className='text-[10px] font-black px-2 py-1 rounded-full uppercase text-white bg-zinc-900'>
                                {rule.positions.length} hand-placed
                              </span>
                            )}
                          </div>

                          <div className='text-xs text-zinc-500 mt-2 flex items-center gap-4 flex-wrap'>
                            <span className='flex items-center gap-1'><Clock size={11} /> Daily {rule.scheduleTime} IST</span>
                            <span className='truncate max-w-md'>{slotsSummary(rule)}</span>
                          </div>

                          <div className='text-[11px] text-zinc-400 mt-1.5'>
                            Last sync {formatDateTime(rule.lastRunAt)}
                            {rule.lastRunStats && (
                              <span>
                                {' · '}{rule.lastRunStats.totalProducts} products
                                {' · '}{rule.lastRunStats.moves} moved
                                {rule.lastRunStats.sortOrderChanged ? ' · switched to manual sorting' : ''}
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
                            <History size={13} /> Syncs
                          </button>
                          <button
                            type='button'
                            onClick={() => syncNow(rule)}
                            disabled={syncingId === rule._id}
                            className='bg-black text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:bg-zinc-800 disabled:opacity-50 transition-colors'
                          >
                            {syncingId === rule._id ? <Loader2 size={13} className='animate-spin' /> : <Play size={13} />} Sync now
                          </button>
                          <button type='button' onClick={() => openEdit(rule)} title='Edit' className='p-2.5 text-zinc-400 hover:text-black transition-colors'>
                            <Pencil size={16} />
                          </button>
                          <button type='button' onClick={() => deleteRule(rule)} title='Delete' className='p-2.5 text-zinc-400 hover:text-rose-500 transition-colors'>
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

      <CurateModal
        rule={previewRule}
        preview={previewData}
        loading={previewLoading}
        onClose={closePreview}
        curation={curation}
        onMove={curateMove}
        onRelease={curateRelease}
        onPin={curateToggle('pinned')}
        onRemove={curateToggle('removed')}
        onResetCuration={resetCuration}
        onSave={saveCuration}
        saving={savingCuration}
        dirty={curationDirty}
      />

      <SyncsModal
        rule={runsRule}
        runs={runs}
        loading={runsLoading}
        onClose={() => { setRunsRule(null); setRuns([]); }}
      />
    </div>
  );
}
