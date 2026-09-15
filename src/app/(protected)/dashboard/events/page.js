"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, CalendarHeart, Cake, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

/**
 * Birthday & anniversary coupons, read-only apart from a manual sync.
 *
 * The rules themselves are ordinary Product Discounts rules tagged with an
 * occasion — they're created and edited on the Coupons page, and the backend
 * (lib/occasionCoupons.js) moves customers on and off them as each window
 * opens and closes. This page answers the two questions that page can't at a
 * glance: which coupon is running for each event, and who can use it today.
 */
const EVENTS = [
  {
    occasion: "birthday",
    label: "Birthday",
    icon: Cake,
    blurb: "Opens 7 days before each customer's birthday and runs for 14 days.",
  },
  {
    occasion: "anniversary",
    label: "Anniversary",
    icon: CalendarHeart,
    blurb: "Same window, for customers who saved an anniversary date and are married.",
  },
];

const formatDate = (value) => {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value || "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const formatValue = (rule) =>
  rule.discountType === "percentage"
    ? `${rule.discountValue}% off`
    : `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(rule.discountValue) || 0)} off`;

export default function EventsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);

  const fetchDiscounts = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/settings/product-discounts`);
      const data = await res.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error("Failed to fetch discounts:", error);
      toast.error("Failed to load event coupons");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchDiscounts();
      setLoading(false);
    })();
  }, []);

  // Opens/closes today's windows immediately instead of waiting for the
  // nightly 03:15 IST pass. Reads every customer's saved dates, so it takes
  // a moment.
  const handleSync = async (rule) => {
    setSyncingId(rule.id);
    try {
      const res = await fetch(`${BASE_URL}/api/settings/product-discounts/${rule.id}/occasion-sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync");
      setDiscounts((prev) => prev.map((d) => (d.id === rule.id ? data.discount || d : d)));
      toast.success(`${data.discount?.occasionEligibleCount || 0} customer(s) in window`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-x-5 gap-y-4">
        <div className="min-w-0">
          <h1 className="admin-title">Events</h1>
          <p className="admin-subtitle">Birthday and anniversary coupons, and who can use them today</p>
        </div>
        <Link
          href="/dashboard/product-discounts"
          className="flex items-center gap-2 border border-gray-300 bg-panel hover:bg-row-hover text-ink-soft px-4 py-2.5 rounded-[8px] font-bold text-sm transition-all"
        >
          <ExternalLink size={16} /> Edit coupons
        </Link>
      </div>

      <div className="space-y-6">
        {EVENTS.map(({ occasion, label, icon: Icon, blurb }) => {
          const rule = discounts.find((d) => d.occasion === occasion);
          const customers = rule?.occasionCustomers || [];

          return (
            <div key={occasion} className="admin-panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-hairline-soft">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex items-center justify-center size-9 rounded-full bg-primary/10 text-primary shrink-0">
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-ink">{label}</h2>
                    <p className="text-xs text-ink-soft" style={{ fontSize: "12px", color: "rgb(165, 165, 165)" }}>{blurb}</p>
                  </div>
                </div>

                {rule && (
                  <button
                    onClick={() => handleSync(rule)}
                    disabled={syncingId === rule.id}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {syncingId === rule.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Sync customers now
                  </button>
                )}
              </div>

              {!rule ? (
                <div className="px-5 py-6 text-sm text-ink-soft">
                  No coupon is tagged as a {label.toLowerCase()} coupon yet. Create one on{" "}
                  <Link href="/dashboard/product-discounts" className="text-primary font-medium underline">
                    Coupons
                  </Link>{" "}
                  and set its Occasion to {label}.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 py-4 border-b border-hairline-soft">
                    <Stat label="Code" value={rule.title} />
                    <Stat label="Value" value={formatValue(rule)} />
                    <Stat
                      label="In window today"
                      value={`${rule.occasionEligibleCount || 0} customer${rule.occasionEligibleCount === 1 ? "" : "s"}`}
                    />
                    <Stat
                      label="Last synced"
                      value={rule.occasionSyncedAt ? new Date(rule.occasionSyncedAt).toLocaleString("en-IN") : "Never"}
                    />
                  </div>

                  {rule.occasionSyncError && (
                    <p className="flex items-center gap-2 px-5 py-3 text-xs text-red-500 border-b border-hairline-soft">
                      <AlertTriangle size={14} /> Last sync failed: {rule.occasionSyncError}
                    </p>
                  )}

                  {rule.occasionAutoPaused && (
                    <p className="px-5 py-3 text-xs text-ink-soft border-b border-hairline-soft">
                      Paused in Shopify — nobody is inside a {label.toLowerCase()} window today. It switches back on by
                      itself as soon as someone is.
                    </p>
                  )}

                  {customers.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-ink-soft">
                      {rule.occasionEligibleCount > 0
                        ? 'This sync ran before the customer list existed — hit "Sync customers now" to load the names.'
                        : "Nobody is eligible right now."}
                    </p>
                  ) : (
                    <div className="divide-y divide-hairline-soft">
                      <div className="grid grid-cols-[1fr_1fr_100px_100px] gap-4 px-5 py-2.5 bg-panel-alt text-xs font-medium text-ink-soft">
                        <span>Customer</span>
                        <span>Email</span>
                        <span>{label}</span>
                        <span>Valid till</span>
                      </div>
                      {customers.map((c) => (
                        <div key={c.id} className="grid grid-cols-[1fr_1fr_100px_100px] gap-4 px-5 py-3 text-sm">
                          <span className="text-ink truncate">{c.name || "Unnamed customer"}</span>
                          <span className="text-ink-soft truncate">{c.email || "—"}</span>
                          <span className="text-ink-soft">{formatDate(c.date)}</span>
                          <span className="text-ink-soft">{formatDate(c.validTill)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-ink-soft" style={{ fontSize: "12px", color: "rgb(165, 165, 165)" }}>{label}</p>
      <p className="text-sm font-semibold text-ink truncate">{value}</p>
    </div>
  );
}
