"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Info } from "lucide-react";
import { toast } from "react-toastify";

export default function GoldCoinOfferPage() {
  const [settings, setSettings] = useState({
    enabled: false,
    threshold: 20000,
    message: "Complimentary Gold Coin available on this order"
  });
  const [shopifyProduct, setShopifyProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const res = await fetch(`${baseUrl}/api/settings/gold-coin`);
        const data = await res.json();
        setSettings({
          enabled: data.enabled ?? false,
          threshold: data.threshold ?? 20000,
          message: data.message || "Complimentary Gold Coin available on this order"
        });
        if (data.shopifyProduct) {
          setShopifyProduct(data.shopifyProduct);
        }
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
      const res = await fetch(`${baseUrl}/api/settings/gold-coin`, {
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-abhaya" style={{ fontWeight: 600, fontFamily: 'Figtree', fontSize: '24px', letterSpacing: '0.1px' }}>Gold Coin Offer Configuration</h1>
          <p className="text-sm text-gray-500 mt-1" style={{ marginTop: '2px', fontSize: '16px', color: '#000' }}>Manage the automated free gold coin promotion</p>
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

      <div className="bg-white border border-gray-100 rounded-sm shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          <div className="flex items-center justify-between pb-6 border-b border-gray-50">
            <div>
              <h3 className="font-bold text-gray-900">Promotion Status</h3>
              <p className="text-sm text-gray-500" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>Enable or disable the gold coin offer site-wide</p>
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
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                Minimum Cart Value (₹)
              </label>
              <input
                type="number"
                value={settings.threshold}
                onChange={(e) => setSettings({ ...settings, threshold: e.target.value })}
                className="w-full border border-gray-200 rounded-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">
                Promotional Message
              </label>
              <input
                type="text"
                value={settings.message}
                onChange={(e) => setSettings({ ...settings, message: e.target.value })}
                className="w-full border border-gray-200 rounded-sm px-4 py-3 focus:outline-none focus:border-primary transition-colors font-medium"
              />
            </div>
          </div>

          {shopifyProduct && (
            <div className="mt-8 pt-8 border-t border-gray-50">
              <h3 className="font-bold text-gray-900 mb-4 uppercase text-sm tracking-wider">Associated Shopify Product</h3>
              <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-sm border border-gray-100">
                <div className="relative w-24 h-24 bg-white rounded-sm border border-gray-200 overflow-hidden shrink-0">
                  <img 
                    src={shopifyProduct.image} 
                    alt={shopifyProduct.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-gray-900">{shopifyProduct.title}</h4>
                  <p className="text-sm text-gray-500" style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(165, 165, 165)' }}>Variant: {shopifyProduct.variantTitle}</p>
                  <p className="text-sm font-semibold text-primary">Price: ₹{parseFloat(shopifyProduct.price).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-2">ID: {shopifyProduct.variantId}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
