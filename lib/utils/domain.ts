/**
 * Utility functions for detecting and working with global vs subdomain contexts
 */

/**
 * Get the base domain from environment variables
 * @returns The base domain (e.g., "dcalms.test")
 */
export function getBaseDomain(): string {
  return process.env.NEXT_PUBLIC_BASE_DOMAIN || "dcalms.test"
}

/**
 * Check if the current hostname is on the global domain (not a subdomain)
 * @param hostname - Optional hostname to check (defaults to window.location.hostname)
 * @returns true if on global domain, false if on subdomain
 */
export function isGlobalDomain(hostname?: string): boolean {
  const baseDomain = getBaseDomain()
  const currentHostname = hostname || (typeof window !== 'undefined' ? window.location.hostname : '')
  
  return (
    currentHostname === baseDomain ||
    currentHostname === "localhost" ||
    currentHostname === "127.0.0.1" ||
    currentHostname === `www.${baseDomain}`
  )
}

/**
 * Check if running in development mode
 * Returns true if hostname is localhost/127.0.0.1 OR if there's a port (indicating dev environment)
 */
export function isDevelopment(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  const hasPort = !!window.location.port
  return hostname === "localhost" || hostname === "127.0.0.1" || hasPort
}

/**
 * Build a tenant URL (e.g., for redirecting to signup)
 * @param tenantDomain - The subdomain of the tenant
 * @param path - The path to append (e.g., "/signup")
 * @returns The full URL to the tenant's portal
 * 
 * Examples based on current window.location:
 * - http://dcalms.test:3000 -> http://yappi.dcalms.test:3000/signup
 * - https://dcalms.test -> https://yappi.dcalms.test/signup
 */
export function buildTenantUrl(tenantDomain: string, path: string = ""): string {
  const protocol = window.location.protocol.replace(":", "") // "http" or "https"
  const port = window.location.port ? `:${window.location.port}` : ""
  
  // Use base domain (e.g., dcalms.test) and append the tenant subdomain
  const baseDomain = getBaseDomain()
  
  return `${protocol}://${tenantDomain}.${baseDomain}${port}${path}`
}
