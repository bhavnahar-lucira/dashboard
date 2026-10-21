'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ChevronRight, ChevronDown, ChevronsLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdminTheme } from './AdminThemeProvider';
import { NAV_SECTIONS, ROLE_LABELS, filterSectionsForRole } from '../../lib/adminNav';

/* ------------------------------------------------------------------ *
 * Theme tokens — luxury dark palette tailored for fine jewelry CRM
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
    itemActive: 'bg-[#5A413F]/[0.08] text-[#5A413F] font-semibold',
    itemActiveIcon: 'text-[#5A413F]',
    parentOpen: 'text-[#3A2A29] bg-[#5A413F]/[0.04]',
    groupTag: 'bg-zinc-100 text-zinc-400 border border-zinc-200/60',
    groupTagActive: 'bg-[#5A413F]/[0.1] text-[#5A413F] border border-[#5A413F]/20',
    childRail: 'border-zinc-200/80',
    childIdle: 'text-zinc-400 hover:text-[#3A2A29] hover:bg-[#5A413F]/[0.04]',
    childActive: 'bg-[#5A413F]/[0.08] text-[#5A413F] font-semibold',
    footerRule: 'border-zinc-200/80',
    avatar: 'bg-[#5A413F] text-white',
    userName: 'text-[#3A2A29]',
    userMeta: 'text-zinc-400',
    ghostBtn: 'text-zinc-400 hover:text-[#3A2A29] hover:bg-zinc-100',
    dangerBtn: 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50',
    toggleBtn: 'bg-white border-zinc-200 text-zinc-400 hover:text-[#5A413F] hover:border-[#5A413F]/40',
    scrollbar: 'sidebar-scrollbar',
  },
  dark: {
    shell: 'bg-[#0e111d] border-white/[0.08]',
    brandMark: 'text-[#E7C6B4]',
    brandWordmark: 'text-white',
    brandSuffix: 'text-white/40',
    sectionLabel: 'text-white/35',
    sectionRule: 'bg-white/10',
    itemIdle: 'text-white/55 hover:text-white hover:bg-white/[0.05]',
    itemActive: 'bg-white/[0.08] text-white font-semibold border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
    itemActiveIcon: 'text-[#E7C6B4]',
    parentOpen: 'text-white bg-white/[0.03]',
    groupTag: 'bg-white/[0.06] text-white/40 border border-white/10',
    groupTagActive: 'bg-[#E7C6B4]/15 text-[#E7C6B4] border border-[#E7C6B4]/25',
    childRail: 'border-white/10',
    childIdle: 'text-white/45 hover:text-white hover:bg-white/[0.04]',
    childActive: 'bg-[#E7C6B4]/15 text-[#E7C6B4] border border-[#E7C6B4]/25 font-semibold shadow-xs',
    footerRule: 'border-white/[0.08]',
    avatar: 'bg-gradient-to-tr from-[#5A413F] via-[#8A5F5C] to-[#E7C6B4]',
    userName: 'text-white',
    userMeta: 'text-white/40',
    ghostBtn: 'text-white/40 hover:text-white hover:bg-white/[0.07]',
    dangerBtn: 'text-white/40 hover:text-rose-400 hover:bg-rose-500/10',
    toggleBtn: 'bg-[#181c2e] border-white/20 text-white/60 hover:text-white hover:border-white/50 shadow-md',
    scrollbar: 'sidebar-scrollbar',
  },
};

const WIDTH_EXPANDED = '17.5rem';
const WIDTH_COLLAPSED = '5.25rem';

const STORAGE_COLLAPSED = 'lucira_admin_sidebar_collapsed';
const STORAGE_OPEN_GROUPS = 'lucira_admin_sidebar_groups';

const ROW_BASE =
  'relative flex items-center rounded-xl transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#E7C6B4]/60 group';
const LABEL_BASE = 'truncate text-[13px] tracking-normal';

/* ------------------------------------------------------------------ */

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { isDark } = useAdminTheme();
  const [role, setRole] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState({});

  // Sidebar stays dark luxury slate like Shopify / Linear
  const t = THEME.dark;

  /* Restore persisted preferences */
  useEffect(() => {
    setRole(localStorage.getItem('lucira_admin_role') || 'admin');
    setCollapsed(localStorage.getItem(STORAGE_COLLAPSED) === '1');
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_OPEN_GROUPS) || '{}');
      if (saved && typeof saved === 'object') setOpenGroups((prev) => ({ ...saved, ...prev }));
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  /* Publish current width so the main content tracks it seamlessly */
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

  /* Remember open groups */
  useEffect(() => {
    if (!role) return;
    localStorage.setItem(STORAGE_OPEN_GROUPS, JSON.stringify(openGroups));
  }, [openGroups, role]);

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

  /* Role-filtered nav tree */
  const sections = filterSectionsForRole(role);
  const roleLabel = ROLE_LABELS[role] || 'Administrator';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-screen flex-col border-r transition-[width] duration-300 ease-out select-none',
        t.shell
      )}
      style={{ width: collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED }}
    >
      {/* Collapse Toggle Handle */}
      <button
        type='button'
        onClick={toggleCollapsed}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'absolute -right-3 top-7 z-20 grid h-6 w-6 place-items-center rounded-full border transition-all duration-200 cursor-pointer',
          t.toggleBtn
        )}
      >
        <ChevronsLeft
          size={13}
          className={cn('transition-transform duration-300', collapsed && 'rotate-180')}
        />
      </button>

      {/* Brand Header */}
      <div className={cn('flex h-[78px] shrink-0 items-center border-b border-white/[0.08]', collapsed ? 'justify-center px-0' : 'px-5 justify-between')}>
        <Link
          href='/dashboard'
          prefetch={false}
          className='flex items-center gap-3 overflow-hidden group'
          title='Lucira Dashboard'
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E7C6B4]/25 via-[#B77767]/15 to-transparent border border-[#E7C6B4]/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(231,198,180,0.15)] group-hover:border-[#E7C6B4]/60 transition-colors">
            <LuciraMark className="h-5 w-auto text-[#E7C6B4]" />
          </div>
          {!collapsed && (
            <div className='flex flex-col leading-none min-w-0'>
              <span
                className='text-[17px] font-bold tracking-tight text-white'
                style={{ fontFamily: 'var(--font-figtree), sans-serif' }}
              >
                Lucira Crm
              </span>
              <span className='mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40'>
                Website Crm
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-4 sidebar-scrollbar',
          collapsed ? 'px-2' : 'px-3'
        )}
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255, 255, 255, 0.12) transparent' }}
      >
        {sections.map((section, sectionIndex) => (
          <div
            key={section.label || `section-${sectionIndex}`}
            className={sectionIndex === 0 ? '' : 'mt-4'}
          >
            {section.label &&
              (collapsed ? (
                <div className={cn('mx-auto mb-2 h-px w-6 rounded-full', t.sectionRule)} />
              ) : (
                <p
                  className={cn(
                    'mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em]',
                    t.sectionLabel
                  )}
                >
                  {section.label}
                </p>
              ))}

            <div className='space-y-0.5'>
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
      <div className={cn('shrink-0 border-t border-white/[0.08] bg-[#0b0e18]/60 p-3.5', t.footerRule)}>
        {collapsed ? (
          <div className='flex flex-col items-center gap-2.5'>
            <div className='relative'>
              <div className='w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5A413F] via-[#8A5F5C] to-[#E7C6B4] p-[1.5px] shadow-sm'>
                <div className='w-full h-full rounded-[10px] bg-[#141829] flex items-center justify-center font-bold text-xs text-[#E7C6B4]'>
                  {roleLabel.charAt(0)}
                </div>
              </div>
              <span className='w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0e111d] absolute -bottom-0.5 -right-0.5' />
            </div>
            <IconButton onClick={handleLogout} className={t.dangerBtn} title='Sign out'>
              <LogOut size={15} />
            </IconButton>
          </div>
        ) : (
          <div className='flex items-center gap-3'>
            <div className='relative shrink-0'>
              <div className='w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5A413F] via-[#8A5F5C] to-[#E7C6B4] p-[1.5px] shadow-sm'>
                <div className='w-full h-full rounded-[10px] bg-[#141829] flex items-center justify-center font-bold text-xs text-[#E7C6B4]'>
                  {roleLabel.charAt(0)}
                </div>
              </div>
              <span className='w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0e111d] absolute -bottom-0.5 -right-0.5' />
            </div>
            <div className='min-w-0 flex-1 leading-tight'>
              <span className='block truncate text-[13px] font-bold text-white'>{roleLabel}</span>
              <span className='block truncate text-[10.5px] font-medium text-white/40 mt-0.5'>Store Admin • Online</span>
            </div>
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
 * Helper Components
 * ------------------------------------------------------------------ */

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
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#E7C6B4]/60 cursor-pointer',
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
        collapsed ? 'h-10 w-10 mx-auto justify-center' : 'gap-3 px-3 py-2.5',
        isActive ? t.itemActive : t.itemIdle
      )}
    >
      {/* Active Left Indicator Bar */}
      {isActive && !collapsed && (
        <span className="absolute -left-1 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-[#E7C6B4] to-[#B77767] shadow-[0_0_8px_rgba(231,198,180,0.6)]" />
      )}
      <item.icon
        size={17}
        strokeWidth={isActive ? 2.2 : 1.75}
        className={cn(
          'shrink-0 transition-transform duration-150 group-hover:scale-105',
          isActive ? t.itemActiveIcon : 'text-white/50 group-hover:text-white'
        )}
      />
      {!collapsed && (
        <span className={cn(LABEL_BASE, isActive ? 'font-semibold text-white' : 'font-medium')}>
          {item.title}
        </span>
      )}
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
          collapsed ? 'h-10 w-10 mx-auto justify-center' : 'w-full gap-3 px-3 py-2.5 text-left cursor-pointer',
          hasActiveChild ? t.itemActive : isOpen ? t.parentOpen : t.itemIdle
        )}
      >
        {hasActiveChild && !collapsed && (
          <span className="absolute -left-1 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-[#E7C6B4] to-[#B77767] shadow-[0_0_8px_rgba(231,198,180,0.6)]" />
        )}
        <item.icon
          size={17}
          strokeWidth={hasActiveChild ? 2.2 : 1.75}
          className={cn(
            'shrink-0 transition-transform duration-150 group-hover:scale-105',
            hasActiveChild ? t.itemActiveIcon : 'text-white/50 group-hover:text-white'
          )}
        />
        {!collapsed && (
          <>
            <span className={cn(LABEL_BASE, 'flex-1', hasActiveChild ? 'font-semibold text-white' : 'font-medium')}>
              {item.title}
            </span>
            {item.short && (
              <span
                className={cn(
                  'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                  hasActiveChild ? t.groupTagActive : t.groupTag
                )}
              >
                {item.short}
              </span>
            )}
            <ChevronDown
              size={14}
              className={cn(
                'shrink-0 text-white/40 group-hover:text-white transition-transform duration-200',
                !isOpen && '-rotate-90'
              )}
            />
          </>
        )}
      </button>

      {isOpen && !collapsed && (
        <div className='relative mt-1 ml-4 pl-3.5 border-l border-white/10 space-y-0.5'>
          {item.children.map((child) => {
            const isActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                prefetch={false}
                className={cn(
                  'relative flex items-center rounded-lg transition-all duration-150 outline-none gap-2 px-2.5 py-2 text-left group',
                  isActive ? t.childActive : t.childIdle
                )}
              >
                <child.icon
                  size={14}
                  strokeWidth={isActive ? 2.2 : 1.75}
                  className={cn(
                    'shrink-0 transition-transform duration-150 group-hover:scale-105',
                    isActive ? 'text-[#E7C6B4]' : 'text-white/40 group-hover:text-white/80'
                  )}
                />
                <span className={cn('truncate text-[12.5px] flex-1', isActive ? 'font-semibold text-[#E7C6B4]' : 'font-medium')}>
                  {child.title}
                </span>
                {isActive && <ChevronRight size={13} className='shrink-0 text-[#E7C6B4]' />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
