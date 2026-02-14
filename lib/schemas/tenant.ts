import { z } from "zod"

export const tenantRegistrationSchema = z.object({
  school_name: z.string().min(2, "Academy name must be at least 2 characters"),
  subdomain: z.string()
    .min(2, "Subdomain must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed")
    .transform(val => val.toLowerCase()),
  admin_email: z.string().email("Invalid email address"),
  admin_password: z.string().min(8, "Password must be at least 8 characters"),
  admin_first_name: z.string().min(1, "First name is required"),
  admin_last_name: z.string().min(1, "Last name is required"),
})

export type TenantRegistrationValues = z.infer<typeof tenantRegistrationSchema>
