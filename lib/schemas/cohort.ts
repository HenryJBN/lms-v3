import { z } from "zod"

export const CohortSchema = z.object({
  name: z.string().min(1, "Name is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional().nullable(),
  max_students: z.coerce.number().min(1).optional().nullable(),
  registration_open: z.boolean().default(true),
  course_id: z.string().uuid("Invalid course ID").optional(),
})

export const CohortCreateSchema = CohortSchema.extend({
  course_id: z.string().uuid("Invalid course ID"),
})

export const CohortUpdateSchema = CohortSchema.partial()

export type CohortFormValues = z.infer<typeof CohortSchema>
export type CohortCreateValues = z.infer<typeof CohortCreateSchema>
export type CohortUpdateValues = z.infer<typeof CohortUpdateSchema>
