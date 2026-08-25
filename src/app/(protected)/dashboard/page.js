'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import { format } from 'date-fns';
import {
  LayoutDashboard,
  MapPin,
  Store,
  Video,
  Camera,
  Coins,
  Bell,
  ExternalLink,
  Users,
  LogIn,
  UserPlus,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Heart,
  Layers,
  Gift
} from "lucide-react";

const DASHBOARD_ITEMS = [
  {
    title: "Update Rate",
    description: "Manage daily rates for gold, silver, and platinum pages.",
    href: "/dashboard/update-rate",
    icon: TrendingUp,
    color: "bg-yellow-50 text-yellow-600 border-yellow-100"
  },
  {
    title: "User Activity",
    description: "Track successful logins, registrations, and active session completions.",
    href: "/dashboard/user-activity",
    icon: Users,
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    isTracking: true
  },
  {
    title: "Orders",
    description: "View and track confirmed payments and orders placed through the website.",
    href: "/dashboard/payments",
    icon: CreditCard,
    color: "bg-emerald-50 text-emerald-600 border-emerald-100"
  },
  {
    title: "Abandoned Carts",
    description: "Real-time view of customer shopping carts across the store.",
    href: "/dashboard/carts",
    icon: ShoppingCart,
    color: "bg-zinc-50 text-zinc-600 border-zinc-100"
  },
  {
    title: "User Wishlists",
    description: "Monitor customer wishlists and saved items.",
    href: "/dashboard/wishlists",
    icon: Heart,
    color: "bg-rose-50 text-rose-600 border-rose-100"
  },
  {
    title: "Topbar Offers",
    description: "Update announcements and promotional messages in the header.",
    href: "/dashboard/topbar-offers",
    icon: Bell,
    color: "bg-blue-50 text-blue-600 border-blue-100"
  },
  {
    title: "Pincode Management",
    description: "Manage serviceable pincodes, delivery times, and locations.",
    href: "/dashboard/pincodes",
    icon: MapPin,
    color: "bg-emerald-50 text-emerald-600 border-emerald-100"
  },
  {
    title: "Store Management",
    description: "Update physical store locations, contact details, and images.",
    href: "/dashboard/stores",
    icon: Store,
    color: "bg-purple-50 text-purple-600 border-purple-100"
  },
  {
    title: "Curated Looks",
    description: "Manage shop-the-look sets and matching product collections.",
    href: "/dashboard/curated-looks",
    icon: Camera,
    color: "bg-rose-50 text-rose-600 border-rose-100"
  },
  {
    title: "Styled Videos",
    description: "Update the shoppable video gallery and product tagging.",
    href: "/dashboard/styled-videos",
    icon: Video,
    color: "bg-indigo-50 text-indigo-600 border-indigo-100"
  },
  {
    title: "Styled Video (Collection)",
    description: "Manage styled video galleries for specific collections.",
    href: "/dashboard/styled-videos-collection",
    icon: Layers,
    color: "bg-zinc-50 text-zinc-600 border-zinc-100"
  },
  {
    title: "Clear Cache",
    description: "Clear Vercel cache for any page to instantly apply updates.",
    href: "/dashboard/revalidate",
    icon: RefreshCw,
    color: "bg-teal-50 text-teal-600 border-teal-100"
  },
  {
    title: "Hero Banners",
    description: "Manage homepage hero slider images, videos, and links.",
    href: "/dashboard/hero-banners",
    icon: Camera, // Reusing Camera since it's already imported
    color: "bg-orange-50 text-orange-600 border-orange-100"
  },
  {
    title: "Scheme Offer",
    description: "Manage promotional gifts, thresholds, and visibility for savings schemes.",
    href: "/dashboard/scheme-offer",
    icon: Gift,
    color: "bg-rose-50 text-rose-600 border-rose-100"
  }
];

