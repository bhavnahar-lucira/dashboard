import { NextResponse } from "next/server";

// Proxies to the backend's Admin-API-backed product search, which — unlike
// /api/products/search — includes Unlisted/draft products. Used by pickers
// that need to select an internal-only product (e.g. a free-gift variant),
// not by anything customer-facing.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

    const res = await fetch(`${BACKEND_URL}/api/products/admin-search?q=${encodeURIComponent(query)}&limit=${limit}`);

    if (!res.ok) {
      throw new Error(`Backend admin search failed with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin Product Search Error:", error);
    return NextResponse.json(
      { error: "Failed to search products", message: error.message },
      { status: 500 }
    );
  }
}
