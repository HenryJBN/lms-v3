// /schemas/course.ts
import { z } from "zod"

// File validation helpers
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]

export const imageFileSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= MAX_IMAGE_SIZE,
    `Image size must be under ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
  )
  .refine((file) => ALLOWED_IMAGE_TYPES.includes(file.type), {
    message: `Only ${ALLOWED_IMAGE_TYPES.join(", ")} files are allowed for images`,
  })

export const videoFileSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= MAX_VIDEO_SIZE,
    `Video size must be under ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`
  )
  .refine((file) => ALLOWED_VIDEO_TYPES.includes(file.type), {
    message: `Only ${ALLOWED_VIDEO_TYPES.join(", ")} files are allowed for videos`,
  })

export const CourseCreateSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters")
    .trim(),

  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(100, "Slug must be less than 100 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .trim(),

  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters")
    .trim(),

  short_description: z
    .string()
    .min(10, "Short description must be at least 10 characters")
    .max(500, "Short description must be less than 500 characters")
    .trim(),

  category_id: z.string().uuid("Please select a valid category"),

  duration_hours: z.coerce
    .number()
    .min(0.5, "Duration must be at least 0.5 hours")
    .max(1000, "Duration cannot exceed 1000 hours"),

  price: z.coerce
    .number()
    .min(0, "Price cannot be negative")
    .max(10000, "Price cannot exceed $10,000"),

  level: z.enum(["beginner", "intermediate", "advanced"], {
    errorMap: () => ({ message: "Please select a difficulty level" }),
  }),

  language: z.string().min(2, "Language code is required").default("en"),

  requirements: z.array(z.string().trim().min(1, "Requirement cannot be empty")).optional(),

  learning_outcomes: z
    .array(z.string().trim().min(1, "Learning outcome cannot be empty"))
    .optional(),

  target_audience: z.string().max(1000, "Target audience description is too long").optional(),

  tags: z.array(z.string().trim().min(1, "Tag cannot be empty")).optional(),

  is_free: z.boolean().default(false),

  is_featured: z.boolean().default(false),

  enrollment_limit: z.coerce
    .number()
    .min(1, "Enrollment limit must be at least 1")
    .max(10000, "Enrollment limit cannot exceed 10,000")
    .optional(),

  token_reward: z.coerce
    .number()
    .min(0, "Token reward cannot be negative")
    .max(1000, "Token reward cannot exceed 1000")
    .default(0),

  status: z.enum(["draft", "published", "archived"]).default("draft"),

  // File validations
  thumbnail: imageFileSchema.optional(),

  trailer_video: videoFileSchema.optional(),
})

// File upload response schemas
export const FileUploadResponseSchema = z.object({
  filename: z.string(),
  original_filename: z.string(),
  url: z.string(),
  content_type: z.string(),
  size: z.number(),
  uploaded_at: z.string().datetime(),
  thumbnail_url: z.string().optional(),
  duration: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

// Course update schema (partial of create)
export const CourseUpdateSchema = CourseCreateSchema.partial().extend({
  thumbnail: imageFileSchema.or(z.string()).optional(), // Allow URL string or File
  trailer_video: videoFileSchema.or(z.string()).optional(), // Allow URL string or File
})

// Export TypeScript types
export type CourseCreate = z.infer<typeof CourseCreateSchema>
export type CourseUpdate = z.infer<typeof CourseUpdateSchema>
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>
export type ImageFile = z.infer<typeof imageFileSchema>
export type VideoFile = z.infer<typeof videoFileSchema>

// Form-specific types for React Hook Form
export type CourseCreateForm = Omit<CourseCreate, "thumbnail" | "trailer_video"> & {
  thumbnail?: File | null
  trailer_video?: File | null
}

export type CourseUpdateForm = Omit<CourseUpdate, "thumbnail" | "trailer_video"> & {
  thumbnail?: File | string | null
  trailer_video?: File | string | null
}
