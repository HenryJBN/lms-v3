import { z } from "zod"

export const CategoryCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parent_id: z.string().optional(),
  sort_order: z.coerce.number().default(0),
  is_active: z.boolean().default(true),
})

export const CategoryUpdateSchema = CategoryCreateSchema.partial()

export type CategoryCreateForm = z.infer<typeof CategoryCreateSchema>
export type CategoryUpdateForm = z.infer<typeof CategoryUpdateSchema>
