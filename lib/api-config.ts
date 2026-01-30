export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const REQUEST_TIMEOUT = 10000

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
  adminUsers: "/api/admin/users",
  adminCourses: "/api/admin/courses",
  adminAnalytics: "/api/admin/analytics",

  // Analytics endpoints
  analytics: "/api/analytics",
  userOverview: "/api/analytics/me",

  // Categories endpoints
  categories: "/api/categories",
  
  // Extra specific endpoints often used in dashboard
  inProgressCourses: "/api/enrollments/my-courses?status=active",
  completedCourses: "/api/enrollments/my-courses?status=completed",
}
