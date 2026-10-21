'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CreditCard, 
  User, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  Receipt, 
  Download, 
  Calendar, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  RotateCw,
  ShoppingBag,
  Sparkles,
  Search
} from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format, subDays } from 'date-fns';

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

    // Monday as start of week: (0 is Sunday, so (day + 6) % 7)
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; 
    const days = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    // Next month padding days to complete rows
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
        setIsRefreshing(false);
      }
    }
    fetchOrders();
  }, [startDate, endDate, pageIndex, pageSize, refreshTrigger]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
  };

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
            <span className="font-bold text-[#202223] text-[13.5px] tracking-tight hover:text-[#005bd3] transition-colors cursor-pointer" style={{ fontWeight: 700 }}>
              {displayName}
            </span>
            <span className="text-[11px] text-[#6d7175] font-mono">
              ID: {String(order.shopifyOrderId || "").split('/').pop()}
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
        const name = (customer?.firstName || customer?.lastName) 
          ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
          : 'Guest Checkout';
        return (
          <div className="flex flex-col gap-1 max-w-[220px]">
            <div className="flex items-center gap-1.5 font-bold text-[#202223] text-xs">
              <User size={12} className="text-[#8c9196] shrink-0" />
              <span className="truncate">{name}</span>
            </div>
            {customer?.email && (
              <div className="text-[11px] text-[#5c5f62] truncate" title={customer.email}>
                {customer.email}
              </div>
            )}
            {address && (address.city || address.province) && (
              <div className="flex items-center gap-1 text-[10px] text-[#8c9196] truncate">
                <MapPin size={10} className="shrink-0" />
                <span>{[address.city, address.province].filter(Boolean).join(', ')}</span>
              </div>
            )}
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
            <Badge 
              className={cn(
                "w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                method === "Prepaid" 
                  ? "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]" 
                  : "bg-[#fff8db] text-[#8a6100] border-[#fbe4a0]"
              )}
            >
              {method}
            </Badge>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-[#5c5f62] font-mono">
                RP: {order.razorpayPaymentId || 'N/A'}
              </span>
              <span className="text-[9px] text-[#8c9196] uppercase tracking-wider font-medium">
                Razorpay Secure
              </span>
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
          <span className="font-bold text-[#202223] text-[14px]" style={{ fontWeight: 700 }}>
            ₹{row.original.totalAmount?.toLocaleString('en-IN')}
          </span>
          {row.original.paymentMethod?.type === "partial_cod" && (
            <span className="text-[10px] text-[#8c9196]">
              Prepaid: ₹{row.original.paymentMethod.prepaidAmount?.toLocaleString('en-IN')}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 text-xs text-[#202223] font-medium">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-[#8c9196]" />
            <span>{row.original.createdAt ? format(new Date(row.original.createdAt), 'MMM dd, yyyy') : 'N/A'}</span>
          </div>
          <span className="text-[10.5px] text-[#8c9196] pl-4">
            {row.original.createdAt ? format(new Date(row.original.createdAt), 'HH:mm') : ''}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status || 'PAID';
        let badgeStyle = "bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]";
        if (status === 'PARTIALLY_PAID') {
          badgeStyle = "bg-[#fff8db] text-[#8a6100] border-[#fbe4a0]";
        } else if (status === 'UNPAID' || status === 'PENDING') {
          badgeStyle = "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]";
        }

        return (
          <Badge className={cn("text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full border", badgeStyle)}>
            {status}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="font-figtree min-h-screen p-6 sm:p-8 space-y-6 bg-[#f6f6f7]">
      {/* Top Header Bar - Shopify Polaris Style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#e1e3e5] flex items-center justify-center text-emerald-600 shadow-xs">
            <ShieldCheck size={20} className="text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#202223] tracking-tight">Website Orders</h1>
              <span className="bg-[#f1f2f4] text-[#303030] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[#e1e3e5]">
                Shopify Orders API
              </span>
            </div>
            <p className="text-xs text-[#6d7175] mt-0.5">
              Confirmed orders and payments from the website channel.
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
            <span>Live Sync Active</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards - Highlighted counts in bold (font-weight: 700) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Card */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Total Sales</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Receipt size={16} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
              ₹{totalSales.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-[#6d7175] font-normal mt-0.5">
              From {totalCount} confirmed order{totalCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Total Orders Card */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Confirmed Orders</span>
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <ShoppingBag size={16} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
              {totalCount}
            </span>
            <span className="text-xs text-[#6d7175] font-normal mt-0.5">
              Online store checkouts
            </span>
          </div>
        </div>

        {/* Avg Order Value Card */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Avg Order Value (AOV)</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Sparkles size={16} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
              ₹{totalCount > 0 ? Math.round(totalSales / totalCount).toLocaleString('en-IN') : 0}
            </span>
            <span className="text-xs text-[#6d7175] font-normal mt-0.5">
              Average basket size
            </span>
          </div>
        </div>

        {/* Refresh & Sync Card */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Data Sync</span>
            <span className="w-8 h-8 rounded-lg bg-[#f1f2f4] text-[#5c5f62] flex items-center justify-center">
              <RotateCw size={16} className={isRefreshing ? 'animate-spin text-emerald-600' : ''} />
            </span>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#202223]">Live Connected</span>
              <span className="text-[11px] text-[#6d7175]">Shopify API channel</span>
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

      {/* Filter & Toolbar - Shopify Polaris Unified Bar with One Unified Date Field */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Presets - Polaris Segmented Button Group */}
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
          Showing results for <span className="text-[#202223] font-semibold">{formatDateSafe(startDate)}</span> to <span className="text-[#202223] font-semibold">{formatDateSafe(endDate)}</span>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] overflow-hidden">
        {loading && pageIndex === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#202223]"></div>
            <span className="text-xs font-medium text-[#6d7175]">Loading orders...</span>
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={orders} 
            hideCount={false} 
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
      </div>

      {/* Export to Excel Modal - Shopify Polaris Style */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-[#e1e3e5] animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#e1e3e5] flex items-center justify-between bg-[#fafafb]">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Download size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#202223]">Export Orders to Excel</h3>
                  <p className="text-[11px] text-[#6d7175]">Download CSV report with customer details and payments</p>
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
                  className="w-full text-xs font-semibold bg-white border border-[#d1d5db] rounded-lg px-3 py-2 text-[#202223] outline-none focus:border-[#202223] focus:ring-1 focus:ring-[#202223] transition-all cursor-pointer"
                  disabled={isExporting}
                >
                  <option value="ALL">All Users (Registered & Guests)</option>
                  <option value="CUSTOMER">Registered Customers Only</option>
                  <option value="GUEST">Guest Checkouts Only</option>
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

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
