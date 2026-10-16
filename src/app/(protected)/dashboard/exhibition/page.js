'use client';

import { useState, useEffect } from 'react';
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
  Gift
} from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format } from 'date-fns';

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
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

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
      }
    }

    fetchLeads();
  }, [statusFilter, searchQuery, startDate, endDate, pageIndex, pageSize, refreshTrigger]);

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
            <span className="font-bold text-ink text-sm capitalize">{name}</span>
            <div className="flex items-center gap-1.5 text-xs text-ink-soft">
              <Mail size={12} className="text-ink-muted" />
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
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-ink">
            <Phone size={13} className="text-ink-muted" />
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
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
            <Calendar size={13} className="text-ink-muted" />
            <span>{dob || '—'}</span>
          </div>
        );
      },
    },
    {
      header: 'Points',
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
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 w-fit ${
              isClaimed
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-amber-100 text-amber-700 border-amber-300'
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
        if (!date) return <span className="text-xs text-ink-muted">—</span>;
        return (
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-ink">{format(new Date(date), 'dd MMM yyyy')}</span>
            <span className="text-[10px] text-ink-muted">{format(new Date(date), 'hh:mm a')}</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* ─── TITLE & ACTION BAR ─── */}
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-4">
        <div className="min-w-0">
          <h1 className="admin-title flex items-center gap-3">
            <Sparkles className="text-amber-500" size={30} />
            Exhibition Leads
          </h1>
          <p className="admin-subtitle">
            Visitors registered for the 1000 Lucira Points offer from the Event Exhibition.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-3">
          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-[8px] shadow-sm transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-60"
          >
            <Download size={15} />
            <span>{isExporting ? 'Exporting...' : 'Export to CSV'}</span>
          </button>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2 bg-panel px-3 py-1.5 rounded-[8px] border border-hairline-soft shadow-sm">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPageIndex(0);
                }}
                className="text-xs font-semibold bg-transparent outline-none"
              />
            </div>
            <div className="h-6 w-px bg-hairline-soft mx-1" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-ink-muted uppercase tracking-wider">End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPageIndex(0);
                }}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="text-xs font-semibold bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Reload / Refresh Button */}
          <button
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            className="flex items-center gap-1.5 bg-panel hover:bg-row-hover px-3 py-2 rounded-[8px] border border-hairline-soft text-xs font-bold text-ink shadow-sm transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── SUMMARY STATS CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-panel rounded-xl p-5 border border-hairline-soft shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Total Leads</p>
            <p className="text-2xl font-black text-ink mt-1">{(stats.totalLeads || 0).toLocaleString()}</p>
            <p className="text-[11px] text-ink-soft mt-0.5">All exhibition visitors</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={24} />
          </div>
        </div>

        {/* Claimed / Verified */}
        <div className="bg-panel rounded-xl p-5 border border-hairline-soft shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Verified &amp; Claimed</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{(stats.claimedCount || 0).toLocaleString()}</p>
            <p className="text-[11px] text-ink-soft mt-0.5">OTP verified members</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Points Distributed */}
        <div className="bg-panel rounded-xl p-5 border border-hairline-soft shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Points Credited</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{(stats.totalPoints || 0).toLocaleString()}</p>
            <p className="text-[11px] text-ink-soft mt-0.5">1000 pts per verified claim</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Coins size={24} />
          </div>
        </div>

        {/* Today's Registrations */}
        <div className="bg-panel rounded-xl p-5 border border-hairline-soft shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Today's Leads</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{(stats.todayCount || 0).toLocaleString()}</p>
            <p className="text-[11px] text-ink-soft mt-0.5">Registered today</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Gift size={24} />
          </div>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH ROW ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-panel p-4 rounded-xl border border-hairline-soft shadow-sm">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setPageIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#543E3B] text-white shadow-sm'
                : 'text-ink-soft hover:bg-row-hover'
            }`}
          >
            All Leads ({stats.totalLeads || 0})
          </button>
          <button
            onClick={() => {
              setStatusFilter('CLAIMED');
              setPageIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'CLAIMED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-ink-soft hover:bg-row-hover'
            }`}
          >
            Claimed ({stats.claimedCount || 0})
          </button>
          <button
            onClick={() => {
              setStatusFilter('PENDING_VERIFICATION');
              setPageIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === 'PENDING_VERIFICATION'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-ink-soft hover:bg-row-hover'
            }`}
          >
            Pending OTP ({stats.pendingCount || 0})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search name, phone, email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPageIndex(0);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-field border border-hairline-soft rounded-lg text-ink placeholder:text-ink-muted outline-none focus:border-[#543E3B] transition-colors"
          />
        </div>
      </div>

      {/* ─── DATA TABLE ─── */}
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
    </div>
  );
}
