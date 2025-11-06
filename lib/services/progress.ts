import { apiClient } from "../api-client";
import { API_ENDPOINTS } from "../api-config";

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  enrollment_id: string;
  status: string;
  time_spent_minutes: number;
  last_accessed_at: string;
  completed_at?: string;
}

export interface UpdateLessonProgressRequest {
  lesson_id: string;
  enrollment_id: string;
  status: string;
  time_spent_minutes?: number;
}

class ProgressService {
  async getLessonProgress(
    lessonId: string,
    enrollmentId: string
  ): Promise<LessonProgress> {
    try {
      return await apiClient.get<LessonProgress>(
        `${API_ENDPOINTS.lessonProgress}/${lessonId}?enrollment_id=${enrollmentId}`
      );
    } catch (error) {
      console.error("Failed to get lesson progress:", error);
      throw error;
    }
  }

  async updateLessonProgress(
    data: UpdateLessonProgressRequest
  ): Promise<LessonProgress> {
    try {
      return await apiClient.post<LessonProgress>(
        API_ENDPOINTS.lessonProgress,
        data
      );
    } catch (error) {
      console.error("Failed to update lesson progress:", error);
      throw error;
    }
  }

  async getUserProgress(enrollmentId: string): Promise<LessonProgress[]> {
    try {
      return await apiClient.get<LessonProgress[]>(
        `${API_ENDPOINTS.progress}?enrollment_id=${enrollmentId}`
      );
    } catch (error) {
      console.error("Failed to get user progress:", error);
      throw error;
    }
  }
}

export const progressService = new ProgressService();
