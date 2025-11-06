// /schemas/course.ts
import { z } from "zod";

export const CourseCreateSchema = z.object({
  title: z.string().min(3, "Title is required"),
  slug: z.string().min(3, "Slug is required"),
  description: z.string().min(10, "Description is required"),
  short_description: z.string().min(10, "Short description is required"),
  category_id: z.string().uuid("Invalid category ID"),
  duration_hours: z.coerce.number().min(1, "Duration must be at least 1 hour"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  level: z.string().min(1, "Level is required"),
  language: z.string().default("en"),
  requirements: z.array(z.string()).optional(),
  learning_outcomes: z.array(z.string()).optional(),
  is_free: z.boolean().default(false),
  status: z.string().default("draft"),

  // 🧠 Thumbnail file validation
  thumbnail: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || file.size < 5 * 1024 * 1024,
      "File size must be under 5MB"
    )
    .refine(
      (file) =>
        !file || ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      {
        message: "Only .jpg, .png or .webp files allowed",
      }
    ),
});

// ✅ Export TypeScript types derived from the Zod schema
export type CourseCreate = z.infer<typeof CourseCreateSchema>;

// ✅ Define update schema
export const CourseUpdateSchema = CourseCreateSchema.partial();
export type CourseUpdate = z.infer<typeof CourseUpdateSchema>;
