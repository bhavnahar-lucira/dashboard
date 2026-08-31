'use client';

// Run history for one rule. Read-only: the backend writes a reco_runs doc per
// run (status running -> completed/failed) and this shows the last 20.

import { Loader2, X, AlertTriangle } from 'lucide-react';
import { formatDateTime } from './_shared';

const STATUS_CLS = {
  completed: 'text-emerald-600 bg-emerald-50',
  running: 'text-sky-600 bg-sky-50',
  failed: 'text-rose-500 bg-rose-50',
};

export function RunsModal({ rule, runs, loading, onClose }) {
  if (!rule) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
      <div className='bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl'>
        <div className='px-8 py-5 border-b border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-4'>
          <div className='min-w-0'>
            <h2 className='text-lg font-bold text-zinc-900 truncate'>Run history — {rule.collectionTitle || rule.collectionHandle}</h2>
            <p className='text-[11px] text-zinc-400 mt-0.5'>
              &ldquo;Unchanged&rdquo; is normal — a product is only rewritten when its recommendations actually differ.
            </p>
          </div>
          <button type='button' onClick={onClose} className='text-zinc-400 hover:text-black shrink-0'><X size={20} /></button>
        </div>

        <div className='flex-1 overflow-y-auto px-8 py-6 custom-scrollbar'>
          {loading ? (
            <div className='flex justify-center py-20'><Loader2 className='animate-spin text-zinc-300' size={32} /></div>
          ) : runs.length === 0 ? (
            <p className='text-sm text-zinc-400 text-center py-12'>No runs yet — use Run now, or wait for the daily schedule.</p>
          ) : (
            <div className='space-y-4'>
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
                      <td className='py-2.5 pr-4 text-zinc-600 whitespace-nowrap'>{formatDateTime(run.startedAt)}</td>
                      <td className='py-2.5 pr-4 text-zinc-500 capitalize'>{run.trigger}</td>
                      <td className='py-2.5 pr-4'>
                        <span className={'text-[9px] font-black px-2 py-0.5 rounded-full uppercase ' + (STATUS_CLS[run.status] || STATUS_CLS.failed)}>
                          {run.status}
                        </span>
                      </td>
                      <td className='py-2.5 pr-4 text-zinc-600'>{run.productsProcessed}</td>
                      <td className='py-2.5 pr-4 text-zinc-600'>{run.written}</td>
                      <td className='py-2.5 pr-4 text-zinc-600'>{run.unchanged}</td>
                      <td className={'py-2.5 pr-4 ' + (run.failed ? 'text-rose-500 font-bold' : 'text-zinc-600')}>{run.failed}</td>
                      <td className='py-2.5 text-zinc-500 whitespace-nowrap'>{run.durationMs != null ? Math.round(run.durationMs / 1000) + 's' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Errors are recorded on the run doc but were never shown, so a
                  failed run gave no way to find out why without the server log. */}
              {runs.filter((r) => (r.errors || []).length > 0).map((run) => (
                <div key={'err-' + run._id} className='bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3'>
                  <div className='flex items-center gap-2 text-[11px] font-bold text-rose-600'>
                    <AlertTriangle size={12} /> {formatDateTime(run.startedAt)} — {run.errors.length} error{run.errors.length === 1 ? '' : 's'}
                  </div>
                  <ul className='mt-1.5 space-y-1'>
                    {run.errors.map((e, i) => (
                      <li key={i} className='text-[11px] text-rose-500 font-mono break-all'>{e}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
