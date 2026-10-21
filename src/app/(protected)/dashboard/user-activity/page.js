'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
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
  Disc,
  Layers,
  Tag,
  Truck,
  ShoppingBag,
  UserCheck,
  Calendar,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  MousePointerClick
} from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format, subDays } from 'date-fns';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export const getAuthSource = (item) => {
  const rs = (item.rewardSource || '').toLowerCase().trim();
  const page = (item.sourcePage || '').toLowerCase().trim();
  const tags = typeof item.tags === 'string' ? item.tags.toLowerCase() : '';

  // 1. Explicit sources passed from client or backend
  if (rs === 'scratch_card' || rs === 'scratch') return 'scratch_card';
  if (rs === 'spin_wheel' || rs === 'wheel') return 'spin_wheel';
  if (rs === 'unlock_coupon' || rs === 'coupon' || tags.includes('pdp-offers-lead')) return 'unlock_coupon';
  if (rs === 'atc_login' || rs === 'atc') return 'atc_login';
  if (rs === 'shipping_login' || rs === 'shipping' || rs === 'checkout') return 'shipping_login';
  if (rs === 'cart_login' || rs === 'cart') return 'cart_login';
  if (rs === 'direct_login' || rs === 'direct') return 'direct_login';

  // 2. Fallback resolution for records where rewardSource was missing:
  if (page.includes('/checkout')) return 'shipping_login';
  if (page.includes('/cart')) return 'cart_login';
  if (page.includes('/login') || page.includes('/register')) return 'direct_login';
  if (page.includes('/products/')) return 'unlock_coupon';

  return 'others';
};

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
  const [backendPopupStats, setBackendPopupStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityType, setActivityType] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Disclosure states for the cards: show first 4 items, then dropdown for the rest
  const [showMoreRegister, setShowMoreRegister] = useState(false);
  const [showMoreLogin, setShowMoreLogin] = useState(false);
  const [showMoreViewOnly, setShowMoreViewOnly] = useState(false);

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
    async function fetchTracking() {
      try {
        setLoading(true);

        // Always fetch the complete dataset (type=ALL) so summary cards never get zeroed out
        const url = `${BACKEND_URL}/api/admin/tracking?start_date=${startDate}&end_date=${endDate}&type=ALL&limit=10000&t=${Date.now()}`;
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
          if (data.popupStats) {
            setBackendPopupStats(data.popupStats);
          } else {
            setBackendPopupStats(null);
          }
        } else {
          setTrackingData([]);
          setBackendPopupStats(null);
        }
      } catch (err) {
        console.error('Failed to fetch tracking data:', err);
        setTrackingData([]);
        setBackendPopupStats(null);
      } finally {
        setLoading(false);
      }
    }
    fetchTracking();
  }, [startDate, endDate]);

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

    // 2. Scratch card view sessions (fallback if backendPopupStats not provided)
    const scratchViews = trackingData.filter(r => (r.type || '').toLowerCase() === 'scratch_card_view');
    const scratchViewSessions = new Set(scratchViews.filter(r => r.sessionId).map(r => r.sessionId));
    const scratchViewOnly = new Set(
      scratchViews.filter(r => r.sessionId && !isRowConverted(r)).map(r => r.sessionId)
    );

    // 3. Spin wheel view sessions (fallback if backendPopupStats not provided)
    const spinViews = trackingData.filter(r => {
      const t = (r.type || '').toLowerCase();
      return t === 'spin_wheel_view' || t === 'wheel_view';
    });
    const spinViewSessions = new Set(spinViews.filter(r => r.sessionId).map(r => r.sessionId));
    const spinViewOnly = new Set(
      spinViews.filter(r => r.sessionId && !isRowConverted(r)).map(r => r.sessionId)
    );

    // 4. ATC view sessions
    const atcViews = trackingData.filter(r => (r.type || '').toLowerCase() === 'atc_login_view');
    const atcViewSessions = new Set(atcViews.filter(r => r.sessionId).map(r => r.sessionId));
    const atcViewOnly = new Set(
      atcViews.filter(r => r.sessionId && !isRowConverted(r)).map(r => r.sessionId)
    );

    // 5. Unlock coupon view sessions
    const couponViews = trackingData.filter(r => (r.type || '').toLowerCase() === 'unlock_coupon_view');
    const couponViewSessions = new Set(couponViews.filter(r => r.sessionId).map(r => r.sessionId));
    const couponViewOnly = new Set(
      couponViews.filter(r => r.sessionId && !isRowConverted(r)).map(r => r.sessionId)
    );

    // 6. Other view sessions
    const otherViews = trackingData.filter(r => {
      const t = (r.type || '').toLowerCase();
      return t.endsWith('_view') && !['scratch_card_view', 'spin_wheel_view', 'wheel_view', 'atc_login_view', 'unlock_coupon_view', 'product_view', 'scheme_view'].includes(t);
    });
    const otherViewSessions = new Set(otherViews.filter(r => r.sessionId).map(r => r.sessionId));
    const otherViewOnly = new Set(
      otherViews.filter(r => r.sessionId && !isRowConverted(r)).map(r => r.sessionId)
    );

    // Combined view-only set
    const allViewOnly = new Set([...scratchViewOnly, ...spinViewOnly, ...atcViewOnly, ...couponViewOnly, ...otherViewOnly]);

    const m = {
      register: { 
        total: 0, 
        scratch: 0, 
        wheel: 0, 
        atc: 0, 
        coupon: 0, 
        shipping: 0, 
        cart: 0, 
        direct: 0, 
        others: 0, 
        external: 0, 
        internal: 0 
      },
      login: { 
        total: 0, 
        scratch: 0, 
        wheel: 0, 
        atc: 0, 
        coupon: 0, 
        shipping: 0, 
        cart: 0, 
        direct: 0, 
        others: 0, 
        external: 0, 
        internal: 0 
      },
      cart: { total: 0, pdp: 0, external: 0, internal: 0 },
      popupViews: backendPopupStats ? {
        total: backendPopupStats.total || 0,
        scratchTotal: backendPopupStats.scratchTotal || 0,
        scratchSessions: backendPopupStats.scratchSessions || 0,
        spinTotal: backendPopupStats.spinTotal || 0,
        spinSessions: backendPopupStats.spinSessions || 0,
        atcTotal: backendPopupStats.atcTotal || atcViews.length,
        atcSessions: backendPopupStats.atcSessions || atcViewSessions.size,
        couponTotal: backendPopupStats.couponTotal || couponViews.length,
        couponSessions: backendPopupStats.couponSessions || couponViewSessions.size,
        othersTotal: backendPopupStats.othersTotal || 0,
        othersSessions: backendPopupStats.othersSessions || 0,
        external: backendPopupStats.total || 0,
        internal: 0
      } : {
        total: scratchViews.length + spinViews.length + atcViews.length + couponViews.length + otherViews.length,
        scratchTotal: scratchViews.length,
        scratchSessions: scratchViewSessions.size,
        spinTotal: spinViews.length,
        spinSessions: spinViewSessions.size,
        atcTotal: atcViews.length,
        atcSessions: atcViewSessions.size,
        couponTotal: couponViews.length,
        couponSessions: couponViewSessions.size,
        othersTotal: otherViews.length,
        othersSessions: otherViewSessions.size,
        external: 0,
        internal: 0
      },
      viewOnly: backendPopupStats?.viewOnly ? {
        total: backendPopupStats.viewOnly.total || 0,
        scratch: backendPopupStats.viewOnly.scratch || 0,
        spin: backendPopupStats.viewOnly.spin || 0,
        atc: backendPopupStats.viewOnly.atc ?? atcViewOnly.size,
        coupon: backendPopupStats.viewOnly.coupon ?? couponViewOnly.size,
        others: backendPopupStats.viewOnly.atc !== undefined
          ? (backendPopupStats.viewOnly.others || 0)
          : Math.max(0, (backendPopupStats.viewOnly.others || 0) - (atcViewOnly.size + couponViewOnly.size)),
        totalSessions: backendPopupStats.viewOnly.totalSessions || 0,
        convertedSessions: backendPopupStats.viewOnly.convertedSessions || 0
      } : {
        total: allViewOnly.size,
        scratch: scratchViewOnly.size,
        spin: spinViewOnly.size,
        atc: atcViewOnly.size,
        coupon: couponViewOnly.size,
        others: otherViewOnly.size,
        totalSessions: scratchViewSessions.size + spinViewSessions.size + atcViewSessions.size + couponViewSessions.size + otherViewSessions.size,
        convertedSessions: (scratchViewSessions.size - scratchViewOnly.size) + (spinViewSessions.size - spinViewOnly.size) + (atcViewSessions.size - atcViewOnly.size) + (couponViewSessions.size - couponViewOnly.size) + (otherViewSessions.size - otherViewOnly.size)
      }
    };

    trackingData.forEach(item => {
      const isInternal = inHouseIPs.includes(item.ip);
      const type = (item.type || '').toUpperCase();
      const authSource = getAuthSource(item);

      if (type === 'REGISTER') {
        m.register.total++;
        if (authSource === 'scratch_card') m.register.scratch++;
        else if (authSource === 'spin_wheel') m.register.wheel++;
        else if (authSource === 'atc_login') m.register.atc++;
        else if (authSource === 'unlock_coupon') m.register.coupon++;
        else if (authSource === 'shipping_login') m.register.shipping++;
        else if (authSource === 'cart_login') m.register.cart++;
        else if (authSource === 'direct_login') m.register.direct++;
        else m.register.others++;

        if (isInternal) m.register.internal++;
        else m.register.external++;
      } else if (type === 'LOGIN') {
        m.login.total++;
        if (authSource === 'scratch_card') m.login.scratch++;
        else if (authSource === 'spin_wheel') m.login.wheel++;
        else if (authSource === 'atc_login') m.login.atc++;
        else if (authSource === 'unlock_coupon') m.login.coupon++;
        else if (authSource === 'shipping_login') m.login.shipping++;
        else if (authSource === 'cart_login') m.login.cart++;
        else if (authSource === 'direct_login') m.login.direct++;
        else m.login.others++;

        if (isInternal) m.login.internal++;
        else m.login.external++;
      } else if (type === 'ADD_TO_CART') {
        m.cart.total++;
        const sp = (item.sourcePage || '').toLowerCase();
        const hasProduct = Boolean(item.product && item.product !== 'unknown');
        if (sp.includes('/products/') || hasProduct) {
          m.cart.pdp = (m.cart.pdp || 0) + 1;
        }
        if (isInternal) m.cart.internal++;
        else m.cart.external++;
      } else if (!backendPopupStats && (type === 'SCRATCH_CARD_VIEW' || type === 'SPIN_WHEEL_VIEW' || type === 'WHEEL_VIEW')) {
        if (isInternal) m.popupViews.internal++;
        else m.popupViews.external++;
      }
    });

    // ATC Conversion Funnel calculation (User clicked ATC -> Prompted -> Authenticated -> Proceeded to Cart)
    const atcConverted = (m.register.atc || 0) + (m.login.atc || 0);
    const atcDropOffCount = m.viewOnly.atc || 0;
    const atcTotalSessions = atcConverted + atcDropOffCount;
    const atcConvRate = atcTotalSessions > 0 ? ((atcConverted / atcTotalSessions) * 100).toFixed(1) : '0.0';

    // Rates for Cards 1, 2, 3 based on total prompted sessions
    const totalPromptedSessions = m.viewOnly.totalSessions || 0;
    m.viewOnly.rate = totalPromptedSessions > 0 
      ? (((m.viewOnly.convertedSessions || 0) / totalPromptedSessions) * 100).toFixed(1) 
      : '0.0';
    m.register.rate = totalPromptedSessions > 0 
      ? (((m.register.total || 0) / totalPromptedSessions) * 100).toFixed(1) 
      : '0.0';
    m.login.rate = totalPromptedSessions > 0 
      ? (((m.login.total || 0) / totalPromptedSessions) * 100).toFixed(1) 
      : '0.0';

    let atcExternal = 0;
    let atcInternal = 0;
    trackingData.forEach(item => {
      const t = (item.type || '').toUpperCase();
      if ((t === 'REGISTER' || t === 'LOGIN') && getAuthSource(item) === 'atc_login') {
        if (inHouseIPs.includes(item.ip)) atcInternal++;
        else atcExternal++;
      }
    });

    m.atcConversion = {
      converted: atcConverted,
      viewOnly: atcDropOffCount,
      totalSessions: atcTotalSessions,
      rate: atcConvRate,
      external: atcExternal,
      internal: atcInternal
    };

    return { 
      metrics: m, 
      viewOnlySessionIds: allViewOnly, 
      convertedSessionIds: convertedSessionIdsSet 
    };
  }, [trackingData, backendPopupStats]);

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
                <span className="font-semibold text-ink text-xs">
                  {isViewOnly ? `Visitor (${popupType})` : `Converted (${popupType})`}
                </span>
                <Badge className={`text-[9px] font-semibold uppercase tracking-tighter px-1.5 py-0 ${
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
              <div className="font-semibold text-ink text-sm tracking-tight capitalize">
                {name || 'Guest / Session'}
              </div>
              {item.stitched && (
                <Badge className="bg-field text-ink-soft border-hairline text-[9px] font-semibold uppercase tracking-tighter px-1.5 py-0">
                  Linked
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-ink-soft font-medium">
              {item.email !== 'unknown' && item.email !== 'active_session' ? item.email : (item.sessionId || 'No ID')}
            </div>
            <div className="text-[10px] text-ink-muted font-semibold tracking-wider">
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
          color = 'bg-[#e4f8ec] text-[#007a5a] border-[#aee9d1]';
          Icon = LogIn;
        } else if (type === 'REGISTER') {
          color = 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]';
          Icon = UserPlus;
        } else if (type === 'LOGOUT') {
          color = 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]';
          Icon = LogOut;
        } else if (type === 'ADD_TO_CART') {
          color = 'bg-[#fff8e5] text-[#8a6116] border-[#fde68a]';
          Icon = ShoppingCart;
        } else if (type === 'SCRATCH_CARD_VIEW') {
          color = 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]';
          Icon = Sparkles;
        } else if (type === 'SPIN_WHEEL_VIEW') {
          color = 'bg-[#e0e7ff] text-[#3730a3] border-[#c7d2fe]';
          Icon = Disc;
        }

        const isScratch = item.rewardSource === 'scratch_card';
        const isView = type === 'SCRATCH_CARD_VIEW' || type === 'SPIN_WHEEL_VIEW';
        const isViewOnly = isView && viewOnlySessionIds.has(item.sessionId);

        return (
          <div className="flex flex-col gap-1.5 items-start">
            <Badge className={`${color} flex items-center gap-1.5 px-2.5 py-0.5 border font-semibold text-[10px] tracking-wide rounded-md w-fit`}>
              <Icon size={12} />
              {type === 'SCRATCH_CARD_VIEW' ? 'Scratch View' : type === 'SPIN_WHEEL_VIEW' ? 'Wheel View' : type.replace(/_/g, ' ')}
            </Badge>

            {/* Source Tag Badge for Register / Login (Shopify Tags style) */}
            {(type === 'REGISTER' || type === 'LOGIN') && (() => {
              const src = getAuthSource(item);
              if (src === 'scratch_card') {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border bg-[#f1f2f4] text-[#303030] border-[#e1e3e5]">
                    🎟️ Scratch Card
                  </span>
                );
              }
              if (src === 'spin_wheel') {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border bg-[#f1f2f4] text-[#303030] border-[#e1e3e5]">
                    🎡 Spin the Wheel
                  </span>
                );
              }
              if (src === 'unlock_coupon') {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border bg-[#f1f2f4] text-[#303030] border-[#e1e3e5]">
                    🔓 Unlock Coupon
                  </span>
                );
              }
              if (src === 'atc_login') {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border bg-[#f1f2f4] text-[#303030] border-[#e1e3e5]">
                    🛒 ATC Login
                  </span>
                );
              }
              if (src === 'shipping_login') {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border bg-[#f1f2f4] text-[#303030] border-[#e1e3e5]">
                    📦 Shipping Login
                  </span>
                );
              }
              if (src === 'cart_login') {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border bg-[#f1f2f4] text-[#303030] border-[#e1e3e5]">
                    🛍️ Cart Login
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border bg-[#f1f2f4] text-[#303030] border-[#e1e3e5]">
                  ✨ Others
                </span>
              );
            })()}

            {/* View Only Badge for impressions */}
            {isView && (
              <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-[6px] border ${
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
          const isScratch = item.rewardSource === 'scratch_card';
          return (
            <div className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                <Award size={13} className="text-amber-500" />
                {item.reward}
              </span>
              <span className="text-[10px] text-ink-muted">Won via {isScratch ? 'Scratch Card' : 'Wheel'}</span>
            </div>
          );
        }

        if (item.type === 'scratch_card_view' || item.type === 'spin_wheel_view') {
          const duration = item.metadata?.durationSeconds ? `${item.metadata.durationSeconds}s` : null;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-ink">
                {item.type === 'scratch_card_view' ? 'Scratch Card' : 'Spin Wheel'} Popup
              </span>
              {duration && <span className="text-[10px] text-ink-muted">On screen: {duration}</span>}
            </div>
          );
        }

        if (!item.product && !item.variantId) return <span className="text-ink-muted">—</span>;
        
        return (
          <div className="flex flex-col gap-0.5 max-w-[200px]">
            <span className="text-xs font-semibold text-ink line-clamp-1" title={item.product}>
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
            <div className="flex items-center gap-1.5 text-xs text-ink font-semibold">
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
            <div className="flex items-center gap-2 text-xs text-ink font-semibold">
              <Clock size={12} className="text-ink-muted" />
              {row.original.timestamp ? format(new Date(row.original.timestamp), 'HH:mm:ss') : 'N/A'}
            </div>
            {duration && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold uppercase tracking-tighter bg-emerald-50 w-fit px-1.5 rounded-[8px] mt-0.5">
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
    // Exclude popup and view beacons completely from the table (only actual user activities belong here)
    const typeLower = (item.type || '').toLowerCase();
    if (typeLower.endsWith('_view') || typeLower.includes('view') || typeLower === 'try_at_home_click') {
      return false;
    }

    // Activity type filter
    if (activityType !== 'ALL') {
      if (activityType === 'ATC_AUTH') {
        const t = (item.type || '').toUpperCase();
        if (!((t === 'REGISTER' || t === 'LOGIN') && getAuthSource(item) === 'atc_login')) {
          return false;
        }
      } else if (item.type !== activityType) {
        return false;
      }
    }

    // Location / Page filter
    if (locationFilter === 'ALL') return true;
    const cleanPage = (item.sourcePage || 'unknown').replace(/^https?:\/\/[^\/]+/, '') || '/';
    return getPageType(cleanPage) === locationFilter;
  });

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

  return (
    <div className="font-figtree min-h-screen p-6 sm:p-8 space-y-6 bg-[#f6f6f7]">
      {/* Top Header Bar - Shopify Polaris Style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#e1e3e5] flex items-center justify-center text-[#202223] shadow-xs">
            <Users size={20} className="text-[#303030]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#202223] tracking-tight">User Activity Tracking</h1>
              <span className="bg-[#f1f2f4] text-[#303030] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[#e1e3e5]">
                Live Feed
              </span>
            </div>
            <p className="text-xs text-[#6d7175] mt-0.5">
              Detailed log of user logins, registrations, cart activities, and popup engagement.
            </p>
          </div>
        </div>

        {/* Top Right Action & Status Badges */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {/* Live Monitoring Badge */}
          <div className="bg-[#e4f8ec] text-[#007a5a] border border-[#aee9d1] px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#108043] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#108043]"></span>
            </span>
            <span>Live Monitoring Active</span>
          </div>
        </div>
      </div>

      {/* Filter & Toolbar - Shopify Polaris Unified Bar */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Presets - Polaris Segmented Button Group */}
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
          </div>

          {/* ONE Unified Date Field with Interactive Visual Calendar */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setOpenDatePicker(!openDatePicker)}
              className="flex items-center gap-2 bg-white border border-[#d1d5db] hover:border-[#202223] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#202223] shadow-2xs transition-colors"
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

                {/* Interactive Clickable Calendar Day Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isStart = dateStr === startDate;
                    const isEnd = dateStr === endDate;
                    const isInRange = dateStr > startDate && dateStr < endDate;
                    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

                    let btnClass = "h-7 w-7 text-xs font-semibold rounded-md transition-all flex items-center justify-center mx-auto cursor-pointer ";
                    if (isStart || isEnd) {
                      btnClass += "bg-[#202223] text-white shadow-xs ";
                    } else if (isInRange) {
                      btnClass += "bg-[#f1f2f4] text-[#202223] ";
                    } else if (!isCurrentMonth) {
                      btnClass += "text-[#c2c5c8] hover:bg-[#f1f2f4] hover:text-[#202223] ";
                    } else {
                      btnClass += "text-[#303030] hover:bg-[#f1f2f4] ";
                    }

                    if (isToday && !isStart && !isEnd) {
                      btnClass += "ring-1 ring-[#202223] ";
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDayClick(date)}
                        className={btnClass}
                        title={dateStr}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>

                {/* Popover Footer with Range & Apply Range */}
                <div className="mt-3 pt-2.5 border-t border-[#f1f2f4] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setOpenDatePicker(false); setSelectingEnd(false); }}
                    className="px-2.5 py-1 text-xs font-semibold text-[#5c5f62] hover:text-[#202223] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOpenDatePicker(false); setSelectingEnd(false); }}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-[#202223] text-white rounded-lg hover:bg-[#303030] shadow-xs transition-colors cursor-pointer"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Activity Type Dropdown */}
          <div className="relative">
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="appearance-none bg-white border border-[#d1d5db] text-[#202223] text-xs font-medium pl-3 pr-8 py-1.5 rounded-lg shadow-2xs hover:bg-[#f9fafb] cursor-pointer outline-none focus:border-[#202223]"
            >
              <option value="ALL">All Activities</option>
              <option value="ATC_AUTH">ATC Cart Auth</option>
              <option value="REGISTER">Registrations</option>
              <option value="LOGIN">Logins</option>
              <option value="ADD_TO_CART">PDP ATC Clicks</option>
              <option value="LOGOUT">Logouts</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6d7175] pointer-events-none" />
          </div>

          {/* Location / Page Dropdown */}
          <div className="relative">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="appearance-none bg-white border border-[#d1d5db] text-[#202223] text-xs font-medium pl-3 pr-8 py-1.5 rounded-lg shadow-2xs hover:bg-[#f9fafb] cursor-pointer outline-none focus:border-[#202223] max-w-[140px]"
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
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6d7175] pointer-events-none" />
          </div>
        </div>

        <div className="text-xs text-[#6d7175] font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#108043]"></span>
          <span>Updated live</span>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#202223]"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Key Metric Cards - Shopify Polaris Style (White surface, crisp border, elegant dropdown) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. VIEW ONLY CARD */}
            <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">View Only</span>
                <span className="w-7 h-7 rounded-lg bg-[#f1f2f4] flex items-center justify-center text-[#5c5f62]">
                  <Eye size={14} />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold tracking-tight text-[#202223]">
                  {metrics.viewOnly.total.toLocaleString()}
                </span>
                <span className="text-xs text-[#6d7175] font-normal mt-0.5">
                  Saw popup & dropped off without signup
                </span>
              </div>

              {/* Show till Unlock Coupon, then dropdown */}
              <div className="flex flex-col gap-2 pt-3 border-t border-[#f1f2f4]">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <Disc size={13} className="text-indigo-600" /> Spin the Wheel
                  </span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.viewOnly.spin.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <Sparkles size={13} className="text-amber-600" /> Scratch Card
                  </span>
                  <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.viewOnly.scratch.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <ShoppingCart size={13} className="text-teal-600" /> ATC Modal
                  </span>
                  <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.viewOnly.atc.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <Tag size={13} className="text-rose-600" /> Unlock Coupon
                  </span>
                  <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.viewOnly.coupon.toLocaleString()}
                  </span>
                </div>

                {/* Dropdown for remaining sources */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowMoreViewOnly(!showMoreViewOnly)}
                    className="w-full flex items-center justify-between pt-1.5 border-t border-dashed border-[#e1e3e5] text-[11px] font-semibold text-[#5c5f62] hover:text-[#202223] transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <ChevronDown size={12} className={`transition-transform duration-200 ${showMoreViewOnly ? 'rotate-180' : ''}`} />
                      {showMoreViewOnly ? 'Hide other' : 'More sources (1)'}
                    </span>
                    <span className="text-[10px] text-[#8c9196]">{metrics.viewOnly.others}</span>
                  </button>
                  {showMoreViewOnly && (
                    <div className="mt-2 space-y-2 pt-1 border-t border-[#f1f2f4]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                          <Layers size={13} className="text-[#5c5f62]" /> Others
                        </span>
                        <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                          {metrics.viewOnly.others}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sleek Polaris Conversion Rate Progress Box */}
                <div className="pt-2.5 border-t border-[#f1f2f4] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-[#5c5f62]">Popup Conversion Rate</span>
                    <span className="font-bold text-[#007a5a] text-xs">
                      {metrics.viewOnly.rate || '0.0'}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f1f2f4] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(3, parseFloat(metrics.viewOnly.rate || 0)))}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#6d7175] pt-0.5">
                    <span>{(metrics.viewOnly.totalSessions || 0).toLocaleString()} prompted sessions</span>
                    <span className="font-semibold text-emerald-700">
                      {(metrics.viewOnly.convertedSessions || 0).toLocaleString()} converted
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#6d7175] font-medium pt-3 border-t border-[#f1f2f4]">
                <span>Ext: <strong className="text-[#202223] font-semibold">{metrics.viewOnly.total || 0}</strong></span>
                <span className="h-3 w-px bg-[#e1e3e5]" />
                <span>In-House: <strong className="text-[#202223] font-semibold">0</strong></span>
              </div>
            </div>

            {/* 2. REGISTER CARD */}
            <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Register</span>
                <span className="w-7 h-7 rounded-lg bg-[#f1f2f4] flex items-center justify-center text-[#5c5f62]">
                  <UserPlus size={14} />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold tracking-tight text-[#202223]">
                  {metrics.register.total.toLocaleString()}
                </span>
                <span className="text-xs text-[#6d7175] font-normal mt-0.5">
                  Total User Registrations
                </span>
              </div>

              {/* Show till Unlock Coupon, then dropdown */}
              <div className="flex flex-col gap-2 pt-3 border-t border-[#f1f2f4]">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <Disc size={13} className="text-indigo-600" /> Spin the Wheel
                  </span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.register.wheel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <Sparkles size={13} className="text-amber-600" /> Scratch Card
                  </span>
                  <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.register.scratch}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <ShoppingCart size={13} className="text-teal-600" /> ATC Login
                  </span>
                  <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.register.atc}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <Tag size={13} className="text-rose-600" /> Unlock Coupon
                  </span>
                  <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.register.coupon}
                  </span>
                </div>

                {/* Dropdown for remaining sources */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowMoreRegister(!showMoreRegister)}
                    className="w-full flex items-center justify-between pt-1.5 border-t border-dashed border-[#e1e3e5] text-[11px] font-semibold text-[#5c5f62] hover:text-[#202223] transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <ChevronDown size={12} className={`transition-transform duration-200 ${showMoreRegister ? 'rotate-180' : ''}`} />
                      {showMoreRegister ? 'Hide more sources' : 'Other sources (4)'}
                    </span>
                    <span className="text-[10px] text-[#8c9196]">
                      {metrics.register.shipping + metrics.register.cart + metrics.register.direct + metrics.register.others}
                    </span>
                  </button>
                  {showMoreRegister && (
                    <div className="mt-2 space-y-2 pt-1 border-t border-[#f1f2f4]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                          <Truck size={13} className="text-sky-600" /> Shipping Login
                        </span>
                        <span className="font-bold text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                          {metrics.register.shipping}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                          <ShoppingBag size={13} className="text-blue-600" /> Cart Login
                        </span>
                        <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                          {metrics.register.cart}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                          <UserCheck size={13} className="text-cyan-600" /> Direct Signup
                        </span>
                        <span className="font-bold text-cyan-700 bg-cyan-50 border border-cyan-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                          {metrics.register.direct}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                          <Layers size={13} className="text-[#5c5f62]" /> Others
                        </span>
                        <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                          {metrics.register.others}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sleek Polaris Conversion Rate Progress Box */}
                <div className="pt-2.5 border-t border-[#f1f2f4] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-[#5c5f62]">Signup Conversion Rate</span>
                    <span className="font-bold text-blue-700 text-xs">
                      {metrics.register.rate || '0.0'}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f1f2f4] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(3, parseFloat(metrics.register.rate || 0)))}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#6d7175] pt-0.5">
                    <span>{(metrics.viewOnly.totalSessions || 0).toLocaleString()} prompted shoppers</span>
                    <span className="font-semibold text-blue-700">
                      {(metrics.register.total || 0).toLocaleString()} signups
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#6d7175] font-medium pt-3 border-t border-[#f1f2f4]">
                <span>Ext: <strong className="text-[#202223] font-semibold">{metrics.register.external}</strong></span>
                <span className="h-3 w-px bg-[#e1e3e5]" />
                <span>In-House: <strong className="text-[#202223] font-semibold">{metrics.register.internal}</strong></span>
              </div>
            </div>

            {/* 3. LOGIN CARD */}
            <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Login</span>
                <span className="w-7 h-7 rounded-lg bg-[#f1f2f4] flex items-center justify-center text-[#5c5f62]">
                  <LogIn size={14} />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold tracking-tight text-[#202223]">
                  {metrics.login.total.toLocaleString()}
                </span>
                <span className="text-xs text-[#6d7175] font-normal mt-0.5">
                  Total User Logins
                </span>
              </div>

              {/* Show till Unlock Coupon, then dropdown */}
              <div className="flex flex-col gap-2 pt-3 border-t border-[#f1f2f4]">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <Disc size={13} className="text-indigo-600" /> Spin the Wheel
                  </span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.login.wheel}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <Sparkles size={13} className="text-amber-600" /> Scratch Card
                  </span>
                  <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.login.scratch}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <ShoppingCart size={13} className="text-teal-600" /> ATC Login
                  </span>
                  <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.login.atc}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <Tag size={13} className="text-rose-600" /> Unlock Coupon
                  </span>
                  <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.login.coupon}
                  </span>
                </div>

                {/* Dropdown for remaining sources */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowMoreLogin(!showMoreLogin)}
                    className="w-full flex items-center justify-between pt-1.5 border-t border-dashed border-[#e1e3e5] text-[11px] font-semibold text-[#5c5f62] hover:text-[#202223] transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      <ChevronDown size={12} className={`transition-transform duration-200 ${showMoreLogin ? 'rotate-180' : ''}`} />
                      {showMoreLogin ? 'Hide more sources' : 'Other sources (4)'}
                    </span>
                    <span className="text-[10px] text-[#8c9196]">
                      {metrics.login.shipping + metrics.login.cart + metrics.login.direct + metrics.login.others}
                    </span>
                  </button>
                  {showMoreLogin && (
                    <div className="mt-2 space-y-2 pt-1 border-t border-[#f1f2f4]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                          <Truck size={13} className="text-sky-600" /> Shipping Login
                        </span>
                        <span className="font-bold text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                          {metrics.login.shipping}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                          <ShoppingBag size={13} className="text-blue-600" /> Cart Login
                        </span>
                        <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                          {metrics.login.cart}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                          <UserCheck size={13} className="text-cyan-600" /> Direct Login
                        </span>
                        <span className="font-bold text-cyan-700 bg-cyan-50 border border-cyan-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                          {metrics.login.direct}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                          <Layers size={13} className="text-[#5c5f62]" /> Others
                        </span>
                        <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                          {metrics.login.others}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sleek Polaris Conversion Rate Progress Box */}
                <div className="pt-2.5 border-t border-[#f1f2f4] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-[#5c5f62]">Login Conversion Rate</span>
                    <span className="font-bold text-[#007a5a] text-xs">
                      {metrics.login.rate || '0.0'}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f1f2f4] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(3, parseFloat(metrics.login.rate || 0)))}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#6d7175] pt-0.5">
                    <span>{(metrics.viewOnly.totalSessions || 0).toLocaleString()} prompted shoppers</span>
                    <span className="font-semibold text-emerald-700">
                      {(metrics.login.total || 0).toLocaleString()} logins
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#6d7175] font-medium pt-3 border-t border-[#f1f2f4]">
                <span>Ext: <strong className="text-[#202223] font-semibold">{metrics.login.external}</strong></span>
                <span className="h-3 w-px bg-[#e1e3e5]" />
                <span>In-House: <strong className="text-[#202223] font-semibold">{metrics.login.internal}</strong></span>
              </div>
            </div>

            {/* 4. ATC CART CONVERSION CARD */}
            <div className="bg-white border border-[#e1e3e5] text-[#202223] p-5 rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between gap-3">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">ATC Cart Conversion</span>
                <span className="w-7 h-7 rounded-lg bg-[#e4f8ec] text-[#007a5a] flex items-center justify-center">
                  <ShoppingCart size={14} />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold tracking-tight text-[#202223]" style={{ fontWeight: 700 }}>
                  {(metrics.atcConversion?.converted || 0).toLocaleString()}
                </span>
                <span className="text-xs text-[#6d7175] font-normal mt-0.5">
                  Shoppers Authenticated & Queued to Cart
                </span>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-[#f1f2f4]">
                {/* Breakdown rows matching Card 1, 2, 3 Shopify Polaris standards */}
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <UserPlus size={13} className="text-blue-600" /> New Signups (ATC)
                  </span>
                  <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.register.atc.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <LogIn size={13} className="text-emerald-600" /> Returning Logins (ATC)
                  </span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.login.atc.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <Eye size={13} className="text-slate-500" /> Dismissed (Drop-offs)
                  </span>
                  <span className="font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {(metrics.atcConversion?.viewOnly || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#303030] font-medium">
                    <ShoppingCart size={13} className="text-teal-600" /> Items Added to Cart
                  </span>
                  <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-[4px] min-w-[28px] text-center text-[11px]">
                    {metrics.cart.total.toLocaleString()}
                  </span>
                </div>

                {/* Sleek Polaris Conversion Rate Progress Box */}
                <div className="pt-2.5 border-t border-[#f1f2f4] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-[#5c5f62]">ATC Conversion Rate</span>
                    <span className="font-bold text-[#007a5a] text-xs">
                      {metrics.atcConversion?.rate || '0.0'}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f1f2f4] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.max(3, parseFloat(metrics.atcConversion?.rate || 0)))}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#6d7175] pt-0.5">
                    <span>{(metrics.atcConversion?.totalSessions || 0).toLocaleString()} prompted shoppers</span>
                    <Link 
                      href="/dashboard/carts"
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                    >
                      <span>View Carts</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#6d7175] font-medium pt-3 border-t border-[#f1f2f4]">
                <span>Ext: <strong className="text-[#202223] font-semibold">{metrics.atcConversion?.external || 0}</strong></span>
                <span className="h-3 w-px bg-[#e1e3e5]" />
                <span>In-House: <strong className="text-[#202223] font-semibold">{metrics.atcConversion?.internal || 0}</strong></span>
              </div>
            </div>

          </div>

          {/* Activity Data Table - Polaris Card Wrap */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] overflow-hidden">
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
