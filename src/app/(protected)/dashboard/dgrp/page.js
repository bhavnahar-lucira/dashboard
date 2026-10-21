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
  Receipt,
  Sparkles
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
    <div className="font-figtree min-h-screen p-6 sm:p-8 space-y-6 bg-[#f6f6f7]">
      {/* Header Bar - Shopify Polaris Style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#e1e3e5] flex items-center justify-center text-amber-600 shadow-xs">
            <Coins size={20} className="text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#202223] tracking-tight">DGRP (Lock &amp; Key) Plans</h1>
              <span className="bg-[#f1f2f4] text-[#303030] text-[11px] font-semibold px-2 py-0.5 rounded-md border border-[#e1e3e5]">
                Gold Rate Protection
              </span>
            </div>
            <p className="text-xs text-[#6d7175] mt-0.5">
              Manage Daily Gold Rate Protection customer enrollments, payment schedules, and pre-closures.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center gap-1.5 bg-white hover:bg-[#f6f6f7] text-[#202223] border border-[#d1d5db] hover:border-[#202223] px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-amber-600' : ''} />
            <span>Reload</span>
          </button>

          <div className="bg-[#e4f8ec] text-[#007a5a] border border-[#aee9d1] px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#108043] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#108043]"></span>
            </span>
            <span>Live DGRP Stream</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid - Shopify Polaris Cards with 700 bold weight on metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3.5">
        <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Total Plans</span>
          <p className="text-2xl font-bold text-[#202223] my-1 tracking-tight" style={{ fontWeight: 700 }}>
            {stats?.total_plans || 0}
          </p>
          <span className="text-[10.5px] text-[#8c9196]">All locks</span>
        </div>

        <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Active Plans</span>
          <p className="text-2xl font-bold text-emerald-700 my-1 tracking-tight" style={{ fontWeight: 700 }}>
            {stats?.active_plans || 0}
          </p>
          <span className="text-[10.5px] text-[#8c9196]">Ongoing EMIs</span>
        </div>

        <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-700">Pre-Closed</span>
          <p className="text-2xl font-bold text-purple-700 my-1 tracking-tight" style={{ fontWeight: 700 }}>
            {stats?.preclosed_plans || 0}
          </p>
          <span className="text-[10.5px] text-[#8c9196]">Lowest rate applied</span>
        </div>

        <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">Cancelled</span>
          <p className="text-2xl font-bold text-rose-700 my-1 tracking-tight" style={{ fontWeight: 700 }}>
            {stats?.cancelled_plans || 0}
          </p>
          <span className="text-[10.5px] text-[#8c9196]">Cancelled orders</span>
        </div>

        <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Total Locked</span>
          <p className="text-lg font-bold text-[#202223] my-1 tracking-tight" style={{ fontWeight: 700 }}>
            ₹{fmtPrice(stats?.total_locked_value)}
          </p>
          <span className="text-[10.5px] text-[#8c9196]">Total jewelry value</span>
        </div>

        <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Collected</span>
          <p className="text-lg font-bold text-amber-700 my-1 tracking-tight" style={{ fontWeight: 700 }}>
            ₹{fmtPrice(stats?.total_collected)}
          </p>
          <span className="text-[10.5px] text-[#8c9196]">Advance + EMIs paid</span>
        </div>

        <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-[0_1px_0_rgba(0,0,0,0.05)] hover:border-[#c9cccf] transition-all flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5c5f62]">Pending</span>
          <p className="text-lg font-bold text-[#202223] my-1 tracking-tight" style={{ fontWeight: 700 }}>
            ₹{fmtPrice(stats?.total_pending)}
          </p>
          <span className="text-[10.5px] text-[#8c9196]">Balance to collect</span>
        </div>
      </div>

      {/* Filters & Search - Shopify Polaris Unified Bar */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="inline-flex bg-[#f1f2f4] p-1 rounded-lg border border-[#e1e3e5] overflow-x-auto">
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
              className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-[#202223] font-semibold shadow-xs'
                  : 'text-[#5c5f62] hover:text-[#202223] font-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, customer, mobile, SKU..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-[#d1d5db] focus:border-[#202223] text-[#202223] outline-none shadow-2xs"
          />
        </div>
      </div>

      {/* Plans Table Container */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-[#202223]" size={32} />
            <p className="text-xs font-semibold text-[#6d7175]">Loading DGRP plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Coins className="mx-auto text-[#8c9196]" size={40} />
            <p className="text-sm font-bold text-[#202223]">No DGRP plans found</p>
            <p className="text-xs text-[#6d7175]">Try adjusting your filters or search keywords.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#e1e3e5] bg-[#fafafb] text-[11px] font-semibold text-[#5c5f62]">
                  <th className="py-3 px-4">Plan Code</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Locked Rate</th>
                  <th className="py-3 px-4">Plan Type</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-4">Paid / Pending</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f2f4]">
                {plans.map((plan) => {
                  const paidCount = plan.installments?.filter((i) => i.status === 'paid')?.length || 0;
                  const totalCount = plan.installments?.length || 1;

                  return (
                    <tr key={plan._id} className="hover:bg-[#f6f6f7] transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-[#202223]">
                        {plan.plan_code}
                        {plan.shopify_order_name && (
                          <span className="block text-[11px] font-semibold text-amber-800 mt-0.5">
                            Order {plan.shopify_order_name}
                          </span>
                        )}
                        <span className="block text-[10px] font-normal text-[#8c9196] mt-0.5">
                          {fmtDate(plan.created_at)}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-[#202223]">
                          {plan.customer?.first_name} {plan.customer?.last_name}
                        </div>
                        <div className="text-[11px] text-[#5c5f62]">{plan.customer?.mobile}</div>
                        <div className="text-[10px] text-[#8c9196] truncate max-w-[140px]">
                          {plan.customer?.email}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-[#f6f6f7] border border-[#e1e3e5] p-0.5">
                            {plan.product?.image ? (
                              <Image
                                src={plan.product.image}
                                alt={plan.product.title || 'Product'}
                                fill
                                className="object-contain"
                                unoptimized
                              />
                            ) : (
                              <Coins size={16} className="text-[#8c9196] m-auto" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[180px]">
                            <p className="font-semibold text-[#202223] truncate" title={plan.product?.title}>
                              {plan.product?.title}
                            </p>
                            <p className="text-[10px] text-[#8c9196]">
                              {plan.product?.metal_purity} · {plan.product?.metal_weight}g
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-bold text-[#202223]" style={{ fontWeight: 700 }}>
                        ₹{fmtPrice(plan.financials?.locked_gold_rate)}/gm
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fff8db] text-[#8a6100] border border-[#fbe4a0]">
                          {plan.financials?.installment_tenure_months === 6
                            ? 'Gold & Diamond (6M)'
                            : 'Plain Gold (3M)'}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-bold text-[#202223]" style={{ fontWeight: 700 }}>
                        ₹{fmtPrice(plan.financials?.original_product_price)}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-emerald-700" style={{ fontWeight: 700 }}>
                          ₹{fmtPrice(plan.financials?.total_paid)}
                        </div>
                        <div className="text-[10px] text-[#8c9196]">
                          Pending: ₹{fmtPrice(plan.financials?.amount_pending)}
                        </div>
                        <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-[#f1f2f4]">
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
                          className={`uppercase font-semibold text-[10px] px-2.5 py-0.5 rounded-full border ${
                            plan.financials?.status === 'completed'
                              ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                              : plan.financials?.status === 'pre_closed'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : plan.financials?.status === 'cancelled'
                              ? 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                              : 'bg-[#fff8db] text-[#8a6100] border-[#fbe4a0]'
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
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setIsDetailModalOpen(true);
                          }}
                          className="h-7 px-3 text-xs font-semibold rounded-lg bg-white border border-[#d1d5db] hover:border-[#202223] text-[#202223] shadow-2xs hover:bg-[#f6f6f7] transition-all cursor-pointer"
                        >
                          Details
                        </button>
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl bg-white border border-[#e1e3e5] shadow-xl">
          <DialogTitle className="text-base font-bold text-[#202223] flex items-center justify-between pb-2 border-b border-[#f1f2f4]">
            <span>DGRP Plan Details: {selectedPlan?.plan_code}</span>
          </DialogTitle>

          {selectedPlan && (
            <div className="space-y-5 pt-2 text-xs">
              {/* Product & Rate Overview */}
              <div className="flex gap-4 items-center bg-[#fafafb] p-4 rounded-xl border border-[#e1e3e5]">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-white border border-[#e1e3e5] p-1">
                  {selectedPlan.product?.image ? (
                    <Image
                      src={selectedPlan.product.image}
                      alt={selectedPlan.product.title || 'Product'}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <Coins size={24} className="text-[#8c9196] m-auto" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-[#202223]">{selectedPlan.product?.title}</h4>
                  <p className="text-[#6d7175]">
                    SKU: {selectedPlan.product?.sku || 'N/A'} · {selectedPlan.product?.metal_purity}{' '}
                    {selectedPlan.product?.metal_color} · {selectedPlan.product?.metal_weight}g
                  </p>
                  <p className="text-amber-800 font-bold mt-0.5">
                    Locked Gold Rate: ₹{fmtPrice(selectedPlan.financials?.locked_gold_rate)}/gm
                  </p>
                </div>
              </div>

              {/* Customer & Shipping Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#e1e3e5] bg-white p-4 space-y-1">
                  <span className="text-[10px] font-semibold text-[#6d7175] uppercase tracking-wider">
                    Customer Info
                  </span>
                  <p className="font-bold text-[#202223]">
                    {selectedPlan.customer?.first_name} {selectedPlan.customer?.last_name}
                  </p>
                  <p className="text-[#5c5f62]">Mobile: {selectedPlan.customer?.mobile}</p>
                  <p className="text-[#5c5f62]">Email: {selectedPlan.customer?.email || 'N/A'}</p>
                </div>

                <div className="rounded-xl border border-[#e1e3e5] bg-white p-4 space-y-1">
                  <span className="text-[10px] font-semibold text-[#6d7175] uppercase tracking-wider">
                    Shipping Address ({selectedPlan.shipping_address?.delivery_method?.toUpperCase()})
                  </span>
                  <p className="text-[#202223] leading-relaxed">
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
                <div className="rounded-xl bg-purple-50 p-4 border border-purple-200 space-y-1 text-purple-900">
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
                <span className="text-[11px] font-bold text-[#202223] uppercase tracking-wider">
                  Payment History &amp; Installments Ledger
                </span>

                <div className="rounded-xl border border-[#e1e3e5] overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#fafafb] text-[10px] font-semibold text-[#6d7175] uppercase border-b border-[#e1e3e5]">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Payment Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f2f4]">
                      {selectedPlan.installments?.map((ins) => (
                        <tr key={ins.installment_number}>
                          <td className="py-2.5 px-3 text-[#8c9196]">{ins.installment_number}</td>
                          <td className="py-2.5 px-3 font-semibold text-[#202223]">{ins.label}</td>
                          <td className="py-2.5 px-3 text-[#5c5f62]">{fmtDate(ins.due_date)}</td>
                          <td className="py-2.5 px-3 font-bold text-[#202223]">₹{fmtPrice(ins.amount)}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border whitespace-nowrap ${
                                ins.status === 'paid'
                                  ? 'bg-[#ecfdf5] text-[#065f46] border-[#a7f3d0]'
                                  : ins.status === 'pre_closed'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : ins.status === 'cancelled'
                                  ? 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                                  : 'bg-[#fff8db] text-[#8a6100] border-[#fbe4a0]'
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
                          <td className="py-2.5 px-3 font-mono text-[10px] text-[#8c9196] truncate max-w-[120px]">
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
                <div className="rounded-xl bg-red-50 p-4 border border-red-200 space-y-1 text-red-900">
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
                    <p className="text-[11px] text-[#5c5f62]">
                      Associated Shopify Order: <strong>{selectedPlan.shopify_order_name}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Status Action Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#f1f2f4]">
                <span className="font-semibold text-[#202223]">Order &amp; Fulfillment Status:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedPlan.financials?.status !== 'cancelled' ? (
                    <>
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(selectedPlan._id, 'dispatched')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#d1d5db] hover:border-[#202223] text-[#202223] shadow-2xs hover:bg-[#f6f6f7] transition-all cursor-pointer disabled:opacity-50"
                      >
                        Mark Dispatched
                      </button>
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(selectedPlan._id, 'completed')}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#202223] hover:bg-black text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        Mark Delivered
                      </button>
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => {
                          if (confirm('Are you sure you want to mark this DGRP plan as CANCELLED?')) {
                            handleUpdateStatus(selectedPlan._id, 'cancelled');
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                      >
                        Cancel Plan
                      </button>
                    </>
                  ) : (
                    <Badge className="bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] uppercase font-semibold text-xs py-1 px-3 rounded-full">
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
