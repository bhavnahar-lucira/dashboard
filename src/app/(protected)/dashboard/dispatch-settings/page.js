"use client";

import { useState, useEffect, useMemo } from "react";
import { Save, Loader2, Info, Truck, Clock, Package } from "lucide-react";
import { toast } from "react-toastify";

/* Mirrors DISPATCH_DEFAULTS in lucira-backend/routes/settings.js and
   lucira-frontend/src/lib/utils.js — the shape the GET/POST /api/settings/dispatch
   endpoint speaks. */
const DEFAULTS = {
  enabled: true,
  timezone: "Asia/Kolkata",
  excludeSundays: false,
  inStock: {
    label: "In stock",
    cutoffHour: 12,
    cutoffMinute: 0,
    beforeCutoffDays: 0,
    afterCutoffDays: 1,
    template: "Estimated dispatch by {date}",
    dateFormat: "MMM D, YYYY",
    timerEnabled: true,
    timerTemplate: "Order dispatches within {countdown} hrs",
  },
  madeToOrder: {
    label: "Made to order",
    leadDays: 12,
    bufferDays: 3,
    template: "Estimated dispatch by {date}",
    dateFormat: "MMM D, YYYY",
    timerEnabled: false,
    timerTemplate: "",
  },
};

const DATE_FORMATS = ["MMM D, YYYY", "MMMM D, YYYY", "D MMM YYYY", "DD/MM/YYYY"];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function fmtDate(d, fmt) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  switch (fmt) {
    case "MMMM D, YYYY": return `${MONTHS_LONG[m]} ${day}, ${y}`;
    case "D MMM YYYY": return `${day} ${MONTHS_SHORT[m]} ${y}`;
    case "DD/MM/YYYY": return `${String(day).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}/${y}`;
    default: return `${MONTHS_SHORT[m]} ${day}, ${y}`;
  }
}

function fill(tpl, tokens) {
  return String(tpl || "").replace(/\{(\w+)\}/g, (_, k) => (k in tokens ? tokens[k] : `{${k}}`));
}

const to12h = (h, m) => {
  const hr = ((h + 11) % 12) + 1;
  const ap = h < 12 ? "AM" : "PM";
  return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
};

const dayWord = (n) =>
  n === 0 ? "the same day" : n === 1 ? "the next day" : `${n} days later`;

// Dispatch date for an in-stock order placed `offsetDays` from today.
function inStockDate(section, offsetDays, excludeSundays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  if (excludeSundays && d.getDay() === 0) d.setDate(d.getDate() + 1);
  return fmtDate(d, section.dateFormat);
}

function madeToOrderDate(section, leadDays, excludeSundays) {
  const d = new Date();
  d.setDate(d.getDate() + leadDays + (section.bufferDays || 0));
  if (excludeSundays && d.getDay() === 0) d.setDate(d.getDate() + 1);
  return fmtDate(d, section.dateFormat);
}

