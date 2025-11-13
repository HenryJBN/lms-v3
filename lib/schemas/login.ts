import { z } from "zod"

export const LoginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export const TwoFactorSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must contain only numbers"),
})

export type LoginFormData = z.infer<typeof LoginSchema>
export type TwoFactorFormData = z.infer<typeof TwoFactorSchema>

