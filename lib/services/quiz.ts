import { apiClient } from "../api-client"
import { API_ENDPOINTS } from "../api-config"
import { type Quiz, type QuizQuestion } from "../schemas/quiz"

class QuizService {
  /**
   * Fetch all quizzes for a lesson
   */
  async getLessonQuizzes(lessonId: string): Promise<Quiz[]> {
    try {
      return await apiClient.get<Quiz[]>(API_ENDPOINTS.lessonQuizzes(lessonId))
    } catch (error) {
      console.error("❌ Failed to get lesson quizzes:", error)
      throw error
    }
  }

  /**
   * Create a new quiz for a lesson
   */
  async createQuiz(lessonId: string, quizData: Partial<Quiz>): Promise<Quiz> {
    try {
      return await apiClient.post<Quiz>(API_ENDPOINTS.lessonQuizzes(lessonId), quizData)
    } catch (error) {
      console.error("❌ Failed to create quiz:", error)
      throw error
    }
  }

  /**
   * Update an existing quiz
   */
  async updateQuiz(lessonId: string, quizId: string, quizData: Partial<Quiz>): Promise<Quiz> {
    try {
      return await apiClient.put<Quiz>(API_ENDPOINTS.quizItem(lessonId, quizId), quizData)
    } catch (error) {
      console.error("❌ Failed to update quiz:", error)
      throw error
    }
  }

  /**
   * Delete a quiz
   */
  async deleteQuiz(lessonId: string, quizId: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.quizItem(lessonId, quizId))
    } catch (error) {
      console.error("❌ Failed to delete quiz:", error)
      throw error
    }
  }

  /**
   * Fetch all questions for a quiz
   */
  async getQuizQuestions(lessonId: string, quizId: string): Promise<QuizQuestion[]> {
    try {
      return await apiClient.get<QuizQuestion[]>(API_ENDPOINTS.quizQuestions(lessonId, quizId))
    } catch (error) {
      console.error("❌ Failed to get quiz questions:", error)
      throw error
    }
  }

  /**
   * Add a question to a quiz
   */
  async createQuestion(lessonId: string, quizId: string, questionData: Partial<QuizQuestion>): Promise<QuizQuestion> {
    try {
      return await apiClient.post<QuizQuestion>(API_ENDPOINTS.quizQuestions(lessonId, quizId), questionData)
    } catch (error) {
      console.error("❌ Failed to create question:", error)
      throw error
    }
  }

  /**
   * Update a quiz question
   */
  async updateQuestion(
    lessonId: string,
    quizId: string,
    questionId: string,
    questionData: Partial<QuizQuestion>
  ): Promise<QuizQuestion> {
    try {
      return await apiClient.put<QuizQuestion>(
        API_ENDPOINTS.quizQuestionItem(lessonId, quizId, questionId),
        questionData
      )
    } catch (error) {
      console.error("❌ Failed to update question:", error)
      throw error
    }
  }

  /**
   * Delete a quiz question
   */
  async deleteQuestion(lessonId: string, quizId: string, questionId: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.quizQuestionItem(lessonId, quizId, questionId))
    } catch (error) {
      console.error("❌ Failed to delete question:", error)
      throw error
    }
  }
}

export const quizService = new QuizService()
