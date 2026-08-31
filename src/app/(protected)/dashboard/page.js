'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
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
import PageHeader, { StatusPill } from "@/components/common/PageHeader";

const DASHBOARD_ITEMS = [
  {
    title: "Update Rate",
    description: "Manage daily rates for gold, silver, and platinum pages.",
    href: "/dashboard/update-rate",
    icon: TrendingUp,
    color: "bg-warn-bg text-warn-fg border-transparent"
  },
  {
    title: "User Activity",
    description: "Track successful logins, registrations, and active session completions.",
    href: "/dashboard/user-activity",
    icon: Users,
    color: "bg-ok-bg text-ok-fg border-transparent",
    isTracking: true
  },
  {
    title: "Orders",
    description: "View and track confirmed payments and orders placed through the website.",
    href: "/dashboard/payments",
    icon: CreditCard,
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "Abandoned Carts",
    description: "Real-time view of customer shopping carts across the store.",
    href: "/dashboard/carts",
    icon: ShoppingCart,
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "User Wishlists",
    description: "Monitor customer wishlists and saved items.",
    href: "/dashboard/wishlists",
    icon: Heart,
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "Topbar Offers",
    description: "Update announcements and promotional messages in the header.",
    href: "/dashboard/topbar-offers",
    icon: Bell,
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "Pincode Management",
    description: "Manage serviceable pincodes, delivery times, and locations.",
    href: "/dashboard/pincodes",
    icon: MapPin,
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "Store Management",
    description: "Update physical store locations, contact details, and images.",
    href: "/dashboard/stores",
    icon: Store,
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "Curated Looks",
    description: "Manage shop-the-look sets and matching product collections.",
    href: "/dashboard/curated-looks",
    icon: Camera,
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "Styled Videos",
    description: "Update the shoppable video gallery and product tagging.",
    href: "/dashboard/styled-videos",
    icon: Video,
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "Styled Video (Collection)",
    description: "Manage styled video galleries for specific collections.",
    href: "/dashboard/styled-videos-collection",
    icon: Layers,
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "Clear Cache",
    description: "Clear Vercel cache for any page to instantly apply updates.",
    href: "/dashboard/revalidate",
    icon: RefreshCw,
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "Hero Banners",
    description: "Manage homepage hero slider images, videos, and links.",
    href: "/dashboard/hero-banners",
    icon: Camera, // Reusing Camera since it's already imported
    color: "bg-brand-tint text-brand border-transparent"
  },
  {
    title: "Scheme Offer",
    description: "Manage promotional gifts, thresholds, and visibility for savings schemes.",
    href: "/dashboard/scheme-offer",
    icon: Gift,
    color: "bg-brand-tint text-brand border-transparent"
  }
];

export default function Dashboard() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    setRole(localStorage.getItem('lucira_admin_role') || 'admin');
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
      <PageHeader
        icon={LayoutDashboard}
        title="Lucira Unified Backend"
        subtitle="Manage all custom services and promotional content from this unified interface."
        actions={<StatusPill tone="success" pulse>Connected to MongoDB Atlas</StatusPill>}
      />

      <h2 className="admin-section-label mb-3.5 px-1">All modules</h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            prefetch={false}
            className="admin-panel group block p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lifted"
          >
            <div className="mb-5 flex items-start justify-between">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${item.color}`}>
                <item.icon size={22} strokeWidth={1.9} />
              </div>
              <ExternalLink
                size={15}
                className="mt-1 text-ink-muted transition-colors group-hover:text-[#5A413F]"
              />
            </div>
            <h3 className="flex items-center gap-2 text-[15.5px] font-bold tracking-[-0.01em] text-ink">
              {item.title}
              {item.isTracking && (
                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
              )}
            </h3>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-ink-soft">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
