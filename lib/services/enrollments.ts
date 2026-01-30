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
}

export const enrollmentsService = new EnrollmentsService()
