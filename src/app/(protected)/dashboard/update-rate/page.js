"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Save } from "lucide-react";
import { toast } from "react-toastify";
import { apiFetch } from "@/lib/api";

export default function UpdateRatePage() {
  const [rates, setRates] = useState({
    gold_price_24k: "",
    gold_price_22k: "",
    silver_price_10g: "",
    silver_price_1kg: "",
    platinum_price: ""
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function fetchRates() {
      try {
        const data = await apiFetch('/api/rates');
        setRates({
          gold_price_24k: data.gold_price_24k || "",
          gold_price_22k: data.gold_price_22k || "",
          silver_price_10g: data.silver_price_10g || "",
          silver_price_1kg: data.silver_price_1kg || "",
          platinum_price: data.platinum_price || ""
        });
      } catch (err) {
        console.error("Failed to load rates:", err);
        toast.error("Failed to load current rates.");
      } finally {
        setFetching(false);
      }
    }
    fetchRates();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRates((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await apiFetch('/api/rates', {
        method: 'POST',
        body: JSON.stringify(rates)
      });

      toast.success(result.message || "Rates updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "An error occurred while saving rates.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="container-main py-10 px-4">Loading...</div>;
  }

  return (
    <div className="container-main py-10 px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-gray-900 flex items-center gap-3 text-[24px] font-bold font-figtree tracking-[0.1px]">
            <TrendingUp className="text-primary" />
            Update Daily Rates
          </h1>
          <p className="text-gray-500 mt-2" style={{ marginTop: '2px', fontSize: '16px', color: '#000' }}>Manage the daily rates for Gold, Silver, and Platinum across all pages.</p>
        </div>
      </div>

      <div className="max-w-2xl bg-white rounded-[8px] shadow-sm border border-gray-100 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">24kt Gold Rate (per 10 gram)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="gold_price_24k"
                  value={rates.gold_price_24k}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="e.g. 7500"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">22kt Gold Rate (per 10 gram)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="gold_price_22k"
                  value={rates.gold_price_22k}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="e.g. 6800"
                  required
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Silver Rate (10gm)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="silver_price_10g"
                  value={rates.silver_price_10g}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="e.g. 900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Silver Rate (1kg)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="silver_price_1kg"
                  value={rates.silver_price_1kg}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="e.g. 90000"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Platinum Rate (per 1 gram)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="platinum_price"
                  value={rates.platinum_price}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-[8px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="e.g. 3500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-[8px] font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? "Saving..." : "Save Rates"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
