import { UseFormSetError, FieldValues, Path } from "react-hook-form"
import { toast } from "sonner"

/**
 * Pydantic validation error structure from FastAPI
 */
export interface PydanticValidationError {
  loc: (string | number)[]
  msg: string
  type: string
}

/**
 * API Error response structure
 */
export interface ApiErrorResponse {
  detail: string | PydanticValidationError[]
  [key: string]: any
}

/**
 * Handle Pydantic validation errors from FastAPI and map them to React Hook Form fields
 *
 * @param error - The error object from the API
 * @param setError - React Hook Form's setError function
 * @param fieldMap - Optional mapping of backend field names to form field names
 * @returns true if errors were handled, false otherwise
 *
 * @example
 * ```tsx
 * try {
 *   await apiClient.post('/api/users', data)
 * } catch (error) {
 *   handleFormErrors(error, form.setError, {
 *     first_name: 'firstName',
 *     last_name: 'lastName',
 *   })
 * }
 * ```
 */
export function handleFormErrors<T extends FieldValues>(
  error: any,
  setError: UseFormSetError<T>,
  fieldMap?: Record<string, Path<T>>
): boolean {
  // Check if error has the expected structure
  if (!error?.data?.detail) {
    return false
  }

  const detail = error.data.detail

  // Handle Pydantic validation errors (array format)
  if (Array.isArray(detail)) {
    let hasErrors = false

    detail.forEach((err: PydanticValidationError) => {
      // Pydantic returns location as ['body', 'field_name'] or ['query', 'field_name']
      const fieldName = err.loc?.[1]?.toString()
      const message = err.msg || "Invalid value"

      if (fieldName) {
        // Use field map if provided, otherwise use field name as-is
        const formFieldName = fieldMap?.[fieldName] || fieldName

        try {
          setError(formFieldName as Path<T>, {
            type: "server",
            message: message,
          })
          hasErrors = true
        } catch (e) {
          console.warn(`Could not set error for field: ${formFieldName}`, e)
        }
      }
    })

    if (hasErrors) {
      toast.error("Please fix the errors in the form")
      return true
    }
  }

  // Handle string error messages
  if (typeof detail === "string") {
    toast.error(detail)
    return true
  }

  return false
}

/**
 * Handle API errors with automatic form field mapping and toast notifications
 *
 * @param error - The error object from the API
 * @param setError - React Hook Form's setError function (optional)
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * try {
 *   await apiClient.post('/api/users', data)
 * } catch (error) {
 *   handleApiError(error, form.setError, {
 *     fieldMap: { first_name: 'firstName' },
 *     defaultMessage: 'Failed to create user'
 *   })
 * }
 * ```
 */
export function handleApiError<T extends FieldValues>(
  error: any,
  setError?: UseFormSetError<T>,
  options?: {
    fieldMap?: Record<string, Path<T>>
    defaultMessage?: string
    showToast?: boolean
  }
): void {
  const { fieldMap, defaultMessage = "An error occurred", showToast = true } = options || {}

  // Try to handle as form errors first
  if (setError && handleFormErrors(error, setError, fieldMap)) {
    return
  }

  // Handle other error types
  let errorMessage = defaultMessage

  if (error?.data?.detail && typeof error.data.detail === "string") {
    errorMessage = error.data.detail
  } else if (error?.message) {
    errorMessage = error.message
  } else if (error?.data?.message) {
    errorMessage = error.data.message
  }

  if (showToast) {
    toast.error(errorMessage)
  }
}

/**
 * Extract error message from various error formats
 */
export function getErrorMessage(error: any, defaultMessage = "An error occurred"): string {
  if (error?.data?.detail) {
    if (typeof error.data.detail === "string") {
      return error.data.detail
    }
    if (Array.isArray(error.data.detail) && error.data.detail.length > 0) {
      return error.data.detail[0].msg || defaultMessage
    }
  }

  if (error?.message) {
    return error.message
  }

  if (error?.data?.message) {
    return error.data.message
  }

  return defaultMessage
}
