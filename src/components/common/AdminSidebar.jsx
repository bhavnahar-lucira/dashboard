'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ChevronDown,
  ChevronsLeft,
  ShoppingCart,
  Heart,
  Receipt,
  Percent,
  RefreshCw,
  Image as ImageIcon,
  LayoutTemplate,
  Layers,
  Users,
  Ticket,
  Gift,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdminTheme } from './AdminThemeProvider';

/* ------------------------------------------------------------------ *
 * Navigation model
 * ------------------------------------------------------------------ */

const NAV_SECTIONS = [
  {
    items: [{ title: 'Overview', icon: LayoutDashboard, href: '/dashboard' }],
  },
  {
    items: [
      { title: 'Orders', icon: Receipt, href: '/dashboard/payments' },
      { title: 'Abandoned Carts', icon: ShoppingCart, href: '/dashboard/carts' },
      { title: 'User Wishlists', icon: Heart, href: '/dashboard/wishlists' },
    ],
  },
  {
    items: [
      {
        title: 'Product Discounts',
        icon: Percent,
        children: [
          { title: 'Coupons', icon: Ticket, href: '/dashboard/product-discounts' },
          { title: 'Free Gift Tiers', icon: Gift, href: '/dashboard/free-gift-tiers' },
        ],
      },
      { title: 'Topbar Offers', icon: Bell, href: '/dashboard/topbar-offers' },
    ],
  },
  {
    items: [
      { title: 'Curated Looks', icon: Camera, href: '/dashboard/curated-looks' },
      { title: 'Styled Videos', icon: Video, href: '/dashboard/styled-videos' },
      { title: 'Video Collections', icon: Layers, href: '/dashboard/styled-videos-collection' },
      { title: 'Hero Banners', icon: ImageIcon, href: '/dashboard/hero-banners' },
      { title: 'PLP Banners', icon: LayoutTemplate, href: '/dashboard/plp-banners' },
    ],
  },
  {
    items: [
      { title: 'Pincodes', icon: MapPin, href: '/dashboard/pincodes' },
      { title: 'Stores', icon: Store, href: '/dashboard/stores' },
      { title: 'Daily Rates', icon: Coins, href: '/dashboard/update-rate' },
    ],
  },
  {
    items: [
      { title: 'User Activity', icon: Users, href: '/dashboard/user-activity' },
      { title: 'Clear Cache', icon: RefreshCw, href: '/dashboard/revalidate' },
    ],
  },
];

const ROLE_HREFS = {
  marketing: [
    '/dashboard',
    '/dashboard/revalidate',
    '/dashboard/update-rate',
    '/dashboard/curated-looks',
    '/dashboard/styled-videos',
    '/dashboard/styled-videos-collection',
  ],
  cro: [
    '/dashboard',
    '/dashboard/payments',
    '/dashboard/carts',
    '/dashboard/wishlists',
    '/dashboard/user-activity',
  ],
};

const ROLE_LABELS = {
  admin: 'Administrator',
  marketing: 'Marketing',
  cro: 'Growth / CRO',
};

/* ------------------------------------------------------------------ *
 * Theme tokens — the sidebar carries its own light/dark palette so the
 * dark variant never depends on the rest of the CMS being dark-ready.
 * ------------------------------------------------------------------ */

