'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, ArrowUpRight } from 'lucide-react';
import PageHeader, { StatusPill } from '@/components/common/PageHeader';
import { filterSectionsForRole } from '@/lib/adminNav';
import { cn } from '@/lib/utils';

const TONES = {
  brand: 'bg-brand-tint text-brand',
  ok: 'bg-ok-bg text-ok-fg',
  warn: 'bg-warn-bg text-warn-fg',
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
    <div className='container-main py-10 px-4'>
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
              className='inline-flex items-center gap-1.5 rounded-full border border-hairline bg-panel px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand'
            >
              {block.icon && <block.icon size={13} strokeWidth={2} />}
              {block.title}
              {block.short && <span className='text-[10px] font-bold text-ink-muted'>{block.short}</span>}
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
                  <span className='grid h-9 w-9 place-items-center rounded-xl bg-brand-tint text-brand'>
                    <block.icon size={17} strokeWidth={1.9} />
                  </span>
                )}
                <div className='min-w-0'>
                  <h2 className='admin-section-label flex items-center gap-2'>
                    {block.title}
                    {block.short && (
                      <span className='rounded-md bg-brand-tint px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-brand'>
                        {block.short}
                      </span>
                    )}
                  </h2>
                  {block.blurb && <p className='admin-eyebrow mt-0.5'>{block.blurb}</p>}
                </div>
              </div>
              <span className='admin-eyebrow shrink-0'>
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
      className='admin-panel group block p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lifted'
    >
      <div className='mb-5 flex items-start justify-between'>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl border border-transparent',
            TONES[item.tone] || TONES.brand
          )}
        >
          <item.icon size={22} strokeWidth={1.9} />
        </div>
        <ArrowUpRight
          size={16}
          className='mt-1 text-ink-muted transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand'
        />
      </div>
      <h3 className='flex items-center gap-2 text-[15.5px] font-bold tracking-[-0.01em] text-ink'>
        {item.title}
        {item.isTracking && <span className='h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500' />}
      </h3>
      <p className='mt-2 text-[13px] font-medium leading-relaxed text-ink-soft'>{item.description}</p>
    </Link>
  );
}

function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
