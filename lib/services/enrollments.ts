import { apiClient } from "../api-client"
import { API_ENDPOINTS } from "../api-config"
import type { Course } from "./courses"

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrollment_date: string
  completion_date?: string
  progress_percentage: number
  status: string
  course?: Course
}

export interface EnrollRequest {
  course_id: string
}

export interface CompletionRecord {
  id: string
  userId: string
  userName: string
  userEmail: string
  courseId: string
  courseTitle: string
  cohortId: string | null
  cohortName: string | null
  enrollmentDate: string
  completionDate: string | null
  progress: number
  timeSpent: string
  lessonsCompleted: number
  totalLessons: number
  quizzesPassed: number
  totalQuizzes: number
  finalScore: number | null
  certificateIssued: boolean
  certificateId: string | null
  tokensEarned: number
  status: 'completed' | 'in_progress' | 'not_started'
}

export interface CompletionsStats {
  totalCompletions: number
  totalEnrollments: number
  averageCompletionRate: number
  averageTimeToComplete: string
  certificatesIssued: number
  totalTokensEarned: number
  completionTrends: Array<{ month: string; completions: number }>
  courseCompletionRates: Array<{ course: string; rate: number }>
  timeToCompletionDistribution: Array<{ range: string; count: number }>
}

export interface CompletionsFilters {
  page?: number
  size?: number
  course_id?: string
  status?: string
  search?: string
  start_date?: string
  end_date?: string
}

class EnrollmentsService {
  async getUserEnrollments(): Promise<Enrollment[]> {
    try {
      const response = await apiClient.get<{ items: Enrollment[] }>(
        `${API_ENDPOINTS.enrollments}/my-courses`
      )
      return response.items || []
    } catch (error) {
      console.error("Failed to get user enrollments:", error)
      throw error
    }
  }

  async enroll(courseId: string, cohortId?: string): Promise<Enrollment> {
    try {
      return await apiClient.post<Enrollment>(API_ENDPOINTS.enrollments, {
        course_id: courseId,
        ...(cohortId && { cohort_id: cohortId }),
      })
    } catch (error) {
      console.error("Failed to enroll in course:", error)
      throw error
    }
  }

  async enrollInCourse(courseId: string, cohortId?: string): Promise<Enrollment> {
    return this.enroll(courseId, cohortId)
  }

  async getEnrollment(enrollmentId: string): Promise<Enrollment> {
    try {
      return await apiClient.get<Enrollment>(`${API_ENDPOINTS.enrollments}/${enrollmentId}`)
    } catch (error) {
      console.error("Failed to get enrollment:", error)
      throw error
    }
  }

  // Admin Completions Methods
  async getCompletions(filters?: CompletionsFilters): Promise<{
    items: CompletionRecord[]
    total: number
    page: number
    size: number
    pages: number
  }> {
    try {
      const params = new URLSearchParams()
      if (filters?.page) params.set('page', String(filters.page))
      if (filters?.size) params.set('size', String(filters.size))
      if (filters?.course_id) params.set('course_id', filters.course_id)
      if (filters?.status) params.set('status', filters.status)
      if (filters?.search) params.set('search', filters.search)
      if (filters?.start_date) params.set('start_date', filters.start_date)
      if (filters?.end_date) params.set('end_date', filters.end_date)
      
      const url = `${API_ENDPOINTS.adminCompletions}?${params.toString()}`
      return await apiClient.get(url)
    } catch (error) {
      console.error("Failed to get completions:", error)
      throw error
    }
  }

  async getCompletionsStats(params?: {
    start_date?: string
    end_date?: string
  }): Promise<CompletionsStats> {
    try {
      const searchParams = new URLSearchParams()
      if (params?.start_date) searchParams.set('start_date', params.start_date)
      if (params?.end_date) searchParams.set('end_date', params.end_date)
      
      const url = `${API_ENDPOINTS.adminCompletionsStats}?${searchParams.toString()}`
      return await apiClient.get(url)
    } catch (error) {
      console.error("Failed to get completions stats:", error)
      throw error
    }
  }
}

export const enrollmentsService = new EnrollmentsService()
