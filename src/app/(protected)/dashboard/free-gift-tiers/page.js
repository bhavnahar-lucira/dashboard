"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Loader2, Plus, Trash2, Info, Search, X, Package, Tag, ChevronDown, Copy } from "lucide-react";
import { toast } from "react-toastify";

const emptyTier = () => ({
  title: "",
  enabled: true,
  // Off means claiming this gift clears any redeemed Lucira Coins, which is
  // how the gift offer has always behaved.
  coinsApplicable: false,
  // Off means claiming this gift removes an applied coupon (and applying a
  // coupon removes this gift) — the long-standing exclusive behavior.
  combineCoupons: false,
  min: 0,
  minQuantity: 1,
  triggerType: "amount", // "amount" | "quantity"
  rewardType: "free", // "free" | "percentage" | "amount_off"
  rewardPercentage: 0,
  rewardAmountOff: 0,
  giftTitle: "",
  giftWorthValue: 0,
  giftProductId: "",
  giftVariantId: "",
  giftImage: "",
  startsAt: "",
  endsAt: "",
  appliesTo: "diamond_value",
  bannerImage: "",
  bannerText: "",
});

const tierSummary = (tier) => {
  const triggerMet = tier.triggerType === "quantity" ? tier.minQuantity > 0 : tier.min > 0;
  if (!triggerMet || !tier.giftVariantId) return "Set a trigger and a gift below";

  const trigger = tier.triggerType === "quantity"
    ? `Buy ${tier.minQuantity}+ item${tier.minQuantity === 1 ? "" : "s"}`
    : `Spend ${formatINR(tier.min)}+`;

  const reward = tier.rewardType === "percentage"
    ? `get ${tier.rewardPercentage || 0}% off`
    : tier.rewardType === "amount_off"
      ? `get ${formatINR(tier.rewardAmountOff)} off`
      : "get 1 item free";

  return `${trigger}, ${reward}`;
};

// Mirrors the backend's own isTierLive (checkout.js/cartPricing.js) so the
// list's status pill and the storefront agree with what checkout will
// actually enforce — a scheduled-but-not-yet-started rule reads "Scheduled"
// here rather than "Active", instead of only failing silently at checkout.
const tierScheduleState = (tier) => {
  const now = Date.now();
  if (tier.startsAt && new Date(tier.startsAt).getTime() > now) return "scheduled";
  if (tier.endsAt && new Date(tier.endsAt).getTime() < now) return "expired";
  return "live";
};

// A rule missing any of these can't run: no title means every rule reads as
// "Untitled rule" in the list, no min means every cart instantly qualifies,
// no gift/worth means there's nothing to actually add to the order.
const getTierErrors = (tier) => {
  const errors = [];
  if (!tier.title?.trim()) errors.push("Rule title");
  if (tier.triggerType === "quantity") {
    if (!tier.minQuantity || tier.minQuantity <= 0) errors.push("Quantity");
  } else if (!tier.min || tier.min <= 0) {
    errors.push("Minimum purchase amount");
  }
  if (!tier.giftVariantId) errors.push("Gift product");
  if (!tier.giftTitle?.trim()) errors.push("Gift title shown to customer");
  if (!tier.giftWorthValue || tier.giftWorthValue <= 0) errors.push('Displayed as "worth"');
  if (tier.rewardType === "percentage" && (!tier.rewardPercentage || tier.rewardPercentage <= 0)) {
    errors.push("Discount percentage");
  }
  if (tier.rewardType === "amount_off" && (!tier.rewardAmountOff || tier.rewardAmountOff <= 0)) {
    errors.push("Amount off each");
  }
  return errors;
};

const formatINR = (n) => "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));

