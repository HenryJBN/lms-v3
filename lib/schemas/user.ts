import { z } from "zod"

export const UserSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  name: z.string().min(2, "Name is required"),
  role: z.enum(["student", "instructor", "admin"]),
})

export type UserFormData = z.infer<typeof UserSchema>
