import { z } from "zod"

export const MilestoneCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  type: z.enum(["progress", "time", "streak", "lesson"] as const),
  threshold_value: z.coerce.number().min(1, "Threshold must be at least 1"),
  threshold_type: z.enum(["courses", "minutes", "days", "certificates"] as const),
  reward_type: z.enum(["tokens", "gift_card", "airtime_voucher", "certificate_bonus"] as const),
  reward_value: z.coerce.number().min(1, "Reward value must be at least 1"),
  badge_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  badge_icon: z.string().optional(),
  badge_image_url: z.string().url().optional(),
  celebration_message: z.string().optional(),
  is_active: z.boolean().default(true),
})

export const MilestoneUpdateSchema = MilestoneCreateSchema.partial()

export type MilestoneCreateForm = z.infer<typeof MilestoneCreateSchema>
export type MilestoneUpdateForm = z.infer<typeof MilestoneUpdateSchema>