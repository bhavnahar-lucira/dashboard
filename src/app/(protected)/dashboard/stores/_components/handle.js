/**
 * Collection-handle normalisation, mirroring `toHandle` in
 * lucira-backend/lib/storePages.js.
 *
 * The backend normalises on save either way; this exists so the dashboard shows
 * the same answer while you type. Pasting a full store URL is the natural thing
 * to do, and without this the preview reads
 * "/collections/https://…/collections/malleshwaram-store".
 */
export function toHandle(value) {
  const raw = String(value == null ? "" : value).trim();
  const fromUrl = raw.match(/\/collections\/([^/?#]+)/);
  return (fromUrl ? fromUrl[1] : raw)
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