const THEME = {
  light: {
    shell: 'bg-white border-zinc-200/80',
    brandMark: 'text-[#5A413F]',
    brandWordmark: 'text-[#3A2A29]',
    brandSuffix: 'text-zinc-400',
    sectionLabel: 'text-zinc-400',
    sectionRule: 'bg-zinc-200/70',
    itemIdle: 'text-zinc-500 hover:text-[#3A2A29] hover:bg-[#5A413F]/[0.05]',
    itemActive: 'bg-[#5A413F]/[0.08] text-[#5A413F]',
    itemActiveIcon: 'text-[#5A413F]',
    parentOpen: 'text-[#3A2A29] bg-[#5A413F]/[0.05]',
    childRail: 'bg-zinc-200/80',
    childIdle: 'text-zinc-400 hover:text-[#3A2A29] hover:bg-[#5A413F]/[0.05]',
    childActive: 'bg-[#5A413F]/[0.08] text-[#5A413F]',
    footerRule: 'border-zinc-200/80',
    avatar: 'bg-[#5A413F] text-white',
    userName: 'text-[#3A2A29]',
    userMeta: 'text-zinc-400',
    ghostBtn: 'text-zinc-400 hover:text-[#3A2A29] hover:bg-zinc-100',
    dangerBtn: 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50',
    toggleBtn: 'bg-white border-zinc-200 text-zinc-400 hover:text-[#5A413F] hover:border-[#5A413F]/40',
    scrollbar: '[&::-webkit-scrollbar-thumb]:bg-zinc-200 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-300',
  },
  dark: {
    shell: 'bg-[#14172A] border-white/[0.06]',
    brandMark: 'text-[#E7C6B4]',
    brandWordmark: 'text-white',
    brandSuffix: 'text-white/35',
    sectionLabel: 'text-white/30',
    sectionRule: 'bg-white/10',
    itemIdle: 'text-white/50 hover:text-white hover:bg-white/[0.06]',
    itemActive: 'bg-white/[0.09] text-white',
    itemActiveIcon: 'text-white',
    parentOpen: 'text-white bg-white/[0.05]',
    childRail: 'bg-white/10',
    childIdle: 'text-white/40 hover:text-white hover:bg-white/[0.05]',
    childActive: 'bg-white/[0.07] text-[#E7C6B4]',
    footerRule: 'border-white/[0.07]',
    avatar: 'bg-white/[0.1] text-white',
    userName: 'text-white',
    userMeta: 'text-white/35',
    ghostBtn: 'text-white/40 hover:text-white hover:bg-white/[0.07]',
    dangerBtn: 'text-white/40 hover:text-rose-300 hover:bg-rose-500/10',
    toggleBtn: 'bg-[#1D2138] border-white/10 text-white/45 hover:text-white hover:border-white/25',
    scrollbar: '[&::-webkit-scrollbar-thumb]:bg-white/10 hover:[&::-webkit-scrollbar-thumb]:bg-white/20',
  },
};

const WIDTH_EXPANDED = '17.5rem';
const WIDTH_COLLAPSED = '5.25rem';

const STORAGE_COLLAPSED = 'lucira_admin_sidebar_collapsed';

const ROW_BASE =
  'relative flex items-center rounded-full transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#B77767]/60';
const LABEL_BASE = 'truncate text-[13px] font-semibold tracking-[0.01em]';