export default function Dashboard() {
  const [role, setRole] = useState(null);
  const [counts, setCounts] = useState({
    carts: { today: 0, total: 0 },
    orders: { today: 0, total: 0 },
    wishlists: { today: 0, total: 0 },
    activity: { today: 0, total: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRole(localStorage.getItem('lucira_admin_role') || 'admin');

    async function fetchSummaryCounts() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Fetch Today's Data
        const [cartsTodayRes, ordersTodayRes, wishlistsTodayRes, activityTodayRes] = await Promise.all([
          fetch(`${baseUrl}/api/admin/carts?start_date=${today}&end_date=${today}&limit=1&t=${Date.now()}`),
          fetch(`${baseUrl}/api/admin/orders?start_date=${today}&end_date=${today}&limit=1&t=${Date.now()}`),
          fetch(`${baseUrl}/api/admin/wishlists?start_date=${today}&end_date=${today}&t=${Date.now()}`),
          fetch(`${baseUrl}/api/admin/tracking?start_date=${today}&end_date=${today}&t=${Date.now()}`)
        ]);

        // Fetch Total Data (No date filter)
        const [cartsTotalRes, ordersTotalRes, wishlistsTotalRes, activityTotalRes] = await Promise.all([
          fetch(`${baseUrl}/api/admin/carts?limit=1&t=${Date.now()}`),
          fetch(`${baseUrl}/api/admin/orders?limit=1&t=${Date.now()}`),
          fetch(`${baseUrl}/api/admin/wishlists?t=${Date.now()}`),
          fetch(`${baseUrl}/api/admin/tracking?t=${Date.now()}`)
        ]);

        const [
          cartsToday, ordersToday, wishlistsToday, activityToday,
          cartsTotal, ordersTotal, wishlistsTotal, activityTotal
        ] = await Promise.all([
          cartsTodayRes.json(), ordersTodayRes.json(), wishlistsTodayRes.json(), activityTodayRes.json(),
          cartsTotalRes.json(), ordersTotalRes.json(), wishlistsTotalRes.json(), activityTotalRes.json()
        ]);

        setCounts({
          carts: {
            today: cartsToday.success ? (cartsToday.total !== undefined ? cartsToday.total : cartsToday.data.length) : 0,
            total: cartsTotal.success ? (cartsTotal.total !== undefined ? cartsTotal.total : cartsTotal.data.length) : 0
          },
          orders: {
            today: ordersToday.success ? (ordersToday.totalCount !== undefined ? ordersToday.totalCount : ordersToday.data.length) : 0,
            total: ordersTotal.success ? (ordersTotal.totalCount !== undefined ? ordersTotal.totalCount : ordersTotal.data.length) : 0
          },
          wishlists: {
            today: wishlistsToday.success ? wishlistsToday.data.length : 0,
            total: wishlistsTotal.success ? wishlistsTotal.data.length : 0
          },
          activity: {
            today: activityToday.success ? activityToday.data.length : 0,
            total: activityTotal.success ? activityTotal.data.length : 0
          }
        });
      } catch (err) {
        console.error('Failed to fetch summary counts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSummaryCounts();
    const interval = setInterval(fetchSummaryCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredItems = DASHBOARD_ITEMS.filter(item => {
    if (!role) return false;
    if (role === 'admin') return true;
    if (role === 'marketing') {
      return ['/dashboard/revalidate', '/dashboard/update-rate', '/dashboard/curated-looks', '/dashboard/styled-videos', '/dashboard/styled-videos-collection'].includes(item.href);
    }
    if (role === 'cro') {
      return ['/dashboard/payments', '/dashboard/carts', '/dashboard/wishlists', '/dashboard/user-activity'].includes(item.href);
    }
    return false;
  });

  return (
    <div className="container-main py-10 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-gray-900 flex items-center gap-3 text-[24px] font-bold font-figtree tracking-[0.1px]">
            <LayoutDashboard className="text-primary" />
            Lucira Unified Backend
          </h1>
          <p className="text-gray-500 mt-2" style={{ marginTop: '2px', fontSize: '16px', color: '#000' }}>Manage all custom services and promotional content from this unified interface.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Connected to MongoDB Atlas
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            prefetch={false}
            className={`group block bg-white border border-gray-100 rounded-[8px] p-6 transition-all hover:shadow-md hover:border-primary/20 ${item.isTracking ? 'ring-2 ring-emerald-500/5 ring-offset-2' : ''}`}
          >
            <div className={`w-12 h-12 rounded-[8px] border ${item.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
              <item.icon size={24} />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                {item.title}
                {item.isTracking && <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full animate-pulse"></span>}
              </h3>
              <ExternalLink size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
