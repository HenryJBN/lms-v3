import { apiClient } from "../api-client"
import { API_ENDPOINTS } from "../api-config"
import {
  CourseCreateSchema,
  CourseUpdateSchema,
  FileUploadResponseSchema,
  type CourseCreate,
  type CourseUpdate,
  type FileUploadResponse,
  type CourseCreateForm,
  type CourseUpdateForm,
} from "@/lib/schemas/course"

export interface Course {
  title: string
  slug: string
  category_id?: string
  description: string
  short_description: string
  trailer_video_url?: string
  thumbnail_url: string | null
  duration_hours: number
  instructor_name: string
  total_students: number
  rating: number
  price: number
  token_reward: number
  is_enrolled: boolean
  is_free: boolean
  status: "draft" | "published" | "archived"
  enrollment_limit: number
  level: "beginner" | "intermediate" | "advanced"
}

export interface CourseReponse extends Course {
  id: number | string // ✅ Returned from backend
  // category: string;
  instructor_name: string
  // students: number;
  lessons: number
  rating: number
  total_students: number
  is_enrolled: boolean
  enrollment_limit: number
  // createdDate: string;
  // lastUpdated: string;
  thumbnail_url: string
}

// CourseUpdate interface is now imported from schemas

export interface GetCoursesResponse {
  items: CourseReponse[]
  total: number
  page: number
  size: number
  pages: number
}

export interface CourseCategory {
  id: string
  name: string
  description?: string
  course_count: number
}

export interface CourseFilters {
  category_id?: string
  difficulty_level?: string
  min_duration?: number
  max_duration?: number
  is_published?: boolean
  search?: string
  level?: "beginner" | "intermediate" | "advanced" | string
}

