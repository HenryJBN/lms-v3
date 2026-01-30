import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const host = request.headers.get("host")
  
  if (host) {
    requestHeaders.set("x-tenant-domain", host)
  }

  // Check if the request is for admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Skip middleware for login and forgot-password pages
    if (
      request.nextUrl.pathname === "/admin/login" ||
      request.nextUrl.pathname === "/admin/forgot-password"
    ) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
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

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
