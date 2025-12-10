import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useCallback } from "react"
import {
  CourseCreateSchema,
  CourseUpdateSchema,
  type CourseCreateForm,
  type CourseUpdateForm,
} from "@/lib/schemas/course"
import { courseService } from "@/lib/services/courses"

// Hook for course creation form
export const useCourseCreateForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const form = useForm<CourseCreateForm>({
    resolver: zodResolver(CourseCreateSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      short_description: "",
      category_id: "",
      level: "beginner",
      price: 0,
      duration_hours: 1,
      language: "en",
      is_free: false,
      is_featured: false,
      requirements: [],
      learning_outcomes: [],
      tags: [],
    },
  })

  const uploadFile = useCallback(async (file: File, type: "thumbnail" | "trailer") => {
    try {
      setUploadProgress((prev) => ({ ...prev, [type]: 0 }))

      let result
      if (type === "thumbnail") {
        result = await courseService.uploadThumbnail(file)
      } else {
        result = await courseService.uploadTrailer(file)
      }

      setUploadProgress((prev) => ({ ...prev, [type]: 100 }))
      return result.url
    } catch (error) {
      console.error(`Failed to upload ${type}:`, error)
      setUploadProgress((prev) => ({ ...prev, [type]: -1 })) // Error state
      throw error
    }
  }, [])

  const onSubmit = useCallback(
    async (data: CourseCreateForm) => {
      setIsSubmitting(true)

      try {
        // Upload files first if they exist
        const courseData: any = { ...data }

        if (data.thumbnail) {
          const thumbnailUrl = await uploadFile(data.thumbnail, "thumbnail")
          courseData.thumbnail_url = thumbnailUrl
        }

        if (data.trailer_video) {
          const trailerUrl = await uploadFile(data.trailer_video, "trailer")
          courseData.trailer_video_url = trailerUrl
        }

        // Remove file objects from data (backend expects URLs)
        delete courseData.thumbnail
        delete courseData.trailer_video

        const result = await courseService.createCourse(courseData)
        return result
      } catch (error) {
        console.error("Failed to create course:", error)
        throw error
      } finally {
        setIsSubmitting(false)
        setUploadProgress({})
      }
    },
    [uploadFile]
  )

  return {
    form,
    isSubmitting,
    uploadProgress,
    onSubmit: form.handleSubmit(onSubmit),
  }
}

// Hook for course update form
export const useCourseUpdateForm = (courseId: string, initialData?: Partial<CourseUpdateForm>) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const form = useForm<CourseUpdateForm>({
    resolver: zodResolver(CourseUpdateSchema),
    defaultValues: initialData || {},
  })

  const uploadFile = useCallback(async (file: File, type: "thumbnail" | "trailer") => {
    try {
      setUploadProgress((prev) => ({ ...prev, [type]: 0 }))

      let result
      if (type === "thumbnail") {
        result = await courseService.uploadThumbnail(file)
      } else {
        result = await courseService.uploadTrailer(file)
      }

      setUploadProgress((prev) => ({ ...prev, [type]: 100 }))
      return result.url
    } catch (error) {
      console.error(`Failed to upload ${type}:`, error)
      setUploadProgress((prev) => ({ ...prev, [type]: -1 }))
      throw error
    }
  }, [])

  const onSubmit = useCallback(
    async (data: CourseUpdateForm) => {
      setIsSubmitting(true)

      try {
        // Handle file uploads
        const updateData: any = { ...data }

        // Check if new files are being uploaded
        if (data.thumbnail && data.thumbnail instanceof File) {
          const thumbnailUrl = await uploadFile(data.thumbnail, "thumbnail")
          updateData.thumbnail = thumbnailUrl
        }

        if (data.trailer_video && data.trailer_video instanceof File) {
          const trailerUrl = await uploadFile(data.trailer_video, "trailer")
          updateData.trailer_video = trailerUrl
        }

        const result = await courseService.updateCourse(courseId, updateData)
        return result
      } catch (error) {
        console.error("Failed to update course:", error)
        throw error
      } finally {
        setIsSubmitting(false)
        setUploadProgress({})
      }
    },
    [courseId, uploadFile]
  )

  return {
    form,
    isSubmitting,
    uploadProgress,
    onSubmit: form.handleSubmit(onSubmit),
  }
}

// Utility hook for file validation
export const useFileValidation = () => {
  const validateFile = useCallback((file: File, schema: any) => {
    try {
      schema.parse(file)
      return { isValid: true, error: null }
    } catch (error: any) {
      return {
        isValid: false,
        error: error.errors?.[0]?.message || "Invalid file",
      }
    }
  }, [])

  return { validateFile }
}
