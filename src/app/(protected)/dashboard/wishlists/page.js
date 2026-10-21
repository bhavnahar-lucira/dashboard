'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Heart, 
  User, 
  Clock, 
  Package, 
  ExternalLink, 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  RotateCw,
  Download,
  Search
} from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format, subDays } from 'date-fns';

export default function UserWishlistsPage() {
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Single date range picker popover state
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);
  const datePickerRef = useRef(null);

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
    async function fetchWishlists() {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://webuat.lucirajewelry.com';
        const res = await fetch(`${baseUrl}/api/admin/wishlists?start_date=${startDate}&end_date=${endDate}&t=${Date.now()}`);
        const data = await res.json();
        if (data.success) {
          setWishlists(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch wishlists:', err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
    fetchWishlists();
  }, [startDate, endDate, refreshTrigger]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
  };

  // Export Wishlists to CSV
  const exportToCSV = () => {
    if (!wishlists || wishlists.length === 0) {
      alert('No wishlists to export for this date range.');
      return;
    }

    const headers = ['Customer Name', 'Email', 'Phone', 'Total Products', 'Product Titles', 'Last Modified'];
    const rows = wishlists.map(w => {
      const name = w.customer ? `${w.customer.firstName || ''} ${w.customer.lastName || ''}`.trim() : 'Guest';
      const email = w.customer?.email || '';
      const phone = w.customer?.phone || '';
      const count = w.items?.length || 0;
      const titles = (w.items || []).map(i => i.title).join('; ');
      const date = w.updatedAt ? format(new Date(w.updatedAt), 'yyyy-MM-dd HH:mm:ss') : '';
      return [name, email, phone, count, titles, date].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const blob = new Blob([[headers.join(','), ...rows].join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `wishlists_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalProductsSaved = useMemo(() => {
    return wishlists.reduce((acc, w) => acc + (w.items?.length || 0), 0);
  }, [wishlists]);

  const registeredCustomersCount = useMemo(() => {
    return wishlists.filter(w => w.customer && (w.customer.firstName || w.customer.email)).length;
  }, [wishlists]);

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
                  <User size={13} className="text-rose-500 shrink-0" />
                  <span className="truncate">{customer.firstName} {customer.lastName}</span>
                </div>
                {customer.email && (
                  <div className="text-[11px] text-[#5c5f62] truncate" title={customer.email}>{customer.email}</div>
                )}
                {customer.phone && (
                  <div className="text-[10px] text-[#8c9196] font-semibold">{customer.phone}</div>
                )}
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
      header: 'Wishlist Items',
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
                  <span className="font-medium text-[#202223] line-clamp-1 max-w-[220px]" title={item.title}>
                    {item.title}
                  </span>
                  <span className="text-[10px] text-[#5c5f62] font-semibold">
                    ₹{item.price?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
            {items.length > 3 && (
              <span className="text-[10px] text-rose-600 font-semibold">
                + {items.length - 3} more saved items
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Total Count',
      accessorKey: 'items_count',
      cell: ({ row }) => (
        <span className="font-bold text-[#202223] text-sm" style={{ fontWeight: 700 }}>
          {row.original.items?.length || 0} Products
        </span>
      ),
    },
    {
      header: 'Last Modified',
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
    },
    {
      header: 'Action',
      id: 'action',
      cell: ({ row }) => (
        <div className="flex items-center">
          <button 
            type="button"
            title="Inspect Wishlist"
            className="p-1.5 hover:bg-[#f1f2f4] rounded-lg text-[#6d7175] hover:text-[#202223] transition-colors cursor-pointer"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="font-figtree min-h-screen p-6 sm:p-8 space-y-6 bg-[#f6f6f7]">
      {/* Top Header Bar - Shopify Polaris Style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#e1e3e5] flex items-center justify-center text-rose-600 shadow-xs">
            <Heart size={20} className="text-rose-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#202223] tracking-tight">User Wishlists</h1>
              <span className="bg-[#f1f2f4] text-[#303030] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[#e1e3e5]">
                Saved Favorites
              </span>
            </div>
            <p className="text-xs text-[#6d7175] mt-0.5">
              Customer saved collections, favorites, and intent for later viewing.
            </p>
          </div>
        </div>

        {/* Top Right Action & Export Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={exportToCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-[#f6f6f7] text-[#202223] border border-[#d1d5db] hover:border-[#202223] px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Download size={14} className="text-rose-600" />
            <span>Export CSV</span>
          </button>

          <div className="bg-[#e4f8ec] text-[#007a5a] border border-[#aee9d1] px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#108043] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#108043]"></span>
            </span>
            <span>Live Wishlist Feed</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards - Highlighted counts in bold (font-weight: 700) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Wishlists Card */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Total Wishlists</span>
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Heart size={16} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
              {wishlists.length}
            </span>
            <span className="text-xs text-[#6d7175] font-normal mt-0.5">
              Active wishlist records
            </span>
          </div>
        </div>

        {/* Total Saved Products Card */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Saved Products</span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Package size={16} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
              {totalProductsSaved}
            </span>
            <span className="text-xs text-[#6d7175] font-normal mt-0.5">
              Cumulative items saved
            </span>
          </div>
        </div>

        {/* Identified Customers Card */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Identified Shoppers</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <User size={16} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
              {registeredCustomersCount}
            </span>
            <span className="text-xs text-[#6d7175] font-normal mt-0.5">
              Registered customer accounts
            </span>
          </div>
        </div>

        {/* Data Sync & Refresh Card */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Data Sync</span>
            <span className="w-8 h-8 rounded-lg bg-[#f1f2f4] text-[#5c5f62] flex items-center justify-center">
              <RotateCw size={16} className={isRefreshing ? 'animate-spin text-rose-600' : ''} />
            </span>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#202223]">MongoDB Atlas</span>
              <span className="text-[11px] text-[#6d7175]">Real-time wishlist API</span>
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading || isRefreshing}
              className="flex items-center gap-1.5 bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Reloading...' : 'Reload'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar - Shopify Polaris Unified Bar */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
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
          Showing <span className="text-[#202223] font-semibold">{wishlists.length}</span> wishlists from <span className="text-[#202223] font-semibold">{formatDateSafe(startDate)}</span> to <span className="text-[#202223] font-semibold">{formatDateSafe(endDate)}</span>
        </div>
      </div>

      {/* Wishlists Table Container */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] overflow-hidden">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
            <span className="text-xs font-medium text-[#6d7175]">Loading wishlists...</span>
          </div>
        ) : (
          <DataTable columns={columns} data={wishlists} hideCount={false} />
        )}
      </div>
    </div>
  );
}
