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
          <img
            src="https://cdn.shopify.com/s/files/1/0739/8516/3482/files/footer-logo.svg?width=256"
            alt="Lucira"
            className="h-8 w-auto shrink-0 object-contain transition-transform duration-200 group-hover:scale-105"
          />
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
