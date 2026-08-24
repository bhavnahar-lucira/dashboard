import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/styled-videos`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin Styled Videos GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch styled videos" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const videos = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/styled-videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(videos),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin Styled Videos POST Error:", error);
    return NextResponse.json({ error: "Failed to save styled videos" }, { status: 500 });
  }
}
