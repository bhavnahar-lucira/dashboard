"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronRight, MoveUp, MoveDown, Trash2, Copy, ExternalLink,
  Plus, RotateCcw, Store as StoreIcon, EyeOff,
} from "lucide-react";
import {
  FieldLabel, TextInput, TextArea, Select, Toggle, AssetField, ImageListField, ChipsField,
} from "./fields";
import { toHandle } from "./handle";

const STATUS_OPTIONS = [
  { value: "auto", label: "Automatic — Open Now / Closed from the hours below" },
  { value: "opening_soon", label: "Opening Soon — badge + overlay, hides the rating" },
  { value: "temporarily_closed", label: "Temporarily Closed — always shows as closed" },
];

const SURFACES = [
  { key: "collectionBanner", label: "Store page hero", hint: "The banner at the top of /collections/<handle>" },
  { key: "homepage", label: "Homepage section", hint: "A tab in \"Visit Lucira Store Near You\" on the home page" },
  { key: "productPage", label: "Product page section", hint: "The same tabbed section below every product" },
  { key: "storeLocator", label: "Store locator", hint: "A card on /pages/store-locator" },
  { key: "footerLink", label: "Footer link", hint: "A link in the \"Visit our stores:\" list in Popular Searches" },
  { key: "experienceStores", label: "Experience Stores block", hint: "A phone/email/address card in \"Lucira's Experience Stores\" on the home page" },
];

