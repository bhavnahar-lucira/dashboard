"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  RotateCcw,
  Search,
  X,
  Package,
  Tag,
  ChevronDown,
  Calendar,
  Clock,
  RefreshCw,
  ExternalLink,
  Check,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
const SHOP_ADMIN_URL = "https://luciraonline.myshopify.com/admin/discounts";

const emptyDiscount = () => ({
  id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  title: "",
  // Every discount staff create is a code now. "automatic" still exists on
  // records authored before the method picker was removed, and the storefront
  // still honours those, but there's no longer a way to make a new one.
  method: "code",
  discountType: "percentage", // "percentage" | "fixed_amount"
  discountValue: 0,
  appliesTo: "specific_collections", // "specific_collections" | "specific_products"
  selectedCollections: [],
  selectedProducts: [],
  minRequirement: "none", // "none" | "amount" | "quantity"
  minRequirementValue: 0,
  startsAt: "",
  endsAt: "",
  showInDrawer: false,
  isFeatured: false,
  coinsApplicable: false,
  combineCoupons: false,
  origin: "dashboard",
  editable: true,
  isNew: true,
});

const getDiscountErrors = (discount) => {
  const errors = [];
  if (!discount.title?.trim()) errors.push("Discount Title / Code");
  if (!discount.discountValue || discount.discountValue <= 0) errors.push("Discount value");

  if (discount.appliesTo === "specific_collections" && discount.selectedCollections.length === 0) {
    errors.push("Selected collections");
  }
  if (discount.appliesTo === "specific_products" && discount.selectedProducts.length === 0) {
    errors.push("Selected products");
  }

  if (discount.minRequirement === "amount" && (!discount.minRequirementValue || discount.minRequirementValue <= 0)) {
    errors.push("Minimum purchase amount");
  }
  if (discount.minRequirement === "quantity" && (!discount.minRequirementValue || discount.minRequirementValue <= 0)) {
    errors.push("Minimum purchase quantity");
  }
  return errors;
};

const formatINR = (n) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));

const StatusPill = ({ status }) => {
  const map = {
    active: "bg-green-100 text-green-700",
    scheduled: "bg-blue-100 text-blue-700",
    expired: "bg-gray-100 text-gray-500",
    deactivated: "bg-gray-100 text-gray-500",
  };
  const label = { active: "Active", scheduled: "Scheduled", expired: "Expired", deactivated: "Deactivated" }[status] || "Active";
  return <span className={`inline-flex w-fit items-center text-xs font-medium px-2.5 py-1 rounded-full ${map[status] || map.active}`}>{label}</span>;
};

const Toggle = ({ checked, onChange, disabled }) => (
  <span className="relative inline-flex items-center">
    <input type="checkbox" className="sr-only peer" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></span>
  </span>
);

