'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  Coins,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Loader2,
  X,
  Package,
} from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Dialog, DialogContent, DialogTitle } from '../../../../components/ui/dialog';
import { toast } from 'react-toastify';

function fmtPrice(val) {
  if (val === null || val === undefined) return '0';
  return Number(val).toLocaleString('en-IN');
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DgrpAdminPage() {
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected plan for detail modal
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, plansRes] = await Promise.all([
        fetch(`${baseUrl}/api/dgrp/admin/stats`),
        fetch(`${baseUrl}/api/dgrp/admin/plans?status=${statusFilter}&search=${encodeURIComponent(search)}&limit=100`)
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
      }
    } catch (err) {
      console.error('Failed to load DGRP admin data:', err);
      toast.error('Failed to load DGRP data');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update status (e.g. fulfill / dispatch)
  const handleUpdateStatus = async (planId, newStatus) => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`${baseUrl}/api/dgrp/admin/plans/${planId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        toast.success(`Plan marked as ${newStatus}`);
        setIsDetailModalOpen(false);
        fetchData();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
            <Coins className="text-amber-600" size={26} />
            DGRP (Lock &amp; Key) Plans
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage Daily Gold Rate Protection customer enrollments, payment schedules, and pre-closures.
          </p>
        </div>

        <Button
          onClick={fetchData}
          variant="outline"
          className="flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Plans</span>
          <p className="text-2xl font-bold text-zinc-900">{stats?.total_plans || 0}</p>
          <span className="text-[10px] text-zinc-500 font-medium">All customer locks</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Plans</span>
          <p className="text-2xl font-bold text-emerald-600">{stats?.active_plans || 0}</p>
          <span className="text-[10px] text-zinc-500 font-medium">Ongoing EMIs</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">Pre-Closed</span>
          <p className="text-2xl font-bold text-purple-600">{stats?.preclosed_plans || 0}</p>
          <span className="text-[10px] text-zinc-500 font-medium">Lowest rate closed</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Cancelled</span>
          <p className="text-2xl font-bold text-red-600">{stats?.cancelled_plans || 0}</p>
          <span className="text-[10px] text-zinc-500 font-medium">Cancelled orders</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Locked Value</span>
          <p className="text-xl font-bold text-zinc-900">₹{fmtPrice(stats?.total_locked_value)}</p>
          <span className="text-[10px] text-zinc-500 font-medium">Total jewelry value</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Collected</span>
          <p className="text-xl font-bold text-amber-700">₹{fmtPrice(stats?.total_collected)}</p>
          <span className="text-[10px] text-zinc-500 font-medium">Advance + EMIs paid</span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Pending Balance</span>
          <p className="text-xl font-bold text-zinc-900">₹{fmtPrice(stats?.total_pending)}</p>
          <span className="text-[10px] text-zinc-500 font-medium">Remaining to collect</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-200">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Plans' },
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Fully Paid' },
            { id: 'pre_closed', label: 'Pre-Closed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[#5A413F] text-white shadow-xs'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, customer, mobile, SKU..."
            className="pl-9 h-10 text-xs rounded-xl bg-zinc-50/70 border-zinc-200"
          />
        </div>
      </div>

      {/* Plans Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-[#5A413F]" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Coins className="mx-auto text-zinc-300" size={40} />
            <p className="text-sm font-bold text-zinc-700">No DGRP plans found</p>
            <p className="text-xs text-zinc-400">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-4">Plan Code</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Locked Rate</th>
                  <th className="py-3.5 px-4">Plan Type</th>
                  <th className="py-3.5 px-4">Total Value</th>
                  <th className="py-3.5 px-4">Paid / Pending</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {plans.map((plan) => {
                  const paidCount = plan.installments?.filter((i) => i.status === 'paid')?.length || 0;
                  const totalCount = plan.installments?.length || 1;

                  return (
                    <tr key={plan._id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-zinc-900">
                        {plan.plan_code}
                        {plan.shopify_order_name && (
                          <span className="block text-[11px] font-bold text-amber-800 mt-0.5">
                            Order {plan.shopify_order_name}
                          </span>
                        )}
                        <span className="block text-[10px] font-normal text-zinc-400 mt-0.5">
                          {fmtDate(plan.created_at)}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-zinc-900">
                          {plan.customer?.first_name} {plan.customer?.last_name}
                        </div>
                        <div className="text-[11px] text-zinc-500">{plan.customer?.mobile}</div>
                        <div className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                          {plan.customer?.email}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-zinc-50 border border-zinc-100 p-0.5">
                            {plan.product?.image ? (
                              <Image
                                src={plan.product.image}
                                alt={plan.product.title || 'Product'}
                                fill
                                className="object-contain"
                                unoptimized
                              />
                            ) : (
                              <Coins size={16} className="text-zinc-400 m-auto" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[180px]">
                            <p className="font-bold text-zinc-900 truncate">{plan.product?.title}</p>
                            <p className="text-[10px] text-zinc-400">
                              {plan.product?.metal_purity} · {plan.product?.metal_weight}g
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-bold text-zinc-900">
                        ₹{fmtPrice(plan.financials?.locked_gold_rate)}/gm
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {plan.financials?.installment_tenure_months === 6
                            ? 'Gold & Diamond (6M)'
                            : 'Plain Gold (3M)'}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-bold text-zinc-900">
                        ₹{fmtPrice(plan.financials?.original_product_price)}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-emerald-600">
                          ₹{fmtPrice(plan.financials?.total_paid)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Pending: ₹{fmtPrice(plan.financials?.amount_pending)}
                        </div>
                        <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                ((plan.financials?.total_paid || 0) /
                                  (plan.financials?.original_product_price || 1)) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <Badge
                          variant={
                            plan.financials?.status === 'completed'
                              ? 'ok'
                              : plan.financials?.status === 'pre_closed'
                              ? 'secondary'
                              : plan.financials?.status === 'cancelled'
                              ? 'destructive'
                              : 'warn'
                          }
                          className={`uppercase font-bold text-[10px] ${
                            plan.financials?.status === 'cancelled'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : ''
                          }`}
                        >
                          {plan.financials?.status === 'pre_closed'
                            ? 'Pre-Closed'
                            : plan.financials?.status === 'completed'
                            ? 'Completed'
                            : plan.financials?.status === 'cancelled'
                            ? 'Cancelled'
                            : `${paidCount}/${totalCount} Paid`}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setIsDetailModalOpen(true);
                          }}
                          className="h-8 px-3 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Plan Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-3xl bg-white">
          <DialogTitle className="text-lg font-bold text-zinc-900 flex items-center justify-between">
            <span>DGRP Plan Details: {selectedPlan?.plan_code}</span>
          </DialogTitle>

          {selectedPlan && (
            <div className="space-y-6 pt-3 text-xs">
              {/* Product & Rate Overview */}
              <div className="flex gap-4 items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white border border-zinc-200 p-1">
                  {selectedPlan.product?.image ? (
                    <Image
                      src={selectedPlan.product.image}
                      alt={selectedPlan.product.title || 'Product'}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <Coins size={24} className="text-zinc-400 m-auto" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-zinc-900">{selectedPlan.product?.title}</h4>
                  <p className="text-zinc-500">
                    SKU: {selectedPlan.product?.sku || 'N/A'} · {selectedPlan.product?.metal_purity}{' '}
                    {selectedPlan.product?.metal_color} · {selectedPlan.product?.metal_weight}g
                  </p>
                  <p className="text-[#5A413F] font-bold mt-0.5">
                    Locked Gold Rate: ₹{fmtPrice(selectedPlan.financials?.locked_gold_rate)}/gm
                  </p>
                </div>
              </div>

              {/* Customer & Shipping Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-zinc-100 bg-white p-4 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Customer Info
                  </span>
                  <p className="font-bold text-zinc-900">
                    {selectedPlan.customer?.first_name} {selectedPlan.customer?.last_name}
                  </p>
                  <p className="text-zinc-600">Mobile: {selectedPlan.customer?.mobile}</p>
                  <p className="text-zinc-600">Email: {selectedPlan.customer?.email || 'N/A'}</p>
                </div>

                <div className="rounded-2xl border border-zinc-100 bg-white p-4 space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Shipping Address ({selectedPlan.shipping_address?.delivery_method?.toUpperCase()})
                  </span>
                  <p className="text-zinc-800 leading-relaxed">
                    {selectedPlan.shipping_address?.address_line}
                    {selectedPlan.shipping_address?.landmark
                      ? `, ${selectedPlan.shipping_address.landmark}`
                      : ''}
                    <br />
                    {selectedPlan.shipping_address?.city}, {selectedPlan.shipping_address?.state} -{' '}
                    {selectedPlan.shipping_address?.pincode}
                  </p>
                </div>
              </div>

              {/* Pre-closure Info if closed early */}
              {selectedPlan.pre_closure?.is_preclosed && (
                <div className="rounded-2xl bg-purple-50 p-4 border border-purple-200 space-y-1 text-purple-900">
                  <span className="font-bold uppercase tracking-wider text-[10px]">
                    Pre-Closure Record
                  </span>
                  <p>
                    Pre-closed on <strong>{fmtDate(selectedPlan.pre_closure.preclosed_at)}</strong> at
                    closing rate of{' '}
                    <strong>₹{fmtPrice(selectedPlan.pre_closure.closing_gold_rate)}/gm</strong>.
                  </p>
                  <p>
                    Total Gold Savings Granted:{' '}
                    <strong className="text-emerald-700">
                      ₹{fmtPrice(selectedPlan.pre_closure.gold_savings_applied)}
                    </strong>
                  </p>
                  <p className="text-[10px] text-purple-700 font-mono">
                    Payment ID: {selectedPlan.pre_closure.razorpay_payment_id || 'N/A'}
                  </p>
                </div>
              )}

              {/* Installments Ledger */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                  Payment History &amp; Installments Ledger
                </span>

                <div className="rounded-2xl border border-zinc-200 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase border-b border-zinc-100">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Payment Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {selectedPlan.installments?.map((ins) => (
                        <tr key={ins.installment_number}>
                          <td className="py-2.5 px-3 text-zinc-400">{ins.installment_number}</td>
                          <td className="py-2.5 px-3 font-bold text-zinc-900">{ins.label}</td>
                          <td className="py-2.5 px-3 text-zinc-600">{fmtDate(ins.due_date)}</td>
                          <td className="py-2.5 px-3 font-bold text-zinc-900">₹{fmtPrice(ins.amount)}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                                ins.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : ins.status === 'pre_closed'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : ins.status === 'cancelled'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full shrink-0 ${
                                  ins.status === 'paid'
                                    ? 'bg-emerald-500'
                                    : ins.status === 'pre_closed'
                                    ? 'bg-purple-500'
                                    : ins.status === 'cancelled'
                                    ? 'bg-red-500'
                                    : 'bg-amber-500'
                                }`}
                              />
                              {ins.status === 'pre_closed' ? 'Pre-Closed' : ins.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-zinc-400 truncate max-w-[120px]">
                            {ins.razorpay_payment_id || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cancellation Notice if cancelled */}
              {(selectedPlan.financials?.status === 'cancelled' || selectedPlan.cancellation?.is_cancelled) && (
                <div className="rounded-2xl bg-red-50 p-4 border border-red-200 space-y-1 text-red-900">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-red-700 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-red-600" />
                    Cancellation Notice
                  </span>
                  <p>
                    This DGRP plan was cancelled on{' '}
                    <strong>{fmtDate(selectedPlan.cancellation?.cancelled_at || selectedPlan.updated_at)}</strong>.
                  </p>
                  {selectedPlan.cancellation?.cancel_reason && (
                    <p className="text-red-700">
                      Reason: <strong>{selectedPlan.cancellation.cancel_reason}</strong>
                    </p>
                  )}
                  {selectedPlan.shopify_order_name && (
                    <p className="text-[11px] text-zinc-600">
                      Associated Shopify Order: <strong>{selectedPlan.shopify_order_name}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Status Action Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-zinc-100">
                <span className="font-bold text-zinc-700">Order &amp; Fulfillment Status:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedPlan.financials?.status !== 'cancelled' ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(selectedPlan._id, 'dispatched')}
                        className="text-xs font-bold cursor-pointer"
                      >
                        Mark Dispatched
                      </Button>
                      <Button
                        size="sm"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(selectedPlan._id, 'completed')}
                        className="text-xs font-bold bg-[#5A413F] text-white hover:bg-[#463231] cursor-pointer"
                      >
                        Mark Delivered
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={updatingStatus}
                        onClick={() => {
                          if (confirm('Are you sure you want to mark this DGRP plan as CANCELLED?')) {
                            handleUpdateStatus(selectedPlan._id, 'cancelled');
                          }
                        }}
                        className="text-xs font-bold bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                      >
                        Cancel Plan
                      </Button>
                    </>
                  ) : (
                    <Badge variant="destructive" className="bg-red-50 text-red-700 border border-red-200 uppercase font-bold text-xs py-1.5 px-3">
                      Plan Cancelled
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
