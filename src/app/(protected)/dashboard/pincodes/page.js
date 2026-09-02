'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { MapPin, Search, Loader2, RefreshCw, FileDown } from 'lucide-react';
import PincodeTable from './PincodeTable';

export default function PincodesDashboard() {
  const [pincodes, setPincodes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      toast.error("Please upload a valid CSV file");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatusText("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      
      const res = await axios.post(`${baseUrl}/api/pincodes/import`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          if (percentCompleted === 100) {
            setUploadStatusText("Processing database...");
          }
        }
      });

      const data = res.data;
      if (data.success) {
        toast.success(`Successfully imported ${data.totalProcessed} pincodes!`);
        fetchPincodes(1, query);
      } else {
        toast.error(data.error || "Failed to import pincodes");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error?.response?.data?.error || "An error occurred during upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const fetchPincodes = useCallback(async (page = 1, q = '') => {
    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/pincodes?page=${page}&limit=15${q ? `&q=${encodeURIComponent(q)}` : ''}`);
      const data = await res.json();
      if (data.success) {
        setPincodes(data.pincodes || []);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error('Failed to fetch pincodes', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { fetchPincodes(1, query); }, 500);
    return () => clearTimeout(timer);
  }, [query, fetchPincodes]);

  return (
    <div className='max-w-7xl mx-auto py-10 px-8'>
      <div className='flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6'>
        <div className='flex items-start gap-4'>
           <div className='bg-field p-3 rounded-[8px]'><MapPin size={24} className='text-ink-muted' /></div>
           <div className="min-w-0">
             <h1 className='admin-title'>Pincode Management</h1>
             <p className="admin-subtitle">Manage serviceability and payment availability by pincode.</p>
           </div>
        </div>
        
        <div className='flex items-center gap-3'>
           <button className='flex items-center gap-2 bg-panel border border-hairline hover:bg-row-hover px-6 py-3 rounded-[8px] font-bold text-[10px] uppercase tracking-widest text-emerald-600 transition-all'>
             <RefreshCw size={16} /> Refine GPS
           </button>
           <div className="flex flex-col items-end gap-1">
             <button 
               onClick={() => fileInputRef.current?.click()}
               disabled={uploading}
               className='relative overflow-hidden flex items-center gap-2 bg-zinc-900 hover:bg-black text-white px-6 py-3 rounded-[8px] font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50'
             >
               {uploading && (
                 <div 
                   className="absolute left-0 top-0 bottom-0 bg-emerald-600 transition-all duration-300" 
                   style={{ width: `${uploadProgress}%`, opacity: 0.3 }} 
                 />
               )}
               <span className="relative z-10 flex items-center gap-2">
                 {uploading ? <Loader2 className="animate-spin" size={18} /> : <FileDown size={18} />} 
                 {uploading ? uploadStatusText || 'Importing...' : 'Import Data'}
               </span>
             </button>
             {uploading && uploadProgress > 0 && uploadProgress < 100 && (
               <span className="text-[10px] text-ink-soft font-medium">{uploadProgress}% uploaded</span>
             )}
           </div>
           <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleFileUpload} 
             accept=".csv" 
             className="hidden" 
           />
        </div>
      </div>

      <div className='bg-panel rounded-[8px] border border-hairline-soft shadow-xl shadow-zinc-100/50 overflow-hidden'>
        <div className='p-6 border-b border-zinc-50 flex items-center justify-between gap-4 bg-white/50 backdrop-blur-sm'>
          <h2 className='text-xl font-bold text-ink italic font-figtree'>Serviceable Areas</h2>
          <div className='relative max-w-sm w-full'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted' size={18} />
            <input
              type='text'
              placeholder='Search by pincode...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className='w-full pl-12 pr-6 py-3 bg-zinc-50/50 border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all font-medium'
            />
          </div>
        </div>
        
        <PincodeTable 
          data={pincodes} 
          pagination={pagination} 
          onPageChange={(p) => fetchPincodes(p, query)} 
        />
      </div>
    </div>
  );
}
