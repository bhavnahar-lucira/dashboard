'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, LogIn, LogOut, Clock, ExternalLink, Globe, ShoppingCart, Trash2, Timer } from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { Badge } from '../../../../components/ui/badge';
import { format, startOfDay, endOfDay } from 'date-fns';

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
  const [activityType, setActivityType] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    async function fetchTracking() {
      try {
        setLoading(true);
        const isLocal = window.location.hostname === 'localhost';
        const uatUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const localUrl = 'http://localhost:8080';
        
        let baseUrl = uatUrl;
        if (isLocal) {
          try {
            const healthCheck = await fetch(`${localUrl}/api/auth/admin-login`, { cache: 'no-store' }).catch(() => null);
            if (healthCheck) {
              baseUrl = localUrl;
              setDataSource('Local (8080)');
            } else {
              setDataSource('UAT (Fallback)');
            }
          } catch (e) {
            setDataSource('UAT (Fallback)');
          }
        } else {
          setDataSource('UAT');
        }
        
        const url = `${baseUrl}/api/admin/tracking?start_date=${startDate}&end_date=${endDate}&type=${activityType}&t=${Date.now()}`;
        console.log('Fetching tracking data from:', url);
        
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        console.log('Tracking data response:', data);
        if (data.success) {
          setTrackingData(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch tracking data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTracking();
  }, [startDate, endDate, activityType]);

  const formatDuration = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const columns = [
    {
      header: 'User / Identity',
      accessorKey: 'email',
      cell: ({ row }) => {
        const item = row.original;
        const name = (item.firstName || item.lastName) ? `${item.firstName || ''} ${item.lastName || ''}`.trim() : null;
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
      header: 'Activity',
      accessorKey: 'type',
      cell: ({ row }) => {
        const type = row.original.type;
        let color = 'bg-field text-ink-soft';
        let Icon = LogIn;

        if (type === 'LOGIN') {
          color = 'bg-ok-bg text-ok-fg border-transparent';
          Icon = LogIn;
        } else if (type === 'REGISTER') {
          color = 'bg-blue-50 text-blue-600 border-blue-100';
          Icon = UserPlus;
        } else if (type === 'LOGOUT') {
          color = 'bg-rose-50 text-rose-600 border-rose-100';
          Icon = LogOut;
        } else if (type === 'ADD_TO_CART') {
          color = 'bg-warn-bg text-warn-fg border-transparent';
          Icon = ShoppingCart;
        }

        return (
          <Badge className={`${color} flex items-center gap-1.5 px-2.5 py-1 border font-bold text-[10px] uppercase tracking-widest w-fit`}>
            <Icon size={12} />
            {type.replace(/_/g, ' ')}
          </Badge>
        );
      },
    },
    {
      header: 'Product / Details',
      accessorKey: 'product',
      cell: ({ row }) => {
        const item = row.original;
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

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col items-start gap-5">
        <div className="min-w-0">
          <h1 className="admin-title flex items-center gap-3">
            <Users className="text-brand" size={32} />
            User Activity Tracking
          </h1>
          <p className="admin-subtitle">Detailed log of user logins, registrations, and cart activities.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-panel px-4 py-2 rounded-[8px] border border-hairline-soft shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Activity Type</span>
              <select 
                value={activityType} 
                onChange={(e) => setActivityType(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none cursor-pointer"
              >
                <option value="ALL">All Activities</option>
                <option value="LOGIN">Logins</option>
                <option value="REGISTER">Registrations</option>
                <option value="ADD_TO_CART">Add to Cart</option>
                <option value="LOGOUT">Logouts</option>
              </select>
            </div>
          </div>

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

          <div className="flex items-center gap-2 bg-panel px-4 py-2 rounded-[8px] border border-hairline-soft shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Start Date</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold bg-transparent outline-none"
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
                className="text-xs font-bold bg-transparent outline-none"
              />
            </div>
          </div>
          <div className="bg-field text-ink-soft px-4 py-2 rounded-[8px] border border-hairline flex flex-col items-end">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Data Source</span>
              <span className="text-xs font-bold">{dataSource}</span>
          </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(
              trackingData.reduce((acc, item) => {
                const inHouseIPs = ['106.201.243.160', '106.201.243.156', '122.179.139.168', '122.179.140.17', '103.88.221.55', '45.250.47.102'];
                const isInternal = inHouseIPs.includes(item.ip);
                
                if (!acc[item.type]) acc[item.type] = { total: 0, internal: 0, external: 0 };
                acc[item.type].total++;
                if (isInternal) acc[item.type].internal++;
                else acc[item.type].external++;
                return acc;
              }, {})
            ).sort((a, b) => b[1].total - a[1].total).map(([key, data]) => {
              let value = data.total;
              let color = 'bg-panel-alt border-hairline-soft text-ink';
              let iconColor = 'text-ink-muted';
              let dividerColor = 'bg-zinc-200';
              let Icon = Globe;

              if (key === 'LOGIN') {
                color = 'bg-emerald-50 border-emerald-100 text-emerald-900';
                iconColor = 'text-emerald-500';
                dividerColor = 'bg-emerald-200';
                Icon = LogIn;
              } else if (key === 'REGISTER') {
                color = 'bg-blue-50 border-blue-100 text-blue-900';
                iconColor = 'text-blue-500';
                dividerColor = 'bg-blue-200';
                Icon = UserPlus;
              } else if (key === 'LOGOUT') {
                color = 'bg-rose-50 border-rose-100 text-rose-900';
                iconColor = 'text-rose-500';
                dividerColor = 'bg-rose-200';
                Icon = LogOut;
              } else if (key === 'ADD_TO_CART') {
                color = 'bg-amber-50 border-amber-100 text-amber-900';
                iconColor = 'text-amber-500';
                dividerColor = 'bg-amber-200';
                Icon = ShoppingCart;
              }

              return (
                <div key={key} className={`${color} p-5 rounded-[8px] border shadow-sm flex flex-col gap-2 relative overflow-hidden transition-transform hover:scale-[1.02]`}>
                  <div className="flex justify-between items-start z-10">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{key.replace(/_/g, ' ')}</span>
                    <Icon size={16} className={iconColor} />
                  </div>
                  <span className="text-3xl font-bold z-10">{value}</span>
                  <div className="flex items-center gap-3 z-10 mt-1">
                     <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest font-bold opacity-60">External</span>
                        <span className="text-xs font-bold">{data.external}</span>
                     </div>
                     <div className={`h-4 w-px ${dividerColor}`} />
                     <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest font-bold opacity-60">In-House</span>
                        <span className="text-xs font-bold">{data.internal}</span>
                     </div>
                  </div>
                  <Icon size={80} className={`absolute -bottom-4 -right-4 opacity-5 ${iconColor}`} />
                </div>
              );
            })}
          </div>

          <div>
              <DataTable 
                columns={activityType === 'ADD_TO_CART' ? columns.filter(col => col.header !== 'Location / Page') : columns} 
                data={trackingData.filter(item => {
                  if (locationFilter === 'ALL') return true;
                  const cleanPage = (item.sourcePage || 'unknown').replace(/^https?:\/\/[^\/]+/, '') || '/';
                  return getPageType(cleanPage) === locationFilter;
                })} 
              />
          </div>
        </div>
      )}
    </div>
  );
}
