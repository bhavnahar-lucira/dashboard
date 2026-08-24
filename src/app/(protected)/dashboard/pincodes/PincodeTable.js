'use client';

import React, { useState } from 'react';
import { Pencil, CheckCircle2, Loader2, X } from 'lucide-react';
import { toast } from 'react-toastify';

export default function PincodeTable({ data, pagination, onPageChange }) {
  const [editingPincode, setEditingPincode] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ latitude: '', longitude: '' });

  const handleEdit = (item) => {
    setEditingPincode(item.pincode);
    setEditForm({ latitude: item.latitude || '', longitude: item.longitude || '' });
  };

  const handleSave = async (pincode) => {
    setIsSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/pincodes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode, ...editForm })
      });
      if (res.ok) {
        toast.success('Pincode updated');
        setEditingPincode(null);
        onPageChange(pagination.page);
      }
    } catch (e) {
      toast.error('Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-left'>
        <thead>
          <tr className='text-zinc-400 text-[10px] uppercase font-black tracking-widest border-b border-zinc-100'>
            <th className='px-6 py-4'>Pincode</th>
            <th className='px-6 py-4'>COD</th>
            <th className='px-6 py-4'>UPI</th>
            <th className='px-6 py-4'>Latitude</th>
            <th className='px-6 py-4'>Longitude</th>
            <th className='px-6 py-4'>Actions</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-zinc-50'>
          {data.map((item) => (
            <tr key={item.pincode} className='hover:bg-zinc-50/50 transition-colors'>
              <td className='px-6 py-4 font-black text-zinc-900'>{item.pincode}</td>
              <td className='px-6 py-4'>
                <span className='inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase'>
                   <CheckCircle2 size={12} /> Available
                </span>
              </td>
              <td className='px-6 py-4'>
                <span className='inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase'>
                   <CheckCircle2 size={12} /> Available
                </span>
              </td>
              <td className='px-6 py-4 text-sm text-zinc-500'>
                {editingPincode === item.pincode ? (
                  <input value={editForm.latitude} onChange={e => setEditForm({...editForm, latitude: e.target.value})} className='w-24 border rounded p-1' />
                ) : (item.latitude || '-')}
              </td>
              <td className='px-6 py-4 text-sm text-zinc-500'>
                {editingPincode === item.pincode ? (
                  <input value={editForm.longitude} onChange={e => setEditForm({...editForm, longitude: e.target.value})} className='w-24 border rounded p-1' />
                ) : (item.longitude || '-')}
              </td>
              <td className='px-6 py-4'>
                {editingPincode === item.pincode ? (
                  <div className='flex gap-2'>
                    <button onClick={() => handleSave(item.pincode)} className='text-emerald-500 p-1'><CheckCircle2 size={18} /></button>
                    <button onClick={() => setEditingPincode(null)} className='text-zinc-400 p-1'><X size={18} /></button>
                  </div>
                ) : (
                  <button onClick={() => handleEdit(item)} className='text-zinc-300 hover:text-zinc-900 transition-colors'><Pencil size={16} /></button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination */}
      <div className='px-6 py-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50'>
         <span className='text-xs text-zinc-400 font-medium'>Page {pagination.page} of {pagination.totalPages}</span>
         <div className='flex gap-2'>
            <button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className='px-4 py-2 bg-white border rounded-xl text-xs font-bold disabled:opacity-50'>Prev</button>
            <button disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)} className='px-4 py-2 bg-white border rounded-xl text-xs font-bold disabled:opacity-50'>Next</button>
         </div>
      </div>
    </div>
  );
}
