import { apiClient } from "../api-client"
import { API_ENDPOINTS } from "../api-config"

// ============ Types ============

export type MilestoneType = 'progress' | 'section' | 'lesson' | 'time' | 'streak'
export type RewardType = 'tokens' | 'gift_card' | 'airtime_voucher' | 'certificate_bonus' | 'custom'

export interface Milestone {
  id: string
  site_id: string
  course_id: string | null
  section_id: string | null
  name: string
  description: string | null
  type: MilestoneType
  is_auto_created: boolean
  threshold_value: number
  threshold_type: string
  lesson_ids: string[] | null
  reward_type: RewardType
  reward_value: number
  reward_metadata: Record<string, unknown> | null
  badge_icon: string | null
  badge_image_url: string | null
  badge_color: string
  celebration_message: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserMilestone {
  id: string
  site_id: string
  user_id: string
  milestone_id: string
  enrollment_id: string
  course_id: string
  achieved_at: string
  reward_claimed: boolean
  reward_claimed_at: string | null
  notification_sent: boolean
  progress_at_achievement: number
  milestone?: Milestone
}

export interface MilestoneWithProgress extends Milestone {
  is_achieved: boolean
  progress_towards: number
  user_milestone?: UserMilestone
}

export interface CourseMilestonesProgress {
  course_id: string
  enrollment_id: string
  total_milestones: number
  achieved_milestones: number
  milestones: MilestoneWithProgress[]
}

export interface MilestoneCelebration {
  milestone: Milestone
  user_milestone: UserMilestone
  celebration_title: string
  celebration_message: string
  reward_description: string
  next_milestone?: Milestone
}

export interface RewardClaimResult {
  success: boolean
  user_milestone_id: string
  reward_type: RewardType
  reward_value: number
  claimed_at: string
  message: string
}

export interface AutoGenerateMilestonesRequest {
  course_id: string
  generate_section_milestones?: boolean
  progress_thresholds?: number[]
  base_token_reward?: number
}

export interface AutoGenerateMilestonesResult {
  created_count: number
  milestones: Milestone[]
}

export interface CreateMilestoneRequest {
  name: string
  description?: string
  type: MilestoneType
  threshold_value: number
  threshold_type?: string
  lesson_ids?: string[]
  course_id?: string
  section_id?: string
  reward_type?: RewardType
  reward_value?: number
  reward_metadata?: Record<string, unknown>
  badge_icon?: string
  badge_image_url?: string
  badge_color?: string
  celebration_message?: string
  sort_order?: number
  is_active?: boolean
}

export interface UpdateMilestoneRequest {
  name?: string
  description?: string
  type?: MilestoneType
  threshold_value?: number
  threshold_type?: string
  lesson_ids?: string[]
  reward_type?: RewardType
  reward_value?: number
  reward_metadata?: Record<string, unknown>
  badge_icon?: string
  badge_image_url?: string
  badge_color?: string
  celebration_message?: string
  sort_order?: number
  is_active?: boolean
}

export interface MilestonesListResponse {
  items: Milestone[]
  total: number
}

export interface UserMilestonesListResponse {
  items: UserMilestone[]
  total: number
}

// ============ Service ============

class MilestonesService {
  // Upload badge image
  async uploadBadgeImage(file: File): Promise<{ url: string }> {
    try {
      return await apiClient.uploadFile<{ url: string }>(
        API_ENDPOINTS.uploadBadgeImage,
        file
      )
    } catch (error) {
      console.error("Failed to upload badge image:", error)
      throw error
    }
  }

  // Admin endpoints
  async createMilestone(data: CreateMilestoneRequest): Promise<Milestone> {
    try {
      return await apiClient.post<Milestone>(API_ENDPOINTS.milestones, data)
    } catch (error) {
      console.error("Failed to create milestone:", error)
      throw error
    }
  }

  async autoGenerateMilestones(data: AutoGenerateMilestonesRequest): Promise<AutoGenerateMilestonesResult> {
    try {
      return await apiClient.post<AutoGenerateMilestonesResult>(
        API_ENDPOINTS.autoGenerateMilestones,
        data
      )
    } catch (error) {
      console.error("Failed to auto-generate milestones:", error)
      throw error
    }
  }

