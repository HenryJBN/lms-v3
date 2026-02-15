import { z } from "zod"

/**
 * Email Configuration Schema
 * 
 * Validation schema for tenant email/SMTP settings.
 * Implements write-only pattern for password security.
 */

export const EmailConfigSchema = z.object({
  smtp_host: z.string().min(1, "SMTP host is required").optional().nullable(),
  smtp_port: z.coerce.number().min(1).max(65535, "Port must be between 1 and 65535").optional().nullable(),
  smtp_username: z.string().min(1, "SMTP username is required").optional().nullable(),
  smtp_password: z.string().optional().nullable(), // Write-only - never retrieved
  smtp_from_email: z.string().email("Invalid email address").optional().nullable(),
  smtp_from_name: z.string().optional().nullable(),
})

export const EmailConfigUpdateSchema = EmailConfigSchema.partial()

export type EmailConfigFormValues = z.infer<typeof EmailConfigSchema>
export type EmailConfigUpdateValues = z.infer<typeof EmailConfigUpdateSchema>

/**
 * Test Email Request Schema
 */
export const TestEmailSchema = z.object({
  smtp_host: z.string().optional(),
  smtp_port: z.coerce.number().optional(),
  smtp_username: z.string().optional(),
  smtp_password: z.string().optional(),
  smtp_from_email: z.string().email().optional(),
  smtp_from_name: z.string().optional(),
  test_recipient: z.string().email().optional(),
})

export type TestEmailValues = z.infer<typeof TestEmailSchema>

