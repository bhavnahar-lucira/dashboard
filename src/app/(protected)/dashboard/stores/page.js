"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Store as StoreIcon, Plus, Save, Loader2, Navigation, RefreshCw,
  CheckCircle2, AlertTriangle, MapPin, Link2,
} from "lucide-react";
import { toast } from "react-toastify";
import StoreCard from "./_components/StoreCard";
import { toHandle } from "./_components/handle";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

/** Mirrors the defaults in lucira-backend/lib/storePages.js → normalizeStore. */
const blankStore = (patch = {}) => ({
  id: `st_${Date.now()}`,
  handle: "",
  city: "",
  name: "",
  rating: null,
  status: "auto",
  published: true,
  hours: {
    weekday: { open: "10:30", close: "22:00" },
    weekend: { open: "10:30", close: "22:00" },
  },
  hoursLabel: "",
  address: "",
  email: "",
  phone: "",
  links: { map: "", call: "", appointment: "", designs: "", whatsapp: "", directions: "" },
  facilities: [],
  services: [],
  images: { collection: [], homepage: "", locator: "" },
  geo: { lat: null, lng: null },
  visitable: true,
  shopifyLocationId: "",
  surfaces: {
    collectionBanner: true,
    homepage: true,
    productPage: true,
    storeLocator: true,
    footerLink: true,
    experienceStores: true,
  },
  footerLinkLabel: "",
  experienceLabel: "",
  sort: 0,
  // A new store has no per-surface position, so it lands after the existing
  // ones everywhere instead of reshuffling tabs that are already live.
  sortOverrides: { homepage: null, storeLocator: null, footerLink: null, experienceStores: null },
  ...patch,
});

