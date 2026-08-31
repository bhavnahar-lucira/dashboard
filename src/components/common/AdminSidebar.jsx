'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Store,
  Video,
  Camera,
  Coins,
  Bell,
  LogOut,
  ChevronRight,
  ShoppingCart,
  Heart,
  CreditCard,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  Users,
  Gem,
  Gift
} from 'lucide-react';
import { cn } from '../../lib/utils';

const MENU_ITEMS = [
  { title: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
  { title: 'Orders', icon: CreditCard, href: '/dashboard/payments' },
  { title: 'Abandoned Carts', icon: ShoppingCart, href: '/dashboard/carts' },
  { title: 'User Wishlists', icon: Heart, href: '/dashboard/wishlists' },
  { title: 'Product Discounts', icon: CreditCard, href: '/dashboard/product-discounts' },
  { title: 'Free Gift Tiers', icon: Gift, href: '/dashboard/free-gift-tiers' },
  { title: 'Topbar Offers', icon: Bell, href: '/dashboard/topbar-offers' },
  { title: 'Pincodes', icon: MapPin, href: '/dashboard/pincodes' },
  { title: 'Stores', icon: Store, href: '/dashboard/stores' },
  { title: 'Curated Looks', icon: Camera, href: '/dashboard/curated-looks' },
  { title: 'Styled Videos', icon: Video, href: '/dashboard/styled-videos' },
  { title: 'Hero Banners', icon: ImageIcon, href: '/dashboard/hero-banners' },
  { title: 'Clear Cache', icon: RefreshCw, href: '/dashboard/revalidate' },
  { title: 'Styled Video (Collection)', icon: Layers, href: '/dashboard/styled-videos-collection' },
  { title: 'From Same Collection', icon: Gem, href: '/dashboard/from-same-collection' },
  { title: 'Daily Rates', icon: Coins, href: '/dashboard/update-rate' },
  { title: 'User Activity', icon: Users, href: '/dashboard/user-activity' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    setRole(localStorage.getItem('lucira_admin_role') || 'admin');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('lucira_admin_auth');
    localStorage.removeItem('lucira_admin_role');
    router.push('/');
  };

  return (
    <aside className='w-72 h-screen bg-white border-r border-zinc-100 flex flex-col fixed left-0 top-0 z-50'>
      {/* Branding */}
      <div className='p-8' style={{ background: '#fafafa' }}>
        <Link href='/dashboard' prefetch={false} className='flex items-center gap-3 font-bold text-xl tracking-tighter text-zinc-900' style={{ fontWeight: 700, color: '#5a413f', letterSpacing: '0.2px' }}>
          <div className='bg-[#5A413F] p-2 rounded-xl text-white shadow-lg shadow-[#5A413F]/20' style={{ fontWeight: 600 }}>
            <LayoutDashboard size={20} />
          </div>
          Lucira CMS
        </Link>
      </div>

      {/* Navigation */}
      <nav className='flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-none py-2'>
        {MENU_ITEMS.filter(item => {
          if (!role) return false;
          if (role === 'admin') return true;
          if (role === 'marketing') {
            return ['/dashboard', '/dashboard/revalidate', '/dashboard/update-rate', '/dashboard/curated-looks', '/dashboard/styled-videos', '/dashboard/styled-videos-collection', '/dashboard/from-same-collection'].includes(item.href);
          }
          if (role === 'cro') {
            return ['/dashboard', '/dashboard/payments', '/dashboard/carts', '/dashboard/wishlists', '/dashboard/user-activity'].includes(item.href);
          }
          return false;
        }).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.title}
              href={item.href}
              prefetch={false}
              className={cn(
                'flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group',
                isActive
                  ? 'bg-zinc-50 text-zinc-900 shadow-sm border border-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50/50'
              )}
            >
              <div className='flex items-center gap-3'>
                <item.icon
                  size={20}
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-[#5A413F]' : 'group-hover:text-zinc-900'
                  )}
                />
                <span 
                  className='text-xs font-bold uppercase tracking-[0.15em]'
                  style={{ fontWeight: 700, fontFamily: "'Figtree', sans-serif", letterSpacing: '0.8px' }}
                >
                  {item.title}
                </span>
              </div>
              {isActive && <ChevronRight size={14} className='text-[#5A413F]' />}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className='p-4 border-t border-zinc-50'>
        <button
          onClick={handleLogout}
          className='w-full flex items-center gap-3 px-4 py-4 text-rose-400 hover:text-rose-500 hover:bg-rose-50/50 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest'
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