export default function ProductDiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [pendingActionId, setPendingActionId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null); // discount object or null
  const [statusFilter, setStatusFilter] = useState("all");
  const [listSearch, setListSearch] = useState("");

  // Search products/collections
  const [pickerId, setPickerId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fetchDiscounts = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/settings/product-discounts`);
      const data = await res.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error("Failed to fetch product discounts:", error);
      toast.error("Failed to load discounts");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchDiscounts();
      setLoading(false);
    })();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/settings/product-discounts/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      await fetchDiscounts();
      const removedPart = data.removed > 0 ? `, ${data.removed} removed` : "";
      toast.success(`Synced from Shopify — ${data.created} new, ${data.updated} refreshed${removedPart}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (discount) => {
    const errors = getDiscountErrors(discount);
    if (errors.length > 0) {
      toast.error(`Discount rule missing: ${errors.join(", ")}`);
      return;
    }

    setSavingId(discount.id);
    try {
      const res = await fetch(`${BASE_URL}/api/settings/product-discounts/${discount.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(discount),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save discount");

      setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? { ...data.discount, isNew: false } : d)));

      const resolvedCount = (data.discount.resolvedCollectionsCount || 0) + (data.discount.resolvedProductsCount || 0);
      if (discount.appliesTo && resolvedCount === 0) {
        toast.warning("Saved, but 0 products resolved in Shopify for this selection — double-check it.");
      } else {
        toast.success(`"${data.discount.title}" saved and synced to Shopify`);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeactivate = async (discount) => {
    setPendingActionId(discount.id);
    try {
      const res = await fetch(`${BASE_URL}/api/settings/product-discounts/${discount.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deactivate discount");
      setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? { ...d, active: false, status: "deactivated" } : d)));
      toast.success(`"${discount.title}" deactivated`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPendingActionId(null);
      setConfirmDeactivate(null);
    }
  };

  const handleReactivate = async (discount) => {
    setPendingActionId(discount.id);
    try {
      const res = await fetch(`${BASE_URL}/api/settings/product-discounts/${discount.id}/reactivate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reactivate discount");
      setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? { ...d, active: true, status: "active" } : d)));
      toast.success(`"${discount.title}" reactivated`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPendingActionId(null);
    }
  };

  const handleToggleDrawer = async (discount, showInDrawer) => {
    setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? { ...d, showInDrawer } : d)));
    if (discount.isNew) return;
    try {
      const res = await fetch(`${BASE_URL}/api/settings/product-discounts/${discount.id}/drawer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showInDrawer }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(showInDrawer ? `"${discount.title}" now shows in the Saving Zone drawer` : `"${discount.title}" hidden from the Saving Zone drawer`);
    } catch (error) {
      setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? { ...d, showInDrawer: !showInDrawer } : d)));
      toast.error("Failed to update drawer visibility");
    }
  };

  // showInDrawer / isFeatured / coinsApplicable / combineCoupons all persist
  // through the same PATCH, so they share one optimistic-update handler
  // rather than a near-identical copy each.
  const handleToggleFlag = async (discount, field, value, { onLabel, offLabel }) => {
    setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? { ...d, [field]: value } : d)));
    if (discount.isNew) return;
    try {
      const res = await fetch(`${BASE_URL}/api/settings/product-discounts/${discount.id}/drawer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(value ? onLabel : offLabel);
    } catch (error) {
      setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? { ...d, [field]: !value } : d)));
      toast.error("Failed to update setting");
    }
  };

  const handleToggleFeatured = async (discount, isFeatured) => {
    setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? { ...d, isFeatured } : d)));
    if (discount.isNew) return;
    try {
      const res = await fetch(`${BASE_URL}/api/settings/product-discounts/${discount.id}/drawer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(isFeatured ? `"${discount.title}" is now featured` : `"${discount.title}" is no longer featured`);
    } catch (error) {
      setDiscounts((prev) => prev.map((d) => (d.id === discount.id ? { ...d, isFeatured: !isFeatured } : d)));
      toast.error("Failed to update featured status");
    }
  };

  const addDiscount = () => {
    const fresh = emptyDiscount();
    setDiscounts((prev) => [fresh, ...prev]);
    setExpandedId(fresh.id);
  };

  const discardUnsavedNew = (id) => {
    setDiscounts((prev) => prev.filter((d) => d.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateDiscount = (id, updates) => {
    setDiscounts((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const searchShopify = async (query, type = "products") => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const endpoint = type === "collections" ? "/api/products/admin-collections-search" : "/api/products/admin-search";
      const res = await fetch(`${BASE_URL}${endpoint}?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(type === "collections" ? (data.collections || []) : (data.products || []));
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const discountSummary = (d) => {
    const value = d.discountType === "percentage" ? `${d.discountValue || 0}%` : `₹${d.discountValue || 0}`;
    const scope =
      d.appliesTo === "specific_products"
        ? `${d.selectedProducts?.length || 0} product${(d.selectedProducts?.length || 0) === 1 ? "" : "s"}`
        : `${d.selectedCollections?.length || 0} collection${(d.selectedCollections?.length || 0) === 1 ? "" : "s"}`;
    return `${value} off · ${scope}`;
  };

  const visibleDiscounts = discounts
    .map((d, index) => ({ d, index }))
    .filter(({ d }) => {
      const status = d.status || (d.active === false ? "deactivated" : "active");
      if (statusFilter === "drawer") {
        if (!d.showInDrawer) return false;
      } else if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }
      if (listSearch && !(d.title || "Untitled discount").toLowerCase().includes(listSearch.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      const aActive = a.d.active !== false;
      const bActive = b.d.active !== false;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-gray-900 text-[24px] font-bold font-figtree tracking-[0.1px]">Product Discounts</h1>
          <p className="text-sm text-gray-500 mt-1" style={{ marginTop: "2px", fontSize: "16px", color: "#000" }}>
            Every rule here creates or updates a real discount in Shopify.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-[8px] font-bold text-sm transition-all disabled:opacity-70"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync from Shopify"}
          </button>
          <button
            onClick={addDiscount}
            className="flex items-center gap-2 bg-primary hover:bg-[#8F5D5D] text-white px-6 py-2.5 rounded-[8px] font-bold text-sm transition-all"
          >
            <Plus size={16} /> Add Discount
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-[8px] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Discount rules</h2>
          <span className="text-xs text-gray-400">{discounts.length} total</span>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-[8px] px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="deactivated">Deactivated</option>
            <option value="expired">Expired</option>
            <option value="drawer">In Cart Drawer</option>
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Search and filter"
              className="w-full border border-gray-200 rounded-[8px] pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          {visibleDiscounts.length > 0 && (
            <div className="grid grid-cols-[1fr_90px_90px_130px_130px_20px] gap-4 divide-x divide-gray-200 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 [&>span]:pl-4 [&>span:first-child]:pl-0">
              <span>Title</span>
              <span>Status</span>
              <span>Method</span>
              <span>Origin</span>
              <span>Value</span>
              <span />
            </div>
          )}

          {visibleDiscounts.map(({ d: discount }) => {
            const isExpanded = expandedId === discount.id;
            const isSaving = savingId === discount.id;
            const isPending = pendingActionId === discount.id;
            const isEditable = discount.editable !== false;
            const status = discount.status || (discount.active === false ? "deactivated" : "active");
            const resolvedCount = (discount.resolvedCollectionsCount || 0) + (discount.resolvedProductsCount || 0);
            const showResolvedWarning =
              discount.shopifyDiscountId &&
              discount.appliesTo &&
              (discount.selectedCollections?.length > 0 || discount.selectedProducts?.length > 0) &&
              resolvedCount === 0;

            return (
              <div key={discount.id} className="border-b border-gray-100 last:border-0">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : discount.id)}
                  className="w-full grid grid-cols-[1fr_90px_90px_130px_130px_20px] gap-4 divide-x divide-gray-100 px-5 py-4 items-center text-left hover:bg-gray-50 transition-colors [&>*]:pl-4 [&>*:first-child]:pl-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{discount.title || "Untitled discount"}</p>
                    <p className="text-xs text-gray-500 truncate" style={{ marginTop: "8px", fontSize: "12px", color: "rgb(165, 165, 165)" }}>
                      {isEditable ? discountSummary(discount) : discount.summary || discount.shopifyType}
                    </p>
                  </div>
                  <StatusPill status={status} />
                  <span className="text-xs text-gray-500">{discount.method === "code" ? "Discount Code" : "Automatic"}</span>
                  <span className="text-xs text-gray-500">{discount.origin === "shopify" ? "Synced" : "Dashboard"}</span>
                  <span className="inline-flex w-fit items-center gap-1.5 text-xs text-gray-700">
                    <Tag size={13} className="text-gray-400" />
                    {discount.discountType === "percentage" ? `${discount.discountValue || 0}%` : `₹${discount.discountValue || 0}`}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {isExpanded && !isEditable && (
                  <div className="px-5 pb-5 pt-4 bg-gray-50/60 border-t border-gray-100 space-y-2">
                    <p className="text-sm text-gray-600">{discount.summary || "This discount type isn't editable from the dashboard yet."}</p>
                    <a
                      href={discount.shopifyDiscountId ? `${SHOP_ADMIN_URL}/${discount.shopifyDiscountId.split("/").pop()}` : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-[#8F5D5D]"
                    >
                      <ExternalLink size={13} /> Manage in Shopify admin
                    </a>
                  </div>
                )}

                {isExpanded && isEditable && (
                  <div className="px-5 pb-5 pt-4 bg-gray-50/60 border-t border-gray-100">
                    {showResolvedWarning && (
                      <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-[8px] text-amber-700 text-sm">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>
                          0 products resolved in Shopify for the current selection. The discount was saved but won't discount anything until
                          this is fixed — the collection/product may have been removed.
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
                      {/* Left column — editable form, one bordered card per section */}
                      <div className="space-y-4 min-w-0">
                        <div className="bg-white border border-gray-200 rounded-[8px] p-5">
                          <h4 className="text-sm font-bold text-gray-900 mb-4">Method &amp; code</h4>
                          {/* The Automatic option is gone — every new discount is
                              a code. Legacy automatic records still open here and
                              still work on the storefront, so they say so rather
                              than silently presenting as codes. */}
                          {discount.method === "automatic" ? (
                            <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-[8px] text-amber-700 text-sm">
                              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                              <span>
                                This is an older automatic discount. It still applies on the storefront, but new discounts can only be
                                created as codes.
                              </span>
                            </div>
                          ) : (
                            <div className="flex gap-4 mb-4">
                              <div className="flex-1 flex items-center justify-center gap-2 p-3 rounded-[8px] border border-primary bg-primary/5 text-primary font-bold text-sm">
                                Discount code
                              </div>
                            </div>
                          )}

                          <label className="text-xs font-medium text-gray-700 block mb-1.5">
                            {discount.method === "code" ? "Discount code" : "Title"} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={discount.title || ""}
                            onChange={(e) => updateDiscount(discount.id, { title: e.target.value })}
                            className={`w-full border rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                              discount.title?.trim() ? "border-gray-300" : "border-red-300"
                            }`}
                            placeholder={discount.method === "code" ? "e.g. SUMMER20" : "e.g. Summer Sale 20% Off"}
                          />
                          {discount.method === "code" && (
                            <p className="text-xs text-gray-500 mt-1.5" style={{ marginTop: "8px", fontSize: "12px", color: "rgb(165, 165, 165)" }}>
                              Customers enter this at checkout. This becomes the actual code in Shopify.
                            </p>
                          )}
                        </div>

                        <div className="bg-white border border-gray-200 rounded-[8px] p-5">
                          <h4 className="text-sm font-bold text-gray-900 mb-4">Discount value</h4>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1.5">Type</label>
                              <select
                                value={discount.discountType}
                                onChange={(e) => updateDiscount(discount.id, { discountType: e.target.value })}
                                className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              >
                                <option value="percentage">Percentage</option>
                                <option value="fixed_amount">Fixed amount</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 block mb-1.5">Value <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <input
                                  type="number"
                                  value={discount.discountValue || ""}
                                  onChange={(e) => updateDiscount(discount.id, { discountValue: Number(e.target.value) })}
                                  className={`w-full border rounded-[8px] pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                                    discount.discountValue > 0 ? "border-gray-300" : "border-red-300"
                                  }`}
                                  placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                  {discount.discountType === "percentage" ? "%" : "₹"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <label className="text-xs font-medium text-gray-700 block mb-1.5">Applies to</label>
                          <select
                            value={discount.appliesTo}
                            onChange={(e) => updateDiscount(discount.id, { appliesTo: e.target.value, selectedCollections: [], selectedProducts: [] })}
                            className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-3"
                          >
                            <option value="specific_collections">Specific collections</option>
                            <option value="specific_products">Specific products</option>
                          </select>

                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              value={pickerId === discount.id ? searchTerm : ""}
                              onChange={(e) => {
                                setPickerId(discount.id);
                                setSearchTerm(e.target.value);
                                searchShopify(e.target.value, discount.appliesTo === "specific_collections" ? "collections" : "products");
                              }}
                              onFocus={() => setPickerId(discount.id)}
                              className="w-full border border-gray-200 rounded-[8px] pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              placeholder={`Search ${discount.appliesTo === "specific_collections" ? "collections" : "products"}`}
                            />
                            {pickerId === discount.id && searching && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
                            )}
                            {pickerId === discount.id && searchResults.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-[8px] shadow-xl max-h-60 overflow-y-auto">
                                {searchResults.map((p) => (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      const list =
                                        discount.appliesTo === "specific_collections" ? [...discount.selectedCollections] : [...discount.selectedProducts];
                                      if (!list.find((x) => x.id === p.id)) {
                                        list.push({ id: p.id, title: p.title });
                                        updateDiscount(
                                          discount.id,
                                          discount.appliesTo === "specific_collections" ? { selectedCollections: list } : { selectedProducts: list }
                                        );
                                      }
                                      setPickerId(null);
                                      setSearchTerm("");
                                      setSearchResults([]);
                                    }}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                                  >
                                    {p.image?.src && <img src={p.image.src} className="w-8 h-8 rounded-[8px] object-cover" alt="" />}
                                    <span className="text-sm font-medium text-gray-900">{p.title}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mt-2 space-y-2">
                            {(discount.appliesTo === "specific_collections" ? discount.selectedCollections : discount.selectedProducts).map((item) => (
                              <div key={item.id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-[8px]">
                                <span className="text-sm font-medium text-gray-900">{item.title}</span>
                                <button
                                  onClick={() => {
                                    if (discount.appliesTo === "specific_collections") {
                                      updateDiscount(discount.id, { selectedCollections: discount.selectedCollections.filter((x) => x.id !== item.id) });
                                    } else {
                                      updateDiscount(discount.id, { selectedProducts: discount.selectedProducts.filter((x) => x.id !== item.id) });
                                    }
                                  }}
                                  className="p-1 hover:bg-red-50 hover:text-red-500 rounded-[8px] text-gray-400"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-[8px] p-5">
                          <h4 className="text-sm font-bold text-gray-900 mb-4">Minimum purchase requirements</h4>
                          <div className="space-y-2 mb-4">
                            <label className="flex items-center gap-2.5 text-sm text-gray-900 cursor-pointer">
                              <input
                                type="radio"
                                name={`req_${discount.id}`}
                                checked={discount.minRequirement === "none"}
                                onChange={() => updateDiscount(discount.id, { minRequirement: "none" })}
                                className="accent-primary"
                              />
                              No minimum requirements
                            </label>
                            <label className="flex items-center gap-2.5 text-sm text-gray-900 cursor-pointer">
                              <input
                                type="radio"
                                name={`req_${discount.id}`}
                                checked={discount.minRequirement === "amount"}
                                onChange={() => updateDiscount(discount.id, { minRequirement: "amount" })}
                                className="accent-primary"
                              />
                              Minimum purchase amount (₹)
                            </label>
                            <label className="flex items-center gap-2.5 text-sm text-gray-900 cursor-pointer">
                              <input
                                type="radio"
                                name={`req_${discount.id}`}
                                checked={discount.minRequirement === "quantity"}
                                onChange={() => updateDiscount(discount.id, { minRequirement: "quantity" })}
                                className="accent-primary"
                              />
                              Minimum quantity of items
                            </label>
                          </div>
                          {discount.minRequirement !== "none" && (
                            <input
                              type="number"
                              value={discount.minRequirementValue || ""}
                              onChange={(e) => updateDiscount(discount.id, { minRequirementValue: Number(e.target.value) })}
                              className="w-full max-w-[200px] border border-gray-300 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              placeholder={discount.minRequirement === "amount" ? "e.g. 5000" : "e.g. 2"}
                            />
                          )}
                        </div>

                        <div className="bg-white border border-gray-200 rounded-[8px] p-5">
                          <h4 className="text-sm font-bold text-gray-900 mb-4">Active dates</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                                <Calendar size={13} /> Start date &amp; time
                              </label>
                              <input
                                type="datetime-local"
                                value={discount.startsAt ? discount.startsAt.slice(0, 16) : ""}
                                onChange={(e) => updateDiscount(discount.id, { startsAt: e.target.value })}
                                className="w-full border border-gray-300 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                                <Clock size={13} /> End date &amp; time
                              </label>
                              <input
                                type="datetime-local"
                                value={discount.endsAt ? discount.endsAt.slice(0, 16) : ""}
                                onChange={(e) => updateDiscount(discount.id, { endsAt: e.target.value })}
                                className="w-full border border-gray-300 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-6">
                          {status === "deactivated" ? (
                            <button
                              onClick={() => handleReactivate(discount)}
                              disabled={isPending}
                              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                            >
                              {isPending ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                              Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => (discount.isNew ? discardUnsavedNew(discount.id) : setConfirmDeactivate(discount))}
                              disabled={isPending}
                              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                            >
                              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              {discount.isNew ? "Discard" : "Deactivate"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right column — summary sidebar, mirrors Free Gift Tiers */}
                      <div className="bg-white border border-gray-200 rounded-[8px] p-5 space-y-4">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{discount.title || "Untitled discount"}</p>
                            <StatusPill status={status} />
                          </div>
                          <p className="text-xs text-gray-500" style={{ marginTop: "8px", fontSize: "12px", color: "rgb(165, 165, 165)" }}>
                            {discount.origin === "shopify" ? "Synced from Shopify" : "Created in dashboard"}
                          </p>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-bold text-gray-900">Show in Saving Zone drawer</span>
                            <Toggle checked={discount.showInDrawer} onChange={(val) => handleToggleDrawer(discount, val)} />
                          </label>
                          <p className="text-xs text-gray-500 mt-2" style={{ fontSize: "12px", color: "rgb(165, 165, 165)" }}>
                            {discount.method === "automatic"
                              ? "On: this becomes a claim-gated discount — it stops applying silently and instead shows a \"Claim\" card in the drawer."
                              : "Controls whether this code appears in the cart's \"Saving Zone\" drawer for customers to grab."}
                          </p>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-bold text-gray-900">Featured Offer (Cart Banner)</span>
                            <Toggle checked={discount.isFeatured} onChange={(val) => handleToggleFeatured(discount, val)} />
                          </label>
                          <p className="text-xs text-gray-500 mt-2" style={{ fontSize: "12px", color: "rgb(165, 165, 165)" }}>
                            {discount.method === "automatic"
                              ? "Shows a prominent banner above the Apply Coupon block (where the bracelet offer sits) — claimed the same way. Only the highest value featured offer applies."
                              : "Shows a prominent banner above the Apply Coupon block. Claiming it submits this code automatically — the customer never has to type it in. Only the highest value featured offer applies."}
                          </p>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-bold text-gray-900">Lucira Coins applicable</span>
                            <Toggle
                              checked={discount.coinsApplicable === true}
                              onChange={(val) =>
                                handleToggleFlag(discount, "coinsApplicable", val, {
                                  onLabel: `Lucira Coins can now be redeemed with "${discount.title}"`,
                                  offLabel: `Lucira Coins no longer apply with "${discount.title}"`,
                                })
                              }
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-2" style={{ fontSize: "12px", color: "rgb(165, 165, 165)" }}>
                            On: a customer can redeem Lucira Coins on top of this discount. Off: applying it clears any coins they had redeemed.
                          </p>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                          <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-bold text-gray-900">Combine coupons</span>
                            <Toggle
                              checked={discount.combineCoupons === true}
                              onChange={(val) =>
                                handleToggleFlag(discount, "combineCoupons", val, {
                                  onLabel: `"${discount.title}" can now combine with other discounts`,
                                  offLabel: `"${discount.title}" no longer combines with other discounts`,
                                })
                              }
                            />
                          </label>
                          <p className="text-xs text-gray-500 mt-2" style={{ fontSize: "12px", color: "rgb(165, 165, 165)" }}>
                            On: Shopify will let this stack with other order, product and shipping discounts. Off: it applies on its own. Save &amp; sync to push the change to Shopify.
                          </p>
                        </div>

                        {discount.shopifyDiscountId && (
                          <div className="border-t border-gray-100 pt-4">
                            <a
                              href={`${SHOP_ADMIN_URL}/${discount.shopifyDiscountId.split("/").pop()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-[#8F5D5D]"
                            >
                              <ExternalLink size={13} /> View in Shopify admin
                            </a>
                          </div>
                        )}

                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs font-bold text-gray-900 mb-2">Details</p>
                          <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                            <li>{discountSummary(discount)}</li>
                            {discount.minRequirement === "amount" && discount.minRequirementValue > 0 && (
                              <li>Min. purchase {formatINR(discount.minRequirementValue)}</li>
                            )}
                            {discount.minRequirement === "quantity" && discount.minRequirementValue > 0 && (
                              <li>Min. {discount.minRequirementValue} items</li>
                            )}
                            {discount.lastSyncedAt && <li>Last synced {new Date(discount.lastSyncedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</li>}
                            {!discount.lastSyncedAt && <li>Not yet synced to Shopify</li>}
                          </ul>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                          <button
                            onClick={() => handleSave(discount)}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-[#8F5D5D] text-white px-4 py-2.5 rounded-[8px] font-bold text-sm transition-all disabled:opacity-70"
                          >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {isSaving ? "Saving…" : "Save & sync to Shopify"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {visibleDiscounts.length === 0 && (
            <div className="text-center py-12 text-gray-400 italic">
              {discounts.length === 0 ? (
                <div className="space-y-4 not-italic">
                  <Tag size={32} className="mx-auto text-gray-300" />
                  <p>No product discounts yet.</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={handleSync} disabled={syncing} className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-[8px] font-bold text-sm transition-all">
                      <RefreshCw size={15} className={syncing ? "animate-spin" : ""} /> Sync from Shopify
                    </button>
                    <button onClick={addDiscount} className="flex items-center gap-2 bg-primary hover:bg-[#8F5D5D] text-white px-4 py-2 rounded-[8px] font-bold text-sm transition-all">
                      <Plus size={15} /> Create Discount
                    </button>
                  </div>
                </div>
              ) : (
                "No discounts match this filter."
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-[8px] p-4 flex gap-3 text-blue-800">
        <Info size={20} className="shrink-0" />
        <div className="space-y-2">
          <p className="text-sm font-bold">Important Instructions:</p>
          <ul className="text-xs list-disc ml-4 space-y-1">
            <li>Saving a rule here creates or updates the real discount in Shopify — cart and checkout validate coupons directly against Shopify.</li>
            <li>Buy X Get Y and Free Shipping discounts sync in read-only from Shopify; manage those directly in Shopify admin.</li>
            <li>Deactivating a rule deactivates it in Shopify too (history stays intact) rather than deleting it — reactivate any time.</li>
            <li>"Show in Saving Zone drawer" only controls storefront visibility — it never touches Shopify.</li>
          </ul>
        </div>
      </div>

      <div
        className={`fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 ${confirmDeactivate ? "" : "hidden"}`}
        onClick={() => setConfirmDeactivate(null)}
      >
        {confirmDeactivate && (
          <div className="bg-white rounded-[8px] shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 mb-2">Deactivate "{confirmDeactivate.title}"?</h3>
            <p className="text-sm text-gray-500 mb-6">
              {confirmDeactivate.shopifyDiscountId
                ? "This deactivates the discount in Shopify too (its history stays intact) and stops it from applying in the cart. You can reactivate it later."
                : "This removes the rule from the active list. You can reactivate it later."}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeactivate(null)} className="px-4 py-2 rounded-[8px] border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => handleDeactivate(confirmDeactivate)} className="px-4 py-2 rounded-[8px] bg-red-500 hover:bg-red-600 text-white text-sm font-bold">
                Deactivate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
