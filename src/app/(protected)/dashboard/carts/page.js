'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingCart, 
  User, 
  Clock, 
  Package, 
  Globe, 
  Download, 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  RotateCw,
  Search,
  Filter
} from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format, subDays } from 'date-fns';

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customerType, setCustomerType] = useState('ALL');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCarts, setTotalCarts] = useState(0);
  const [stats, setStats] = useState({ uniqueUsers: 0, totalItems: 0, externalUsers: 0, inHouseUsers: 0, externalItems: 0, inHouseItems: 0, externalCarts: 0, inHouseCarts: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Single date range picker popover state
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);
  const datePickerRef = useRef(null);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportCustomerType, setExportCustomerType] = useState('ALL');
  const [exportStartDate, setExportStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportEndDate, setExportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  // Sync calendarMonth when startDate changes
  useEffect(() => {
    if (startDate) {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) {
        setCalendarMonth(parsed);
      }
    }
  }, [startDate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setOpenDatePicker(false);
        setSelectingEnd(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const setPresetDate = (type) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'yesterday') {
      const yStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (type === 'last7') {
      setStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
      setEndDate(todayStr);
    } else if (type === 'last30') {
      setStartDate(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
      setEndDate(todayStr);
    }
    setOpenDatePicker(false);
    setSelectingEnd(false);
  };

  const formatDateSafe = (dStr) => {
    try {
      if (!dStr) return '';
      const parts = String(dStr).split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dStr;
    } catch {
      return dStr;
    }
  };

  // Compute 35-42 interactive day cells for the active month view
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = (firstDay.getDay() + 6) % 7; 
    const days = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [calendarMonth]);

  const handleDayClick = (d) => {
    const formatted = format(d, 'yyyy-MM-dd');
    if (!selectingEnd) {
      setStartDate(formatted);
      setEndDate(formatted);
      setSelectingEnd(true);
    } else {
      if (formatted < startDate) {
        setEndDate(startDate);
        setStartDate(formatted);
      } else {
        setEndDate(formatted);
      }
      setSelectingEnd(false);
    }
  };

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
        setIsRefreshing(false);
      }
    }

    fetchCarts();
  }, [startDate, endDate, customerType, pageIndex, pageSize, refreshTrigger]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
  };

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
          <div className="flex flex-col gap-1 max-w-[220px]">
            {customer ? (
              <>
                <div className="flex items-center gap-1.5 font-bold text-[#202223] text-xs">
                  <User size={13} className="text-[#6d7175] shrink-0" />
                  <span className="truncate">{customer.firstName} {customer.lastName}</span>
                  {customer.isNitroIdentified && (
                    <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[9px] font-semibold px-1.5 py-0 shadow-2xs ml-1">
                      Nitro
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-[#5c5f62] truncate" title={customer.email}>{customer.email}</div>
                <div className="text-[10px] text-[#8c9196] font-semibold flex items-center gap-2">
                  <span>{customer.phone}</span>
                  {customer.pincode && (
                    <span className="px-1.5 py-0.5 bg-[#f1f2f4] rounded text-[#5c5f62] font-medium border border-[#e1e3e5]">
                      PIN: {customer.pincode}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 font-bold text-[#6d7175] text-xs">
                  <User size={13} />
                  <span>Guest User</span>
                </div>
                {item.sessionId && (
                  <span className="text-[10px] text-[#8c9196] font-mono truncate max-w-[170px]" title={item.sessionId}>
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
            <div className="flex items-center gap-1.5 text-xs text-[#5c5f62] font-medium">
              <Globe size={12} className="text-[#8c9196] shrink-0" />
              <span className="truncate" title={page}>{cleanPage}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge className="bg-[#f1f2f4] text-[#202223] border border-[#e1e3e5] text-[9.5px] font-semibold px-1.5 py-0">
                {item.utmSource || 'Organic'}
              </Badge>
              {item.utmMedium && (
                <span className="text-[9.5px] text-[#8c9196] font-semibold uppercase">{item.utmMedium}</span>
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
            <span className="text-xs font-semibold text-[#202223] truncate max-w-[130px]">
              {item.utmCampaign || 'None'}
            </span>
            <div className="flex flex-wrap gap-1">
              {item.utmContent && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-semibold px-1 py-0">
                  CT: {item.utmContent}
                </Badge>
              )}
              {item.utmTerm && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-semibold px-1 py-0">
                  TM: {item.utmTerm}
                </Badge>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Cart Items',
      accessorKey: 'items',
      cell: ({ row }) => {
        const items = row.original.items || [];
        return (
          <div className="flex flex-col gap-1.5">
            {items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div className="size-8 rounded-lg bg-[#f6f6f7] flex-shrink-0 overflow-hidden border border-[#e1e3e5]">
                  {item.image ? (
                    <img src={item.image} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center text-[#8c9196]">
                      <Package size={12} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-[#202223] line-clamp-1 max-w-[200px]" title={item.title}>
                    {item.title}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-[#5c5f62] font-semibold">
                      Qty: {item.quantity} • ₹{item.price?.toLocaleString('en-IN')}
                    </span>
                    {item.addedAt && (
                      <Badge className="bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] text-[8.5px] font-semibold px-1 py-0">
                        {format(new Date(item.addedAt), 'MMM dd')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {items.length > 3 && (
              <span className="text-[10px] text-[#005bd3] font-semibold">
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
      cell: ({ row }) => {
        const val = row.original.totalAmount || row.original.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
        return (
          <span className="font-bold text-[#202223] text-sm" style={{ fontWeight: 700 }}>
            ₹{val.toLocaleString('en-IN')}
          </span>
        );
      },
    },
    {
      header: 'Last Activity',
      accessorKey: 'updatedAt',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 text-xs text-[#202223] font-medium">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-[#8c9196]" />
            <span>{row.original.updatedAt ? format(new Date(row.original.updatedAt), 'MMM dd, yyyy') : 'N/A'}</span>
          </div>
          <span className="text-[10.5px] text-[#8c9196] pl-4">
            {row.original.updatedAt ? format(new Date(row.original.updatedAt), 'HH:mm') : ''}
          </span>
        </div>
      ),
    }
  ];

  const isToday = startDate === format(new Date(), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="font-figtree min-h-screen p-6 sm:p-8 space-y-6 bg-[#f6f6f7]">
      {/* Top Header Bar - Shopify Polaris Style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#e1e3e5] flex items-center justify-center text-[#202223] shadow-xs">
            <ShoppingCart size={20} className="text-[#303030]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#202223] tracking-tight">Abandoned Carts</h1>
              <span className="bg-[#f1f2f4] text-[#303030] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[#e1e3e5]">
                Real-Time Store Carts
              </span>
            </div>
            <p className="text-xs text-[#6d7175] mt-0.5">
              Live monitoring of customer shopping carts, added items, and recovery leads.
            </p>
          </div>
        </div>

        {/* Top Right Action & Export Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={handleOpenExportModal}
            className="flex items-center gap-1.5 bg-white hover:bg-[#f6f6f7] text-[#202223] border border-[#d1d5db] hover:border-[#202223] px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Download size={14} className="text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <div className="bg-[#e4f8ec] text-[#007a5a] border border-[#aee9d1] px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#108043] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#108043]"></span>
            </span>
            <span>Live Cart Tracking Active</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards - 3 Overview Cards styled identical to User Activity cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. TOTAL ABANDONED CARTS CARD */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start h-[36px]">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">
                  Total Abandoned Carts
                </span>
                <span className="text-xs text-[#6d7175] font-normal mt-0.5">
                  Store Overview
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCustomerType('ALL')}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-[4px] border transition-colors cursor-pointer ${
                    customerType === 'ALL' 
                      ? 'bg-[#202223] text-white border-[#202223]' 
                      : 'text-[#5c5f62] bg-[#f1f2f4] border-[#e1e3e5] hover:bg-[#e1e3e5]'
                  }`}
                  title="Show all carts"
                >
                  {customerType === 'ALL' ? 'Total' : 'Show All'}
                </button>
                <span className="w-7 h-7 rounded-lg bg-[#fff8e5] text-[#b45309] flex items-center justify-center">
                  <ShoppingCart size={14} />
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-3xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
                {(stats.totalCarts || totalCarts || 0).toLocaleString()}
              </span>
              <span className="text-xs text-[#6d7175] font-normal mt-0.5">
                {isToday ? 'active carts today' : 'active carts in range'}
              </span>
            </div>

            {/* Fresh Items highlight pill */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#fbfbfa] border border-[#f1f2f4] rounded-lg text-xs font-medium text-[#5c5f62]">
              <span>{isToday ? 'Fresh items today:' : 'Fresh items in range:'}</span>
              <span className="font-bold text-xs text-[#202223]">
                {(stats.totalItems || 0).toLocaleString()} items
              </span>
            </div>

            {/* Sub comparison boxes: NEW CARTS TODAY vs RETURNING CARTS */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#fbfbfa] border border-[#f1f2f4] rounded-lg p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c5f62]">
                  {isToday ? 'New Carts Today' : 'New Carts'}
                </span>
                <span className="text-base font-bold text-[#202223]">
                  {(stats.newCarts || 0).toLocaleString()} <span className="text-xs font-normal text-[#6d7175]">carts</span>
                </span>
                <span className="text-[11px] font-medium text-[#6d7175]">
                  {(stats.newItems || 0).toLocaleString()} items
                </span>
              </div>

              <div className="bg-[#fbfbfa] border border-[#f1f2f4] rounded-lg p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c5f62]">
                  Returning Carts
                </span>
                <span className="text-base font-bold text-[#202223]">
                  {(stats.returningCarts || 0).toLocaleString()} <span className="text-xs font-normal text-[#6d7175]">carts</span>
                </span>
                <span className="text-[11px] font-medium text-[#6d7175]">
                  {(stats.returningItems || 0).toLocaleString()} items
                </span>
              </div>
            </div>

            {/* Sleek Polaris Conversion Rate Progress Box */}
            <div className="pt-2.5 border-t border-[#f1f2f4] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-[#5c5f62]">Registered Cart Share</span>
                <span className="font-bold text-[#007a5a] text-xs">
                  {stats.totalCarts > 0 ? (((stats.registered?.activeCarts || 0) / stats.totalCarts) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#f1f2f4] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(3, stats.totalCarts > 0 ? (((stats.registered?.activeCarts || 0) / stats.totalCarts) * 100) : 0))}%` }} 
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#6d7175] pt-0.5">
                <span>{(stats.registered?.activeCarts || 0).toLocaleString()} reg · {(stats.guest?.activeCarts || 0).toLocaleString()} guests</span>
                <span className="font-bold text-[#202223]">
                  ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(stats.totalValue || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#6d7175] font-medium pt-3 border-t border-[#f1f2f4]">
            <span>Ext: <strong className="text-[#202223] font-semibold">{stats.externalCarts || 0}</strong></span>
            <span className="h-3 w-px bg-[#e1e3e5]" />
            <span>In-House: <strong className="text-[#202223] font-semibold">{stats.inHouseCarts || 0}</strong></span>
          </div>
        </div>

        {/* 2. REGISTERED CUSTOMERS CARD */}
        <div className={`bg-white border ${customerType === 'CUSTOMER' ? 'border-[#007a5a] ring-2 ring-[#aee9d1]' : 'border-[#e1e3e5]'} text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3`}>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start h-[36px]">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">
                  Registered Customers
                </span>
                <span className="text-xs text-[#6d7175] font-normal mt-0.5">
                  Known Accounts
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCustomerType(prev => prev === 'CUSTOMER' ? 'ALL' : 'CUSTOMER')}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-[4px] border transition-colors cursor-pointer ${
                    customerType === 'CUSTOMER' 
                      ? 'bg-[#007a5a] text-white border-[#007a5a]' 
                      : 'text-[#007a5a] bg-[#e4f8ec] border-[#aee9d1] hover:bg-[#d1f2e0]'
                  }`}
                  title="Filter by Registered Customers"
                >
                  {customerType === 'CUSTOMER' ? 'Active ✓' : 'Filter →'}
                </button>
                <span className="w-7 h-7 rounded-lg bg-[#e4f8ec] text-[#007a5a] flex items-center justify-center">
                  <User size={14} />
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-3xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
                {(stats.registered?.activeCarts || 0).toLocaleString()}
              </span>
              <span className="text-xs text-[#6d7175] font-normal mt-0.5">
                {isToday ? 'active carts today' : 'active carts in range'}
              </span>
            </div>

            {/* Fresh Items highlight pill */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#fbfbfa] border border-[#f1f2f4] rounded-lg text-xs font-medium text-[#5c5f62]">
              <span>{isToday ? 'Fresh items today:' : 'Fresh items in range:'}</span>
              <span className="font-bold text-xs text-[#007a5a]">
                {(stats.registered?.items || 0).toLocaleString()} items
              </span>
            </div>

            {/* Sub comparison boxes: NEW CARTS TODAY vs RETURNING CARTS */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#fbfbfa] border border-[#f1f2f4] rounded-lg p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c5f62]">
                  {isToday ? 'New Carts Today' : 'New Carts'}
                </span>
                <span className="text-base font-bold text-[#202223]">
                  {(stats.registered?.newCarts || 0).toLocaleString()} <span className="text-xs font-normal text-[#6d7175]">carts</span>
                </span>
                <span className="text-[11px] font-medium text-[#007a5a]">
                  {(stats.registered?.newItems || 0).toLocaleString()} items
                </span>
              </div>

              <div className="bg-[#fbfbfa] border border-[#f1f2f4] rounded-lg p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c5f62]">
                  Returning Carts
                </span>
                <span className="text-base font-bold text-[#202223]">
                  {(stats.registered?.returningCarts || 0).toLocaleString()} <span className="text-xs font-normal text-[#6d7175]">carts</span>
                </span>
                <span className="text-[11px] font-medium text-[#007a5a]">
                  {(stats.registered?.returningItems || 0).toLocaleString()} items
                </span>
              </div>
            </div>

            {/* Sleek Polaris Conversion Rate Progress Box */}
            <div className="pt-2.5 border-t border-[#f1f2f4] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-[#5c5f62]">New Cart Acquisition</span>
                <span className="font-bold text-[#007a5a] text-xs">
                  {stats.registered?.activeCarts > 0 ? (((stats.registered?.newCarts || 0) / stats.registered.activeCarts) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#f1f2f4] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(3, stats.registered?.activeCarts > 0 ? (((stats.registered?.newCarts || 0) / stats.registered.activeCarts) * 100) : 0))}%` }} 
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#6d7175] pt-0.5">
                <span>Identified with email or phone</span>
                <span className="font-semibold text-emerald-700">Accounts Verified</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#6d7175] font-medium pt-3 border-t border-[#f1f2f4]">
            <span>Ext: <strong className="text-[#202223] font-semibold">{Math.max(0, (stats.registered?.activeCarts || 0) - (stats.inHouseUsers || 0))}</strong></span>
            <span className="h-3 w-px bg-[#e1e3e5]" />
            <span>In-House: <strong className="text-[#202223] font-semibold">{stats.inHouseUsers || 0}</strong></span>
          </div>
        </div>

        {/* 3. GUEST USERS CARD */}
        <div className={`bg-white border ${customerType === 'GUEST' ? 'border-[#2563eb] ring-2 ring-[#bfdbfe]' : 'border-[#e1e3e5]'} text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3`}>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start h-[36px]">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">
                  Guest Users
                </span>
                <span className="text-xs text-[#6d7175] font-normal mt-0.5">
                  Anonymous Visitors
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={loading || isRefreshing}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#f1f2f4] text-[#5c5f62] text-[10px] font-semibold border border-[#e1e3e5] hover:bg-[#e1e3e5] transition-colors cursor-pointer"
                  title="Refresh cart stream"
                >
                  <span className={`w-1.5 h-1.5 rounded-full bg-blue-600 ${isRefreshing ? 'animate-ping' : ''}`} />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType(prev => prev === 'GUEST' ? 'ALL' : 'GUEST')}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-[4px] border transition-colors cursor-pointer ${
                    customerType === 'GUEST' 
                      ? 'bg-[#2563eb] text-white border-[#2563eb]' 
                      : 'text-[#2563eb] bg-[#eff6ff] border-[#bfdbfe] hover:bg-[#dbeafe]'
                  }`}
                  title="Filter by Guest Users"
                >
                  {customerType === 'GUEST' ? 'Active ✓' : 'Filter →'}
                </button>
                <span className="w-7 h-7 rounded-lg bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                  <Globe size={14} />
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-3xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
                {(stats.guest?.activeCarts || 0).toLocaleString()}
              </span>
              <span className="text-xs text-[#6d7175] font-normal mt-0.5">
                {isToday ? 'active carts today' : 'active carts in range'}
              </span>
            </div>

            {/* Fresh Items highlight pill */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#fbfbfa] border border-[#f1f2f4] rounded-lg text-xs font-medium text-[#5c5f62]">
              <span>{isToday ? 'Fresh items today:' : 'Fresh items in range:'}</span>
              <span className="font-bold text-xs text-[#2563eb]">
                {(stats.guest?.items || 0).toLocaleString()} items
              </span>
            </div>

            {/* Sub comparison boxes: NEW CARTS TODAY vs RETURNING CARTS */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#fbfbfa] border border-[#f1f2f4] rounded-lg p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c5f62]">
                  {isToday ? 'New Carts Today' : 'New Carts'}
                </span>
                <span className="text-base font-bold text-[#202223]">
                  {(stats.guest?.newCarts || 0).toLocaleString()} <span className="text-xs font-normal text-[#6d7175]">carts</span>
                </span>
                <span className="text-[11px] font-medium text-[#2563eb]">
                  {(stats.guest?.newItems || 0).toLocaleString()} items
                </span>
              </div>

              <div className="bg-[#fbfbfa] border border-[#f1f2f4] rounded-lg p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c5f62]">
                  Returning Carts
                </span>
                <span className="text-base font-bold text-[#202223]">
                  {(stats.guest?.returningCarts || 0).toLocaleString()} <span className="text-xs font-normal text-[#6d7175]">carts</span>
                </span>
                <span className="text-[11px] font-medium text-[#2563eb]">
                  {(stats.guest?.returningItems || 0).toLocaleString()} items
                </span>
              </div>
            </div>

            {/* Sleek Polaris Conversion Rate Progress Box */}
            <div className="pt-2.5 border-t border-[#f1f2f4] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-[#5c5f62]">Returning Guest Rate</span>
                <span className="font-bold text-[#2563eb] text-xs">
                  {stats.guest?.activeCarts > 0 ? (((stats.guest?.returningCarts || 0) / stats.guest.activeCarts) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#f1f2f4] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(3, stats.guest?.activeCarts > 0 ? (((stats.guest?.returningCarts || 0) / stats.guest.activeCarts) * 100) : 0))}%` }} 
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#6d7175] pt-0.5">
                <span>Visitors without account</span>
                <span className="font-semibold text-blue-700">Browser Sessions</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#6d7175] font-medium pt-3 border-t border-[#f1f2f4]">
            <span>Ext: <strong className="text-[#202223] font-semibold">{Math.max(0, (stats.guest?.activeCarts || 0) - Math.max(0, (stats.inHouseCarts || 0) - (stats.inHouseUsers || 0)))}</strong></span>
            <span className="h-3 w-px bg-[#e1e3e5]" />
            <span>In-House: <strong className="text-[#202223] font-semibold">{Math.max(0, (stats.inHouseCarts || 0) - (stats.inHouseUsers || 0))}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar - Shopify Polaris Unified Bar */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Customer Type Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-[#d1d5db] rounded-lg px-2.5 py-1.5 shadow-2xs">
            <Filter size={13} className="text-[#6d7175]" />
            <select 
              value={customerType} 
              onChange={(e) => setCustomerType(e.target.value)}
              className="text-xs font-semibold bg-transparent text-[#202223] outline-none cursor-pointer"
            >
              <option value="ALL">All Shoppers</option>
              <option value="CUSTOMER">Registered Customers</option>
              <option value="GUEST">Guest Users</option>
            </select>
          </div>

          {/* Quick Date Presets */}
          <div className="inline-flex bg-[#f1f2f4] p-1 rounded-lg border border-[#e1e3e5]">
            <button
              type="button"
              onClick={() => setPresetDate('today')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                startDate === format(new Date(), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd')
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPresetDate('yesterday')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                startDate === format(subDays(new Date(), 1), 'yyyy-MM-dd') && endDate === format(subDays(new Date(), 1), 'yyyy-MM-dd')
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setPresetDate('last7')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                startDate === format(subDays(new Date(), 6), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd')
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setPresetDate('last30')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                startDate === format(subDays(new Date(), 29), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd')
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          {/* ONE Unified Date Field with Interactive Visual Calendar Popover */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setOpenDatePicker(!openDatePicker)}
              className="flex items-center gap-2 bg-white border border-[#d1d5db] hover:border-[#202223] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#202223] shadow-2xs transition-colors cursor-pointer"
              title="Click to select dates on calendar"
            >
              <Calendar size={13} className="text-[#6d7175]" />
              <span>{formatDateSafe(startDate)}</span>
              <span className="text-[#8c9196] text-[11px] font-normal">to</span>
              <span>{formatDateSafe(endDate)}</span>
              <ChevronDown size={13} className={`text-[#6d7175] ml-0.5 transition-transform duration-200 ${openDatePicker ? 'rotate-180' : ''}`} />
            </button>

            {/* Interactive Visual Calendar Dropdown Popover */}
            {openDatePicker && (
              <div className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-[#e1e3e5] rounded-xl shadow-xl p-4 w-[330px]">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#f1f2f4]">
                  <span className="text-xs font-semibold text-[#202223]">Select Date Range</span>
                  <button
                    type="button"
                    onClick={() => { setOpenDatePicker(false); setSelectingEnd(false); }}
                    className="text-[#6d7175] hover:text-[#202223] p-1 rounded-md hover:bg-[#f1f2f4]"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => { setPresetDate('today'); }}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      startDate === format(new Date(), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd')
                        ? 'bg-[#202223] text-white shadow-xs'
                        : 'bg-[#f1f2f4] text-[#202223] hover:bg-[#e4e5e7]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPresetDate('yesterday'); }}
                    className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      startDate === format(subDays(new Date(), 1), 'yyyy-MM-dd') && endDate === format(subDays(new Date(), 1), 'yyyy-MM-dd')
                        ? 'bg-[#202223] text-white shadow-xs'
                        : 'bg-[#f1f2f4] text-[#202223] hover:bg-[#e4e5e7]'
                    }`}
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPresetDate('last7'); }}
                    className="px-2 py-1 text-[11px] font-semibold bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] rounded-md transition-colors"
                  >
                    Last 7 Days
                  </button>
                </div>

                {/* Interactive START DATE & END DATE Selectors */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div
                    onClick={() => setSelectingEnd(false)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      !selectingEnd
                        ? 'border-[#202223] bg-white ring-1 ring-[#202223] shadow-2xs'
                        : 'border-[#e1e3e5] bg-[#fafbfb] hover:bg-white'
                    }`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6d7175]">Start Date</div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#202223] mt-0.5">
                      <span>{formatDateSafe(startDate)}</span>
                      <Calendar size={12} className="text-[#8c9196]" />
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectingEnd(true)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      selectingEnd
                        ? 'border-[#202223] bg-white ring-1 ring-[#202223] shadow-2xs'
                        : 'border-[#e1e3e5] bg-[#fafbfb] hover:bg-white'
                    }`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6d7175]">End Date</div>
                    <div className="flex items-center justify-between text-xs font-semibold text-[#202223] mt-0.5">
                      <span>{formatDateSafe(endDate)}</span>
                      <Calendar size={12} className="text-[#8c9196]" />
                    </div>
                  </div>
                </div>

                {/* Month Navigator Header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e1e3e5] text-[#5c5f62] hover:text-[#202223] hover:bg-[#f1f2f4] transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="font-semibold text-xs text-[#202223]">
                    {format(calendarMonth, 'MMMM yyyy')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#e1e3e5] text-[#5c5f62] hover:text-[#202223] hover:bg-[#f1f2f4] transition-colors"
                    title="Next month"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                    <span key={day} className="text-[10px] font-semibold text-[#8c9196] py-0.5">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Interactive Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((item, idx) => {
                    const formatted = format(item.date, 'yyyy-MM-dd');
                    const isSelectedStart = formatted === startDate;
                    const isSelectedEnd = formatted === endDate;
                    const isInRange = formatted >= startDate && formatted <= endDate;
                    const isToday = formatted === format(new Date(), 'yyyy-MM-dd');

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDayClick(item.date)}
                        className={`h-7 w-7 text-xs rounded-md flex items-center justify-center transition-all ${
                          isSelectedStart || isSelectedEnd
                            ? 'bg-[#202223] text-white font-bold shadow-xs'
                            : isInRange
                            ? 'bg-[#f1f2f4] text-[#202223] font-semibold'
                            : isToday
                            ? 'border border-[#202223] text-[#202223] font-semibold'
                            : item.isCurrentMonth
                            ? 'text-[#202223] hover:bg-[#f6f6f7]'
                            : 'text-[#d1d5db] hover:bg-[#fafafa]'
                        }`}
                      >
                        {item.date.getDate()}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#f1f2f4]">
                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = format(new Date(), 'yyyy-MM-dd');
                      setStartDate(todayStr);
                      setEndDate(todayStr);
                    }}
                    className="text-[11px] text-[#6d7175] hover:text-[#202223] font-medium"
                  >
                    Reset to Today
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOpenDatePicker(false); setSelectingEnd(false); }}
                    className="bg-[#202223] hover:bg-black text-white px-3 py-1 rounded-md text-xs font-semibold shadow-xs transition-colors"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="text-xs text-[#6d7175] font-medium">
          Showing <span className="text-[#202223] font-semibold">{totalCarts}</span> carts from <span className="text-[#202223] font-semibold">{formatDateSafe(startDate)}</span> to <span className="text-[#202223] font-semibold">{formatDateSafe(endDate)}</span>
        </div>
      </div>

      {/* Carts Table Container */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] overflow-hidden">
        {loading && pageIndex === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#202223]"></div>
            <span className="text-xs font-medium text-[#6d7175]">Loading shopping carts...</span>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={carts} 
            hideCount={false} 
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
      </div>

      {/* Export to Excel Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-[#e1e3e5] animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#e1e3e5] flex items-center justify-between bg-[#fafafb]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Download size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#202223]">Export Carts to Excel</h3>
                  <p className="text-[11px] text-[#6d7175]">Download CSV report with customer contacts &amp; items</p>
                </div>
              </div>
              <button 
                onClick={() => !isExporting && setIsExportModalOpen(false)}
                className="text-[#6d7175] hover:text-[#202223] p-1.5 rounded-lg hover:bg-[#f1f2f4] transition-colors"
                disabled={isExporting}
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#5c5f62] uppercase tracking-wider block">Customer Type</label>
                <select 
                  value={exportCustomerType} 
                  onChange={(e) => setExportCustomerType(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-[#d1d5db] rounded-lg px-3 py-2 text-[#202223] outline-none focus:border-[#202223] transition-all cursor-pointer"
                  disabled={isExporting}
                >
                  <option value="ALL">All Users (Registered &amp; Guests)</option>
                  <option value="CUSTOMER">Registered Customers Only</option>
                  <option value="GUEST">Guest Users Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#5c5f62] uppercase tracking-wider block">Start Date</label>
                  <input 
                    type="date" 
                    value={exportStartDate} 
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-[#d1d5db] rounded-lg px-3 py-2 text-[#202223] outline-none focus:border-[#202223] transition-all"
                    disabled={isExporting}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#5c5f62] uppercase tracking-wider block">End Date</label>
                  <input 
                    type="date" 
                    value={exportEndDate} 
                    onChange={(e) => setExportEndDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full text-xs font-semibold bg-white border border-[#d1d5db] rounded-lg px-3 py-2 text-[#202223] outline-none focus:border-[#202223] transition-all"
                    disabled={isExporting}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-[#fafafb] border-t border-[#e1e3e5] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                disabled={isExporting}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#5c5f62] hover:text-[#202223] hover:bg-[#f1f2f4] rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={exportToExcel}
                disabled={isExporting}
                className="flex items-center gap-2 bg-[#202223] hover:bg-black text-white px-4 py-1.5 rounded-lg font-semibold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <div className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    <span>Download CSV</span>
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
