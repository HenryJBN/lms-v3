"use client"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  CourseCreateSchema,
  CourseUpdateSchema,
  type CourseCreateForm as CourseCreateFormData,
} from "@/lib/schemas/course"
import { courseService } from "@/lib/services/courses"
import { categoryService, type Category } from "@/lib/services/categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

// File upload component with validation
const FileUploadField = ({
  name,
  label,
  accept,
  maxSize,
  value,
  onChange,
  error,
  uploadProgress,
  previewUrl,
}: {
  name: string
  label: string
  accept: string
  maxSize: number
  value?: File | null
  onChange: (file: File | null) => void
  error?: string
  uploadProgress?: number
  previewUrl?: string
}) => {
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      onChange(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      onChange(files[0])
    }
  }

  const clearFile = () => {
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : error
              ? "border-destructive"
              : "border-muted-foreground/25"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          id={name}
        />

        {value ? (
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm">{value.name}</span>
            <Button type="button" variant="ghost" size="sm" onClick={clearFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label htmlFor={name} className="cursor-pointer">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">
              Max size: {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </label>
        )}
      </div>

      {/* File Preview */}
      {previewUrl && (
        <div className="mt-4">
          {accept.includes("image") ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg border"
              />
              <div className="absolute top-2 right-2">
                <Button type="button" variant="secondary" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : accept.includes("video") ? (
            <div className="relative">
              <video
                src={previewUrl}
                controls
                className="w-full h-48 object-cover rounded-lg border"
                style={{ maxHeight: "200px" }}
              />
              <div className="absolute top-2 right-2">
                <Button type="button" variant="secondary" size="sm" onClick={clearFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {uploadProgress !== undefined && uploadProgress > 0 && (
        <Progress value={uploadProgress} className="h-2" />
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Main course creation form component
interface CourseFormProps {
  mode: "create" | "update"
  courseId?: string
  initialData?: any
  onSuccess?: (course: any) => void
  onCancel?: () => void
  isSubmitting?: boolean
  uploadProgress?: Record<string, number>
}

export const CourseCreateForm = ({
  mode,
  courseId,
  initialData,
  onSuccess,
  onCancel,
  isSubmitting: externalIsSubmitting,
  uploadProgress: externalUploadProgress,
}: CourseFormProps) => {
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false)
  const [internalUploadProgress, setInternalUploadProgress] = useState<Record<string, number>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("")
  const [videoPreview, setVideoPreview] = useState<string>("")

  const isSubmitting = externalIsSubmitting ?? internalIsSubmitting
  const uploadProgress = externalUploadProgress ?? internalUploadProgress

  const schema = mode === "create" ? CourseCreateSchema : CourseUpdateSchema

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<CourseCreateFormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: initialData || {
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
      token_reward: 0,
      requirements: [],
      learning_outcomes: [],
      tags: [],
    },
  })

  const thumbnailFile = watch("thumbnail")
  const trailerFile = watch("trailer_video")
  const isFree = watch("is_free")
  const title = watch("title")

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryData = await categoryService.getCategories()
        setCategories(categoryData)
      } catch (error) {
        console.error("Failed to fetch categories:", error)
      }
    }
    fetchCategories()
  }, [])

  // Create object URLs for file previews
  useEffect(() => {
    if (thumbnailFile && thumbnailFile instanceof File) {
      const url = URL.createObjectURL(thumbnailFile)
      setThumbnailPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setThumbnailPreview("")
    }
  }, [thumbnailFile])

  useEffect(() => {
    if (trailerFile && trailerFile instanceof File) {
      const url = URL.createObjectURL(trailerFile)
      setVideoPreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setVideoPreview("")
    }
  }, [trailerFile])

  // Auto-generate slug from title
  useEffect(() => {
    if (title) {
      // Convert title to slug: lowercase, replace spaces with hyphens, remove special chars
      const generatedSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special characters except spaces and hyphens
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, "") // Remove leading/trailing hyphens

      setValue("slug", generatedSlug, { shouldValidate: true })
    }
  }, [title, setValue])

  const uploadFile = async (file: File, type: "thumbnail" | "trailer") => {
    try {
      const setProgress = externalUploadProgress ? () => {} : setInternalUploadProgress
      setProgress((prev) => ({ ...prev, [type]: 0 }))

      let result
      if (type === "thumbnail") {
        result = await courseService.uploadThumbnail(file)
      } else {
        result = await courseService.uploadTrailer(file)
      }

      setProgress((prev) => ({ ...prev, [type]: 100 }))
      return result.url
    } catch (error) {
      console.error(`Failed to upload ${type}:`, error)
      const setProgress = externalUploadProgress ? () => {} : setInternalUploadProgress
      setProgress((prev) => ({ ...prev, [type]: -1 }))
      throw error
    }
  }

  const onSubmit = async (data: CourseCreateFormData) => {
    const setSubmitting = externalIsSubmitting ? () => {} : setInternalIsSubmitting
    const setProgress = externalUploadProgress ? () => {} : setInternalUploadProgress

    setSubmitting(true)

    try {
      // Upload files first if they exist
      const courseData: any = { ...data }

      if (data.thumbnail && typeof data.thumbnail !== "string") {
        const thumbnailUrl = await uploadFile(data.thumbnail, "thumbnail")
        courseData.thumbnail_url = thumbnailUrl
      }

      if (data.trailer_video && typeof data.trailer_video !== "string") {
        const trailerUrl = await uploadFile(data.trailer_video, "trailer")
        courseData.trailer_video_url = trailerUrl
      }

      // Remove file objects from data (backend expects URLs)
      delete courseData.thumbnail
      delete courseData.trailer_video

      let result
      if (mode === "create") {
        result = await courseService.createCourse(courseData)
      } else if (mode === "update" && courseId) {
        result = await courseService.updateCourse(courseId, courseData)
      }

      console.log(`Course ${mode}d successfully:`, result)

      if (onSuccess) {
        onSuccess(result)
      } else {
        reset() // Reset form if no external handler
      }
    } catch (error) {
      console.error(`Failed to ${mode} course:`, error)
    } finally {
      setSubmitting(false)
      setProgress({})
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Create New Course" : "Update Course"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input {...register("title")} placeholder="Enter course title" />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Slug *</label>
              <Input {...register("slug")} placeholder="course-slug" />
              {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              {...register("description")}
              placeholder="Detailed course description"
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Short Description *</label>
            <Textarea
              {...register("short_description")}
              placeholder="Brief course summary"
              rows={2}
            />
            {errors.short_description && (
              <p className="text-sm text-destructive">{errors.short_description.message}</p>
            )}
          </div>

          {/* Category and Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Controller
                name="category_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty Level *</label>
              <Controller
                name="level"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price ($)</label>
              <Input
                {...register("price", { valueAsNumber: true })}
                type="number"
                step="0.01"
                disabled={isFree}
              />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (hours)</label>
              <Input
                {...register("duration_hours", { valueAsNumber: true })}
                type="number"
                step="0.5"
                min="0.5"
              />
              {errors.duration_hours && (
                <p className="text-sm text-destructive">{errors.duration_hours.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Token Reward</label>
              <Input
                {...register("token_reward", { valueAsNumber: true })}
                type="number"
                min="0"
                step="1"
              />
              {errors.token_reward && (
                <p className="text-sm text-destructive">{errors.token_reward.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Controller
                name="is_free"
                control={control}
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <label className="text-sm font-medium">Free Course</label>
            </div>
          </div>

          {/* File Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller
              name="thumbnail"
              control={control}
              render={({ field }) => (
                <FileUploadField
                  name="thumbnail"
                  label="Course Thumbnail *"
                  accept="image/*"
                  maxSize={10 * 1024 * 1024}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.thumbnail?.message}
                  uploadProgress={uploadProgress.thumbnail}
                  previewUrl={thumbnailPreview}
                />
              )}
            />

            <Controller
              name="trailer_video"
              control={control}
              render={({ field }) => (
                <FileUploadField
                  name="trailer_video"
                  label="Course Trailer Video"
                  accept="video/*"
                  maxSize={500 * 1024 * 1024}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.trailer_video?.message}
                  uploadProgress={uploadProgress.trailer}
                  previewUrl={videoPreview}
                />
              )}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !isValid} className="min-w-[120px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Course"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default CourseCreateForm
