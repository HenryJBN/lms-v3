import { apiClient } from "../api-client"
import { API_ENDPOINTS } from "../api-config"
import type { CourseCreate } from "@/lib/schemas/course"

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

export interface CourseUpdate {
  title?: string
  description?: string
  short_description?: string
  thumbnail?: File
  category_id?: string
  level?: "beginner" | "intermediate" | "advanced" | string
  price?: number
  original_price?: number
  duration_hours?: number
  language?: string
  requirements?: string[]
  learning_outcomes?: string[]
  target_audience?: string
  tags?: string[]
  is_featured?: boolean
  is_free?: boolean
  enrollment_limit?: number
}

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
   * ✅ Fetch single course details
   */
  async getCourse(slug: string): Promise<Course> {
    try {
      return await apiClient.get<Course>(`${API_ENDPOINTS.courses}/${slug}`)
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
   * ✅ Create new course (supports file upload)
   */
  async createCourse(course: CourseReponse): Promise<Course> {
    const formData = new FormData()

    Object.entries(course).forEach(([key, value]) => {
      if (value === undefined || value === null) return

      if (key === "thumbnail" && value instanceof File) {
        formData.append("thumbnail", value)
      } else if (Array.isArray(value)) {
        value.forEach((item) => formData.append(`${key}[]`, item))
      } else {
        formData.append(key, String(value))
      }
    })

    const response = await apiClient.post<Course>(API_ENDPOINTS.courses, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })

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
