'use client';

import { useState, useEffect } from 'react';
import { CreditCard, User, Clock, CheckCircle2, ShieldCheck, MapPin, Receipt, ExternalLink, Download } from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format } from 'date-fns';

export default function PaymentsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportCustomerType, setExportCustomerType] = useState('ALL');
  const [exportStartDate, setExportStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportEndDate, setExportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setPageIndex(0);
    setOrders([]);
  }, [startDate, endDate, refreshTrigger]);

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://webuat.lucirajewelry.com';
        const url = `${baseUrl}/api/admin/orders?start_date=${startDate}&end_date=${endDate}&page=${pageIndex + 1}&limit=${pageSize}&t=${Date.now()}`;
        console.log('Fetching orders from:', url);
        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setOrders(prev => pageIndex === 0 ? data.data : [...prev, ...data.data]);
          setTotalCount(data.totalCount || 0);
          setTotalSales(data.totalSales || 0);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [startDate, endDate, pageIndex, pageSize, refreshTrigger]);

  const handleOpenExportModal = () => {
    setExportCustomerType('ALL');
    setExportStartDate(startDate);
    setExportEndDate(endDate);
    setIsExportModalOpen(true);
  };

  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://webuat.lucirajewelry.com';
      const url = `${baseUrl}/api/admin/orders?start_date=${exportStartDate}&end_date=${exportEndDate}&customer_type=${exportCustomerType}&page=1&limit=100000&t=${Date.now()}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.success || !data.data || data.data.length === 0) {
        alert('No data available for the selected filters.');
        setIsExporting(false);
        return;
      }

      const exportData = data.data;
      const headers = ['Order ID', 'Customer Name', 'Email', 'Location', 'Payment Method', 'Razorpay ID', 'Total Amount', 'Prepaid Amount', 'Date', 'Status'];
      const rows = exportData.map(order => {
        const orderId = order.shopifyOrderName && !order.shopifyOrderName.includes('DRAFT') ? order.shopifyOrderName : `#${String(order.shopifyOrderId || "").split('/').pop()}`;
        const customer = order.customer;
        const name = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Guest';
        const email = customer?.email || '';
        const address = order.shippingAddress;
        const location = address ? `${address.city || ''}, ${address.province || ''}` : '';
        const method = order.paymentMethod?.type === "partial_cod" ? "Partial COD" : "Prepaid";
        const rpId = order.razorpayPaymentId || '';
        const totalAmount = order.totalAmount || 0;
        const prepaidAmount = order.paymentMethod?.prepaidAmount || 0;
        const date = order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm:ss') : '';
        const status = order.status || 'PAID';
        
        return [orderId, name, email, location, method, rpId, totalAmount, prepaidAmount, date, status].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      });
      const blob = new Blob([[headers.join(','), ...rows].join("\n")], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", blobUrl);
      link.setAttribute("download", `payments_${exportStartDate}_to_${exportEndDate}.csv`);
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
      header: 'Order Details',
      accessorKey: 'shopifyOrderName',
      cell: ({ row }) => {
        const order = row.original;
        const displayName = order.shopifyOrderName && !order.shopifyOrderName.includes('DRAFT') 
          ? order.shopifyOrderName 
          : `#${String(order.shopifyOrderId || "").split('/').pop()}`;
        return (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-[#5A413F] text-sm tracking-tight" style={{ fontWeight: 700 }}>{displayName}</span>
            <span className="text-[10px] text-zinc-400 font-mono break-all max-w-[150px]" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                {String(order.shopifyOrderId || "").split('/').pop()}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Customer',
      accessorKey: 'customer',
      cell: ({ row }) => {
        const customer = row.original.customer;
        const address = row.original.shippingAddress;
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-bold text-zinc-900 text-xs" style={{ marginBottom: '0px', fontSize: '0.75rem' }}>
              <User size={12} className="text-zinc-400" />
              {customer?.firstName} {customer?.lastName}
            </div>
            <div className="text-[10px] text-zinc-500 truncate max-w-[180px]" style={{ fontSize: '0.75rem' }}>{customer?.email}</div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400" style={{ fontSize: '0.75rem' }}>
                <MapPin size={10} />
                {address?.city}, {address?.province}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Payment info',
      accessorKey: 'paymentMethod',
      cell: ({ row }) => {
        const order = row.original;
        const method = order.paymentMethod?.type === "partial_cod" ? "Partial COD" : "Prepaid";
        return (
          <div className="flex flex-col gap-1.5">
            <Badge variant={method === "Prepaid" ? "success" : "warning"} className="w-fit text-[9px] px-1.5 py-0" style={method === "Prepaid" ? { background: '#e2ffe8', color: 'rgb(0, 113, 78)', fontWeight: 600, padding: '0px 8px', fontSize: '0.7rem' } : {}}>
                {method}
            </Badge>
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-700" style={{ fontWeight: 700, fontSize: '0.65rem' }}>RP: {order.razorpayPaymentId || 'N/A'}</span>
                <span className="text-[9px] text-zinc-400 uppercase tracking-widest">Razorpay Secure</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Total Amount',
      accessorKey: 'totalAmount',
      cell: ({ row }) => (
        <div className="flex flex-col">
            <span className="font-bold text-zinc-900" style={{ fontWeight: 700 }}>₹{row.original.totalAmount?.toLocaleString()}</span>
            {row.original.paymentMethod?.type === "partial_cod" && (
                <span className="text-[10px] text-zinc-400 italic">Prepaid: ₹{row.original.paymentMethod.prepaidAmount?.toLocaleString()}</span>
            )}
        </div>
      ),
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 text-[10px] text-zinc-500 font-medium" style={{ fontSize: '0.75rem' }}>
            <span>{row.original.createdAt ? format(new Date(row.original.createdAt), 'MMM dd, yyyy') : 'N/A'}</span>
            <span>{row.original.createdAt ? format(new Date(row.original.createdAt), 'HH:mm') : ''}</span>
        </div>
      ),
    },
    {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
            const status = row.original.status || 'PAID';
            return (
                <Badge className={cn(
                    "text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded-full border-none",
                    status === 'PAID' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                )} style={{ fontWeight: 600, letterSpacing: '0.6px' }}>
                    {status}
                </Badge>
            )
        }
    }
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between" style={{ gap: '18px' }}>
        <div>
          <h1 className="text-zinc-900 flex items-center gap-3 text-[24px] font-bold font-figtree tracking-[0.1px]" style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
            <ShieldCheck className="text-emerald-500" size={32} />
            Website Orders
          </h1>
          <p className="text-zinc-500 mt-1" style={{ marginTop: '2px', fontSize: '0.85rem', color: 'rgb(0, 0, 0)' }}>Confirmed orders from the website (Shopify Admin API channel).</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleOpenExportModal}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-[8px] border border-emerald-200 shadow-sm transition-colors"
            style={{ borderRadius: '4px' }}
          >
            <Download size={16} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ fontWeight: 700 }}>Export Excel</span>
          </button>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-[8px] border border-zinc-100 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest" style={{ fontWeight: 600, marginBottom: '4px' }}>Start Date</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none"
              />
            </div>
            <div className="h-8 w-px bg-zinc-100 mx-2" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest" style={{ fontWeight: 600, marginBottom: '4px' }}>End Date</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="text-xs font-bold bg-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 rounded-[8px] border border-zinc-100 shadow-sm">
              <button 
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                className="px-4 py-2 border-r border-zinc-100 text-center hover:bg-zinc-50 rounded-l-[8px] transition-colors flex flex-col items-center justify-center cursor-pointer"
              >
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 justify-center" style={{ fontWeight: 600, marginBottom: '4px' }}>
                    <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Refresh
                  </p>
                  <p className="text-[10px] font-bold text-[#5A413F] underline">Reload</p>
              </button>
              <div className="px-6 py-2 text-center border-r border-zinc-50" style={{ padding: '0 12px' }}>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest" style={{ fontWeight: 600, marginBottom: '4px' }}>Total Sales</p>
                  <p className="text-xl font-bold text-zinc-900" style={{ fontSize: '16px', fontWeight: 700 }}>₹{totalSales.toLocaleString()}</p>
              </div>
              <div className="px-6 py-2 text-center" style={{ padding: '0 12px' }}>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest" style={{ fontWeight: 600, marginBottom: '4px' }}>Orders</p>
                  <p className="text-xl font-bold text-zinc-900" style={{ fontSize: '16px', fontWeight: 700 }}>{totalCount}</p>
              </div>
          </div>
        </div>
      </div>

      {loading && pageIndex === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={orders} 
          hideCount={true} 
          serverSide={true}
          totalCount={totalCount}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPageChange={setPageIndex}
          onPageSizeChange={setPageSize}
          infiniteScroll={true}
          onLoadMore={() => {
            if (orders.length < totalCount && !loading) {
              setPageIndex(prev => prev + 1);
            }
          }}
          hasMore={orders.length < totalCount}
          loading={loading}
        />
      )}

      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[8px] shadow-xl w-full max-w-md overflow-hidden border border-zinc-200">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
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
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Customer Details</label>
                <select 
                  value={exportCustomerType} 
                  onChange={(e) => setExportCustomerType(e.target.value)}
                  className="w-full text-sm font-bold bg-zinc-50 border border-zinc-200 rounded-[8px] px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                  disabled={isExporting}
                >
                  <option value="ALL">All Users</option>
                  <option value="CUSTOMER">Registered Customers</option>
                  <option value="GUEST">Guest Users</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Start Date</label>
                  <input 
                    type="date" 
                    value={exportStartDate} 
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full text-sm font-bold bg-zinc-50 border border-zinc-200 rounded-[8px] px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    disabled={isExporting}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">End Date</label>
                  <input 
                    type="date" 
                    value={exportEndDate} 
                    onChange={(e) => setExportEndDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full text-sm font-bold bg-zinc-50 border border-zinc-200 rounded-[8px] px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    disabled={isExporting}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                disabled={isExporting}
                className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-[8px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={exportToExcel}
                disabled={isExporting}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-[8px] font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
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

function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
