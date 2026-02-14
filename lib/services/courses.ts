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
   * ✅ Fetch single course details by ID
   */
  async getCourseById(courseId: string): Promise<CourseReponse> {
    try {
      return await apiClient.get<CourseReponse>(`${API_ENDPOINTS.courses}/${courseId}`)
    } catch (error) {
      console.error("❌ Failed to get course by ID:", error)
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

  /**
   * ✅ Fetch course lessons for learning
   */
  async getCourseLessons(courseIdOrSlug: string): Promise<any[]> {
    try {
      // Check if it's a UUID or slug - UUIDs are 36 chars, slugs are typically shorter
      const isUUID = courseIdOrSlug.length === 36 && courseIdOrSlug.includes("-")
      const endpoint = isUUID
        ? `${API_ENDPOINTS.courses}/course/${courseIdOrSlug}/lessons`
        : `${API_ENDPOINTS.courseLessons}/course/slug/${courseIdOrSlug}`

      return await apiClient.get(endpoint)
    } catch (error) {
      console.error("❌ Failed to get course lessons:", error)
      throw error
    }
  }

  /**
   * ✅ Fetch course sections
   */
  async getCourseSections(courseId: string): Promise<any[]> {
    try {
      return await apiClient.get(`${API_ENDPOINTS.courses}/sections/course/${courseId}`)
    } catch (error) {
      console.error("❌ Failed to get course sections:", error)
      throw error
    }
  }

  /**
   * ✅ Fetch all site cohorts
   */
  async getAllCohorts(): Promise<Cohort[]> {
    try {
      return await apiClient.get<Cohort[]>(API_ENDPOINTS.cohorts)
    } catch (error) {
      console.error("❌ Failed to get all cohorts:", error)
      throw error
    }
  }

  /**
   * ✅ Fetch course cohorts
   */
  async getCourseCohorts(courseId: string): Promise<Cohort[]> {
    try {
      return await apiClient.get<Cohort[]>(`${API_ENDPOINTS.cohorts}/course/${courseId}`)
    } catch (error) {
      console.error("❌ Failed to get course cohorts:", error)
      throw error
    }
  }

  /**
   * ✅ Create new cohort
   */
  async createCohort(cohortData: {
    course_id: string
    name: string
    start_date: string
    end_date?: string
    max_students?: number | null
    registration_open?: boolean
  }): Promise<Cohort> {
    try {
      return await apiClient.post<Cohort>(API_ENDPOINTS.cohorts, cohortData)
    } catch (error) {
      console.error("❌ Failed to create cohort:", error)
      throw error
    }
  }

  /**
   * ✅ Update existing cohort
   */
  async updateCohort(
    cohortId: string,
    data: {
      name?: string
      start_date?: string
      end_date?: string
      max_students?: number | null
      registration_open?: boolean
    }
  ): Promise<Cohort> {
    try {
      return await apiClient.put<Cohort>(`${API_ENDPOINTS.cohorts}/${cohortId}`, data)
    } catch (error) {
      console.error("❌ Failed to update cohort:", error)
      throw error
    }
  }

  /**
   * ✅ Delete cohort
   */
  async deleteCohort(cohortId: string): Promise<void> {
    try {
      await apiClient.delete(`${API_ENDPOINTS.cohorts}/${cohortId}`)
    } catch (error) {
      console.error("❌ Failed to delete cohort:", error)
      throw error
    }
  }
}

export interface Cohort {
  id: string
  course_id: string
  name: string
  start_date: string
  end_date: string | null
  max_students: number | null
  registration_open: boolean
  current_enrollment_count: number
  created_at: string
  updated_at: string
}

export const courseService = new CourseService()

// Progress Service for handling user progress
export interface UserProgress {
  courseId: string
  completedLessons: string[]
  completedQuizzes: string[]
  lastAccessedLessonId?: string
}

export interface LessonProgressUpdate {
  progress_percentage?: number
  time_spent?: number
  last_position?: number
  notes?: string
}

class ProgressService {
  /**
   * Get user progress for a course
   */
  async getCourseProgress(courseIdOrSlug: string): Promise<UserProgress> {
    try {
      // Check if it's a UUID or slug - UUIDs are 36 chars, slugs are typically shorter
      const isUUID = courseIdOrSlug.length === 36 && courseIdOrSlug.includes("-")
      const endpoint = isUUID
        ? `${API_ENDPOINTS.progress}/course/${courseIdOrSlug}`
        : `${API_ENDPOINTS.progress}/course/slug/${courseIdOrSlug}`

      // API returns LessonProgressResponse[] - transform to UserProgress format
      const progressRecords = await apiClient.get<any[]>(endpoint)

      // Transform API response to expected UserProgress format
      const completedLessons: string[] = []
      const completedQuizzes: string[] = []

      progressRecords.forEach((record: any) => {
        // If lesson status is 'completed', add to completedLessons
        if (record.status === "completed") {
          completedLessons.push(record.lesson_id)
        }
        // Note: quiz completion logic would need to be added here if needed
        // For now, we'll focus on lesson completion
      })

      return {
        courseId: courseIdOrSlug,
        completedLessons,
        completedQuizzes,
        lastAccessedLessonId: undefined, // Could be calculated from progress records
      }
    } catch (error) {
      console.error("❌ Failed to get course progress:", error)
      // Return default structure on error
      return {
        courseId: courseIdOrSlug,
        completedLessons: [],
        completedQuizzes: [],
      }
    }
  }

  /**
   * Update lesson progress
   */
  async updateLessonProgress(lessonId: string, progress: LessonProgressUpdate): Promise<any> {
    try {
      return await apiClient.put(`${API_ENDPOINTS.progress}/lesson/${lessonId}`, progress)
    } catch (error) {
      console.error("❌ Failed to update lesson progress:", error)
      throw error
    }
  }

  /**
   * Mark lesson as completed
   */
  async markLessonCompleted(courseId: string, lessonId: string): Promise<any> {
    try {
      return await this.updateLessonProgress(lessonId, { progress_percentage: 100 })
    } catch (error) {
      console.error("❌ Failed to mark lesson as completed:", error)
      throw error
    }
  }

  /**
   * Submit quiz attempt
   */
  async submitQuizAttempt(quizId: string, answers: Record<string, string>): Promise<any> {
    try {
      return await apiClient.post(`${API_ENDPOINTS.progress}/quiz/attempt`, {
        quiz_id: quizId,
        answers: answers,
      })
    } catch (error) {
      console.error("❌ Failed to submit quiz attempt:", error)
      throw error
    }
  }

  /**
   * Get enrollment progress for a course
   */
  async getEnrollmentProgress(courseIdOrSlug: string): Promise<{ progress_percentage: number }> {
    try {
      // Check if it's a UUID or slug - UUIDs are 36 chars, slugs are typically shorter
      const isUUID = courseIdOrSlug.length === 36 && courseIdOrSlug.includes("-")
      const endpoint = isUUID
        ? `${API_ENDPOINTS.enrollments}/progress/${courseIdOrSlug}`
        : `${API_ENDPOINTS.enrollments}/progress/slug/${courseIdOrSlug}`

      return await apiClient.get<{ progress_percentage: number }>(endpoint)
    } catch (error) {
      console.error("❌ Failed to get enrollment progress:", error)
      // Return default on error
      return { progress_percentage: 0 }
    }
  }
}

export const progressService = new ProgressService()