  async updateMilestone(milestoneId: string, data: UpdateMilestoneRequest): Promise<Milestone> {
    try {
      return await apiClient.put<Milestone>(
        API_ENDPOINTS.milestoneItem(milestoneId),
        data
      )
    } catch (error) {
      console.error("Failed to update milestone:", error)
      throw error
    }
  }

  async deleteMilestone(milestoneId: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.milestoneItem(milestoneId))
    } catch (error) {
      console.error("Failed to delete milestone:", error)
      throw error
    }
  }

  // Get milestones for a course
  async getCourseMilestones(courseId: string, isActive?: boolean): Promise<MilestonesListResponse> {
    try {
      let url = API_ENDPOINTS.milestoneCourse(courseId)
      if (isActive !== undefined) {
        url += `?is_active=${isActive}`
      }
      return await apiClient.get<MilestonesListResponse>(url)
    } catch (error) {
      console.error("Failed to get course milestones:", error)
      throw error
    }
  }

  // Get single milestone
  async getMilestone(milestoneId: string): Promise<Milestone> {
    try {
      return await apiClient.get<Milestone>(API_ENDPOINTS.milestoneItem(milestoneId))
    } catch (error) {
      console.error("Failed to get milestone:", error)
      throw error
    }
  }

  // User endpoints
  async getMyMilestones(courseId?: string, page = 1, size = 20): Promise<UserMilestonesListResponse> {
    try {
      let url = `${API_ENDPOINTS.myMilestones}?page=${page}&size=${size}`
      if (courseId) {
        url += `&course_id=${courseId}`
      }
      return await apiClient.get<UserMilestonesListResponse>(url)
    } catch (error) {
      console.error("Failed to get my milestones:", error)
      throw error
    }
  }

  async getCourseMilestonesProgress(courseId: string): Promise<CourseMilestonesProgress> {
    try {
      return await apiClient.get<CourseMilestonesProgress>(
        API_ENDPOINTS.milestoneCourseProgress(courseId)
      )
    } catch (error) {
      console.error("Failed to get course milestones progress:", error)
      throw error
    }
  }

  async claimMilestoneReward(milestoneId: string): Promise<RewardClaimResult> {
    try {
      return await apiClient.post<RewardClaimResult>(
        API_ENDPOINTS.milestoneClaim(milestoneId)
      )
    } catch (error) {
      console.error("Failed to claim milestone reward:", error)
      throw error
    }
  }

  // Helper methods
  getBadgeIcon(milestone: Milestone): string {
    if (milestone.badge_icon) {
      return milestone.badge_icon
    }
    
    // Default icons based on milestone type
    switch (milestone.type) {
      case 'progress':
        return '🎯'
      case 'section':
        return '📚'
      case 'lesson':
        return '✅'
      case 'time':
        return '⏱️'
      case 'streak':
        return '🔥'
      default:
        return '🏆'
    }
  }

  getRewardDescription(milestone: Milestone): string {
    switch (milestone.reward_type) {
      case 'tokens':
        return `${milestone.reward_value} tokens`
      case 'gift_card':
        return `$${milestone.reward_value} gift card`
      case 'airtime_voucher':
        return `$${milestone.reward_value} airtime voucher`
      case 'certificate_bonus':
        return `Certificate bonus: ${milestone.reward_value}`
      case 'custom':
        return milestone.reward_metadata?.description as string || 'Special reward'
      default:
        return 'Reward'
    }
  }

  formatMilestoneProgress(milestone: MilestoneWithProgress): {
    status: 'achieved' | 'in_progress' | 'locked'
    progressText: string
    progressPercent: number
  } {
    if (milestone.is_achieved) {
      return {
        status: 'achieved',
        progressText: 'Completed!',
        progressPercent: 100
      }
    }

    const progress = milestone.progress_towards
    const threshold = milestone.threshold_value

    if (milestone.threshold_type === 'percentage') {
      return {
        status: 'in_progress',
        progressText: `${Math.min(progress, 100)}% of ${threshold}%`,
        progressPercent: Math.min((progress / threshold) * 100, 100)
      }
    }

    return {
      status: 'in_progress',
      progressText: `${progress}% complete`,
      progressPercent: progress
    }
  }
}

export const milestonesService = new MilestonesService()