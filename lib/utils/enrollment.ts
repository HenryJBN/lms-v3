/**
 * Utility functions for managing pending enrollment across redirects using cookies
 * Cookies are used instead of sessionStorage because sessionStorage is domain-specific
 * and cannot be accessed across subdomains (e.g., from dcalms.test to yappi.dcalms.test)
 */

export interface PendingEnrollment {
  courseId: string | number
  courseTitle: string
  tenantDomain: string
  timestamp: number
}

const PENDING_ENROLLMENT_KEY = "pending_enrollment"

/**
 * Get the base domain with leading dot for cross-subdomain cookie access
 */
function getCookieDomain(): string {
  // Get base domain from env or default
  const baseDomain = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_BASE_DOMAIN || "dcalms.test")
    : "dcalms.test"
  // Return with leading dot to allow access from all subdomains
  return "." + baseDomain
}

/**
 * Set a cookie with cross-subdomain support
 */
function setCookie(name: string, value: string, days: number): void {
  if (typeof window === "undefined") return
  
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  
  const domain = getCookieDomain()
  
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};domain=${domain};path=/;SameSite=Lax`
}

/**
 * Get a cookie value
 */
function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null
  
  const nameEQ = name + "="
  const cookies = document.cookie.split(";")
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i]
    while (cookie.charAt(0) === " ") {
      cookie = cookie.substring(1, cookie.length)
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length))
    }
  }
  
  return null
}

/**
 * Clear a cookie (must use same domain as when it was set)
 */
function eraseCookie(name: string): void {
  if (typeof window === "undefined") return
  
  const domain = getCookieDomain()
  
  // Try to erase with the same domain settings
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;domain=${domain};path=/`
  // Also try without domain to cover all cases
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`
}

/**
 * Store pending enrollment in cookie before redirecting to signup
 * Cookie is set with cross-subdomain domain so it can be accessed on tenant subdomains
 */
export function setPendingEnrollment(course: { id: string | number; title: string; tenant_domain?: string }): void {
  const pendingEnrollment: PendingEnrollment = {
    courseId: course.id,
    courseTitle: course.title,
    tenantDomain: course.tenant_domain || "",
    timestamp: Date.now(),
  }
  
  try {
    // Store for 24 hours (1 day)
    setCookie(PENDING_ENROLLMENT_KEY, JSON.stringify(pendingEnrollment), 1)
  } catch (error) {
    console.error("Failed to store pending enrollment:", error)
  }
}

/**
 * Get pending enrollment from cookie
 * Works across subdomains because cookie is set with cross-subdomain domain
 */
export function getPendingEnrollment(): PendingEnrollment | null {
  try {
    const stored = getCookie(PENDING_ENROLLMENT_KEY)
    if (!stored) return null
    
    const pending: PendingEnrollment = JSON.parse(stored)
    
    // Check if the pending enrollment is still valid (within 24 hours)
    const expiresAfter = 24 * 60 * 60 * 1000 // 24 hours
    if (Date.now() - pending.timestamp > expiresAfter) {
      clearPendingEnrollment()
      return null
    }
    
    return pending
  } catch (error) {
    console.error("Failed to get pending enrollment:", error)
    return null
  }
}

/**
 * Clear pending enrollment cookie
 */
export function clearPendingEnrollment(): void {
  try {
    eraseCookie(PENDING_ENROLLMENT_KEY)
  } catch (error) {
    console.error("Failed to clear pending enrollment:", error)
  }
}
