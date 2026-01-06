export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const REQUEST_TIMEOUT = 10000
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

  // Categories endpoints
  categories: "/api/categories",
}