const STOREFRONT = (process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://www.lucirajewelry.com").replace(/\/$/, "");

function SectionTitle({ children, hint }) {
  return (
    <div className="mb-4">
      <h5 className="text-xs font-bold text-ink uppercase tracking-wider">{children}</h5>
      {hint ? <p className="text-[11px] text-ink-muted mt-0.5 leading-snug">{hint}</p> : null}
    </div>
  );
}

export default function StoreCard({
  store,
  index,
  total,
  serviceCatalog,
  facilitySuggestions,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);

  const set = (patch) => onChange({ ...store, ...patch });
  const setLink = (key, value) => set({ links: { ...(store.links || {}), [key]: value } });
  const setImage = (key, value) => set({ images: { ...(store.images || {}), [key]: value } });
  const setSurface = (key, value) => set({ surfaces: { ...(store.surfaces || {}), [key]: value } });
  const setHours = (part, key, value) =>
    set({ hours: { ...(store.hours || {}), [part]: { ...((store.hours || {})[part] || {}), [key]: value } } });
  const setGeo = (key, value) => set({ geo: { ...(store.geo || {}), [key]: value } });

  const services = Array.isArray(store.services) ? store.services : [];
  const setService = (i, patch) => set({ services: services.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  const liveSurfaces = SURFACES.filter((s) => store?.surfaces?.[s.key] !== false).length;
  // What the handle field will actually be saved as — pasting a full store URL
  // is normal, so show the result rather than the raw text.
  const handle = toHandle(store.handle);

  return (
    <div className={`bg-panel border rounded-[8px] shadow-sm ${store.published === false ? "border-dashed border-hairline opacity-70" : "border-hairline-soft"}`}>
      {/* ── Header row ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-4">
        <button type="button" onClick={() => setOpen((v) => !v)} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-row-hover text-ink-soft">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>

        <div className="w-12 h-12 shrink-0 rounded-[6px] bg-field overflow-hidden flex items-center justify-center">
          {store?.images?.homepage || store?.images?.locator || store?.images?.collection?.[0] ? (
            <img src={store.images.homepage || store.images.locator || store.images.collection[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <StoreIcon size={18} className="text-ink-muted" />
          )}
        </div>

        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink truncate">{store.city || store.name || "Untitled store"}</span>
            {store.published === false && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-ink-muted bg-field px-2 py-0.5 rounded-full">
                <EyeOff size={9} /> Hidden
              </span>
            )}
            {store.status === "opening_soon" && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">Opening soon</span>
            )}
            {store.status === "temporarily_closed" && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">Temporarily closed</span>
            )}
          </div>
          <div className="text-[11px] text-ink-muted truncate">
            /collections/{handle || "…"} · on {liveSurfaces} of {SURFACES.length} surfaces
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {handle && (
            <a
              href={`${STOREFRONT}/collections/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the store page"
              className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-row-hover"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button type="button" title="Duplicate" onClick={onDuplicate} className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-row-hover"><Copy size={14} /></button>
          <button type="button" title="Move up" onClick={() => onMove("up")} disabled={index === 0} className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30"><MoveUp size={14} /></button>
          <button type="button" title="Move down" onClick={() => onMove("down")} disabled={index === total - 1} className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30"><MoveDown size={14} /></button>
          <button type="button" title="Delete" onClick={onRemove} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 ml-1"><Trash2 size={14} /></button>
        </div>
      </div>

      {!open ? null : (
        <div className="border-t border-hairline-soft p-6 space-y-9">
          {/* ── Basics ─────────────────────────────────────────────────── */}
          <section>
            <SectionTitle hint="The collection handle decides which URL shows this store's hero — it must match an existing Shopify collection.">
              Basics
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel hint="e.g. malleshwaram-store">COLLECTION HANDLE / URL</FieldLabel>
                <TextInput
                  value={store.handle}
                  onChange={(v) => set({ handle: v })}
                  onBlur={(v) => set({ handle: toHandle(v) })}
                  placeholder="malleshwaram-store"
                />
                <p className="text-[11px] text-ink-muted mt-1.5">
                  Store page: <span className="font-medium text-ink-soft">/collections/{handle || "…"}</span>
                </p>
              </div>
              <div>
                <FieldLabel hint="the tab label on the homepage">CITY</FieldLabel>
                <TextInput value={store.city} onChange={(v) => set({ city: v })} placeholder="Malleshwaram" />
              </div>
              <div>
                <FieldLabel hint="the heading over the banner image">STORE NAME</FieldLabel>
                <TextInput value={store.name} onChange={(v) => set({ name: v })} placeholder="Malleshwaram Lucira Store" />
              </div>
              <div>
                <FieldLabel hint="leave blank to hide the stars">RATING</FieldLabel>
                <TextInput value={store.rating ?? ""} onChange={(v) => set({ rating: v === "" ? null : v })} placeholder="4.8" />
              </div>
              <div className="md:col-span-2">
                <FieldLabel>STATUS TAG</FieldLabel>
                <Select value={store.status || "auto"} onChange={(v) => set({ status: v })} options={STATUS_OPTIONS} />
              </div>
            </div>
          </section>

          {/* ── Hours ──────────────────────────────────────────────────── */}
          <section>
            <SectionTitle hint="24-hour times in IST. These decide the Open Now / Closed pill and the timings line.">
              Opening hours
            </SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <FieldLabel>MON–FRI OPENS</FieldLabel>
                <TextInput value={store?.hours?.weekday?.open} onChange={(v) => setHours("weekday", "open", v)} placeholder="10:30" />
              </div>
              <div>
                <FieldLabel>MON–FRI CLOSES</FieldLabel>
                <TextInput value={store?.hours?.weekday?.close} onChange={(v) => setHours("weekday", "close", v)} placeholder="22:00" />
              </div>
              <div>
                <FieldLabel>SAT–SUN OPENS</FieldLabel>
                <TextInput value={store?.hours?.weekend?.open} onChange={(v) => setHours("weekend", "open", v)} placeholder="10:30" />
              </div>
              <div>
                <FieldLabel>SAT–SUN CLOSES</FieldLabel>
                <TextInput value={store?.hours?.weekend?.close} onChange={(v) => setHours("weekend", "close", v)} placeholder="22:00" />
              </div>
            </div>
            <div className="mt-4">
              <FieldLabel hint="optional — overrides the sentence built from the times above">CUSTOM TIMINGS LINE</FieldLabel>
              <TextInput value={store.hoursLabel} onChange={(v) => set({ hoursLabel: v })} placeholder="Monday - Sunday | 10:30 am - 10:00 pm" />
            </div>
          </section>

          {/* ── Address & links ────────────────────────────────────────── */}
          <section>
            <SectionTitle hint="A button is hidden on the storefront when its link is left blank.">
              Address &amp; buttons
            </SectionTitle>
            <div className="mb-5">
              <FieldLabel>ADDRESS</FieldLabel>
              <TextArea value={store.address} onChange={(v) => set({ address: v })} placeholder="Shop no. 3, …" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <FieldLabel hint="shown in the Experience Stores block">PHONE NUMBER</FieldLabel>
                <TextInput
                  value={store.phone}
                  onChange={(v) => set({ phone: v })}
                  // Filling the displayed number is enough for a new store — the
                  // dial target follows unless it has been set by hand.
                  onBlur={(v) => {
                    const digits = String(v || "").replace(/\s+/g, "");
                    if (digits && !store?.links?.call) setLink("call", `tel:${digits}`);
                  }}
                  placeholder="+91 9000000000"
                />
              </div>
              <div>
                <FieldLabel hint="shown in the Experience Stores block">EMAIL</FieldLabel>
                <TextInput value={store.email} onChange={(v) => set({ email: v })} placeholder="store@lucirajewelry.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel hint="DIRECT ME">GOOGLE MAPS LINK</FieldLabel>
                <TextInput value={store?.links?.map} onChange={(v) => setLink("map", v)} placeholder="https://maps.google.com/?q=…" />
              </div>
              <div>
                <FieldLabel hint="CALL US — use the tel: prefix">PHONE LINK</FieldLabel>
                <TextInput value={store?.links?.call} onChange={(v) => setLink("call", v)} placeholder="tel:+919000000000" />
              </div>
              <div>
                <FieldLabel hint="BOOK APPOINTMENT">APPOINTMENT LINK</FieldLabel>
                <TextInput value={store?.links?.appointment} onChange={(v) => setLink("appointment", v)} placeholder="https://wa.me/91…" />
              </div>
              <div>
                <FieldLabel hint="VIEW AVAILABLE DESIGNS — defaults to this store's collection">DESIGNS LINK</FieldLabel>
                <TextInput value={store?.links?.designs} onChange={(v) => setLink("designs", v)} placeholder={`/collections/${handle || "…"}`} />
              </div>
              <div>
                <FieldLabel hint="the WhatsApp button on the store locator card">WHATSAPP LINK</FieldLabel>
                <TextInput value={store?.links?.whatsapp} onChange={(v) => setLink("whatsapp", v)} placeholder="https://api.whatsapp.com/send?phone=…" />
              </div>
              <div>
                <FieldLabel hint="optional — falls back to the maps link">DIRECTIONS LINK</FieldLabel>
                <TextInput value={store?.links?.directions} onChange={(v) => setLink("directions", v)} placeholder="https://www.lucirajewelry.com/collections/…" />
              </div>
            </div>
          </section>

          {/* ── Images ─────────────────────────────────────────────────── */}
          <section>
            <SectionTitle hint="Each surface crops differently, so they take their own image. Paste a URL or upload straight to the Shopify CDN.">
              Images
            </SectionTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ImageListField
                label="STORE PAGE CAROUSEL"
                hint="/collections/<handle> — cross-fades through these in order"
                values={store?.images?.collection}
                onChange={(v) => setImage("collection", v)}
                namePrefix={`Store-${handle || "new"}`}
              />
              <div className="space-y-6">
                <AssetField
                  label="HOMEPAGE / PRODUCT PAGE IMAGE"
                  value={store?.images?.homepage}
                  onChange={(v) => setImage("homepage", v)}
                  namePrefix={`Store-${handle || "new"}-home`}
                />
                <AssetField
                  label="STORE LOCATOR CARD IMAGE"
                  value={store?.images?.locator}
                  onChange={(v) => setImage("locator", v)}
                  namePrefix={`Store-${handle || "new"}-locator`}
                />
              </div>
            </div>
          </section>

          {/* ── Facilities ─────────────────────────────────────────────── */}
          <section>
            <SectionTitle hint="The pills under &quot;Facilities at Store&quot;. Tap a suggestion or type your own.">
              Facilities
            </SectionTitle>
            <ChipsField
              label="FACILITIES AT STORE"
              values={store.facilities}
              onChange={(v) => set({ facilities: v })}
              suggestions={facilitySuggestions}
            />
          </section>

          {/* ── Services ───────────────────────────────────────────────── */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <SectionTitle hint="The icon cards under &quot;Services Offered at Store&quot;. Most stores keep the standard four.">
                Services
              </SectionTitle>
              <button
                type="button"
                onClick={() => set({ services: serviceCatalog.map((s) => ({ ...s })) })}
                className="shrink-0 text-[11px] font-bold text-ink-muted hover:text-ink flex items-center gap-1.5"
              >
                <RotateCcw size={12} /> Reset to standard services
              </button>
            </div>
            <div className="space-y-3">
              {services.map((svc, i) => (
                <div key={i} className="flex gap-3 items-start bg-panel-alt border border-hairline-soft rounded-[8px] p-3">
                  <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>TITLE</FieldLabel>
                      <TextInput value={svc.title} onChange={(v) => setService(i, { title: v })} placeholder="Gold Exchange" />
                    </div>
                    <AssetField
                      label="ICON"
                      value={svc.icon}
                      onChange={(v) => setService(i, { icon: v })}
                      namePrefix="Store-service-icon"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => set({ services: services.filter((_, idx) => idx !== i) })}
                    className="shrink-0 w-8 h-8 mt-6 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => set({ services: [...services, { title: "", icon: "" }] })}
              className="mt-3 w-full py-3 border-2 border-dashed border-hairline rounded-[8px] text-ink-soft text-sm font-bold hover:bg-row-hover hover:border-zinc-300 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add service
            </button>
          </section>

          {/* ── Where it shows ─────────────────────────────────────────── */}
          <section>
            <SectionTitle hint="Switch a surface off to keep the store configured but hidden there.">
              Where this store appears
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {SURFACES.map((s) => (
                <Toggle
                  key={s.key}
                  checked={store?.surfaces?.[s.key] !== false}
                  onChange={(v) => setSurface(s.key, v)}
                  label={s.label}
                  hint={s.hint}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel hint="blank uses “Lab Grown Diamond Jewelry in <city>”">FOOTER LINK TEXT</FieldLabel>
                <TextInput
                  value={store.footerLinkLabel}
                  onChange={(v) => set({ footerLinkLabel: v })}
                  placeholder={`Lab Grown Diamond Jewelry in ${store.city || "…"}`}
                />
              </div>
              <div>
                <FieldLabel hint="blank uses “<city> Store”">EXPERIENCE STORES HEADING</FieldLabel>
                <TextInput
                  value={store.experienceLabel}
                  onChange={(v) => set({ experienceLabel: v })}
                  placeholder={`${store.city || "…"} Store`}
                />
              </div>
            </div>
          </section>

          {/* ── Location data ──────────────────────────────────────────── */}
          <section>
            <SectionTitle hint="Used to rank stores by distance on the store locator. Filled in for you when you import a Shopify location.">
              Location data
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <FieldLabel>LATITUDE</FieldLabel>
                <TextInput value={store?.geo?.lat ?? ""} onChange={(v) => setGeo("lat", v === "" ? null : v)} placeholder="12.9915" />
              </div>
              <div>
                <FieldLabel>LONGITUDE</FieldLabel>
                <TextInput value={store?.geo?.lng ?? ""} onChange={(v) => setGeo("lng", v === "" ? null : v)} placeholder="77.5701" />
              </div>
              <div>
                <FieldLabel hint="read-only — set by importing a location">SHOPIFY LOCATION</FieldLabel>
                <div className="px-4 py-3 bg-field border border-hairline-soft rounded-[8px] text-xs text-ink-muted truncate">
                  {store.shopifyLocationId || "Not linked"}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <Toggle
                checked={store.visitable !== false}
                onChange={(v) => set({ visitable: v })}
                label="Customers can walk in"
                hint="Turn off for a warehouse or head office — it still holds stock but is never offered as a nearby showroom."
              />
              <Toggle
                checked={store.published !== false}
                onChange={(v) => set({ published: v })}
                label="Published"
                hint="Turning this off hides the store everywhere at once, without deleting its content."
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
