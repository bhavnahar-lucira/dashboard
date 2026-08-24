import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/curated-looks`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin Curated Looks GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch curated looks" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const looks = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/curated-looks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(looks),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin Curated Looks POST Error:", error);
    return NextResponse.json({ error: "Failed to save curated looks" }, { status: 500 });
  }
}