/* ------------------------------------------------------------------ */

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { isDark, toggleTheme } = useAdminTheme();
  const [role, setRole] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  const t = isDark ? THEME.dark : THEME.light;

  /* Restore persisted preferences */
  useEffect(() => {
    setRole(localStorage.getItem('lucira_admin_role') || 'admin');
    setCollapsed(localStorage.getItem(STORAGE_COLLAPSED) === '1');
  }, []);

  /* Publish the current width so the page content can track it */
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--admin-sidebar-w',
      collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED
    );
  }, [collapsed]);

  /* Auto-expand whichever group owns the current route */
  useEffect(() => {
    const active = {};
    NAV_SECTIONS.forEach((section) =>
      section.items.forEach((item) => {
        if (item.children?.some((child) => child.href === pathname)) active[item.title] = true;
      })
    );
    setOpenGroups((prev) => ({ ...prev, ...active }));
  }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_COLLAPSED, prev ? '0' : '1');
      return !prev;
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('lucira_admin_auth');
    localStorage.removeItem('lucira_admin_role');
    router.push('/');
  };

  const isAllowed = (href) => {
    if (!role) return false;
    if (role === 'admin') return true;
    return (ROLE_HREFS[role] || []).includes(href);
  };

  /* Filter by role, keeping a parent only while it still has a visible child */
  const sections = NAV_SECTIONS.map((section) => {
    const items = section.items
      .map((item) => {
        if (!item.children) return isAllowed(item.href) ? item : null;
        const children = item.children.filter((child) => isAllowed(child.href));
        return children.length ? { ...item, children } : null;
      })
      .filter(Boolean);
    return items.length ? { ...section, items } : null;
  }).filter(Boolean);

  const roleLabel = ROLE_LABELS[role] || 'Team Member';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-screen flex-col border-r transition-[width] duration-300 ease-out',
        t.shell
      )}
      style={{ width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED }}
    >
      {/* Collapse handle */}
      <button
        type='button'
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'absolute -right-3.5 top-24 z-10 grid h-7 w-7 place-items-center rounded-full border transition-all duration-200',
          t.toggleBtn
        )}
      >
        <ChevronsLeft
          size={14}
          className={cn('transition-transform duration-300', collapsed && 'rotate-180')}
        />
      </button>

      {/* Brand */}
      <div className={cn('flex h-[104px] shrink-0 items-center', collapsed ? 'justify-center px-0' : 'px-7')}>
        <Link
          href='/dashboard'
          prefetch={false}
          className='flex items-center gap-4 overflow-hidden'
          title='Lucira Dashboard'
        >
          <LuciraMark className={cn('h-[35px] w-[28px] shrink-0', t.brandMark)} />
          {!collapsed && (
            <span className='flex flex-col leading-none'>
              <span
                className={cn('text-[19px] font-bold tracking-[-0.02em]', t.brandWordmark)}
                style={{ fontFamily: 'var(--font-figtree), sans-serif' }}
              >
                Lucira Crm
              </span>
              <span className={cn('mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]', t.brandSuffix)}>
                Dashboard
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden pb-4',
          collapsed ? 'px-3.5' : 'px-4',
          '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full',
          t.scrollbar
        )}
        style={{ scrollbarWidth: 'thin' }}
      >
        {sections.map((section, sectionIndex) => (
          <div key={section.label || `section-${sectionIndex}`} className={sectionIndex === 0 ? '' : 'mt-1'}>
            {section.label &&
              (collapsed ? (
                <div className={cn('mx-auto mb-3 h-px w-8 rounded-full', t.sectionRule)} />
              ) : (
                <p
                  className={cn(
                    'mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.16em]',
                    t.sectionLabel
                  )}
                >
                  {section.label}
                </p>
              ))}

            <div className='space-y-1'>
              {section.items.map((item) =>
                item.children ? (
                  <NavGroup
                    key={item.title}
                    item={item}
                    pathname={pathname}
                    collapsed={collapsed}
                    t={t}
                    isOpen={!collapsed && (openGroups[item.title] ?? false)}
                    onToggle={() => {
                      if (collapsed) {
                        setCollapsed(false);
                        localStorage.setItem(STORAGE_COLLAPSED, '0');
                        setOpenGroups((prev) => ({ ...prev, [item.title]: true }));
                        return;
                      }
                      setOpenGroups((prev) => ({ ...prev, [item.title]: !prev[item.title] }));
                    }}
                  />
                ) : (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={pathname === item.href}
                    collapsed={collapsed}
                    t={t}
                  />
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn('shrink-0 border-t px-4 py-4', t.footerRule)}>
        {collapsed ? (
          <div className='flex flex-col items-center gap-2'>
            <span
              className={cn('grid h-10 w-10 place-items-center rounded-2xl text-[13px] font-bold', t.avatar)}
              title={roleLabel}
            >
              {roleLabel.charAt(0)}
            </span>
            <IconButton onClick={toggleTheme} className={t.ghostBtn} title={isDark ? 'Light mode' : 'Dark mode'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </IconButton>
            <IconButton onClick={handleLogout} className={t.dangerBtn} title='Sign out'>
              <LogOut size={16} />
            </IconButton>
          </div>
        ) : (
          <div className='flex items-center gap-3'>
            <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-[13px] font-bold', t.avatar)}>
              {roleLabel.charAt(0)}
            </span>
            <span className='min-w-0 flex-1 leading-tight'>
              <span className={cn('block truncate text-[13px] font-bold', t.userName)}>{roleLabel}</span>
              <span className={cn('block truncate text-[11px] font-medium', t.userMeta)}>Signed in</span>
            </span>
            <IconButton onClick={toggleTheme} className={t.ghostBtn} title={isDark ? 'Light mode' : 'Dark mode'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </IconButton>
            <IconButton onClick={handleLogout} className={t.dangerBtn} title='Sign out'>
              <LogOut size={16} />
            </IconButton>
          </div>
        )}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

/**
 * Lucira brand mark, inlined from
 * cdn.shopify.com/.../dark_brown_Logo_icon_2.svg
 * The source hardcodes #5A413F; here it draws in currentColor so the mark
 * can follow the sidebar theme. The outline stroke is widened from 10.6 to
 * 22 user units: at a 44px render height the original scales to a
 * sub-pixel hairline and washes out to grey.
 */
function LuciraMark({ className }) {
  return (
    <svg viewBox='0 0 528 996' fill='none' className={className} aria-hidden='true'>
      <path
        fill='currentColor'
        d='M314.295 818.8C297.495 818.8 263.995 852.3 263.995 869.1C263.995 852.3 230.495 818.8 213.695 818.8C230.495 818.8 263.995 785.3 263.995 768.5C263.995 785.2 297.495 818.8 314.295 818.8Z'
      />
      <path
        fill='currentColor'
        d='M142.898 253.2C141.798 245.1 139.698 238.4 136.698 233.1C133.698 227.8 129.198 223.9 123.098 221.2C117.098 218.6 109.298 217.2 99.8984 217.2V211.5C118.398 212.3 133.598 212.9 145.698 213.5C157.798 214.1 169.298 214.3 180.198 214.3C191.098 214.3 202.798 214 215.298 213.5C227.698 212.9 243.398 212.3 262.198 211.5V217.2C252.798 217.2 245.098 218.4 239.298 220.9C233.398 223.4 228.898 226.9 225.698 231.6C222.498 236.3 220.198 242.3 218.898 249.7C217.598 257.1 216.898 265.8 216.898 276C216.898 411.2 216.798 546.4 216.798 681.5C242.598 682.9 264.298 681.5 280.598 679.6C315.698 675.6 332.098 668.6 339.498 665.1C358.698 655.9 371.098 645.2 382.798 633.7C395.998 620.7 409.598 604.6 423.498 585.3C423.898 585.3 424.398 585.5 425.198 585.9C425.898 586.3 426.398 586.6 426.598 586.7C426.798 586.9 427.298 587.2 427.998 587.5L408.798 691V692.7H107.298V687C115.598 687 122.198 685.7 127.098 683C131.998 680.4 135.798 676.7 138.398 672C140.998 667.3 142.698 661.6 143.498 655C144.198 648.4 144.598 641 144.598 632.7V281.8C144.598 277 144.498 271.9 144.198 266.5C143.898 261.8 143.498 257.4 142.898 253.2Z'
      />
      <path
        stroke='currentColor'
        strokeWidth='22'
        strokeMiterlimit='10'
        d='M262.9 5.30078H265.1C407.372 5.30078 522.699 120.628 522.699 262.9V732.304C522.797 874.57 407.375 989.899 265.1 989.899H262.9C120.628 989.899 5.30078 874.572 5.30078 732.3V262.9C5.30078 120.628 120.628 5.30078 262.9 5.30078Z'
      />
    </svg>
  );
}

function IconButton({ onClick, className, title, children }) {
  return (
    <button
      type='button'
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#B77767]/60',
        className
      )}
    >
      {children}
    </button>
  );
}

function NavLink({ item, isActive, collapsed, t }) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      title={collapsed ? item.title : undefined}
      className={cn(
        ROW_BASE,
        collapsed ? 'h-11 w-11 mx-auto justify-center' : 'gap-3 px-4 py-3',
        isActive ? t.itemActive : t.itemIdle
      )}
    >
      <item.icon
        size={18}
        strokeWidth={isActive ? 2.15 : 1.75}
        className={cn('shrink-0', isActive && t.itemActiveIcon)}
      />
      {!collapsed && <span className={LABEL_BASE}>{item.title}</span>}
    </Link>
  );
}

function NavGroup({ item, pathname, collapsed, isOpen, onToggle, t }) {
  const hasActiveChild = item.children.some((child) => child.href === pathname);

  return (
    <div>
      <button
        type='button'
        onClick={onToggle}
        aria-expanded={isOpen}
        title={collapsed ? item.title : undefined}
        className={cn(
          ROW_BASE,
          collapsed ? 'h-11 w-11 mx-auto justify-center' : 'w-full gap-3 px-4 py-3 text-left',
          hasActiveChild ? t.itemActive : isOpen ? t.parentOpen : t.itemIdle
        )}
      >
        <item.icon
          size={18}
          strokeWidth={hasActiveChild ? 2.15 : 1.75}
          className={cn('shrink-0', hasActiveChild && t.itemActiveIcon)}
        />
        {!collapsed && (
          <>
            <span className={cn(LABEL_BASE, 'flex-1')}>{item.title}</span>
            <ChevronDown
              size={14}
              className={cn('shrink-0 transition-transform duration-200', !isOpen && '-rotate-90')}
            />
          </>
        )}
      </button>

      {isOpen && !collapsed && (
        <div className='relative mt-1 space-y-1 pl-7'>
          <span className={cn('absolute left-[26px] top-1 bottom-1 w-px rounded-full', t.childRail)} />
          {item.children.map((child) => {
            const isActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                prefetch={false}
                className={cn(ROW_BASE, 'gap-2.5 px-3.5 py-2.5', isActive ? t.childActive : t.childIdle)}
              >
                <child.icon size={16} strokeWidth={isActive ? 2.15 : 1.75} className='shrink-0' />
                <span className={cn(LABEL_BASE, 'flex-1 text-[12.5px]')}>{child.title}</span>
                {isActive && <ChevronRight size={13} className='shrink-0' />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