class CourseService {
  /**
   * ✅ Fetch paginated courses with optional filters
   */
  async getCourses(filters?: CourseFilters): Promise<GetCoursesResponse> {
    try {
      const params = new URLSearchParams()

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value))
          }
        })
      }

      const endpoint = `${API_ENDPOINTS.courses}${params.toString() ? `?${params.toString()}` : ""}`

      const response = await apiClient.get<GetCoursesResponse>(endpoint)

      // Ensure consistent structure if API returns array instead of paginated object
      if (!("items" in response)) {
        return {
          items: Array.isArray(response) ? response : [],
          total: 0,
          page: 1,
          size: 0,
          pages: 1,
        }
      }

      return response
    } catch (error) {
      console.error("❌ Failed to get courses:", error)
      throw error
    }
  }

  /**
   * ✅ Fetch paginated admin courses (all statuses)
   */
  async getAdminCourses(filters?: CourseFilters): Promise<GetCoursesResponse> {
    try {
      const params = new URLSearchParams()

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value))
          }
        })
      }

      const endpoint = `${API_ENDPOINTS.adminCourses}${params.toString() ? `?${params.toString()}` : ""}`

      const response = await apiClient.get<GetCoursesResponse>(endpoint)

      // Ensure consistent structure if API returns array instead of paginated object
      if (!("items" in response)) {
        return {
          items: Array.isArray(response) ? response : [],
          total: 0,
          page: 1,
          size: 0,
          pages: 1,
        }
      }

      return response
    } catch (error) {
      console.error("❌ Failed to get admin courses:", error)
      throw error
    }
  }

  /**
   * ✅ Fetch paginated  featured courses
   */
  async getFeaturedCourses(): Promise<GetCoursesResponse> {
    try {
      const endpoint = `${API_ENDPOINTS.courses}/featured/`
      const response = await apiClient.get<GetCoursesResponse>(endpoint)

      // Ensure consistent structure if API returns array instead of paginated object
      if (!("items" in response)) {
        return {
          items: Array.isArray(response) ? response : [],
          total: 0,
          page: 1,
          size: 0,
          pages: 1,
        }
      }

      return response
    } catch (error) {
      console.error("❌ Failed to get courses:", error)
      throw error
    }
  }

  /**
   * ✅ Fetch single course details by slug
   */
  async getCourse(courseSlug: string): Promise<CourseReponse> {
    try {
      return await apiClient.get<CourseReponse>(`${API_ENDPOINTS.courses}/slug/${courseSlug}`)
    } catch (error) {
      console.error("❌ Failed to get course:", error)
      throw error
    }
  }

  /**
   * ✅ Fetch all course categories
   */
  async getCategories(): Promise<CourseCategory[]> {
    try {
      return await apiClient.get<CourseCategory[]>(API_ENDPOINTS.courseCategories)
    } catch (error) {
      console.error("❌ Failed to get categories:", error)
      throw error
    }
  }

  /**
   * ✅ Upload course thumbnail
   */
  async uploadThumbnail(file: File): Promise<{ url: string }> {
    return await apiClient.uploadFile<{ url: string }>(
      `${API_ENDPOINTS.courses}/upload-thumbnail`,
      file
    )
  }

  /**
   * ✅ Upload course trailer video
   */
  async uploadTrailer(file: File): Promise<{ url: string }> {
    return await apiClient.uploadFile<{ url: string }>(
      `${API_ENDPOINTS.courses}/upload-trailer`,
      file
    )
  }

  /**
   * ✅ Create new course
   */
  async createCourse(courseData: {
    title: string
    slug: string
    description?: string
    short_description?: string
    category_id?: string
    level: string
    price: number
    duration_hours?: number
    language?: string
    requirements?: string[]
    learning_outcomes?: string[]
    target_audience?: string
    thumbnail_url?: string
    trailer_video_url?: string
    is_free?: boolean
    is_featured?: boolean
    enrollment_limit?: number
    tags?: string[]
  }): Promise<CourseReponse> {
    const response = await apiClient.post<CourseReponse>(API_ENDPOINTS.courses, courseData)
    return response
  }

  /**
   * ✅ Update existing course
   */
  async updateCourse(courseId: string, data: CourseUpdate): Promise<Course> {
    try {
      const isFileUpload = Object.values(data).some((v) => v instanceof File)
      if (isFileUpload) {
        const formData = new FormData()
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value as any)
          }
        })
        return await apiClient.put<Course>(`${API_ENDPOINTS.courses}/${courseId}`, formData)
      }

      // Normal JSON update
      return await apiClient.put<Course>(`${API_ENDPOINTS.courses}/${courseId}`, data)
    } catch (error) {
      console.error("❌ Failed to update course:", error)
      throw error
    }
  }

  /**
   * ✅ Delete course
   */
  async deleteCourse(courseId: string): Promise<void> {
    try {
      await apiClient.delete(`${API_ENDPOINTS.courses}/${courseId}`)
    } catch (error) {
      console.error("❌ Failed to delete course:", error)
      throw error
    }
  }

  /**
   * ✅ Publish course
   */
  async publishCourse(courseId: string): Promise<Course> {
    try {
      return await apiClient.post<Course>(`${API_ENDPOINTS.courses}/${courseId}/publish`, {})
    } catch (error) {
      console.error("❌ Failed to publish course:", error)
      throw error
    }
  }

  /**
   * ✅ Unpublish course
   */
  async unpublishCourse(courseId: string): Promise<Course> {
    try {
      return await apiClient.post<Course>(`${API_ENDPOINTS.courses}/${courseId}/unpublish`, {})
    } catch (error) {
      console.error("❌ Failed to unpublish course:", error)
      throw error
    }
  }

  /**
   * ✅ Update course status (admin only)
   */
  async updateCourseStatus(
    courseId: string,
    status: string,
    reason?: string
  ): Promise<{ message: string }> {
    try {
      return await apiClient.put<{ message: string }>(
        `${API_ENDPOINTS.adminCourses}/${courseId}/status`,
        {
          status,
          reason,
        }
      )
    } catch (error) {
      console.error("❌ Failed to update course status:", error)
      throw error
    }
  }

  /**
   * ✅ Fetch course statistics
   */
  async getCourseStats(courseId: string): Promise<any> {
    try {
      return await apiClient.get(`${API_ENDPOINTS.courses}/${courseId}/stats`)
    } catch (error) {
      console.error("❌ Failed to get course stats:", error)
      throw error
    }
  }
}

export const courseService = new CourseService()
