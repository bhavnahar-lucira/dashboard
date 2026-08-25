"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Plus, Trash2, Info } from "lucide-react";
import { toast } from "react-toastify";

export default function SchemeOfferPage() {
  const [settings, setSettings] = useState({
    enabled: true,
    intervals: [
      { min: 3000, max: 4500, giftValue: 5000, label: "Free Gift Worth 5k" },
      { min: 5000, max: 19000, giftValue: 10000, label: "Free Gift Worth 10k" }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const res = await fetch(`${baseUrl}/api/settings/scheme-offer`);
        const data = await res.json();
        setSettings({
          enabled: data.enabled ?? true,
          intervals: data.intervals || []
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
    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/settings/scheme-offer`, {
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

  const addInterval = () => {
    setSettings({
      ...settings,
      intervals: [
        ...settings.intervals,
        { min: 0, max: 0, giftValue: 0, label: "New Gift" }
      ]
    });
  };

  const removeInterval = (index) => {
    const newIntervals = [...settings.intervals];
    newIntervals.splice(index, 1);
    setSettings({ ...settings, intervals: newIntervals });
  };

  const updateInterval = (index, field, value) => {
    const newIntervals = [...settings.intervals];
    newIntervals[index] = { ...newIntervals[index], [field]: value };
    setSettings({ ...settings, intervals: newIntervals });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-gray-900 text-[24px] font-bold font-figtree tracking-[0.1px]">Scheme Promotional Gift Settings</h1>
          <p className="text-sm text-gray-500 mt-1" style={{ marginTop: '2px', fontSize: '16px', color: '#000' }}>Configure promotional gifts and price thresholds for savings schemes</p>
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

      <div className="bg-white border border-gray-100 rounded-[8px] shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          {/* Status Toggle */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-50">
            <div>
              <h3 className="font-bold text-gray-900">Offer Visibility</h3>
              <p className="text-sm text-gray-500">If disabled, the scheme will function as a basic plan with no free gifts.</p>
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

          {/* Intervals Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 uppercase text-sm tracking-wider">Gift Price Intervals</h3>
              <button
                onClick={addInterval}
                className="flex items-center gap-1.5 text-primary hover:text-[#8F5D5D] font-bold text-xs transition-colors"
              >
                <Plus size={16} />
                ADD INTERVAL
              </button>
            </div>

            {!settings.enabled && (
               <div className="bg-amber-50 border border-amber-100 rounded-[8px] p-4 flex gap-3 text-amber-800">
                <Info size={20} className="shrink-0" />
                <p className="text-sm">Note: The offer is currently <strong>DISABLED</strong>. These settings will be saved but not shown to customers until enabled.</p>
              </div>
            )}

            <div className="space-y-4">
              {settings.intervals.map((interval, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1.5fr_auto] gap-4 p-4 bg-gray-50 rounded-[8px] border border-gray-100 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Min Amount (₹)</label>
                    <input
                      type="number"
                      value={interval.min}
                      onChange={(e) => updateInterval(index, 'min', parseInt(e.target.value))}
                      className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Max Amount (₹)</label>
                    <input
                      type="number"
                      value={interval.max}
                      onChange={(e) => updateInterval(index, 'max', parseInt(e.target.value))}
                      className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Gift Value (₹)</label>
                    <input
                      type="number"
                      value={interval.giftValue}
                      onChange={(e) => updateInterval(index, 'giftValue', parseInt(e.target.value))}
                      className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Label (e.g. Free Gift Worth 5k)</label>
                    <input
                      type="text"
                      value={interval.label}
                      onChange={(e) => updateInterval(index, 'label', e.target.value)}
                      className="w-full border border-gray-200 rounded-[8px] px-3 py-2 text-sm focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                  <button
                    onClick={() => removeInterval(index)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}

              {settings.intervals.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[8px] text-gray-400 italic">
                  No intervals defined. Add your first gift threshold above.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-[8px] p-4 flex gap-3 text-blue-800">
        <Info size={20} className="shrink-0" />
        <div className="space-y-2">
          <p className="text-sm font-bold">Important Instructions:</p>
          <ul className="text-xs list-disc ml-4 space-y-1">
            <li>Intervals should not overlap to avoid calculation errors.</li>
            <li>If an amount falls outside defined intervals, no gift will be offered.</li>
            <li>Max amount of 19000 or higher will cover all schemes up to the limit.</li>
            <li>Banners on the frontend will automatically adjust to show the closest 5k or 10k image based on gift value.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