/** Turn a Shopify location into a half-filled store page for the merchant to finish. */
function storeFromLocation(loc, serviceCatalog) {
  const city = String(loc.name || "").trim();
  return blankStore({
    id: `st_${Date.now()}`,
    city,
    name: city ? `${city} Lucira Store` : "",
    address: loc.address || "",
    phone: loc.phone || "",
    links: {
      map: loc.mapLink || "",
      call: loc.phone ? `tel:${String(loc.phone).replace(/\s+/g, "")}` : "",
      appointment: "",
      designs: "",
      whatsapp: "",
      directions: loc.mapLink || "",
    },
    images: { collection: loc.image ? [loc.image] : [], homepage: loc.image || "", locator: loc.image || "" },
    geo: { lat: loc.latitude || null, lng: loc.longitude || null },
    shopifyLocationId: loc.shopifyId || "",
    services: (serviceCatalog || []).map((s) => ({ ...s })),
    // Nothing is live until the merchant fills in a handle and publishes.
    published: false,
  });
}

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [facilitySuggestions, setFacilitySuggestions] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newStoreId, setNewStoreId] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [pagesRes, locRes] = await Promise.all([
        fetch(`${BASE_URL}/api/settings/store-pages`),
        fetch(`${BASE_URL}/api/settings/store-pages/shopify-locations`),
      ]);
      if (!pagesRes.ok) throw new Error("Could not load store pages");
      const data = await pagesRes.json();
      setStores(data.stores || []);
      setServiceCatalog(data.serviceCatalog || []);
      setFacilitySuggestions(data.facilitySuggestions || []);
      setDirty(false);

      if (locRes.ok) {
        const locData = await locRes.json();
        setLocations(locData.locations || []);
      }
    } catch (e) {
      toast.error(e.message || "Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  /* ── Validation ─────────────────────────────────────────────────────── */
  const problems = useMemo(() => {
    const list = [];
    const seen = new Map();
    stores.forEach((s, i) => {
      const label = s.city || s.name || `Store ${i + 1}`;
      // Compare the handles the backend will actually store, so pasting a URL
      // for a collection that already has a store page is still caught.
      const h = toHandle(s.handle);
      if (!h) {
        list.push(`${label} has no collection handle.`);
        return;
      }
      if (seen.has(h)) list.push(`${label} and ${seen.get(h)} both use /collections/${h}.`);
      else seen.set(h, label);
    });
    return list;
  }, [stores]);

  /* ── Mutations ──────────────────────────────────────────────────────── */
  const update = (index, next) => {
    setStores((list) => list.map((s, i) => (i === index ? next : s)));
    setDirty(true);
  };

  const remove = (index) => {
    const s = stores[index];
    if (!window.confirm(`Remove ${s.city || s.name || "this store"}? It disappears from every surface once you save.`)) return;
    setStores((list) => list.filter((_, i) => i !== index));
    setDirty(true);
  };

  // Reordering rewrites the global positions and drops the per-surface ones, so
  // the order shown here becomes the order on every surface.
  const move = (index, dir) => {
    setStores((list) => {
      const to = dir === "up" ? index - 1 : index + 1;
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[index], next[to]] = [next[to], next[index]];
      return next.map((s, i) => ({ ...s, sort: i, sortOverrides: { homepage: null, storeLocator: null, footerLink: null, experienceStores: null } }));
    });
    setDirty(true);
  };

  const addStore = (patch) => {
    const store = patch || blankStore({ services: serviceCatalog.map((s) => ({ ...s })) });
    store.sort = stores.length;
    setStores((list) => [...list, store]);
    setNewStoreId(store.id);
    setDirty(true);
    // Scroll the fresh card into view once it has rendered.
    setTimeout(() => document.getElementById(`store-${store.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const duplicate = (index) => {
    const src = stores[index];
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = `st_${Date.now()}`;
    copy.handle = "";
    copy.city = `${src.city} copy`;
    copy.published = false;
    copy.shopifyLocationId = "";
    copy.sort = stores.length;
    copy.sortOverrides = { homepage: null, storeLocator: null, footerLink: null, experienceStores: null };
    setStores((list) => [...list, copy]);
    setNewStoreId(copy.id);
    setDirty(true);
  };

  /* ── Persist ────────────────────────────────────────────────────────── */
  const save = async () => {
    if (problems.length) {
      toast.error(problems[0]);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/settings/store-pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stores: stores.map((s, i) => ({ ...s, sort: typeof s.sort === "number" ? s.sort : i })),
          serviceCatalog,
          facilitySuggestions,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Stores saved — the storefront is refreshing");
      setDirty(false);
      load();
    } catch (e) {
      toast.error(e.message || "Error saving stores");
    } finally {
      setSaving(false);
    }
  };

  const syncFromShopify = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/stores/sync-shopify`, { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Sync failed");
      const locRes = await fetch(`${BASE_URL}/api/settings/store-pages/shopify-locations`);
      if (locRes.ok) setLocations((await locRes.json()).locations || []);
      toast.success(`Synced ${data.count} locations from Shopify`);
    } catch (e) {
      toast.error("Shopify sync error: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  const unlinked = locations.filter((l) => !l.linked);

  return (
    <div className="container-main py-10 px-4 max-w-6xl">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="admin-title flex items-center gap-3">
            <StoreIcon className="text-primary" />
            Stores
          </h1>
          <p className="admin-subtitle">
            One place for every store surface — the store page hero, the homepage and product-page
            sections, the store locator and the footer links. Adding a store here needs no code change.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={load}
            disabled={saving}
            title="Discard unsaved changes and reload"
            className="w-11 h-11 flex items-center justify-center rounded-full border border-hairline-soft text-ink-muted hover:bg-row-hover transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={save}
            disabled={saving || !!problems.length}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-full font-medium transition-all flex items-center gap-2 disabled:opacity-50 h-fit"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Saving..." : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      {problems.length > 0 && (
        <div className="mb-6 rounded-[8px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-1">
            <AlertTriangle size={15} /> Fix these before saving
          </p>
          <ul className="list-disc pl-6 text-[13px] text-amber-800 space-y-0.5">
            {problems.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {/* ── Store list ───────────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="admin-section-label">Stores</h2>
          <span className="text-xs text-ink-muted">
            {stores.length} store{stores.length === 1 ? "" : "s"} · this order is the order they appear in
          </span>
        </div>

        <div className="space-y-4">
          {stores.map((store, index) => (
            <div key={store.id} id={`store-${store.id}`}>
              <StoreCard
                store={store}
                index={index}
                total={stores.length}
                serviceCatalog={serviceCatalog}
                facilitySuggestions={facilitySuggestions}
                defaultOpen={store.id === newStoreId}
                onChange={(next) => update(index, next)}
                onRemove={() => remove(index)}
                onMove={(dir) => move(index, dir)}
                onDuplicate={() => duplicate(index)}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => addStore(null)}
          className="mt-5 w-full py-4 border-2 border-dashed border-hairline rounded-[8px] text-ink-soft font-bold hover:bg-row-hover hover:border-zinc-300 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Add a store
        </button>
      </section>

      {/* ── Shopify locations ────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between px-1 mb-3">
          <div className="min-w-0">
            <h2 className="admin-section-label">Shopify locations</h2>
            <p className="text-sm text-ink-muted mt-1">
              Locations from Shopify Admin. Import one to start a store page with its name, address,
              phone and coordinates already filled in — then give it a collection handle and publish.
            </p>
          </div>
          <button
            onClick={syncFromShopify}
            disabled={syncing}
            className="shrink-0 flex items-center gap-2 bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
            Sync from Shopify
          </button>
        </div>

        {locations.length === 0 ? (
          <div className="text-center py-14 bg-panel rounded-[8px] border-2 border-dashed border-hairline-soft">
            <MapPin size={32} className="mx-auto text-zinc-200 mb-3" />
            <p className="text-ink-muted text-sm font-medium">No locations synced yet — hit “Sync from Shopify”.</p>
          </div>
        ) : (
          <>
            {unlinked.length === 0 && (
              <p className="text-[13px] text-ink-muted mb-3 px-1 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-500" /> Every Shopify location already has a store page.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => (
                <div key={loc.shopifyId} className="bg-panel border border-hairline-soft rounded-[8px] p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-ink text-sm min-w-0 truncate">{loc.name}</h3>
                    <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${loc.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-zinc-50 text-zinc-400 border-zinc-100"}`}>
                      {loc.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-muted leading-relaxed flex-1">{loc.address || "No address"}</p>
                  <div className="mt-4 pt-4 border-t border-hairline-soft">
                    {loc.linked ? (
                      <p className="text-[11px] text-ink-muted flex items-center gap-1.5">
                        <Link2 size={11} className="text-emerald-500" />
                        {loc.linkedHandle ? `Store page: /collections/${loc.linkedHandle}` : "Already has a store page"}
                      </p>
                    ) : (
                      <button
                        onClick={() => addStore(storeFromLocation(loc, serviceCatalog))}
                        className="w-full py-2.5 rounded-[8px] border-2 border-dashed border-hairline text-ink-soft text-xs font-bold hover:bg-row-hover hover:border-zinc-300 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={13} /> Create store page
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
