"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Info } from "lucide-react";
import { toast } from "react-toastify";

export default function BankDiscountPage() {
  const [settings, setSettings] = useState({
    enabled: false,
    discountPercentage: 5,
    threshold: 20000,
    message: "5% Instant Bank Discount on Diamond Value"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const res = await fetch(`${baseUrl}/api/settings/bank-discount`);
        const data = await res.json();
        setSettings({
          enabled: data.enabled ?? false,
          discountPercentage: data.discountPercentage ?? 5,
          threshold: data.threshold ?? 20000,
          message: data.message || "5% Instant Bank Discount on Diamond Value"
        });
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/settings/bank-discount`, {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-x-5 gap-y-4">
        <div className="min-w-0">
          <h1 className="admin-title">Bank Discount Configuration</h1>
          <p className="admin-subtitle">Manage the automated bank discount on diamond value</p>
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

      <div className="admin-panel overflow-hidden">
        <div className="p-6 space-y-8">
          <div className="flex items-center justify-between pb-6 border-b border-gray-50">
            <div>
              <h3 className="font-bold text-ink">Promotion Status</h3>
              <p className="text-sm text-ink-soft" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>Enable or disable the bank discount site-wide</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-ink-soft uppercase tracking-wider">
                Discount Percentage (%)
              </label>
              <input
                type="number"
                value={settings.discountPercentage}
                onChange={(e) => setSettings({ ...settings, discountPercentage: Number(e.target.value) })}
                className="w-full border border-hairline rounded-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors font-medium"
                min="0"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-ink-soft uppercase tracking-wider">
                Minimum Cart/Diamond Value (₹)
              </label>
              <input
                type="number"
                value={settings.threshold}
                onChange={(e) => setSettings({ ...settings, threshold: Number(e.target.value) })}
                className="w-full border border-hairline rounded-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors font-medium"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-bold text-ink-soft uppercase tracking-wider">
                Promotional Message
              </label>
              <input
                type="text"
                value={settings.message}
                onChange={(e) => setSettings({ ...settings, message: e.target.value })}
                className="w-full border border-hairline rounded-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors font-medium"
              />
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-sm flex gap-3 text-blue-800 text-sm">
            <Info className="shrink-0 mt-0.5" size={18} />
            <p>
              This discount will only be applied to the calculated <strong>Diamond Value</strong> of products in the cart that have explicit <code>diamondCharges</code> or <code>diamondTotal</code> fields greater than 0. The threshold checks if the eligible value meets the minimum amount.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
