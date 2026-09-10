"use client";

import { useState } from "react";
import { Loader2, Upload, Plus, X, MoveUp, MoveDown, Trash2 } from "lucide-react";
import { uploadToShopify } from "@/lib/utils";
import { toast } from "react-toastify";

/* Small shared inputs, styled to match the PLP Banners screen. */

export function FieldLabel({ children, hint }) {
  return (
    <label className="text-[10px] font-bold text-ink-muted block mb-2">
      {children}
      {hint ? <span className="ml-2 font-medium normal-case text-ink-muted/70">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder, type = "text", onBlur }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
    />
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black resize-y"
    />
  );
}

export function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-black"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint ? <span className="block text-[11px] text-ink-muted leading-snug">{hint}</span> : null}
      </span>
    </label>
  );
}

/**
 * A URL field with a preview and a direct-to-Shopify upload button. Same
 * component the PLP Banners screen uses, lifted so the store editor and its
 * image lists share one upload path.
 */
export function AssetField({ label, value, onChange, ratio = "wide", namePrefix = "Store" }) {
  const [busy, setBusy] = useState(false);
  const previewClass = ratio === "tall" ? "w-28 h-40 mx-auto" : "w-full h-28";

  const upload = async (file) => {
    if (!file) return;
    try {
      setBusy(true);
      const assetName = `${namePrefix}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "")}`;
      const url = await uploadToShopify(file, assetName);
      if (url) {
        onChange(url);
        toast.success("Image uploaded");
      }
    } catch (e) {
      toast.error("Upload failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 relative">
      {busy && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-[8px]">
          <Loader2 className="animate-spin text-black" size={24} />
        </div>
      )}
      {label ? (
        <label className="text-[10px] font-bold text-ink-muted flex items-center justify-between">
          {label}
          <span className="text-ink-muted flex items-center gap-1"><Upload size={10} /> DIRECT UPLOAD</span>
        </label>
      ) : null}

      {value ? (
        <div className={`${previewClass} bg-field rounded-[8px] overflow-hidden relative mb-2 border border-hairline`}>
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://cdn.shopify.com/...jpg"
          className="flex-1 px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <label className="shrink-0 w-12 flex items-center justify-center rounded-[8px] border-2 border-dashed border-hairline hover:border-black transition-all cursor-pointer">
          <Upload size={16} className="text-ink-muted" />
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }}
          />
        </label>
      </div>
    </div>
  );
}

/**
 * An ordered list of images — used for the collection-page carousel, which
 * cross-fades through every image in order.
 */
export function ImageListField({ label, hint, values, onChange, namePrefix = "Store" }) {
  const list = Array.isArray(values) ? values : [];

  const update = (i, url) => onChange(list.map((v, idx) => (idx === i ? url : v)));
  const remove = (i) => onChange(list.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const to = dir === "up" ? i - 1 : i + 1;
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };

  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="space-y-3">
        {list.map((url, i) => (
          <div key={i} className="flex gap-3 items-start bg-panel-alt border border-hairline-soft rounded-[8px] p-3">
            <span className="w-6 h-6 shrink-0 mt-1 rounded-full bg-field flex items-center justify-center text-[10px] font-bold text-ink-soft">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <AssetField label={null} value={url} onChange={(v) => update(i, v)} namePrefix={namePrefix} />
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button type="button" onClick={() => move(i, "up")} disabled={i === 0} className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30"><MoveUp size={13} /></button>
              <button type="button" onClick={() => move(i, "down")} disabled={i === list.length - 1} className="w-8 h-8 flex items-center justify-center rounded-full bg-field text-ink-soft hover:bg-zinc-200 disabled:opacity-30"><MoveDown size={13} /></button>
              <button type="button" onClick={() => remove(i)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...list, ""])}
        className="mt-3 w-full py-3 border-2 border-dashed border-hairline rounded-[8px] text-ink-soft text-sm font-bold hover:bg-row-hover hover:border-zinc-300 transition-all flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Add image
      </button>
    </div>
  );
}

/**
 * Free-text chips with one-tap suggestions — the "Facilities at Store" pills.
 * Suggestions are the labels already used across the existing stores; anything
 * typed in is accepted, so a store can offer something new.
 */
export function ChipsField({ label, hint, values, onChange, suggestions = [] }) {
  const [draft, setDraft] = useState("");
  const list = Array.isArray(values) ? values : [];

  const add = (raw) => {
    const v = String(raw || "").trim();
    if (!v || list.includes(v)) return;
    onChange([...list, v]);
    setDraft("");
  };
  const remove = (v) => onChange(list.filter((x) => x !== v));
  const unused = suggestions.filter((s) => !list.includes(s));

  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>

      {list.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {list.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5 bg-field text-ink-soft text-xs font-medium pl-3 pr-2 py-1.5 rounded-full">
              {v}
              <button type="button" onClick={() => remove(v)} className="hover:text-red-500"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }}
          placeholder="Type a facility and press Enter"
          className="flex-1 px-4 py-3 bg-panel-alt border border-hairline-soft rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          className="shrink-0 px-4 rounded-[8px] border-2 border-dashed border-hairline hover:border-black text-ink-muted transition-all"
        >
          <Plus size={16} />
        </button>
      </div>

      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {unused.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="text-[11px] text-ink-muted border border-hairline-soft rounded-full px-2.5 py-1 hover:bg-row-hover hover:text-ink transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
