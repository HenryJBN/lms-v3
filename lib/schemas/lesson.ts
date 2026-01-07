// lib/schemas/lesson.ts
import { z } from "zod"

// Lesson types enum (matching backend)
export const LessonTypeSchema = z.enum([
  "video",
  "text",
  "audio",
  "image",
  "quiz",
  "assignment",
  "live_session",
])

// File validation helpers
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm"]
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
]

// Duration validation helper (MM:SS format)
const durationRegex = /^(\d{1,3}):([0-5]\d)$/
const validateDuration = (value: string) => {
  const match = value.match(durationRegex)
  if (!match) return false
  const minutes = parseInt(match[1])
  const seconds = parseInt(match[2])
  return minutes >= 0 && minutes <= 999 && seconds >= 0 && seconds <= 59
}

// Convert MM:SS to minutes
const durationToMinutes = (duration: string): number => {
  const [minutes, seconds] = duration.split(":").map(Number)
  return minutes + seconds / 60
}

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

export const audioFileSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= MAX_VIDEO_SIZE, // Use same size limit as video for now
    `Audio size must be under ${MAX_VIDEO_SIZE / (1024 * 1024)}MB`
  )
  .refine((file) => ALLOWED_AUDIO_TYPES.includes(file.type), {
    message: `Only ${ALLOWED_AUDIO_TYPES.join(", ")} files are allowed for audio`,
  })

export const attachmentFileSchema = z
  .instanceof(File)
  .refine(
    (file) => file.size <= MAX_FILE_SIZE,
    `File size must be under ${MAX_FILE_SIZE / (1024 * 1024)}MB`
  )
  .refine(
    (file) =>
      [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES].includes(
        file.type
      ),
    {
      message: "Unsupported file type",
    }
  )

// Lesson creation schema
export const LessonCreateSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters")
    .trim(),

  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .trim()
    .optional(),

  content: z.string().max(50000, "Content must be less than 50,000 characters").optional(),

  course_id: z.string().uuid("Please select a valid course"),

  type: LessonTypeSchema.default("video"),

  sort_order: z.coerce
    .number()
    .min(0, "Sort order must be 0 or greater")
    .max(999, "Sort order cannot exceed 999")
    .default(0),

  estimated_duration: z
    .string()
    .regex(durationRegex, "Duration must be in MM:SS format (e.g., 15:30)")
    .refine(validateDuration, "Invalid duration format")
    .transform(durationToMinutes)
    .optional(),

  is_preview: z.boolean().default(false),

  // Media fields (type-specific)
  video_url: z.string().url("Please enter a valid video URL").optional().or(z.literal("")),
  video_file: videoFileSchema.optional(),
  audio_url: z.string().url("Please enter a valid audio URL").optional().or(z.literal("")),
  audio_file: audioFileSchema.optional(),
  image_files: z.array(imageFileSchema).optional(),
  image_urls: z.array(z.string().url("Please enter valid image URLs")).optional(),

  // File attachments (supplementary materials)
  thumbnail: imageFileSchema.optional(),
  attachments: z.array(attachmentFileSchema).optional(),
})

// Lesson update schema (partial of create)
export const LessonUpdateSchema = LessonCreateSchema.partial().extend({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters")
    .trim()
    .optional(),

  course_id: z.string().uuid("Please select a valid course").optional(),

  video_url: z
    .string()
    .url("Please enter a valid video URL")
    .optional()
    .or(z.literal(""))
    .nullable(),

  thumbnail: imageFileSchema.or(z.string()).optional(), // Allow URL string or File
  attachments: z.array(z.string()).or(z.array(attachmentFileSchema)).optional(), // Allow URLs or Files
})

// Media provision type enums
export const VideoProvisionTypeSchema = z.enum(["url", "upload"])
export const AudioProvisionTypeSchema = z.enum(["url", "upload"])
export const ImageProvisionTypeSchema = z.enum(["url", "upload"])

