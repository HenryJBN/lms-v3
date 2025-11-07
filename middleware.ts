import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check if the request is for admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Skip middleware for login and forgot-password pages
    if (
      request.nextUrl.pathname === "/admin/login" ||
      request.nextUrl.pathname === "/admin/forgot-password"
    ) {
      return NextResponse.next()
    }

    // Check for admin authentication token
    const adminToken = request.cookies.get("admin-token")

    if (!adminToken) {
      // Redirect to admin login if not authenticated
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }

    // In a real app, you would validate the token here
    // For demo purposes, we'll assume any token is valid
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/admin/:path*",
}