export default function DispatchSettingsPage() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
        const res = await fetch(`${baseUrl}/api/settings/dispatch`);
        const data = await res.json();
        setSettings({
          ...DEFAULTS,
          ...data,
          inStock: { ...DEFAULTS.inStock, ...(data.inStock || {}) },
          madeToOrder: { ...DEFAULTS.madeToOrder, ...(data.madeToOrder || {}) },
        });
      } catch (error) {
        console.error("Failed to fetch dispatch settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const res = await fetch(`${baseUrl}/api/settings/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Dispatch settings saved");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const setTop = (field, value) => setSettings((s) => ({ ...s, [field]: value }));
  const setSection = (section, field, value) =>
    setSettings((s) => ({ ...s, [section]: { ...s[section], [field]: value } }));

  const inS = settings.inStock;
  const mto = settings.madeToOrder;
  const cutoffLabel = to12h(inS.cutoffHour || 0, inS.cutoffMinute || 0);

  // "In stock" worked example — both branches.
  const inStockExample = useMemo(() => {
    const beforeDate = inStockDate(inS, inS.beforeCutoffDays || 0, settings.excludeSundays);
    const afterDate = inStockDate(inS, inS.afterCutoffDays || 0, settings.excludeSundays);
    return {
      before: `Order placed BEFORE ${cutoffLabel}  →  dispatches ${dayWord(inS.beforeCutoffDays || 0)}  (${inS.template.includes("{date}") ? beforeDate : fill(inS.template, { date: beforeDate })})`,
      after: `Order placed AFTER ${cutoffLabel}  →  dispatches ${dayWord(inS.afterCutoffDays || 0)}  (${afterDate})`,
    };
  }, [inS, settings.excludeSundays, cutoffLabel]);

  // What a customer actually sees on the storefront right now.
  const inStockLivePreview = useMemo(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const cutoffMins = (inS.cutoffHour || 0) * 60 + (inS.cutoffMinute || 0);
    const beforeCutoff = nowMins < cutoffMins;
    const timerLive =
      inS.timerEnabled && (inS.beforeCutoffDays || 0) !== (inS.afterCutoffDays || 0);

    if (timerLive) {
      let rem = cutoffMins * 60 - (nowMins * 60 + now.getSeconds());
      let cutoffDayOffset = 0;
      if (rem <= 0) { rem += 86400; cutoffDayOffset = 1; }
      const pad = (n) => String(n).padStart(2, "0");
      const countdown = `${pad(Math.floor(rem / 3600))}:${pad(Math.floor((rem % 3600) / 60))}:${pad(rem % 60)}`;
      const dt = inStockDate(inS, cutoffDayOffset + (inS.beforeCutoffDays || 0), settings.excludeSundays);
      return `${inS.label}. ${fill(inS.timerTemplate || "Order within {countdown}", { countdown, date: dt, label: inS.label })}`;
    }
    const dt = inStockDate(inS, beforeCutoff ? (inS.beforeCutoffDays || 0) : (inS.afterCutoffDays || 0), settings.excludeSundays);
    return `${inS.label}. ${fill(inS.template, { date: dt, label: inS.label })}`;
  }, [inS, settings.excludeSundays]);

  // Made-to-order — show a couple of representative product lead times.
  const mtoExamples = useMemo(() => {
    const rows = [7, 15, 30].map((lt) => ({
      lt,
      date: madeToOrderDate(mto, lt, settings.excludeSundays),
    }));
    const fallback = madeToOrderDate(mto, mto.leadDays || 0, settings.excludeSundays);
    return { rows, fallback };
  }, [mto, settings.excludeSundays]);

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
          <h1 className="admin-title">Dispatch Settings</h1>
          <p className="admin-subtitle">
            Controls the dispatch line customers see on the product page, cart, checkout summary and shipping page &mdash;
            <span className="font-semibold"> &ldquo;In stock. Estimated dispatch by&hellip;&rdquo;</span> or a live countdown.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-[#8F5D5D] text-white px-6 py-2.5 rounded-sm font-bold text-sm transition-all disabled:opacity-70"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          SAVE CHANGES
        </button>
      </div>

      {/* How it works */}
      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-5 text-blue-900">
        <div className="flex items-center gap-2 font-bold text-sm mb-2">
          <Info size={16} /> How dispatch dates are worked out
        </div>
        <ul className="text-[13px] leading-relaxed list-disc ml-5 space-y-1.5">
          <li>
            <span className="font-semibold">In-stock items</span> use a daily <span className="font-semibold">cutoff time</span>.
            Beat the cutoff and the order goes out sooner; miss it and it goes out later. You set how many days each case adds.
          </li>
          <li>
            <span className="font-semibold">Made-to-order items</span> use that product&apos;s own crafting time
            (<code className="font-mono bg-white/70 px-1 rounded">lead_time</code> metafield in Shopify) plus a fixed buffer.
            The number on this page is only a fallback for products that have no <code className="font-mono bg-white/70 px-1 rounded">lead_time</code> set.
          </li>
          <li>Everything is calculated in the timezone below, not the shopper&apos;s.</li>
        </ul>
      </div>

      {/* Global */}
      <div className="admin-panel overflow-hidden mb-6">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink">Show the dispatch line</h3>
              <p className="text-xs text-ink-muted mt-1">
                Turn off to hide the dispatch estimate and countdown from the storefront entirely.
              </p>
            </div>
            <Toggle checked={settings.enabled} onChange={(v) => setTop("enabled", v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <Field label="Timezone" hint="IANA name. All cutoff times and dates use this.">
              <input
                type="text"
                value={settings.timezone}
                onChange={(e) => setTop("timezone", e.target.value)}
                className="admin-input"
                placeholder="Asia/Kolkata"
              />
            </Field>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer pb-3">
                <input
                  type="checkbox"
                  checked={settings.excludeSundays}
                  onChange={(e) => setTop("excludeSundays", e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm font-medium text-ink">
                  Never show a Sunday dispatch date (bump it to Monday)
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* In stock */}
      <SectionCard icon={Truck} title="In-stock items">
        <Field label="Status word shown to customers" hint="Appears before the date, e.g. &ldquo;In stock. …&rdquo;">
          <input type="text" value={inS.label} onChange={(e) => setSection("inStock", "label", e.target.value)} className="admin-input" />
        </Field>

        <div className="rounded-md border border-hairline-soft bg-panel-alt p-4 space-y-4">
          <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Dispatch cutoff</p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider">Hour</label>
              <input type="number" min={0} max={23} value={inS.cutoffHour}
                onChange={(e) => setSection("inStock", "cutoffHour", clamp(e.target.value, 0, 23))}
                className="admin-input w-24" />
            </div>
            <span className="pb-3 text-lg font-bold text-ink-muted">:</span>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider">Minute</label>
              <input type="number" min={0} max={59} value={inS.cutoffMinute}
                onChange={(e) => setSection("inStock", "cutoffMinute", clamp(e.target.value, 0, 59))}
                className="admin-input w-24" />
            </div>
            <span className="pb-3 text-sm font-semibold text-ink">= {cutoffLabel} ({settings.timezone.split("/").pop().replace("_", " ")})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Field
              label={`Ordered BEFORE ${cutoffLabel}`}
              hint="How many days from today until dispatch. 0 = same day."
            >
              <div className="flex items-center gap-2">
                <input type="number" min={0} value={inS.beforeCutoffDays}
                  onChange={(e) => setSection("inStock", "beforeCutoffDays", clamp(e.target.value, 0, 60))}
                  className="admin-input w-24" />
                <span className="text-sm text-ink-soft">day(s) &rarr; dispatches {dayWord(inS.beforeCutoffDays || 0)}</span>
              </div>
            </Field>
            <Field
              label={`Ordered AFTER ${cutoffLabel}`}
              hint="How many days from today until dispatch. 1 = next day."
            >
              <div className="flex items-center gap-2">
                <input type="number" min={0} value={inS.afterCutoffDays}
                  onChange={(e) => setSection("inStock", "afterCutoffDays", clamp(e.target.value, 0, 60))}
                  className="admin-input w-24" />
                <span className="text-sm text-ink-soft">day(s) &rarr; dispatches {dayWord(inS.afterCutoffDays || 0)}</span>
              </div>
            </Field>
          </div>

          <div className="rounded bg-white border border-hairline-soft p-3 text-[12.5px] text-ink-soft space-y-1">
            <p className="font-bold text-ink-muted uppercase text-[10px] tracking-wider mb-1">Worked example (today)</p>
            <p>{inStockExample.before}</p>
            <p>{inStockExample.after}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
          <Field label="Message wording" hint="Use {date} where the dispatch date should appear.">
            <input type="text" value={inS.template} onChange={(e) => setSection("inStock", "template", e.target.value)} className="admin-input" />
          </Field>
          <Field label="Date format">
            <select value={inS.dateFormat} onChange={(e) => setSection("inStock", "dateFormat", e.target.value)} className="admin-input">
              {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
        </div>

        <div className="pt-4 mt-2 border-t border-hairline-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-ink-soft" />
              <span className="font-bold text-ink text-sm">Show a live countdown instead of the date</span>
            </div>
            <Toggle checked={inS.timerEnabled} onChange={(v) => setSection("inStock", "timerEnabled", v)} />
          </div>
          {inS.timerEnabled && (
            <>
              <p className="text-xs text-ink-muted">
                In-stock items show a ticking <span className="font-mono">HH:MM:SS</span> line counting down to the next cutoff,
                instead of the plain date. Needs the &ldquo;before&rdquo; and &ldquo;after&rdquo; day counts to differ.
              </p>
              <Field label="Countdown wording" hint="Use {countdown} for the timer and {date} for the dispatch date.">
                <input type="text" value={inS.timerTemplate} onChange={(e) => setSection("inStock", "timerTemplate", e.target.value)} className="admin-input" />
              </Field>
            </>
          )}
        </div>

        <PreviewBox label="Customer sees now">{inStockLivePreview}</PreviewBox>
      </SectionCard>

      {/* Made to order */}
      <SectionCard icon={Package} title="Made-to-order items">
        <Field label="Status word shown to customers">
          <input type="text" value={mto.label} onChange={(e) => setSection("madeToOrder", "label", e.target.value)} className="admin-input" />
        </Field>

        <div className="rounded-md border border-hairline-soft bg-panel-alt p-4 space-y-4">
          <p className="text-[13px] text-ink-soft leading-relaxed">
            Dispatch date = <span className="font-semibold">the product&apos;s <code className="font-mono">lead_time</code></span>
            {" "}(days, set per-product in Shopify) <span className="font-semibold">+ buffer days</span> below, counted from today.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Buffer days" hint="Added on top of every product's lead_time (packing, QC, courier pickup).">
              <input type="number" min={0} value={mto.bufferDays}
                onChange={(e) => setSection("madeToOrder", "bufferDays", clamp(e.target.value, 0, 90))}
                className="admin-input w-28" />
            </Field>
            <Field label="Fallback lead days" hint="Used ONLY for products with no lead_time metafield set.">
              <input type="number" min={0} value={mto.leadDays}
                onChange={(e) => setSection("madeToOrder", "leadDays", clamp(e.target.value, 0, 365))}
                className="admin-input w-28" />
            </Field>
          </div>

          <div className="rounded bg-white border border-hairline-soft p-3 text-[12.5px] text-ink-soft space-y-1">
            <p className="font-bold text-ink-muted uppercase text-[10px] tracking-wider mb-1">
              Worked example — buffer {mto.bufferDays || 0} day(s)
            </p>
            {mtoExamples.rows.map((r) => (
              <p key={r.lt}>
                Product with <span className="font-semibold">lead_time = {r.lt}</span>  →  dispatches {r.date}
              </p>
            ))}
            <p className="pt-1 text-ink-muted">
              Product with no <span className="font-mono">lead_time</span>  →  uses fallback {mto.leadDays || 0}, dispatches {mtoExamples.fallback}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
          <Field label="Message wording" hint="Use {date} where the dispatch date should appear.">
            <input type="text" value={mto.template} onChange={(e) => setSection("madeToOrder", "template", e.target.value)} className="admin-input" />
          </Field>
          <Field label="Date format">
            <select value={mto.dateFormat} onChange={(e) => setSection("madeToOrder", "dateFormat", e.target.value)} className="admin-input">
              {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
        </div>

        <div className="pt-4 mt-2 border-t border-hairline-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-ink-soft" />
              <span className="font-bold text-ink text-sm">Show a countdown</span>
            </div>
            <Toggle checked={mto.timerEnabled} onChange={(v) => setSection("madeToOrder", "timerEnabled", v)} />
          </div>
          {mto.timerEnabled && (
            <Field label="Countdown wording" hint="Use {countdown} and {date}.">
              <input type="text" value={mto.timerTemplate} onChange={(e) => setSection("madeToOrder", "timerTemplate", e.target.value)} className="admin-input" />
            </Field>
          )}
        </div>

        <PreviewBox label="Customer sees (lead_time 15)">
          {`${mto.label}. ${fill(mto.template, { date: madeToOrderDate(mto, 15, settings.excludeSundays), label: mto.label })}`}
        </PreviewBox>
      </SectionCard>

      <div className="mt-6 bg-panel-alt border border-hairline-soft rounded-lg p-4 text-xs text-ink-soft space-y-1.5">
        <p className="font-bold text-ink-muted uppercase tracking-wider text-[10px]">Wording tokens</p>
        <p><code className="font-mono">{"{date}"}</code> — the calculated dispatch date, in the chosen format.</p>
        <p><code className="font-mono">{"{countdown}"}</code> — time left to the cutoff as <span className="font-mono">HH:MM:SS</span>.</p>
        <p><code className="font-mono">{"{label}"}</code> — the status word above.</p>
        <p className="pt-1">Storefront picks up saved changes within about a minute.</p>
      </div>
    </div>
  );
}

const clamp = (v, min, max) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
};

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-ink-soft uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-ink-muted leading-snug">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
    </label>
  );
}

function PreviewBox({ label, children }) {
  return (
    <div className="mt-2 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3">
      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-semibold text-emerald-900">{children}</p>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="admin-panel overflow-hidden mb-6">
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-gray-50">
          <Icon size={18} className="text-primary" />
          <h3 className="font-bold text-ink">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}
