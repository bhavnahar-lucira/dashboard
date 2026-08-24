'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, User, Clock, Package, Globe, ExternalLink, Tag, Download } from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format } from 'date-fns';

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerType, setCustomerType] = useState('ALL');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCarts, setTotalCarts] = useState(0);
  const [stats, setStats] = useState({ uniqueUsers: 0, totalItems: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportCustomerType, setExportCustomerType] = useState('ALL');
  const [exportStartDate, setExportStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportEndDate, setExportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setPageIndex(0);
    setCarts([]);
  }, [startDate, endDate, customerType, refreshTrigger]);

  useEffect(() => {
    async function fetchCarts() {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const res = await fetch(`${baseUrl}/api/admin/carts?start_date=${startDate}&end_date=${endDate}&customer_type=${customerType}&page=${pageIndex + 1}&limit=${pageSize}&t=${Date.now()}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setCarts(prev => pageIndex === 0 ? data.data : [...prev, ...data.data]);
          setTotalCarts(data.total || 0);
          setStats(data.stats || { uniqueUsers: 0, totalItems: 0 });
        }
      } catch (err) {
        console.error('Failed to fetch carts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCarts();
  }, [startDate, endDate, customerType, pageIndex, pageSize, refreshTrigger]);

  const handleOpenExportModal = () => {
    setExportCustomerType(customerType);
    setExportStartDate(startDate);
    setExportEndDate(endDate);
    setIsExportModalOpen(true);
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/admin/carts?start_date=${exportStartDate}&end_date=${exportEndDate}&customer_type=${exportCustomerType}&page=1&limit=100000&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      
      if (!data.success || !data.data || data.data.length === 0) {
        alert('No data available for the selected filters.');
        setIsExporting(false);
        return;
      }

      const exportData = data.data;
      const headers = ['Customer Name', 'Email', 'Phone', 'Source', 'Campaign', 'Total Value', 'Date'];
      const rows = exportData.map(item => {
        const customer = item.customer;
        const name = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Guest';
        const email = customer?.email || '';
        const phone = customer?.phone || '';
        const source = item.utmSource || 'Organic';
        const campaign = item.utmCampaign || 'None';
        const value = item.totalAmount || item.items?.reduce((acc, i) => acc + (i.price * i.quantity), 0) || 0;
        const date = item.updatedAt ? format(new Date(item.updatedAt), 'yyyy-MM-dd HH:mm:ss') : '';
        return [name, email, phone, source, campaign, value, date].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      });
      const blob = new Blob([[headers.join(','), ...rows].join("\n")], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `abandoned_carts_${exportStartDate}_to_${exportEndDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      header: 'Customer Details',
      accessorKey: 'userId',
      cell: ({ row }) => {
        const item = row.original;
        const customer = item.customer;
        return (
          <div className="flex flex-col gap-1">
            {customer ? (
              <>
                <div className="flex items-center gap-2 font-black text-zinc-900 text-sm tracking-tight">
                  <User size={14} className="text-[#5A413F]" />
                  {customer.firstName} {customer.lastName}
                  {customer.isNitroIdentified && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] px-1.5 py-0 shadow-sm ml-1">
                      Nitro Identified
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500 truncate max-w-[180px] font-medium">{customer.email}</div>
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                  {customer.phone}
                  {customer.pincode && <span className="ml-2 px-1 py-0.5 bg-zinc-100 rounded text-zinc-500 font-medium">PIN: {customer.pincode}</span>}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 font-bold text-zinc-400">
                  <User size={14} />
                  Guest
                </div>
                {item.sessionId && (
                   <span className="text-[9px] text-zinc-300 font-mono truncate max-w-[150px]">
                     SID: {item.sessionId}
                   </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Attribution / Source',
      accessorKey: 'utmSource',
      cell: ({ row }) => {
        const item = row.original;
        const page = item.sourcePage || 'unknown';
        const cleanPage = page.replace(/^https?:\/\/[^\/]+/, '') || '/';
        return (
          <div className="flex flex-col gap-1 max-w-[200px]">
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
              <Globe size={12} className="text-zinc-400" />
              <span className="truncate" title={page}>{cleanPage}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-zinc-100 text-zinc-500 border-zinc-200 text-[9px] font-black uppercase tracking-tighter px-1.5 py-0">
                {item.utmSource || 'Organic'}
              </Badge>
              {item.utmMedium && (
                 <span className="text-[9px] text-zinc-400 font-bold uppercase">{item.utmMedium}</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Campaign / Context',
      accessorKey: 'utmCampaign',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-zinc-900 truncate max-w-[120px]">
              {item.utmCampaign || 'None'}
            </span>
            <div className="flex flex-wrap gap-1">
              {item.utmContent && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-100 text-[8px] font-bold px-1 py-0">
                  CT: {item.utmContent}
                </Badge>
              )}
              {item.utmTerm && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-[8px] font-bold px-1 py-0">
                  TM: {item.utmTerm}
                </Badge>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Items',
      accessorKey: 'items',
      cell: ({ row }) => {
        const items = row.original.items || [];
        return (
          <div className="flex flex-col gap-1.5">
            {items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div className="size-8 rounded bg-zinc-100 flex-shrink-0 overflow-hidden border border-zinc-200">
                  {item.image && <img src={item.image} alt="" className="size-full object-cover" />}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium line-clamp-1 max-w-[200px]">{item.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-500">Qty: {item.quantity} • ₹{item.price?.toLocaleString()}</span>
                    {item.addedAt && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[8px] font-black tracking-widest px-1 py-0 uppercase shadow-sm">
                        {format(new Date(item.addedAt), 'MMM dd, yyyy')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {items.length > 3 && (
              <span className="text-[10px] text-[#5A413F] font-bold">
                + {items.length - 3} more items
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Total Value',
      accessorKey: 'totalAmount',
      cell: ({ row }) => (
        <span className="font-black text-zinc-900">
          ₹{row.original.totalAmount?.toLocaleString() || row.original.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Last Activity',
      accessorKey: 'updatedAt',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            {row.original.updatedAt ? format(new Date(row.original.updatedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
          </div>
        </div>
      ),
    }
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 flex items-center gap-3">
            <ShoppingCart className="text-[#5A413F]" size={32} />
            Abandoned Carts
          </h1>
          <p className="text-zinc-500 mt-1">Real-time view of customer shopping carts across the store.</p>
        </div>
        
        <div className="flex items-center gap-4">

          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-zinc-100 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Customer Details</span>
              <select 
                value={customerType} 
                onChange={(e) => setCustomerType(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">All Users</option>
                <option value="CUSTOMER">Registered Customers</option>
                <option value="GUEST">Guest Users</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-zinc-100 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Start Date</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none"
              />
            </div>
            <div className="h-8 w-px bg-zinc-100 mx-2" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">End Date</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="text-xs font-bold bg-transparent outline-none"
              />
            </div>
          </div>


        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col gap-2 relative overflow-hidden">
          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Unique Users Added Items</span>
            <User size={16} className="text-amber-500" />
          </div>
          <span className="text-3xl font-black text-amber-900 z-10">{stats.uniqueUsers || 0}</span>
          <div className="flex items-center gap-3 z-10 mt-1">
             <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest font-black opacity-60 text-amber-800">External</span>
                <span className="text-xs font-bold text-amber-900">{stats.externalUsers || 0}</span>
             </div>
             <div className="h-4 w-px bg-amber-200" />
             <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest font-black opacity-60 text-amber-800">In-House</span>
                <span className="text-xs font-bold text-amber-900">{stats.inHouseUsers || 0}</span>
             </div>
          </div>
          <User size={80} className="absolute -bottom-4 -right-4 opacity-5 text-amber-500" />
        </div>
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col gap-2 relative overflow-hidden">
          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Total Items Added</span>
            <Package size={16} className="text-emerald-500" />
          </div>
          <span className="text-3xl font-black text-emerald-900 z-10">{stats.totalItems || 0}</span>
          <div className="flex items-center gap-3 z-10 mt-1">
             <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest font-black opacity-60 text-emerald-800">External</span>
                <span className="text-xs font-bold text-emerald-900">{stats.externalItems || 0}</span>
             </div>
             <div className="h-4 w-px bg-emerald-200" />
             <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest font-black opacity-60 text-emerald-800">In-House</span>
                <span className="text-xs font-bold text-emerald-900">{stats.inHouseItems || 0}</span>
             </div>
          </div>
          <Package size={80} className="absolute -bottom-4 -right-4 opacity-5 text-emerald-500" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm flex flex-col gap-2 relative overflow-hidden">
          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Carts</span>
            <button 
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity bg-zinc-50 px-2 py-1 rounded-md"
            >
              <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Refresh</span>
            </button>
          </div>
          <span className="text-3xl font-black text-zinc-900 z-10">{totalCarts}</span>
          <div className="flex items-center gap-3 z-10 mt-1">
             <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest font-black opacity-60 text-zinc-500">External</span>
                <span className="text-xs font-bold text-zinc-700">{stats.externalCarts || 0}</span>
             </div>
             <div className="h-4 w-px bg-zinc-200" />
             <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest font-black opacity-60 text-zinc-500">In-House</span>
                <span className="text-xs font-bold text-zinc-700">{stats.inHouseCarts || 0}</span>
             </div>
          </div>
          <ShoppingCart size={80} className="absolute -bottom-4 -right-4 opacity-[0.03] text-zinc-900" />
        </div>

        <button
          onClick={handleOpenExportModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 p-5 rounded-2xl border border-emerald-700 shadow-sm flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Download size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">Export Excel</span>
        </button>
      </div>

      {loading && pageIndex === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A413F]"></div>
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={carts} 
          hideCount={true} 
          serverSide={true}
          totalCount={totalCarts}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
          infiniteScroll={true}
          onLoadMore={() => {
            if (carts.length < totalCarts && !loading) {
              setPageIndex(prev => prev + 1);
            }
          }}
          hasMore={carts.length < totalCarts}
          loading={loading}
        />
      )}

      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-zinc-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
                <Download size={18} className="text-emerald-500" />
                Export to Excel
              </h3>
              <button 
                onClick={() => !isExporting && setIsExportModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1"
                disabled={isExporting}
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Customer Details</label>
                <select 
                  value={exportCustomerType} 
                  onChange={(e) => setExportCustomerType(e.target.value)}
                  className="w-full text-sm font-bold bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                  disabled={isExporting}
                >
                  <option value="ALL">All Users</option>
                  <option value="CUSTOMER">Registered Customers</option>
                  <option value="GUEST">Guest Users</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Start Date</label>
                  <input 
                    type="date" 
                    value={exportStartDate} 
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full text-sm font-bold bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    disabled={isExporting}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">End Date</label>
                  <input 
                    type="date" 
                    value={exportEndDate} 
                    onChange={(e) => setExportEndDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full text-sm font-bold bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    disabled={isExporting}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                disabled={isExporting}
                className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={exportToExcel}
                disabled={isExporting}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Download File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
