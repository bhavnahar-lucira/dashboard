"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

const LIVE_URL = "https://www.lucirajewelry.com";

export default function RevalidatePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState(null);

  const handleClearAllCollections = async () => {
    setBulkLoading(true);
    setBulkStatus(null);

    try {
      const response = await fetch(`${LIVE_URL}/api/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "collections" }),
      });

      const data = await response.json();

      if (response.ok && data.revalidated) {
        setBulkStatus({ type: "success", message: "Cleared cache for every collection page. They will re-cache on the next visit." });
      } else {
        setBulkStatus({ type: "error", message: data.message || "Failed to clear collection caches." });
      }
    } catch (error) {
      console.error(error);
      setBulkStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setBulkLoading(false);
    }
  };

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
        <h1 className="admin-title flex items-center gap-3">
          <RefreshCw className="text-primary" />
          Clear Page Cache
        </h1>
        <p className="admin-subtitle">
          Paste a full URL from the storefront to clear its Vercel cache immediately. The page will be freshly cached on the next visit.
        </p>
      </div>

      <div className="bg-panel border border-hairline-soft rounded-[8px] p-8 shadow-sm">
        <form onSubmit={handleRevalidate} className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-ink-soft mb-2">
              Page URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://lucirajewelry.com/collections/rings"
              className="w-full px-4 py-3 rounded-[8px] border border-hairline focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              required
            />
          </div>

          {status && (
            <div className={`p-4 rounded-[8px] flex items-start gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
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
            className="w-full bg-[#E5B95F] hover:bg-[#D4A850] text-white font-medium py-3 px-4 rounded-[8px] flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
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

      <div className="bg-panel border border-hairline-soft rounded-[8px] p-8 shadow-sm mt-6">
        <h2 className="text-lg font-semibold text-ink mb-1">Clear all collection pages</h2>
        <p className="admin-subtitle mb-6">
          Clears the Vercel cache for every <code>/collections/*</code> page in one go, so you don&apos;t have to paste each collection URL individually.
        </p>

        {bulkStatus && (
          <div className={`p-4 rounded-[8px] flex items-start gap-3 mb-6 ${bulkStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
            {bulkStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 mt-0.5 text-red-600" />}
            <div>
              <p className="font-medium">{bulkStatus.type === 'success' ? 'Success' : 'Error'}</p>
              <p className="text-sm opacity-90">{bulkStatus.message}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleClearAllCollections}
          disabled={bulkLoading}
          className="w-full bg-[#E5B95F] hover:bg-[#D4A850] text-white font-medium py-3 px-4 rounded-[8px] flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {bulkLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Clearing All Collections...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Clear All Collection Caches
            </>
          )}
        </button>
      </div>
    </div>
  );
}