// Form-specific schema (for React Hook Form)
export const LessonCreateFormSchema = z
  .object({
    title: z
      .string()
      .min(3, "Title must be at least 3 characters")
      .max(200, "Title must be less than 200 characters")
      .trim(),

    description: z
      .string()
      .max(2000, "Description must be less than 2000 characters")
      .trim()
      .optional()
      .or(z.literal("")),

    content: z
      .string()
      .max(50000, "Content must be less than 50,000 characters")
      .optional()
      .or(z.literal("")),

    courseId: z.string().uuid("Please select a valid course"),

    sectionId: z.string().optional().or(z.literal("")),

    type: LessonTypeSchema.default("video"),

    order: z
      .string()
      .regex(/^\d+$/, "Order must be a number")
      .transform((val) => parseInt(val))
      .optional()
      .or(z.literal("")),

    duration: z
      .string()
      .regex(durationRegex, "Duration must be in MM:SS format (e.g., 15:30)")
      .optional()
      .or(z.literal("")),

    isPreview: z.boolean().default(false),

    // Media provision types (conditional based on lesson type)
    videoProvisionType: VideoProvisionTypeSchema.default("url"),
    audioProvisionType: AudioProvisionTypeSchema.default("url"),
    imageProvisionType: ImageProvisionTypeSchema.default("url"),

    // Media URLs and files
    videoUrl: z.string().url("Please enter a valid video URL").optional().or(z.literal("")),
    videoFile: videoFileSchema.optional(),
    audioUrl: z.string().url("Please enter a valid audio URL").optional().or(z.literal("")),
    audioFile: audioFileSchema.optional(),
    imageUrls: z.array(z.string().url("Please enter valid image URLs")).optional(),
    imageFiles: z.array(imageFileSchema).optional(),

    hasQuiz: z.boolean().default(false),

    hasAssignment: z.boolean().default(false),

    passingScore: z
      .string()
      .regex(/^\d+$/, "Passing score must be a number")
      .transform((val) => parseInt(val))
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Validate media content based on lesson type
    switch (data.type) {
      case "video":
        if (data.videoProvisionType === "url") {
          if (!data.videoUrl || data.videoUrl.trim() === "") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Video URL is required for video lessons",
              path: ["videoUrl"],
            })
          }
        } else if (data.videoProvisionType === "upload") {
          if (!data.videoFile) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Video file is required for video lessons",
              path: ["videoFile"],
            })
          }
        }
        break

      case "audio":
        if (data.audioProvisionType === "url") {
          if (!data.audioUrl || data.audioUrl.trim() === "") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Audio URL is required for audio lessons",
              path: ["audioUrl"],
            })
          }
        } else if (data.audioProvisionType === "upload") {
          if (!data.audioFile) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Audio file is required for audio lessons",
              path: ["audioFile"],
            })
          }
        }
        break

      case "image":
        if (data.imageProvisionType === "url") {
          if (!data.imageUrls || data.imageUrls.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "At least one image URL is required for image lessons",
              path: ["imageUrls"],
            })
          }
        } else if (data.imageProvisionType === "upload") {
          if (!data.imageFiles || data.imageFiles.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "At least one image file is required for image lessons",
              path: ["imageFiles"],
            })
          }
        }
        break

      case "text":
        // Text lessons don't require media, only content is optional but recommended
        // We could add validation here if content is required for text lessons
        break
    }
  })

// Export TypeScript types
export type LessonCreate = z.infer<typeof LessonCreateSchema>
export type LessonUpdate = z.infer<typeof LessonUpdateSchema>
export type LessonCreateForm = z.infer<typeof LessonCreateFormSchema>
export type LessonType = z.infer<typeof LessonTypeSchema>
export type ImageFile = z.infer<typeof imageFileSchema>
export type VideoFile = z.infer<typeof videoFileSchema>
export type AttachmentFile = z.infer<typeof attachmentFileSchema>
