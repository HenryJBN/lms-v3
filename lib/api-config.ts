export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

// Check if we're in development mode
export const IS_DEVELOPMENT = process.env.NODE_ENV === "development"

export const REQUEST_TIMEOUT = 30000

/**
 * Convert a video URL to use the streaming endpoint in development mode.
 * In production, videos are served directly from S3/CDN which supports Range requests natively.
 * 
 * @param videoUrl - The original video URL
 * @returns The streaming URL for development, or original URL for production
 */
export function getVideoStreamUrl(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null
  
  // In production, return the original URL (S3/CDN handles Range requests)
  if (!IS_DEVELOPMENT) return videoUrl
  
  // In development, convert to streaming endpoint
  // Handle both full URLs and relative paths
  if (videoUrl.includes('/uploads/')) {
    // Extract the path after /uploads/
    const uploadsIndex = videoUrl.indexOf('/uploads/')
    const relativePath = videoUrl.substring(uploadsIndex + 9) // Remove '/uploads/'
    return `${API_BASE_URL}/api/videos/stream/${relativePath}`
  }
  
  // If it's already a relative path or different format, return as-is
  return videoUrl
}

/**
 * Convert an HLS playlist URL for development mode.
 * 
 * @param hlsUrl - The original HLS URL
 * @returns The HLS streaming URL for development, or original URL for production
 */
export function getHlsStreamUrl(hlsUrl: string | null | undefined): string | null {
  if (!hlsUrl) return null
  
  // In production, return the original URL (S3/CDN serves HLS files)
  if (!IS_DEVELOPMENT) return hlsUrl
  
  // In development, convert to HLS endpoint
  if (hlsUrl.includes('/uploads/')) {
    const uploadsIndex = hlsUrl.indexOf('/uploads/')
    const relativePath = hlsUrl.substring(uploadsIndex + 9)
    return `${API_BASE_URL}/api/videos/hls/${relativePath}`
  }
  
  return hlsUrl
}

export const COOKIE_NAMES = {
  userId: "user_id",
  refreshToken: "refresh_token",
}

export const COOKIE_OPTIONS = {
  path: "/",
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
export const API_ENDPOINTS = {
  // Auth endpoints
  login: "/api/auth/login",
  verify2FA: "/api/auth/verify-2fa",
  register: "/api/auth/register",
  logout: "/api/auth/logout",
  refreshToken: "/api/auth/refresh",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password",
  verifyEmail: "/api/auth/verify-email",
  verifyEmailCode: "/api/auth/verify-email-code",
  resendVerificationCode: "/api/auth/resend-verification-code",

  // User endpoints
  users: "/api/users",
  currentUser: "/api/users/me",
  userProfile: (userId: string) => `/api/users/profile/${userId}`,
  updateProfile: "/api/users/profile",
  uploadAvatar: "/api/users/avatar",
  tokenBalance: "/api/users/me/tokens",

  // Course endpoints
  courses: "/api/courses",
  courseCategories: "/api/categories",
  courseLessons: "/api/lessons",

  // Enrollment endpoints
  enrollments: "/api/enrollments",
  myEnrollments: "/api/enrollments/my-enrollments",

  // Progress endpoints
  progress: "/api/progress",
  lessonProgress: "/api/progress/lesson",

  // Certificate endpoints
  certificates: "/api/certificates",
  myCertificates: "/api/certificates/my-certificates",

  // Notification endpoints
  notifications: "/api/notifications",
  myNotifications: "/api/notifications/my-notifications",

  // Admin endpoints
  admin: "/api/admin",
  adminDashboard: "/api/admin/dashboard",
  adminUsers: "/api/admin/users",
  adminCourses: "/api/admin/courses",
  adminAnalytics: "/api/admin/analytics",

  // Analytics endpoints
  analytics: "/api/analytics",
  userOverview: "/api/analytics/me",

  // Categories endpoints
  categories: "/api/categories",

  // Site endpoints
  siteTheme: "/api/site/theme",
  siteInfo: "/api/site/info",
  siteGlobalTheme: "/api/site/global/theme",
  siteGlobalStats: "/api/site/global/stats",

  // System Admin endpoints
  systemAdmin: "/api/system-admin",
  systemAdminSites: "/api/system-admin/sites",
  systemAdminGlobalStats: "/api/system-admin/stats/global",
  systemAdminActivity: "/api/system-admin/stats/activity",
  systemAdminGrowth: "/api/system-admin/stats/growth",
  systemAdminSettings: "/api/system-admin/settings",
  systemAdminSettingItem: (id: string) => `/api/system-admin/settings/${id}`,

  // Onboarding endpoints
  onboarding: "/api/onboarding",
  checkSubdomain: "/api/onboarding/check-subdomain",
  registerTenant: "/api/onboarding/register-tenant",
  
  inProgressCourses: "/api/enrollments/my-courses?status=active",
  completedCourses: "/api/enrollments/my-courses?status=completed",
  cohorts: "/api/cohorts",
  
  // Admin Completions endpoints
  adminCompletions: "/api/enrollments/admin/completions",
  adminCompletionsStats: "/api/enrollments/admin/completions/stats",

  // Milestone endpoints
  milestones: "/api/milestones",
  milestoneCourse: (courseId: string) => `/api/milestones/course/${courseId}`,
  milestoneItem: (milestoneId: string) => `/api/milestones/${milestoneId}`,
  milestoneClaim: (milestoneId: string) => `/api/milestones/${milestoneId}/claim`,
  myMilestones: "/api/milestones/user/my-milestones",
  milestoneCourseProgress: (courseId: string) => `/api/milestones/user/course-progress/${courseId}`,
  autoGenerateMilestones: "/api/milestones/auto-generate",
  uploadBadgeImage: "/api/milestones/upload-badge-image",
}
