"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export default function RevalidatePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleRevalidate = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setStatus(null);

    try {
      // Extract origin and path from the URL
      let targetUrl;
      try {
        targetUrl = new URL(url);
      } catch (err) {
        setStatus({ type: "error", message: "Please enter a valid URL (e.g., https://lucirajewelry.com/about)" });
        setLoading(false);
        return;
      }

      const path = targetUrl.pathname;
      const LIVE_URL = "https://www.lucirajewelry.com";

      const response = await fetch(`${LIVE_URL}/api/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "path",
          path: path
        }),
      });

      const data = await response.json();

      if (response.ok && data.revalidated) {
        setStatus({ type: "success", message: `Successfully cleared cache for: ${path}` });
        setUrl(""); // clear input on success
      } else {
        setStatus({ type: "error", message: data.message || "Failed to clear cache. Make sure it's the correct domain." });
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Network error. Please make sure the URL is correct and reachable." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-main py-10 px-4 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 font-abhaya flex items-center gap-3">
          <RefreshCw className="text-primary" />
          Clear Page Cache
        </h1>
        <p className="text-gray-500 mt-2">
          Paste a full URL from the storefront to clear its Vercel cache immediately. The page will be freshly cached on the next visit.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm">
        <form onSubmit={handleRevalidate} className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Page URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://lucirajewelry.com/collections/rings"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              required
            />
          </div>

          {status && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 mt-0.5 text-red-600" />}
              <div>
                <p className="font-medium">{status.type === 'success' ? 'Success' : 'Error'}</p>
                <p className="text-sm opacity-90">{status.message}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !url}
            className="w-full bg-[#E5B95F] hover:bg-[#D4A850] text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Clearing Cache...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Clear Cache
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
