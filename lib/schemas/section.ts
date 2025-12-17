import { z } from "zod"

// Section schemas for frontend validation
export const SectionCreateFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title must be less than 255 characters"),
  description: z.string().optional(),
  courseId: z.string().min(1, "Course is required"),
  sortOrder: z.string().optional(),
  isPublished: z.boolean().default(true),
})

export type SectionCreateForm = z.infer<typeof SectionCreateFormSchema>