export default function FreeGiftTiersPage() {
  const [settings, setSettings] = useState({ enabled: true, tiers: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Which rule's row is expanded into its editor — one at a time, list-style.
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [listSearch, setListSearch] = useState("");

  // Product picker — one active picker at a time (which tier index it's open
  // for), same pattern as the hotspot product picker on Curated Looks.
  const [pickerTierIndex, setPickerTierIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [variantChoice, setVariantChoice] = useState(null); // { product, variants }
  const searchInputRef = useRef(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const res = await fetch(`${baseUrl}/api/settings/silver-bracelet`);
        const data = await res.json();
        setSettings({
          enabled: data.enabled ?? true,
          tiers: data.tiers || []
        });
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const firstInvalidIndex = settings.tiers.findIndex((tier) => getTierErrors(tier).length > 0);
    if (firstInvalidIndex !== -1) {
      const errors = getTierErrors(settings.tiers[firstInvalidIndex]);
      setExpandedIndex(firstInvalidIndex);
      toast.error(`"${settings.tiers[firstInvalidIndex].title || "Untitled rule"}" is missing: ${errors.join(", ")}`);
      return;
    }

    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/settings/silver-bracelet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        toast.success("Settings saved successfully");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    setSettings({ ...settings, tiers: [...settings.tiers, emptyTier()] });
    setExpandedIndex(settings.tiers.length); // jump straight into editing the new rule
  };
  const removeTier = (index) => {
    const newTiers = [...settings.tiers];
    newTiers.splice(index, 1);
    setSettings({ ...settings, tiers: newTiers });
    if (expandedIndex === index) setExpandedIndex(null);
  };
  const duplicateTier = (index) => {
    const tierToCopy = settings.tiers[index];
    const newTier = {
      ...tierToCopy,
      id: Math.random().toString(36).substr(2, 9),
      title: `${tierToCopy.title || "Untitled rule"} (Copy)`
    };
    const newTiers = [...settings.tiers];
    newTiers.splice(index + 1, 0, newTier);
    setSettings({ ...settings, tiers: newTiers });
    setExpandedIndex(index + 1);
  };
  const updateTier = (index, field, value) => {
    setSettings(prev => {
      const newTiers = [...prev.tiers];
      newTiers[index] = { ...newTiers[index], [field]: value };
      return { ...prev, tiers: newTiers };
    });
  };

  // --- Product picker -------------------------------------------------

  const openPicker = (index) => {
    setPickerTierIndex(index);
    setSearchTerm("");
    setSearchResults([]);
    setVariantChoice(null);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const closePicker = () => {
    setPickerTierIndex(null);
    setSearchTerm("");
    setSearchResults([]);
    setVariantChoice(null);
  };

  // Hits /admin-search (Shopify Admin API), not the storefront search index —
  // a gift product is routinely set to Unlisted so shoppers can't browse or
  // buy it directly, and the storefront-facing search would never surface it.
  const searchProducts = async (q) => {
    if (!q) return setSearchResults([]);
    setSearching(true);
    try {
      const res = await fetch("/api/products/admin-search?q=" + encodeURIComponent(q) + "&limit=8");
      const data = await res.json();
      setSearchResults(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (searchTerm) searchProducts(searchTerm); else setSearchResults([]); }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // A product can have multiple variants (size/color); the gift has to be one
  // exact variant, so a single-variant product applies immediately and a
  // multi-variant one asks which variant before applying anything. Variants
  // come back inline with the search result, no second request needed.
  const pickProduct = (product) => {
    const variants = product.variants || [];
    if (variants.length <= 1) {
      applyVariant(product, variants[0] || null);
    } else {
      setVariantChoice({ product, variants });
    }
  };

  const applyVariant = (product, variant) => {
    if (pickerTierIndex === null) return;
    updateTier(pickerTierIndex, "giftProductId", product.id || product.shopifyId);
    updateTier(pickerTierIndex, "giftVariantId", variant?.shopifyId || "");
    updateTier(pickerTierIndex, "giftTitle", product.title);
    updateTier(pickerTierIndex, "giftImage", variant?.image || product.image || "");
    updateTier(pickerTierIndex, "giftWorthValue", Math.round(variant?.price || product.price || 0));
    closePicker();
  };

  // Keeps each row's original position in settings.tiers (needed by
  // updateTier/removeTier/openPicker, which all index into that array)
  // while letting the filter/search bar hide rows without reordering state.
  const visibleTiers = settings.tiers
    .map((tier, index) => ({ tier, index }))
    .filter(({ tier }) => {
      if (statusFilter === "active" && tier.enabled === false) return false;
      if (statusFilter === "disabled" && tier.enabled !== false) return false;
      if (listSearch && !(tier.title || "Untitled rule").toLowerCase().includes(listSearch.toLowerCase())) return false;
      return true;
    })
    // Newest first, by creation time. `id` is `tier_<Date.now()>_<rand>` for
    // every rule (assigned server-side on first save — see cleanTiers in
    // routes/settings.js), so its embedded timestamp is a creation-order
    // proxy without needing a stored field.
    //
    // Previously this sorted active-first, disabled-last — disabling a rule
    // via the toggle silently dropped it toward the bottom of the list,
    // which read as the row vanishing (same issue Product Discounts had).
    // Status is shown via the pill instead of implied by position.
    .sort((a, b) => {
      const createdAt = (t) => parseInt(String(t.id || "").split("_")[1], 10) || 0;
      return createdAt(b.tier) - createdAt(a.tier);
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
          <h1 className="text-gray-900 text-[24px] font-bold font-figtree tracking-[0.1px]" >Free Gift Tiers</h1>
          <p className="text-sm text-gray-500 mt-1" style={{ marginTop: '2px', fontSize: '16px', color: '#000' }}>Manage the free-gift-with-purchase ladder shown in the cart</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-[#8F5D5D] text-white px-6 py-2.5 rounded-[8px] font-bold text-sm transition-all disabled:opacity-70"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          SAVE CHANGES
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-[8px] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Buy X Get Y rules</h2>
          <button
            onClick={addTier}
            className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-[8px] transition-colors"
          >
            <Plus size={15} />
            Create rule
          </button>
        </div>

        {/* Filter bar — same affordance as the Shopify Discounts list: a scope
            dropdown plus a live search, even though ours only filters by title
            client-side (no server-side discount list to page through). */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-[8px] px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-primary"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
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
          {visibleTiers.length > 0 && (
            <div className="grid grid-cols-[1fr_90px_90px_130px_130px_20px] gap-4 divide-x divide-gray-200 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 [&>span]:pl-4 [&>span:first-child]:pl-0">
              <span>Title</span>
              <span>Status</span>
              <span>Method</span>
              <span>Eligibility</span>
              <span>Type</span>
              <span />
            </div>
          )}

          {visibleTiers.map(({ tier, index }) => {
                const isOpen = expandedIndex === index;
                return (
                  <div key={index} className="border-b border-gray-100 last:border-0">
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(isOpen ? null : index)}
                      className="w-full grid grid-cols-[1fr_90px_90px_130px_130px_20px] gap-4 divide-x divide-gray-100 px-5 py-4 items-center text-left hover:bg-gray-50 transition-colors [&>*]:pl-4 [&>*:first-child]:pl-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{tier.title || "Untitled rule"}</p>
                        <p className="text-xs text-gray-500 truncate" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>{tierSummary(tier)}</p>
                      </div>
                      {getTierErrors(tier).length > 0 ? (
                        <span className="inline-flex w-fit items-center text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                          Incomplete
                        </span>
                      ) : tier.enabled === false ? (
                        <span className="inline-flex w-fit items-center text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                          Disabled
                        </span>
                      ) : tierScheduleState(tier) === "scheduled" ? (
                        <span className="inline-flex w-fit items-center text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                          Scheduled
                        </span>
                      ) : tierScheduleState(tier) === "expired" ? (
                        <span className="inline-flex w-fit items-center text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex w-fit items-center text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          Active
                        </span>
                      )}
                      <span className="text-xs text-gray-500">Automatic</span>
                      <span className="text-xs text-gray-500">All customers</span>
                      <span className="inline-flex w-fit items-center gap-1.5 text-xs text-gray-700">
                        <Tag size={13} className="text-gray-400" />
                        Buy X get Y
                      </span>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-4 bg-gray-50/60 border-t border-gray-100">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
                          {/* Left column — the editable form, one Shopify-style
                              card per section rather than one continuous panel. */}
                          <div className="space-y-4 min-w-0">
                            <div className="bg-white border border-gray-200 rounded-[8px] p-5">
                              <h4 className="text-sm font-bold text-gray-900 mb-4">Buy X get Y</h4>
                              <label className="text-xs font-medium text-gray-700 block mb-1.5">Title <span className="text-red-500">*</span></label>
                              <input
                                type="text"
                                value={tier.title}
                                onChange={(e) => updateTier(index, 'title', e.target.value)}
                                placeholder="e.g. FREE SILVER BRACELET"
                                className={`w-full border rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                                  tier.title?.trim() ? "border-gray-300" : "border-red-300"
                                }`}
                              />
                              <p className="text-xs text-gray-500 mt-1.5" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>Customers will see this in their cart and at checkout.</p>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-[8px] p-5">
                              <h4 className="text-sm font-bold text-gray-900 mb-4">Customer spends</h4>
                              <div className="space-y-2.5 mb-4">
                                <label className="flex items-center gap-2.5 text-sm text-gray-900 cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={tier.triggerType === "quantity"}
                                    onChange={() => updateTier(index, 'triggerType', 'quantity')}
                                    className="accent-primary"
                                  />
                                  Minimum quantity of items
                                </label>
                                <label className="flex items-center gap-2.5 text-sm text-gray-900 cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={tier.triggerType !== "quantity"}
                                    onChange={() => updateTier(index, 'triggerType', 'amount')}
                                    className="accent-primary"
                                  />
                                  Minimum purchase amount
                                </label>
                              </div>

                              {tier.triggerType === "quantity" ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Quantity <span className="text-red-500">*</span></label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={tier.minQuantity}
                                      onChange={(e) => updateTier(index, 'minQuantity', e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                                      className={`w-full border rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                                        tier.minQuantity > 0 ? "border-gray-300" : "border-red-300"
                                      }`}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Any items from</label>
                                    <select
                                      value={tier.appliesTo || "diamond_value"}
                                      onChange={(e) => updateTier(index, 'appliesTo', e.target.value)}
                                      className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                      <option value="diamond_value">Diamond-value items</option>
                                      <option value="all_items">All items</option>
                                    </select>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Amount <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                      <input
                                        type="number"
                                        value={tier.min}
                                        onChange={(e) => updateTier(index, 'min', e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                                        className={`w-full border rounded-[8px] pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                                          tier.min > 0 ? "border-gray-300" : "border-red-300"
                                        }`}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-700 block mb-1.5">Any items from</label>
                                    <select
                                      value={tier.appliesTo || "diamond_value"}
                                      onChange={(e) => updateTier(index, 'appliesTo', e.target.value)}
                                      className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                      <option value="diamond_value">Diamond-value items</option>
                                      <option value="all_items">All items</option>
                                    </select>
                                  </div>
                                </div>
                              )}

                            </div>

                            <div className="bg-white border border-gray-200 rounded-[8px] p-5">
                              <h4 className="text-sm font-bold text-gray-900">Customer gets <span className="text-red-500 font-normal text-xs">*</span></h4>
                              <p className="text-xs text-gray-500 mt-0.5 mb-4" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>This exact product is added to the order for free once the above is met.</p>

                              <div className="mb-4 max-w-[120px]">
                                <label className="text-xs font-medium text-gray-700 block mb-1.5">Quantity</label>
                                <div className="border border-gray-200 rounded-[8px] px-3 py-2 text-sm text-gray-500 bg-gray-50">1</div>
                              </div>

                              {tier.giftVariantId ? (
                                <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-[8px]">
                                  <div className="w-[40px] h-[40px] rounded-[8px] border border-gray-100 overflow-hidden shrink-0 bg-gray-50">
                                    {tier.giftImage ? (
                                      <img src={tier.giftImage} alt={tier.giftTitle} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={18} /></div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{tier.giftTitle || "Untitled product"}</p>
                                    <p className="text-xs text-gray-400 font-mono truncate">{tier.giftVariantId}</p>
                                  </div>
                                  <button
                                    onClick={() => openPicker(index)}
                                    className="text-xs font-bold text-primary hover:text-[#8F5D5D] shrink-0 px-2"
                                  >
                                    CHANGE
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => openPicker(index)}
                                  className="w-full flex items-center gap-2 border border-red-300 rounded-[8px] px-4 py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors bg-white"
                                >
                                  <Search size={15} />
                                  Search products
                                </button>
                              )}

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Gift title shown to customer <span className="text-red-500">*</span></label>
                                  <input
                                    type="text"
                                    value={tier.giftTitle}
                                    onChange={(e) => updateTier(index, 'giftTitle', e.target.value)}
                                    placeholder="e.g. Diamond Bracelet"
                                    className={`w-full border rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                                      tier.giftTitle?.trim() ? "border-gray-300" : "border-red-300"
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Displayed as "worth" (₹) <span className="text-red-500">*</span></label>
                                  <input
                                    type="number"
                                    value={tier.giftWorthValue}
                                    onChange={(e) => updateTier(index, 'giftWorthValue', e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                                    className={`w-full border rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                                      tier.giftWorthValue > 0 ? "border-gray-300" : "border-red-300"
                                    }`}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Custom Banner Text (Optional)</label>
                                  <input
                                    type="text"
                                    value={tier.bannerText || ""}
                                    onChange={(e) => updateTier(index, 'bannerText', e.target.value)}
                                    placeholder="e.g. You've unlocked a FREE Gold Coin!"
                                    className="w-full border border-gray-300 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Custom Banner Image URL (Optional)</label>
                                  <div className="flex items-center gap-3">
                                    {tier.bannerImage && (
                                      <div className="w-[40px] h-[40px] rounded-[8px] border border-gray-100 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
                                        <img src={tier.bannerImage} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                                      </div>
                                    )}
                                    <input
                                      type="text"
                                      value={tier.bannerImage || ""}
                                      onChange={(e) => updateTier(index, 'bannerImage', e.target.value)}
                                      placeholder="https://..."
                                      className="flex-1 w-full border border-gray-300 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Stacked, not a 2-col grid — "At a discounted
                                  value" grows tall (3 radios, 2 with a
                                  conditional sub-field) while "Allocation
                                  limit" is a single input; paired side by
                                  side, the grid row's height follows the
                                  taller column and leaves a dead gap under
                                  the shorter one. */}
                              <div className="space-y-4 mt-4 pt-4 border-t border-gray-100">
                                <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1.5">At a discounted value</label>
                                  <div className="space-y-2">
                                    <label className="flex items-center gap-2.5 text-sm text-gray-900 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={tier.rewardType === "percentage"}
                                        onChange={() => updateTier(index, 'rewardType', 'percentage')}
                                        className="accent-primary"
                                      />
                                      Percentage
                                    </label>
                                    {tier.rewardType === "percentage" && (
                                      <div className="relative max-w-[160px] ml-6">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={tier.rewardPercentage}
                                          onChange={(e) => updateTier(index, 'rewardPercentage', e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))}
                                          className={`w-full border rounded-[8px] pr-7 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                                            tier.rewardPercentage > 0 ? "border-gray-300" : "border-red-300"
                                          }`}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                                      </div>
                                    )}
                                    <label className="flex items-center gap-2.5 text-sm text-gray-900 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={tier.rewardType === "amount_off"}
                                        onChange={() => updateTier(index, 'rewardType', 'amount_off')}
                                        className="accent-primary"
                                      />
                                      Amount off each
                                    </label>
                                    {tier.rewardType === "amount_off" && (
                                      <div className="relative max-w-[160px] ml-6">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                        <input
                                          type="number"
                                          min="0"
                                          value={tier.rewardAmountOff}
                                          onChange={(e) => updateTier(index, 'rewardAmountOff', e.target.value === '' ? '' : (parseInt(e.target.value) || 0))}
                                          className={`w-full border rounded-[8px] pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                                            tier.rewardAmountOff > 0 ? "border-gray-300" : "border-red-300"
                                          }`}
                                        />
                                      </div>
                                    )}
                                    <label className="flex items-center gap-2.5 text-sm text-gray-900 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={!tier.rewardType || tier.rewardType === "free"}
                                        onChange={() => updateTier(index, 'rewardType', 'free')}
                                        className="accent-primary"
                                      />
                                      Free
                                    </label>
                                  </div>
                                </div>
                                <div className="max-w-[200px]">
                                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Allocation limit</label>
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="No limit"
                                    value={tier.allocationLimit || ""}
                                    onChange={(e) => updateTier(index, 'allocationLimit', e.target.value ? parseInt(e.target.value) : null)}
                                    className="w-full border border-gray-300 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                  />
                                  <p className="text-xs text-gray-500 mt-1.5" style={{ fontSize: "12px", color: "rgb(165, 165, 165)" }}>No limit if left blank.</p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-[8px] p-5">
                              <h4 className="text-sm font-bold text-gray-900 mb-4">Active dates</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Start date</label>
                                  <input
                                    type="datetime-local"
                                    value={tier.startsAt || ""}
                                    onChange={(e) => updateTier(index, 'startsAt', e.target.value)}
                                    className="w-full border border-gray-300 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                  />
                                  <p className="text-xs text-gray-500 mt-1.5" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>Blank = live immediately.</p>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-700 block mb-1.5">End date</label>
                                  <input
                                    type="datetime-local"
                                    value={tier.endsAt || ""}
                                    onChange={(e) => updateTier(index, 'endsAt', e.target.value)}
                                    className="w-full border border-gray-300 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                  />
                                  <p className="text-xs text-gray-500 mt-1.5" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>Blank = no expiry.</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-6">
                              <button
                                onClick={() => duplicateTier(index)}
                                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                <Copy size={14} />
                                Duplicate rule
                              </button>
                              <button
                                onClick={() => removeTier(index)}
                                className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={14} />
                                Delete rule
                              </button>
                            </div>
                          </div>

                          {/* Right column — summary sidebar, mirrors the panel
                              Shopify shows beside its own discount editor. */}
                          <div className="bg-white border border-gray-200 rounded-[8px] p-5 space-y-4">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="text-sm font-bold text-gray-900 truncate">{tier.title || "Untitled rule"}</p>
                                {getTierErrors(tier).length > 0 ? (
                                  <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Incomplete</span>
                                ) : tier.enabled === false ? (
                                  <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Disabled</span>
                                ) : tierScheduleState(tier) === "scheduled" ? (
                                  <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">Scheduled</span>
                                ) : tierScheduleState(tier) === "expired" ? (
                                  <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">Expired</span>
                                ) : (
                                  <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>Automatic</p>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                              <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-xs font-bold text-gray-900">Rule active</span>
                                <span className="relative inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={tier.enabled !== false}
                                    onChange={(e) => updateTier(index, 'enabled', e.target.checked)}
                                  />
                                  <span className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></span>
                                </span>
                              </label>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                              <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-xs font-bold text-gray-900">Lucira Coins applicable</span>
                                <span className="relative inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={tier.coinsApplicable === true}
                                    onChange={(e) => updateTier(index, 'coinsApplicable', e.target.checked)}
                                  />
                                  <span className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></span>
                                </span>
                              </label>
                              <p className="text-xs text-gray-500" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>
                                On: a customer can redeem Lucira Coins while this gift is claimed. Off: claiming the gift clears any coins they had redeemed.
                              </p>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                              <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-xs font-bold text-gray-900">Combine coupons</span>
                                <span className="relative inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={tier.combineCoupons === true}
                                    onChange={(e) => updateTier(index, 'combineCoupons', e.target.checked)}
                                  />
                                  <span className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></span>
                                </span>
                              </label>
                              <p className="text-xs text-gray-500" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>
                                On: a customer can claim this gift and apply a coupon on the same order. Off: claiming the gift removes an applied coupon, and applying a coupon removes this gift (today's default).
                              </p>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                              <p className="text-xs font-bold text-gray-900 mb-2">Type</p>
                              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                <Tag size={14} className="text-gray-400" />
                                Buy X get Y
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 ml-[22px]" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>Free gift</p>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                              <p className="text-xs font-bold text-gray-900 mb-2">Details</p>
                              <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                                <li>All customers</li>
                                <li>{tier.min > 0 ? `Spend ${formatINR(tier.min)}+, get 1 item free` : "Set a minimum amount"}</li>
                                <li>1 gift per order</li>
                                {tier.startsAt && <li>Active from {new Date(tier.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</li>}
                                {tier.endsAt && <li>Ends {new Date(tier.endsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</li>}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

          {visibleTiers.length === 0 && (
            <div className="text-center py-12 text-gray-400 italic">
              {settings.tiers.length === 0 ? "No rules yet. Create your first Buy X Get Y rule." : "No rules match this filter."}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-[8px] p-4 flex gap-3 text-blue-800">
        <Info size={20} className="shrink-0" />
        <div className="space-y-2">
          <p className="text-sm font-bold">Important Instructions:</p>
          <ul className="text-xs list-disc ml-4 space-y-1">
            <li>Applies to the diamond value of a cart only — plain gold does not count toward these rules.</li>
            <li>A cart qualifies for the single highest rule its diamond value clears — lower rules below it are ignored, not stacked.</li>
            <li>The selected variant is what gets added to the cart as the ₹0 gift line — it must be a real, published, in-stock variant.</li>
            <li>Changes take effect within about a minute of saving.</li>
          </ul>
        </div>
      </div>

      {/* Product picker overlay */}
      {pickerTierIndex !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-24 px-4" onClick={closePicker}>
          <div className="bg-white rounded-[8px] shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <Search size={18} className="text-gray-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by name..."
                className="flex-1 outline-none text-sm"
              />
              <button onClick={closePicker} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto flex-1">
              {variantChoice ? (
                <div>
                  <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>Choose a variant of &ldquo;{variantChoice.product.title}&rdquo;</p>
                    <button onClick={() => setVariantChoice(null)} className="text-xs text-primary font-bold">BACK</button>
                  </div>
                  {variantChoice.variants.map((v) => (
                    <button
                      key={v.shopifyId}
                      onClick={() => applyVariant(variantChoice.product, v)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-[8px] border border-gray-100 overflow-hidden shrink-0 bg-gray-50">
                        {(v.image || variantChoice.product.image) && (
                          <img src={v.image || variantChoice.product.image} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{v.title || "Default"}</p>
                        <p className="text-xs text-gray-400">{formatINR(v.price)}{!v.inStock ? " · Out of stock" : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searching ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
              ) : searchResults.length > 0 ? (
                searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickProduct(p)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-[8px] border border-gray-100 overflow-hidden shrink-0 bg-gray-50">
                      {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                      <p className="text-xs text-gray-400">
                        {p.variants?.length > 1 ? `${p.variants.length} variants` : formatINR(p.variants?.[0]?.price)}
                      </p>
                    </div>
                    {p.status && p.status !== "ACTIVE" && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 shrink-0">
                        {p.status.toLowerCase()}
                      </span>
                    )}
                  </button>
                ))
              ) : searchTerm ? (
                <p className="text-center text-sm text-gray-400 py-12">No products found for &ldquo;{searchTerm}&rdquo;</p>
              ) : (
                <p className="text-center text-sm text-gray-400 py-12">Start typing to search products</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
