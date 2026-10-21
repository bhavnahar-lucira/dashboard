'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, ArrowUpRight } from 'lucide-react';
import PageHeader, { StatusPill } from '@/components/common/PageHeader';
import { filterSectionsForRole } from '@/lib/adminNav';
import { cn } from '@/lib/utils';

const TONES = {
  brand: 'bg-[#f1f2f4] text-[#202223] border border-[#e1e3e5]',
  ok: 'bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0]',
  warn: 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]',
};

/**
 * Flatten the role-filtered nav tree into overview blocks.
 *
 * Every group (Homepage, Collection Page, …) becomes its own block so
 * the overview mirrors the sidebar one-to-one. Loose items in a section
 * are collected under that section's label.
 */
function buildBlocks(sections) {
  const blocks = [];
  sections.forEach((section) => {
    const loose = [];
    section.items.forEach((item) => {
      if (item.href === '/dashboard') return;
      if (item.children) {
        blocks.push({
          key: item.title,
          title: item.title,
          short: item.short,
          icon: item.icon,
          blurb: item.blurb,
          modules: item.children,
        });
      } else {
        loose.push(item);
      }
    });
    if (loose.length) {
      blocks.push({ key: section.label || `section-${blocks.length}`, title: section.label, modules: loose });
    }
  });
  return blocks;
}

export default function Dashboard() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    setRole(localStorage.getItem('lucira_admin_role') || 'admin');
  }, []);

  const blocks = buildBlocks(filterSectionsForRole(role));
  const moduleCount = blocks.reduce((n, b) => n + b.modules.length, 0);

  return (
    <div className='container-main py-8 px-4'>
      <PageHeader
        icon={LayoutDashboard}
        title='Lucira Unified Backend'
        subtitle='Manage all custom services and promotional content from this unified interface.'
        actions={
          <>
            {role && (
              <StatusPill tone='brand'>
                {moduleCount} module{moduleCount === 1 ? '' : 's'}
              </StatusPill>
            )}
            <StatusPill tone='success' pulse>
              Connected to MongoDB Atlas
            </StatusPill>
          </>
        }
      />

      {/* Jump links — one per block, mirrors the sidebar groups */}
      {blocks.length > 1 && (
        <nav className='mb-8 flex flex-wrap gap-2' aria-label='Sections'>
          {blocks.map((block) => (
            <a
              key={block.key}
              href={`#${slug(block.key)}`}
              className='inline-flex items-center gap-1.5 rounded-full border border-[#e1e3e5] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#5c5f62] shadow-[0_1px_0_rgba(0,0,0,0.05)] transition-all hover:border-[#202223] hover:text-[#202223]'
            >
              {block.icon && <block.icon size={13} strokeWidth={2} />}
              {block.title}
              {block.short && <span className='text-[10px] font-bold text-[#8c9196]'>{block.short}</span>}
            </a>
          ))}
        </nav>
      )}

      <div className='space-y-10'>
        {blocks.map((block) => (
          <section key={block.key} id={slug(block.key)} className='scroll-mt-6'>
            <header className='mb-4 flex items-end justify-between gap-4 px-1'>
              <div className='flex items-center gap-3'>
                {block.icon && (
                  <span className='grid h-9 w-9 place-items-center rounded-xl bg-white border border-[#e1e3e5] text-[#202223] shadow-2xs'>
                    <block.icon size={17} strokeWidth={1.9} />
                  </span>
                )}
                <div className='min-w-0'>
                  <h2 className='text-base font-bold text-[#202223] flex items-center gap-2'>
                    {block.title}
                    {block.short && (
                      <span className='rounded-md bg-[#f1f2f4] border border-[#e1e3e5] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#202223]'>
                        {block.short}
                      </span>
                    )}
                  </h2>
                  {block.blurb && <p className='text-xs text-[#6d7175] mt-0.5'>{block.blurb}</p>}
                </div>
              </div>
              <span className='text-xs font-semibold text-[#6d7175] shrink-0'>
                {block.modules.length} module{block.modules.length === 1 ? '' : 's'}
              </span>
            </header>

            <div className='grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3'>
              {block.modules.map((item) => (
                <ModuleCard key={item.href} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ModuleCard({ item }) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      className='bg-white border border-[#e1e3e5] rounded-xl group block p-6 shadow-[0_1px_0_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c9cccf] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
    >
      <div className='mb-5 flex items-start justify-between'>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl border border-[#e1e3e5] bg-[#f6f6f7] text-[#202223] group-hover:bg-[#202223] group-hover:text-white transition-colors duration-200',
            TONES[item.tone]
          )}
        >
          <item.icon size={22} strokeWidth={1.9} />
        </div>
        <ArrowUpRight
          size={16}
          className='mt-1 text-[#8c9196] transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#202223]'
        />
      </div>
      <h3 className='flex items-center gap-2 text-[15.5px] font-bold tracking-tight text-[#202223] group-hover:text-[#005bd3] transition-colors'>
        {item.title}
        {item.isTracking && <span className='h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500' />}
      </h3>
      <p className='mt-2 text-[13px] font-normal leading-relaxed text-[#5c5f62]'>{item.description}</p>
    </Link>
  );
}

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
