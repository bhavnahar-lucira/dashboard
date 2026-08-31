'use client';

import { useState, useEffect } from 'react';
import { Heart, User, Clock, Package, ExternalLink } from 'lucide-react';
import { DataTable } from '../../../../components/ui/DataTable';
import { format } from 'date-fns';

export default function UserWishlistsPage() {
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    async function fetchWishlists() {
      try {
        setLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://webuat.lucirajewelry.com';
        const res = await fetch(`${baseUrl}/api/admin/wishlists?start_date=${startDate}&end_date=${endDate}&t=${Date.now()}`);
        const data = await res.json();
        if (data.success) {
          setWishlists(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch wishlists:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchWishlists();
  }, [startDate, endDate]);

  const columns = [
    {
      header: 'Customer Details',
      accessorKey: 'userId',
      cell: ({ row }) => {
        const item = row.original;
        const customer = item.customer;
        return (
          <div className="flex flex-col gap-1">
            {customer ? (
              <>
                <div className="flex items-center gap-2 font-bold text-ink text-sm tracking-tight">
                  <User size={14} className="text-rose-500" />
                  {customer.firstName} {customer.lastName}
                </div>
                <div className="text-[10px] text-ink-soft truncate max-w-[180px] font-medium">{customer.email}</div>
                <div className="text-[10px] text-ink-muted font-bold uppercase tracking-wider">{customer.phone}</div>
              </>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 font-bold text-ink-muted">
                  <User size={14} />
                  Guest
                </div>
                {item.sessionId && (
                   <span className="text-[9px] text-ink-muted font-mono truncate max-w-[150px]">
                     SID: {item.sessionId}
                   </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Wishlist Items',
      accessorKey: 'items',
      cell: ({ row }) => {
        const items = row.original.items || [];
        return (
          <div className="flex flex-col gap-1.5">
            {items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div className="size-8 rounded-[8px] bg-field flex-shrink-0 overflow-hidden border border-hairline">
                  {item.image && <img src={item.image} alt="" className="size-full object-cover" />}
                </div>
                <div className="flex flex-col">
                  <span className="font-medium line-clamp-1 max-w-[200px]">{item.title}</span>
                  <span className="text-[10px] text-ink-soft">₹{item.price?.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {items.length > 3 && (
              <span className="text-[10px] text-rose-500 font-bold">
                + {items.length - 3} more items
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Total Count',
      accessorKey: 'items_count',
      cell: ({ row }) => (
        <span className="font-bold text-ink">
          {row.original.items?.length || 0} Products
        </span>
      ),
    },
    {
      header: 'Last Modified',
      accessorKey: 'updatedAt',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1 text-xs text-ink-soft">
          <div className="flex items-center gap-1.5">
            <Clock size={12} />
            {row.original.updatedAt ? format(new Date(row.original.updatedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
          </div>
        </div>
      ),
    },
    {
        header: 'Action',
        cell: ({ row }) => (
            <button className="p-2 hover:bg-brand-tint rounded-[8px] text-ink-muted hover:text-zinc-900 transition-colors">
                <ExternalLink size={16} />
            </button>
        )
    }
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="admin-title flex items-center gap-3">
            <Heart className="text-rose-500" size={32} />
            User Wishlists
          </h1>
          <p className="admin-subtitle">Products saved by customers for later viewing.</p>
        </div>
        <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-4 bg-panel p-2 rounded-[8px] border border-hairline-soft shadow-sm">
              <div className="px-4 py-2 text-center">
                  <p className="text-[10px] font-bold text-ink-muted uppercase tracking-widest">Total Wishlists</p>
                  <p className="text-xl font-bold text-ink">{wishlists.length}</p>
              </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
        </div>
      ) : (
        <DataTable columns={columns} data={wishlists} hideCount={true} />
      )}
    </div>
  );
}
