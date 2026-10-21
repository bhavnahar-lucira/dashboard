'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Download, 
  Calendar, 
  Coins, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Phone, 
  Mail, 
  RotateCw, 
  Search,
  Gift,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format, subDays } from 'date-fns';

export default function ExhibitionLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    claimedCount: 0,
    pendingCount: 0,
    totalPoints: 0,
    todayCount: 0
  });

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
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
    if (type === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (type === 'today') {
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
    setPageIndex(0);
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
    setPageIndex(0);
  };

  useEffect(() => {
    async function fetchLeads() {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const params = new URLSearchParams({
          page: String(pageIndex + 1),
          limit: String(pageSize),
          t: String(Date.now()),
        });

        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);

        const res = await fetch(`${baseUrl}/api/exhibition/leads?${params.toString()}`, {
          cache: 'no-store'
        });
        const result = await res.json();

        if (result.success) {
          setLeads(result.data || []);
          setTotalCount(result.total || 0);
          if (result.stats) setStats(result.stats);
        }
      } catch (err) {
        console.error('Failed to fetch exhibition leads:', err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }

    fetchLeads();
  }, [statusFilter, searchQuery, startDate, endDate, pageIndex, pageSize, refreshTrigger]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
  };

  // One-click CSV Export
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const res = await fetch(`${baseUrl}/api/exhibition/leads/export?${params.toString()}`);
      const json = await res.json();

      if (!json.success || !json.data || json.data.length === 0) {
        alert('No leads available to export with the current filters.');
        return;
      }

      const headers = [
        'Full Name',
        'Mobile Number',
        'Email',
        'Date of Birth',
        'Points Awarded',
        'Status',
        'Registered Date',
        'Claimed Date'
      ];

      const rows = json.data.map(lead => {
        const name = lead.fullName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Attendee';
        const phone = lead.displayPhone || lead.mobile || '';
        const email = lead.email || '';
        const dob = lead.dob || '';
        const points = lead.points || 1000;
        const status = lead.status === 'CLAIMED' ? 'CLAIMED (VERIFIED)' : 'PENDING OTP';
        const regDate = lead.createdAt ? format(new Date(lead.createdAt), 'yyyy-MM-dd HH:mm:ss') : '';
        const claimDate = lead.claimedAt ? format(new Date(lead.claimedAt), 'yyyy-MM-dd HH:mm:ss') : '';

        return [
          name,
          phone,
          email,
          dob,
          points,
          status,
          regDate,
          claimDate
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `exhibition_leads_${startDate || 'all'}_to_${endDate || 'today'}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export leads. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const columns = [
    {
      header: 'Customer',
      accessorKey: 'fullName',
      cell: ({ row }) => {
        const lead = row.original;
        const name = lead.fullName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Attendee';
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-[#202223] text-sm capitalize">{name}</span>
            <div className="flex items-center gap-1.5 text-xs text-[#5c5f62]">
              <Mail size={12} className="text-[#8c9196]" />
              <span>{lead.email || 'No email provided'}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Mobile',
      accessorKey: 'mobile',
      cell: ({ row }) => {
        const lead = row.original;
        const phone = lead.displayPhone || (lead.mobile ? String(lead.mobile).replace(/^91/, '') : 'N/A');
        return (
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#202223]">
            <Phone size={13} className="text-[#8c9196]" />
            <span>+91 {phone}</span>
          </div>
        );
      },
    },
    {
      header: 'Date of Birth',
      accessorKey: 'dob',
      cell: ({ row }) => {
        const dob = row.original.dob;
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#5c5f62]">
            <Calendar size={13} className="text-[#8c9196]" />
            <span>{dob || '—'}</span>
          </div>
        );
      },
    },
    {
      header: 'Points Awarded',
      accessorKey: 'points',
      cell: ({ row }) => {
        const pts = row.original.points || 1000;
        return (
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-full w-fit">
            <Coins size={14} className="text-amber-600" />
            <span className="text-xs font-bold font-figtree">{pts.toLocaleString()} Points</span>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => {
        const isClaimed = row.original.status === 'CLAIMED';
        return (
          <Badge
            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-fit border ${
              isClaimed
                ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                : 'bg-[#fff8db] text-[#8a6100] border-[#fbe4a0]'
            }`}
          >
            {isClaimed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
            <span>{isClaimed ? 'CLAIMED' : 'PENDING OTP'}</span>
          </Badge>
        );
      },
    },
    {
      header: 'Registered At',
      accessorKey: 'createdAt',
      cell: ({ row }) => {
        const date = row.original.createdAt;
        if (!date) return <span className="text-xs text-[#8c9196]">—</span>;
        return (
          <div className="flex flex-col text-xs text-[#202223]">
            <span className="font-semibold">{format(new Date(date), 'dd MMM yyyy')}</span>
            <span className="text-[10px] text-[#8c9196]">{format(new Date(date), 'hh:mm a')}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="font-figtree min-h-screen p-6 sm:p-8 space-y-6 bg-[#f6f6f7]">
      {/* Top Header Bar - Shopify Polaris Style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#e1e3e5] flex items-center justify-center text-amber-600 shadow-xs">
            <Sparkles size={20} className="text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#202223] tracking-tight">Exhibition Leads</h1>
              <span className="bg-[#f1f2f4] text-[#303030] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[#e1e3e5]">
                Event Promotions
              </span>
            </div>
            <p className="text-xs text-[#6d7175] mt-0.5">
              Visitors registered for the 1000 Lucira Points offer from the Event Exhibition.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-white hover:bg-[#f6f6f7] text-[#202223] border border-[#d1d5db] hover:border-[#202223] px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-60"
          >
            <Download size={14} className="text-amber-600" />
            <span>{isExporting ? 'Exporting...' : 'Export to CSV'}</span>
          </button>

          <div className="bg-[#e4f8ec] text-[#007a5a] border border-[#aee9d1] px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#108043] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#108043]"></span>
            </span>
            <span>Live Exhibition Stream</span>
          </div>
        </div>
      </div>

      {/* Summary Stats Cards - Shopify Polaris Style with 700 bold weight on metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Total Leads</span>
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={16} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
              {(stats.totalLeads || 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#6d7175] font-normal mt-0.5">
              All exhibition visitors
            </span>
          </div>
        </div>

        {/* Claimed / Verified */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Verified &amp; Claimed</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-emerald-700" style={{ fontWeight: 700 }}>
              {(stats.claimedCount || 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#6d7175] font-normal mt-0.5">
              OTP verified members
            </span>
          </div>
        </div>

        {/* Points Distributed */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Points Credited</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Coins size={16} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-amber-700" style={{ fontWeight: 700 }}>
              {(stats.totalPoints || 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#6d7175] font-normal mt-0.5">
              1000 pts per verified claim
            </span>
          </div>
        </div>

        {/* Today's Registrations */}
        <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">Today's Leads</span>
            <span className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Gift size={16} />
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold tracking-tight text-purple-700" style={{ fontWeight: 700 }}>
              {(stats.todayCount || 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#6d7175] font-normal mt-0.5">
              Registered today
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar - Shopify Polaris Unified Bar */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter Tabs */}
          <div className="inline-flex bg-[#f1f2f4] p-1 rounded-lg border border-[#e1e3e5]">
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setPageIndex(0);
              }}
              className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              All ({stats.totalLeads || 0})
            </button>
            <button
              onClick={() => {
                setStatusFilter('CLAIMED');
                setPageIndex(0);
              }}
              className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                statusFilter === 'CLAIMED'
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              Claimed ({stats.claimedCount || 0})
            </button>
            <button
              onClick={() => {
                setStatusFilter('PENDING_VERIFICATION');
                setPageIndex(0);
              }}
              className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                statusFilter === 'PENDING_VERIFICATION'
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              Pending OTP ({stats.pendingCount || 0})
            </button>
          </div>

          {/* Quick Date Presets */}
          <div className="inline-flex bg-[#f1f2f4] p-1 rounded-lg border border-[#e1e3e5]">
            <button
              type="button"
              onClick={() => setPresetDate('all')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                !startDate && !endDate
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setPresetDate('today')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                startDate === format(new Date(), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd')
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setPresetDate('last7')}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                startDate === format(subDays(new Date(), 6), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd')
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              Last 7 Days
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
              <span>{startDate ? formatDateSafe(startDate) : 'Any Start'}</span>
              <span className="text-[#8c9196] text-[11px] font-normal">to</span>
              <span>{endDate ? formatDateSafe(endDate) : 'Any End'}</span>
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
                    onClick={() => { setPresetDate('last7'); }}
                    className="px-2 py-1 text-[11px] font-semibold bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] rounded-md transition-colors"
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPresetDate('all'); }}
                    className="px-2 py-1 text-[11px] font-semibold bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] rounded-md transition-colors"
                  >
                    All Time
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
                      <span>{startDate ? formatDateSafe(startDate) : 'Select'}</span>
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
                      <span>{endDate ? formatDateSafe(endDate) : 'Select'}</span>
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
                    const isInRange = startDate && endDate && formatted >= startDate && formatted <= endDate;
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
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="text-[11px] text-[#6d7175] hover:text-[#202223] font-medium"
                  >
                    Clear Dates
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

        {/* Search Input & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
            <input
              type="text"
              placeholder="Search name, phone, email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#d1d5db] rounded-lg text-[#202223] placeholder:text-[#8c9196] outline-none focus:border-[#202223] shadow-2xs transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading || isRefreshing}
            className="flex items-center gap-1.5 bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            title="Refresh Leads"
          >
            <RotateCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Reload'}</span>
          </button>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] overflow-hidden">
        {loading && pageIndex === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            <span className="text-xs font-medium text-[#6d7175]">Loading exhibition leads...</span>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={leads}
            serverSide={true}
            totalCount={totalCount}
            pageIndex={pageIndex}
            pageSize={pageSize}
            onPageChange={(newIndex) => setPageIndex(newIndex)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPageIndex(0);
            }}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
