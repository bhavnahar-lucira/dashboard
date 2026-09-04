'use client';

// Product Information — its own sidebar page. The lookup component itself
// lives with the Smart Collections module (_insights.js), which shares the
// backend endpoints; this route just gives it a front door of its own.

import { PackageSearch } from 'lucide-react';
import { ProductInsights } from '../smart-collection/_insights';

export default function ProductInsightsPage() {
  return (
    <div className='w-full py-10 px-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-zinc-900 font-figtree flex items-center gap-3'>
          <PackageSearch className='text-zinc-400' /> Product Information
        </h1>
        <p className='text-zinc-500 mt-1 max-w-2xl'>
          Look up any product by SKU, title, or handle — views, add-to-carts, orders and revenue across 3 / 7 / 30
          days, stock per variant, recent orders, and where it sits in your collections and smart sorts.
        </p>
      </div>
      <ProductInsights />
    </div>
  );
}
