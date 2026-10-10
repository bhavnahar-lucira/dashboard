'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  LogIn, 
  LogOut, 
  Clock, 
  Globe, 
  ShoppingCart, 
  Timer, 
  Server, 
  Eye, 
  Sparkles, 
  CheckCircle2, 
  Award,
  Disc
} from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format, subDays } from 'date-fns';

const UAT_BACKEND_URL = 'https://webuat.lucirajewelry.com';
const LOCAL_BACKEND_URL = 'http://localhost:8080';

const getPageType = (path) => {
  if (!path || path === 'unknown') return 'Unknown Source';
  if (path === '/' || path === '') return 'Homepage';
  if (path.includes('/collections/')) return 'Collection Page';
  if (path.includes('/products/')) return 'Product Page';
  if (path.includes('/cart')) return 'Cart Page';
  if (path.includes('/login')) return 'Login Page';
  if (path.includes('/register')) return 'Register Page';
  if (path.includes('/pages/')) return 'Information Page';
  if (path.includes('/search')) return 'Search Page';
  if (path.includes('/checkout')) return 'Checkout Page';
  return 'Other Page';
};

export default function UserTrackingPage() {
  const [trackingData, setTrackingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState('UAT');
  const [dataSourceMode, setDataSourceMode] = useState('AUTO'); // 'AUTO' | 'LOCAL' | 'UAT'
  const [activityType, setActivityType] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    async function fetchTracking() {
      try {
        setLoading(true);
        const isLocal = typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

        let baseUrl = UAT_BACKEND_URL;
        let activeLabel = 'UAT';

        if (isLocal) {
          if (dataSourceMode === 'LOCAL') {
            baseUrl = LOCAL_BACKEND_URL;
            activeLabel = 'Local (8080)';
          } else if (dataSourceMode === 'UAT') {
            baseUrl = UAT_BACKEND_URL;
            activeLabel = 'UAT (Live)';
          } else {
            // AUTO detection
            try {
              const healthCheck = await fetch(`${LOCAL_BACKEND_URL}/health`, { cache: 'no-store' }).catch(() => null);
              if (healthCheck && healthCheck.ok) {
                baseUrl = LOCAL_BACKEND_URL;
                activeLabel = 'Local (8080)';
              } else {
                baseUrl = UAT_BACKEND_URL;
                activeLabel = 'UAT (Fallback)';
              }
            } catch (e) {
              baseUrl = UAT_BACKEND_URL;
              activeLabel = 'UAT (Fallback)';
            }
          }
        } else {
          baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || UAT_BACKEND_URL;
          activeLabel = 'UAT';
        }

        setDataSource(activeLabel);

        // Always fetch the complete dataset (type=ALL) so summary cards never get zeroed out
        const url = `${baseUrl}/api/admin/tracking?start_date=${startDate}&end_date=${endDate}&type=ALL&limit=10000&t=${Date.now()}`;
        console.log('Fetching tracking data from:', url);

        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        console.log('Tracking data response:', data);

        if (data && data.success && Array.isArray(data.data)) {
          // Exclude internal noisy beacons (product_view, scheme_view)
          const cleanEvents = data.data.filter(item => {
            const t = (item.type || '').toLowerCase();
            return !['product_view', 'scheme_view', 'try_at_home_click'].includes(t);
          });
          setTrackingData(cleanEvents);
        } else {
          setTrackingData([]);
        }
      } catch (err) {
        console.error('Failed to fetch tracking data:', err);
        setTrackingData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTracking();
  }, [startDate, endDate, dataSourceMode]);

  const setPresetDate = (preset) => {
    const today = new Date();
    if (preset === 'today') {
      const d = format(today, 'yyyy-MM-dd');
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'yesterday') {
      const y = subDays(today, 1);
      const d = format(y, 'yyyy-MM-dd');
      setStartDate(d);
      setEndDate(d);
    } else if (preset === 'last7') {
      const past = subDays(today, 6);
      setStartDate(format(past, 'yyyy-MM-dd'));
      setEndDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // In-house office and internal tester IPs
  const inHouseIPs = ['106.201.243.160', '106.201.243.156', '122.179.139.168', '122.179.140.17', '103.88.221.55', '45.250.47.102', '127.0.0.1'];

  // Calculate detailed bifurcation metrics across Scratch Card and Spin the Wheel
  const { 
    metrics, 
    viewOnlySessionIds, 
    convertedSessionIds 
  } = useMemo(() => {
    // 1. Converted sessions: registered or logged in
    const convertedSessionIdsSet = new Set();
    const convertedIps = new Set();

    trackingData.forEach(r => {
      const t = (r.type || '').toUpperCase();
      if (t === 'REGISTER' || t === 'LOGIN') {
        if (r.sessionId) convertedSessionIdsSet.add(r.sessionId);
        if (r.ip && !inHouseIPs.includes(r.ip)) convertedIps.add(r.ip);
      }
    });

    // Helper to check if a view record converted
    const isRowConverted = (r) => {
      if (r.sessionId && convertedSessionIdsSet.has(r.sessionId)) return true;
      if (r.ip && convertedIps.has(r.ip)) return true;
      return false;
    };

    // 2. Scratch card view sessions
    const scratchViews = trackingData.filter(r => (r.type || '').toLowerCase() === 'scratch_card_view');
    const scratchViewSessions = new Set(scratchViews.filter(r => r.sessionId).map(r => r.sessionId));
    const scratchViewOnly = new Set(
      scratchViews.filter(r => r.sessionId && !isRowConverted(r)).map(r => r.sessionId)
    );

    // 3. Spin wheel view sessions
    const spinViews = trackingData.filter(r => {
      const t = (r.type || '').toLowerCase();
      return t === 'spin_wheel_view' || t === 'wheel_view';
    });
    const spinViewSessions = new Set(spinViews.filter(r => r.sessionId).map(r => r.sessionId));
    const spinViewOnly = new Set(
      spinViews.filter(r => r.sessionId && !isRowConverted(r)).map(r => r.sessionId)
    );

    // Combined view-only set
    const allViewOnly = new Set([...scratchViewOnly, ...spinViewOnly]);

    const m = {
      register: { total: 0, scratch: 0, wheel: 0, external: 0, internal: 0 },
      login: { total: 0, scratch: 0, wheel: 0, external: 0, internal: 0 },
      cart: { total: 0, external: 0, internal: 0 },
      popupViews: {
        total: scratchViews.length + spinViews.length,
        scratchTotal: scratchViews.length,
        scratchSessions: scratchViewSessions.size,
        spinTotal: spinViews.length,
        spinSessions: spinViewSessions.size,
        external: 0,
        internal: 0
      },
      viewOnly: {
        total: allViewOnly.size,
        scratch: scratchViewOnly.size,
        spin: spinViewOnly.size,
        totalSessions: scratchViewSessions.size + spinViewSessions.size,
        convertedSessions: (scratchViewSessions.size - scratchViewOnly.size) + (spinViewSessions.size - spinViewOnly.size)
      }
    };

    trackingData.forEach(item => {
      const isInternal = inHouseIPs.includes(item.ip);
      const type = (item.type || '').toUpperCase();

      if (type === 'REGISTER') {
        m.register.total++;
        if (item.rewardSource === 'scratch_card') m.register.scratch++;
        else m.register.wheel++;

        if (isInternal) m.register.internal++;
        else m.register.external++;
      } else if (type === 'LOGIN') {
        m.login.total++;
        if (item.rewardSource === 'scratch_card') m.login.scratch++;
        else m.login.wheel++;

        if (isInternal) m.login.internal++;
        else m.login.external++;
      } else if (type === 'ADD_TO_CART') {
        m.cart.total++;
        if (isInternal) m.cart.internal++;
        else m.cart.external++;
      } else if (type === 'SCRATCH_CARD_VIEW' || type === 'SPIN_WHEEL_VIEW' || type === 'WHEEL_VIEW') {
        if (isInternal) m.popupViews.internal++;
        else m.popupViews.external++;
      }
    });

    return { 
      metrics: m, 
      viewOnlySessionIds: allViewOnly, 
      convertedSessionIds: convertedSessionIdsSet 
    };
  }, [trackingData]);

  const columns = [
    {
      header: 'User / Identity',
      accessorKey: 'email',
      cell: ({ row }) => {
        const item = row.original;
        const name = (item.firstName || item.lastName) ? `${item.firstName || ''} ${item.lastName || ''}`.trim() : null;

        if (item.type === 'scratch_card_view' || item.type === 'spin_wheel_view') {
          const isViewOnly = viewOnlySessionIds.has(item.sessionId);
          const popupType = item.type === 'scratch_card_view' ? 'Scratch Card' : 'Spin the Wheel';
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink text-xs">
                  {isViewOnly ? `Visitor (${popupType})` : `Converted (${popupType})`}
                </span>
                <Badge className={`text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0 ${
                  isViewOnly ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isViewOnly ? 'View Only' : 'Converted'}
                </Badge>
              </div>
              <div className="text-[10px] text-ink-muted font-mono tracking-tight truncate max-w-[200px]">
                Session: {item.sessionId || 'Unknown'}
              </div>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="font-bold text-ink text-sm tracking-tight capitalize">
                {name || 'Guest / Session'}
              </div>
              {item.stitched && (
                <Badge className="bg-field text-ink-soft border-hairline text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0">
                  Linked
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-ink-soft font-medium">
              {item.email !== 'unknown' && item.email !== 'active_session' ? item.email : (item.sessionId || 'No ID')}
            </div>
            <div className="text-[10px] text-ink-muted font-bold tracking-wider">
              {item.phone !== 'unknown' ? item.phone : ''}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Activity & Source',
      accessorKey: 'type',
      cell: ({ row }) => {
        const item = row.original;
        const type = (item.type || '').toUpperCase();
        let color = 'bg-field text-ink-soft';
        let Icon = LogIn;

        if (type === 'LOGIN') {
          color = 'bg-emerald-50 text-emerald-800 border-emerald-200';
          Icon = LogIn;
        } else if (type === 'REGISTER') {
          color = 'bg-blue-50 text-blue-800 border-blue-200';
          Icon = UserPlus;
        } else if (type === 'LOGOUT') {
          color = 'bg-rose-50 text-rose-700 border-rose-200';
          Icon = LogOut;
        } else if (type === 'ADD_TO_CART') {
          color = 'bg-amber-50 text-amber-800 border-amber-200';
          Icon = ShoppingCart;
        } else if (type === 'SCRATCH_CARD_VIEW') {
          color = 'bg-purple-50 text-purple-800 border-purple-200';
          Icon = Sparkles;
        } else if (type === 'SPIN_WHEEL_VIEW') {
          color = 'bg-indigo-50 text-indigo-800 border-indigo-200';
          Icon = Disc;
        }

        const isScratch = item.rewardSource === 'scratch_card';
        const isView = type === 'SCRATCH_CARD_VIEW' || type === 'SPIN_WHEEL_VIEW';
        const isViewOnly = isView && viewOnlySessionIds.has(item.sessionId);

        return (
          <div className="flex flex-col gap-1.5 items-start">
            <Badge className={`${color} flex items-center gap-1.5 px-2.5 py-0.5 border font-bold text-[10px] uppercase tracking-widest w-fit`}>
              <Icon size={12} />
              {type === 'SCRATCH_CARD_VIEW' ? 'Scratch View' : type === 'SPIN_WHEEL_VIEW' ? 'Wheel View' : type.replace(/_/g, ' ')}
            </Badge>

            {/* Source Bifurcation Badge for Register / Login */}
            {(type === 'REGISTER' || type === 'LOGIN') && (
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-[6px] border ${
                isScratch 
                  ? 'bg-amber-50 text-amber-800 border-amber-200' 
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {isScratch ? '🎟️ Scratch Card' : '🎡 Spin the Wheel'}
              </span>
            )}

            {/* View Only Badge for impressions */}
            {isView && (
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-[6px] border ${
                isViewOnly 
                  ? 'bg-slate-100 text-slate-700 border-slate-200' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {isViewOnly ? '👁️ View Only' : '🎯 Converted'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Reward / Details',
      accessorKey: 'product',
      cell: ({ row }) => {
        const item = row.original;
        
        if (item.reward) {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                <Award size={13} className="text-amber-500" />
                {item.reward}
              </span>
              <span className="text-[10px] text-ink-muted">Won via {item.rewardSource === 'scratch_card' ? 'Scratch Card' : 'Wheel'}</span>
            </div>
          );
        }

        if (item.type === 'scratch_card_view' || item.type === 'spin_wheel_view') {
          const duration = item.metadata?.durationSeconds ? `${item.metadata.durationSeconds}s` : null;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-ink">
                {item.type === 'scratch_card_view' ? 'Scratch Card' : 'Spin Wheel'} Popup
              </span>
              {duration && <span className="text-[10px] text-ink-muted">On screen: {duration}</span>}
            </div>
          );
        }

        if (!item.product && !item.variantId) return <span className="text-ink-muted">—</span>;
        
        return (
          <div className="flex flex-col gap-0.5 max-w-[200px]">
            <span className="text-xs font-bold text-ink line-clamp-1" title={item.product}>
              {item.product || 'Unknown Product'}
            </span>
            {item.variantId && (
              <span className="text-[9px] text-ink-muted font-mono tracking-tighter truncate">
                ID: {item.variantId.split('/').pop()}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Location / Page',
      accessorKey: 'sourcePage',
      cell: ({ row }) => {
        const page = row.original.sourcePage || 'unknown';
        const cleanPage = page.replace(/^https?:\/\/[^\/]+/, '') || '/';

        const pageType = getPageType(cleanPage);

        return (
          <div className="flex flex-col gap-1 max-w-[250px]">
            <div className="flex items-center gap-1.5 text-xs text-ink font-bold">
              <Globe size={12} className="text-brand" />
              <span>{pageType}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-ink-soft font-medium">
              <span className="truncate" title={page}>{cleanPage}</span>
            </div>
            <span className="text-[9px] text-ink-muted font-mono tracking-tighter">IP: {row.original.ip || '0.0.0.0'}</span>
          </div>
        );
      },
    },
    {
      header: 'Time / Duration',
      accessorKey: 'timestamp',
      cell: ({ row }) => {
        const duration = formatDuration(row.original.duration);
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-xs text-ink font-bold">
              <Clock size={12} className="text-ink-muted" />
              {row.original.timestamp ? format(new Date(row.original.timestamp), 'HH:mm:ss') : 'N/A'}
            </div>
            {duration && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase tracking-tighter bg-emerald-50 w-fit px-1.5 rounded-[8px] mt-0.5">
                <Timer size={10} />
                Stayed: {duration}
              </div>
            )}
            {!duration && (
              <div className="text-[10px] text-ink-muted font-medium">
                {row.original.timestamp ? format(new Date(row.original.timestamp), 'MMM dd, yyyy') : 'N/A'}
              </div>
            )}
          </div>
        );
      }
    }
  ];

  // Table data filter based on Activity dropdown selection
  const tableData = trackingData.filter(item => {
    // Activity type filter
    if (activityType === 'VIEW_ONLY') {
      const isView = item.type === 'scratch_card_view' || item.type === 'spin_wheel_view';
      if (!isView || !viewOnlySessionIds.has(item.sessionId)) return false;
    } else if (activityType === 'POPUP_VIEWS') {
      if (item.type !== 'scratch_card_view' && item.type !== 'spin_wheel_view') return false;
    } else if (activityType === 'SCRATCH_CARD_VIEW') {
      if (item.type !== 'scratch_card_view') return false;
    } else if (activityType === 'SPIN_WHEEL_VIEW') {
      if (item.type !== 'spin_wheel_view') return false;
    } else if (activityType === 'ACTIONS_ONLY') {
      if (item.type === 'scratch_card_view' || item.type === 'spin_wheel_view') return false;
    } else if (activityType !== 'ALL') {
      if (item.type !== activityType) return false;
    }

    // Location / Page filter
    if (locationFilter === 'ALL') return true;
    const cleanPage = (item.sourcePage || 'unknown').replace(/^https?:\/\/[^\/]+/, '') || '/';
    return getPageType(cleanPage) === locationFilter;
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col items-start gap-5">
        <div className="min-w-0">
          <h1 className="admin-title flex items-center gap-3">
            <Users className="text-brand" size={32} />
            User Activity Tracking
          </h1>
          <p className="admin-subtitle">Detailed log of user logins, registrations, cart activities, and popup engagement.</p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-4">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 bg-panel p-1 rounded-[8px] border border-hairline-soft shadow-sm">
            <button
              onClick={() => setPresetDate('today')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[6px] transition-colors ${
                startDate === format(new Date(), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd')
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-soft hover:bg-field'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPresetDate('yesterday')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[6px] transition-colors ${
                startDate === format(subDays(new Date(), 1), 'yyyy-MM-dd') && endDate === format(subDays(new Date(), 1), 'yyyy-MM-dd')
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-soft hover:bg-field'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setPresetDate('last7')}
              className={`px-3 py-1.5 text-xs font-bold rounded-[6px] transition-colors ${
                startDate === format(subDays(new Date(), 6), 'yyyy-MM-dd') && endDate === format(new Date(), 'yyyy-MM-dd')
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-ink-soft hover:bg-field'
              }`}
            >
              Last 7 Days
            </button>
          </div>

          {/* Activity Type Filter */}
          <div className="flex items-center gap-2 bg-panel px-4 py-2 rounded-[8px] border border-hairline-soft shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Activity Type</span>
              <select 
                value={activityType} 
                onChange={(e) => setActivityType(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">All Events (Actions + Views)</option>
                <option value="ACTIONS_ONLY">User Actions Only (No Views)</option>
                <option value="REGISTER">Registrations</option>
                <option value="LOGIN">Logins</option>
                <option value="ADD_TO_CART">Add to Cart</option>
                <option value="POPUP_VIEWS">All Popup Views (Wheel + Scratch)</option>
                <option value="SCRATCH_CARD_VIEW">Scratch Card Views</option>
                <option value="SPIN_WHEEL_VIEW">Spin the Wheel Views</option>
                <option value="VIEW_ONLY">View Only (Unconverted Sessions)</option>
                <option value="LOGOUT">Logouts</option>
              </select>
            </div>
          </div>

          {/* Location / Page Filter */}
          <div className="flex items-center gap-2 bg-panel px-4 py-2 rounded-[8px] border border-hairline-soft shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Location / Page</span>
              <select 
                value={locationFilter} 
                onChange={(e) => setLocationFilter(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer max-w-[120px]"
              >
                <option value="ALL">All Pages</option>
                <option value="Homepage">Homepage</option>
                <option value="Collection Page">Collection Page</option>
                <option value="Product Page">Product Page</option>
                <option value="Cart Page">Cart Page</option>
                <option value="Login Page">Login Page</option>
                <option value="Register Page">Register Page</option>
                <option value="Information Page">Information Page</option>
                <option value="Search Page">Search Page</option>
                <option value="Checkout Page">Checkout Page</option>
                <option value="Other Page">Other Page</option>
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-panel px-4 py-2 rounded-[8px] border border-hairline-soft shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Start Date</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer"
              />
            </div>
            <div className="h-8 w-px bg-field mx-2" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">End Date</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Data Source Selector */}
          <div className="bg-field text-ink-soft px-3 py-1.5 rounded-[8px] border border-hairline flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-1.5">
              <Server size={11} className="text-ink-muted" />
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Data Source ({dataSource})</span>
            </div>
            <select
              value={dataSourceMode}
              onChange={(e) => setDataSourceMode(e.target.value)}
              className="text-xs font-bold bg-transparent outline-none cursor-pointer text-ink"
            >
              <option value="AUTO">Auto Detect</option>
              <option value="LOCAL">Local (8080)</option>
              <option value="UAT">UAT (Remote)</option>
            </select>
          </div>

          {/* Live Indicator */}
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-[8px] border border-emerald-100 flex items-center gap-3 h-fit shadow-sm border-emerald-200/50">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest">Live Monitoring Active</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Key Metric Cards with Bifurcation for Spin the Wheel & Scratch Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* 1. POPUP VIEWS CARD (WITH BIFURCATION FOR WHEEL & SCRATCH) */}
            <div className="bg-purple-50/60 border-purple-100 text-purple-950 p-5 rounded-[10px] border shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden transition-all hover:scale-[1.01] hover:shadow-md">
              <div className="flex justify-between items-start z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700">Popup Views</span>
                <Sparkles size={16} className="text-purple-500" />
              </div>
              <div className="flex flex-col z-10">
                <span className="text-3xl font-extrabold tracking-tight">
                  {metrics.popupViews.totalSessions}
                </span>
                <span className="text-[10px] text-purple-700/70 font-bold mt-0.5">
                  Unique Sessions ({metrics.popupViews.total} Total Views)
                </span>
              </div>
              {/* Bifurcation: Spin the Wheel vs Scratch Card Views */}
              <div className="flex flex-col gap-1.5 z-10 pt-2 border-t border-purple-200/60">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-indigo-700">
                    <Disc size={12} className="text-indigo-500" /> Spin the Wheel:
                  </span>
                  <span className="font-extrabold text-indigo-900 bg-indigo-100/60 px-1.5 py-0.2 rounded">
                    {metrics.popupViews.spinSessions} <span className="font-normal text-[10px] text-indigo-600/80">({metrics.popupViews.spinTotal} views)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-amber-800">
                    <Sparkles size={12} className="text-amber-500" /> Scratch Card:
                  </span>
                  <span className="font-extrabold text-amber-900 bg-amber-100/60 px-1.5 py-0.2 rounded">
                    {metrics.popupViews.scratchSessions} <span className="font-normal text-[10px] text-amber-700/80">({metrics.popupViews.scratchTotal} views)</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 z-10 text-[10px] text-purple-700/80 font-bold">
                <span>Ext: {metrics.popupViews.external}</span>
                <span className="h-3 w-px bg-purple-200" />
                <span>In-House: {metrics.popupViews.internal}</span>
              </div>
              <Sparkles size={90} className="absolute -bottom-6 -right-6 opacity-[0.04] text-purple-600 pointer-events-none" />
            </div>

            {/* 2. VIEW ONLY CARD (WITH BIFURCATION FOR WHEEL & SCRATCH) */}
            <div className="bg-slate-50 border-slate-200/80 text-slate-900 p-5 rounded-[10px] border shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden transition-all hover:scale-[1.01] hover:shadow-md">
              <div className="flex justify-between items-start z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600">View Only</span>
                <Eye size={16} className="text-slate-500" />
              </div>
              <div className="flex flex-col z-10">
                <span className="text-3xl font-extrabold tracking-tight text-slate-800">
                  {metrics.viewOnly.total}
                </span>
                <span className="text-[10px] text-slate-500 font-bold mt-0.5">
                  Saw popup & dropped off without signup
                </span>
              </div>
              {/* Bifurcation: Spin the Wheel vs Scratch Card View-Only */}
              <div className="flex flex-col gap-1.5 z-10 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-indigo-700">
                    <Disc size={12} className="text-indigo-500" /> Spin the Wheel:
                  </span>
                  <span className="font-extrabold text-indigo-900 bg-indigo-100/60 px-1.5 py-0.2 rounded">
                    {metrics.viewOnly.spin} <span className="font-normal text-[10px] text-slate-500">/ {metrics.popupViews.spinSessions}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-amber-800">
                    <Sparkles size={12} className="text-amber-500" /> Scratch Card:
                  </span>
                  <span className="font-extrabold text-amber-900 bg-amber-100/60 px-1.5 py-0.2 rounded">
                    {metrics.viewOnly.scratch} <span className="font-normal text-[10px] text-slate-500">/ {metrics.popupViews.scratchSessions}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between z-10 text-[10px] text-slate-600 font-bold">
                <span>Unique Sessions</span>
                <span className="text-emerald-700 font-extrabold">
                  {metrics.viewOnly.totalSessions > 0
                    ? `Conv: ${((metrics.viewOnly.convertedSessions / metrics.viewOnly.totalSessions) * 100).toFixed(1)}% (${metrics.viewOnly.convertedSessions} converted)`
                    : 'Conv: 0%'}
                </span>
              </div>
              <Eye size={90} className="absolute -bottom-6 -right-6 opacity-[0.04] text-slate-600 pointer-events-none" />
            </div>

            {/* 3. REGISTER CARD WITH BIFURCATION */}
            <div className="bg-blue-50/70 border-blue-100 text-blue-950 p-5 rounded-[10px] border shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden transition-all hover:scale-[1.01] hover:shadow-md">
              <div className="flex justify-between items-start z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700">Register</span>
                <UserPlus size={16} className="text-blue-500" />
              </div>
              <div className="flex flex-col z-10">
                <span className="text-3xl font-extrabold tracking-tight text-blue-900">{metrics.register.total}</span>
                <span className="text-[10px] text-blue-700/70 font-bold mt-0.5">Total User Registrations</span>
              </div>
              {/* Bifurcation: Spin the Wheel vs Scratch Card */}
              <div className="flex flex-col gap-1.5 z-10 pt-2 border-t border-blue-200/60">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-indigo-700">
                    <Disc size={12} className="text-indigo-500" /> Spin the Wheel:
                  </span>
                  <span className="font-extrabold text-indigo-900 bg-indigo-100/60 px-1.5 py-0.2 rounded">{metrics.register.wheel}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-amber-800">
                    <Sparkles size={12} className="text-amber-500" /> Scratch Card:
                  </span>
                  <span className="font-extrabold text-amber-900 bg-amber-100/60 px-1.5 py-0.2 rounded">{metrics.register.scratch}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 z-10 text-[10px] text-blue-700 font-bold">
                <span>Ext: {metrics.register.external}</span>
                <span className="h-3 w-px bg-blue-200" />
                <span>In-House: {metrics.register.internal}</span>
              </div>
              <UserPlus size={90} className="absolute -bottom-6 -right-6 opacity-[0.04] text-blue-600 pointer-events-none" />
            </div>

            {/* 4. LOGIN CARD WITH BIFURCATION */}
            <div className="bg-emerald-50/70 border-emerald-100 text-emerald-950 p-5 rounded-[10px] border shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden transition-all hover:scale-[1.01] hover:shadow-md">
              <div className="flex justify-between items-start z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">Login</span>
                <LogIn size={16} className="text-emerald-500" />
              </div>
              <div className="flex flex-col z-10">
                <span className="text-3xl font-extrabold tracking-tight text-emerald-900">{metrics.login.total}</span>
                <span className="text-[10px] text-emerald-700/70 font-bold mt-0.5">Total User Logins</span>
              </div>
              {/* Bifurcation: Spin the Wheel vs Scratch Card */}
              <div className="flex flex-col gap-1.5 z-10 pt-2 border-t border-emerald-200/60">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-indigo-700">
                    <Disc size={12} className="text-indigo-500" /> Spin the Wheel:
                  </span>
                  <span className="font-extrabold text-indigo-900 bg-indigo-100/60 px-1.5 py-0.2 rounded">{metrics.login.wheel}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-amber-800">
                    <Sparkles size={12} className="text-amber-500" /> Scratch Card:
                  </span>
                  <span className="font-extrabold text-amber-900 bg-amber-100/60 px-1.5 py-0.2 rounded">{metrics.login.scratch}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 z-10 text-[10px] text-emerald-700 font-bold">
                <span>Ext: {metrics.login.external}</span>
                <span className="h-3 w-px bg-emerald-200" />
                <span>In-House: {metrics.login.internal}</span>
              </div>
              <LogIn size={90} className="absolute -bottom-6 -right-6 opacity-[0.04] text-emerald-600 pointer-events-none" />
            </div>

            {/* 5. ADD TO CART CARD */}
            <div className="bg-amber-50/70 border-amber-100 text-amber-950 p-5 rounded-[10px] border shadow-sm flex flex-col justify-between gap-3 relative overflow-hidden transition-all hover:scale-[1.01] hover:shadow-md">
              <div className="flex justify-between items-start z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-700">Add to Cart</span>
                <ShoppingCart size={16} className="text-amber-500" />
              </div>
              <div className="flex flex-col z-10">
                <span className="text-3xl font-extrabold tracking-tight text-amber-900">{metrics.cart.total}</span>
                <span className="text-[10px] text-amber-700/70 font-bold mt-0.5">Total Cart Additions</span>
              </div>
              <div className="flex flex-col gap-1 z-10 pt-2 border-t border-amber-200/60">
                <span className="text-[11px] font-bold text-amber-800">Active Shopper Interest</span>
                <span className="text-[10px] text-amber-600/80 font-medium">High intent items queued</span>
              </div>
              <div className="flex items-center gap-3 z-10 text-[10px] text-amber-700 font-bold">
                <span>Ext: {metrics.cart.external}</span>
                <span className="h-3 w-px bg-amber-200" />
                <span>In-House: {metrics.cart.internal}</span>
              </div>
              <ShoppingCart size={90} className="absolute -bottom-6 -right-6 opacity-[0.04] text-amber-600 pointer-events-none" />
            </div>

          </div>

          {/* Activity Data Table */}
          <div>
            <DataTable 
              columns={activityType === 'ADD_TO_CART' ? columns.filter(col => col.header !== 'Location / Page') : columns} 
              data={tableData} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
