import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  const hostWithPort = request.headers.get("host") || ""
  const host = hostWithPort.split(":")[0] // Remove port for domain matching
  const port = hostWithPort.split(":")[1] ? `:${hostWithPort.split(":")[1]}` : ""
  
  if (hostWithPort) {
    requestHeaders.set("x-tenant-domain", host) // Set without port for backend
  }

  // Prevent tenant domains from accessing the root homepage
  if (request.nextUrl.pathname === "/") {
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "dcalms.test"
    const isLocalhost = host === "localhost" || host === "127.0.0.1"
    
    // Determine if the current host is the global domain
    const isGlobal = 
      host === baseDomain || 
      host === `www.${baseDomain}` || 
      isLocalhost
      
    if (!isGlobal) {
      // It's a tenant trying to access `/`, redirect them to the global `/`
      const targetHost = `${baseDomain}${port}`
      return NextResponse.redirect(`${request.nextUrl.protocol}//${isLocalhost ? `localhost${port}` : targetHost}/`)
    }
  }

  // Check if the request is for admin or system-admin routes
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin")
  const isSystemAdminRoute = request.nextUrl.pathname.startsWith("/system-admin")

  if (isAdminRoute || isSystemAdminRoute) {
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
