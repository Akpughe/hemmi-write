import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    // Handle the callback and redirect to home or dashboard
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  // If no code, redirect to error page or login
  return NextResponse.redirect(new URL("/auth/login", requestUrl.origin));
}

// Add default export to satisfy Next.js requirements
export default function CallbackPage() {
  return null;
}
