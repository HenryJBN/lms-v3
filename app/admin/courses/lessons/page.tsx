"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Upload,
  Eye,
  Play,
  FileText,
  Clock,
  Users,
  BarChart3,
  Video,
  ImageIcon,
  FileAudio,
  File,
  Copy,
  Move,
  Loader2,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { LessonCreateFormSchema, type LessonCreateForm } from "@/lib/schemas/lesson"

export default function LessonsManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [sortField, setSortField] = useState("order")
  const [sortDirection, setSortDirection] = useState("asc")
  const [selectedLessons, setSelectedLessons] = useState<string[]>([])

  // Data states
  const [lessons, setLessons] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [isLoadingLessons, setIsLoadingLessons] = useState(true)
  const [isLoadingSections, setIsLoadingSections] = useState(false)

  // Add lesson dialog state
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false)
  const [videoProvisionType, setVideoProvisionType] = useState<"url" | "upload">("url")
  const [selectedFileName, setSelectedFileName] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit lesson dialog state
  const [isEditLessonOpen, setIsEditLessonOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<any>(null)
  const [editVideoProvisionType, setEditVideoProvisionType] = useState<"url" | "upload">("url")
  const [editSelectedFileName, setEditSelectedFileName] = useState<string>("")
  const editFileInputRef = useRef<HTMLInputElement>(null)

  // Delete lesson dialog state
  const [isDeleteLessonOpen, setIsDeleteLessonOpen] = useState(false)
  const [deletingLesson, setDeletingLesson] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // React Hook Form setup
  const form = useForm<LessonCreateForm>({
    resolver: zodResolver(LessonCreateFormSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      courseId: "",
      sectionId: "",
      type: "video",
      order: "",
      duration: "",
      isPreview: false,
      videoProvisionType: "url",
      videoUrl: "",
      videoFile: undefined,
      hasQuiz: false,
      hasAssignment: false,
      passingScore: "",
    },
  })

  const isSubmitting = form.formState.isSubmitting

  // Edit form setup
  const editForm = useForm<LessonCreateForm>({
    resolver: zodResolver(LessonCreateFormSchema),
    defaultValues: {
      title: "",
      description: "",
      content: "",
      courseId: "",
      sectionId: "",
      type: "video",
      order: "",
      duration: "",
      isPreview: false,
      videoProvisionType: "url",
      videoUrl: "",
      videoFile: undefined,
      hasQuiz: false,
      hasAssignment: false,
      passingScore: "",
    },
  })

  const isEditSubmitting = editForm.formState.isSubmitting

  // Fetch courses function
  const fetchCourses = async () => {
    try {
      setIsLoadingCourses(true)
      // Fetch all courses (published and drafts for admin)
      const response: { items: any[] } = await apiClient.get("/api/courses?page=1&size=100")
      setCourses(response.items || [])
    } catch (error) {
      console.error("Failed to fetch courses:", error)
      toast({
        title: "Error",
        description: "Failed to load courses. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCourses(false)
    }
  }

  // Fetch sections for a specific course
  const fetchSectionsForCourse = async (courseId: string) => {
    if (!courseId) {
      setSections([])
      return
    }

    try {
      setIsLoadingSections(true)
      const response: any[] = await apiClient.get(`/api/sections/course/${courseId}`)
      setSections(response || [])
    } catch (error) {
      console.error("Failed to fetch sections:", error)
      setSections([])
    } finally {
      setIsLoadingSections(false)
    }
  }

  // Fetch lessons function
  const fetchLessons = async () => {
    try {
      setIsLoadingLessons(true)

      // Build query parameters for server-side filtering
      const params = new URLSearchParams({
        page: "1",
        size: "100",
      })

      // Add filters if they have values
      if (selectedCourse && selectedCourse !== "all") {
        params.append("course_id", selectedCourse)
      }
      if (selectedType && selectedType !== "all") {
        params.append("type", selectedType)
      }
      if (selectedStatus && selectedStatus !== "all") {
        params.append("status", selectedStatus === "published" ? "published" : "draft")
      }
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim())
      }

      const response: { items: any[] } = await apiClient.get(`/api/lessons?${params.toString()}`)
      console.log("Fetched lessons:", response.items?.length || 0, "items")
      setLessons(response.items || [])
    } catch (error) {
      console.error("Failed to fetch lessons:", error)
      toast({
        title: "Error",
        description: "Failed to load lessons. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingLessons(false)
    }
  }

  // Fetch courses and lessons on component mount
  useEffect(() => {
    fetchCourses()
    fetchLessons()
  }, [])

  // Fetch lessons when filters change
  useEffect(() => {
    fetchLessons()
  }, [selectedCourse, selectedType, selectedStatus, searchTerm])

  // Handle form submission
  const onSubmit = async (values: LessonCreateForm) => {
    try {
      let videoUrl = values.videoUrl?.trim() || null

      // If video file is provided, upload it first
      if (values.videoFile) {
        const formData = new FormData()
        formData.append("file", values.videoFile)

        // Upload video file using the proper FormData method
        const uploadResponse = await apiClient.postFormData<{ video_url: string }>(
          "/api/lessons/upload-video-temp",
          formData
        )

        videoUrl = uploadResponse.video_url
      }

      // Prepare lesson data
      const lessonData = {
        title: values.title.trim(),
        slug: generateSlug(values.title),
        description: values.description?.trim() || "",
        content: values.content?.trim() || "",
        course_id: values.courseId,
        section_id: values.sectionId === "" ? null : values.sectionId,
        type: values.type,
        sort_order: values.order || 0,
        is_published: false, // Start as draft
        is_preview: values.isPreview,
        video_url: videoUrl,
        estimated_duration: values.duration
          ? parseInt(values.duration.split(":")[0]) * 60 + parseInt(values.duration.split(":")[1])
          : null,
      }

      // Make API call to create lesson
      await apiClient.post("/api/lessons", lessonData)

      // Refresh lessons list first
      await fetchLessons()

      toast({
        title: "Success",
        description: "Lesson created successfully!",
      })

      // Reset form and close dialog
      form.reset({
        title: "",
        description: "",
        content: "",
        courseId: "",
        sectionId: "",
        type: "video",
        order: "",
        duration: "",
        isPreview: false,
        videoProvisionType: "url",
        videoUrl: "",
        videoFile: undefined,
        hasQuiz: false,
        hasAssignment: false,
        passingScore: "",
      })
      setVideoProvisionType("url")
      setSelectedFileName("")
      setIsAddLessonOpen(false)
    } catch (error: any) {
      console.error("Failed to create lesson:", error)

      // Extract error message from API error
      let errorMessage = "Failed to create lesson. Please try again."
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.detail) {
        errorMessage = error.detail
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const sortedLessons = [...lessons].sort((a, b) => {
    let aValue = a[sortField as keyof typeof a] || ""
    let bValue = b[sortField as keyof typeof b] || ""

    if (typeof aValue === "string") aValue = aValue.toLowerCase()
    if (typeof bValue === "string") bValue = bValue.toLowerCase()

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const stats = {
    totalLessons: lessons.length,
    publishedLessons: lessons.filter((l) => l.status === "published").length,
    draftLessons: lessons.filter((l) => l.status === "draft").length,
    totalViews: lessons.reduce((sum, lesson) => sum + lesson.views, 0),
    averageCompletion:
      lessons
        .filter((l) => l.completionRate > 0)
        .reduce((sum, lesson) => sum + lesson.completionRate, 0) /
      lessons.filter((l) => l.completionRate > 0).length,
    totalDuration: lessons.reduce((sum, lesson) => {
      const [minutes, seconds] = lesson.duration.split(":").map(Number)
      return sum + minutes + seconds / 60
    }, 0),
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLessons(sortedLessons.map((lesson) => lesson.id))
    } else {
      setSelectedLessons([])
    }
  }

  const handleSelectLesson = (lessonId: string, checked: boolean) => {
    if (checked) {
      setSelectedLessons([...selectedLessons, lessonId])
    } else {
      setSelectedLessons(selectedLessons.filter((id) => id !== lessonId))
    }
  }

  const exportLessons = (format: "csv" | "excel" | "pdf") => {
    const dataToExport =
      selectedLessons.length > 0
        ? sortedLessons.filter((lesson) => selectedLessons.includes(lesson.id))
        : sortedLessons

    console.log(`Exporting ${dataToExport.length} lessons as ${format}`)

    if (format === "csv") {
      const csvContent = [
        [
          "Title",
          "Course",
          "Type",
          "Status",
          "Duration",
          "Views",
          "Completion Rate",
          "Author",
          "Created Date",
        ].join(","),
        ...dataToExport.map((lesson) =>
          [
            lesson.title,
            lesson.course,
            lesson.type,
            lesson.status,
            lesson.duration,
            lesson.views,
            `${lesson.completionRate}%`,
            lesson.author,
            lesson.createdDate,
          ].join(",")
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `lessons-export-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />
      case "text":
        return <FileText className="h-4 w-4" />
      case "audio":
        return <FileAudio className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  // Handle edit lesson
  const handleEditLesson = (lesson: any) => {
    setEditingLesson(lesson)
    setEditVideoProvisionType(lesson.video_url ? "url" : "upload")

    // Convert duration from seconds to MM:SS format
    let durationStr = ""
    if (lesson.video_duration) {
      const minutes = Math.floor(lesson.video_duration / 60)
      const seconds = lesson.video_duration % 60
      durationStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }

    editForm.reset({
      title: lesson.title || "",
      description: lesson.description || "",
      content: lesson.content || "",
      courseId: lesson.course_id || "",
      sectionId: lesson.section_id || "none",
      type: lesson.type || "video",
      order: lesson.sort_order?.toString() || "",
      duration: durationStr,
      isPreview: lesson.is_preview || false,
      videoProvisionType: lesson.video_url ? "url" : "upload",
      videoUrl: lesson.video_url || "",
      videoFile: undefined,
      hasQuiz: lesson.hasQuiz || false,
      hasAssignment: lesson.hasAssignment || false,
      passingScore: lesson.passingScore || "",
    })

    setEditSelectedFileName("")
    setIsEditLessonOpen(true)

    // Fetch sections for the lesson's course
    if (lesson.course_id) {
      fetchSectionsForCourse(lesson.course_id)
    }
  }

  // Handle delete lesson
  const handleDeleteLesson = (lesson: any) => {
    setDeletingLesson(lesson)
    setIsDeleteLessonOpen(true)
  }

  const confirmDeleteLesson = async () => {
    if (!deletingLesson) return

    try {
      setIsDeleting(true)

      // Make API call to delete lesson
      await apiClient.delete(`/api/lessons/${deletingLesson.id}`)

      toast({
        title: "Success",
        description: "Lesson deleted successfully!",
      })

      // Refresh lessons list
      await fetchLessons()

      // Close dialog and reset state
      setIsDeleteLessonOpen(false)
      setDeletingLesson(null)
    } catch (error: any) {
      console.error("Failed to delete lesson:", error)

      // Extract error message from API error
      let errorMessage = "Failed to delete lesson. Please try again."
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.detail) {
        errorMessage = error.detail
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle edit form submission
  const onEditSubmit = async (values: LessonCreateForm) => {
    if (!editingLesson) return

    try {
      let videoUrl = values.videoUrl?.trim() || null

      // If video file is provided, upload it first
      if (values.videoFile) {
        const formData = new FormData()
        formData.append("file", values.videoFile)

        // Upload video file using the proper FormData method
        const uploadResponse = await apiClient.postFormData<{ video_url: string }>(
          `/api/lessons/${editingLesson.id}/upload-video`,
          formData
        )

        videoUrl = uploadResponse.video_url
      }

      // Prepare lesson update data
      const lessonData = {
        title: values.title.trim(),
        slug: generateSlug(values.title),
        description: values.description?.trim() || "",
        content: values.content?.trim() || "",
        course_id: values.courseId,
        section_id: values.sectionId,
        type: values.type,
        sort_order: values.order ? parseInt(values.order) : 0,
        is_preview: values.isPreview,
        video_url: videoUrl,
        estimated_duration: values.duration
          ? parseInt(values.duration.split(":")[0]) * 60 + parseInt(values.duration.split(":")[1])
          : null,
      }

      // Make API call to update lesson
      await apiClient.put(`/api/lessons/${editingLesson.id}`, lessonData)

      // Refresh lessons list first
      await fetchLessons()

      toast({
        title: "Success",
        description: "Lesson updated successfully!",
      })

      // Reset form and close dialog
      editForm.reset()
      setEditingLesson(null)
      setEditVideoProvisionType("url")
      setEditSelectedFileName("")
      setIsEditLessonOpen(false)
    } catch (error: any) {
      console.error("Failed to update lesson:", error)

      // Extract error message from API error
      let errorMessage = "Failed to update lesson. Please try again."
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.detail) {
        errorMessage = error.detail
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6 space-y-4">
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalLessons}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Published</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.publishedLessons}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Drafts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.draftLessons}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Views</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {stats.totalViews.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Completion</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {stats.averageCompletion.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {Math.round(stats.totalDuration)}h
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lessons Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Lessons</CardTitle>
                  <CardDescription>Manage all lessons across courses</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        Import CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <File className="mr-2 h-4 w-4" />
                        Import Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => exportLessons("csv")}>
                        <FileText className="mr-2 h-4 w-4" />
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportLessons("excel")}>
                        <File className="mr-2 h-4 w-4" />
                        Export Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Dialog open={isAddLessonOpen} onOpenChange={setIsAddLessonOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setIsAddLessonOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Lesson
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh]">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                          <ScrollArea className="max-h-[80vh] pr-4">
                            <DialogHeader>
                              <DialogTitle>Create New Lesson</DialogTitle>
                              <DialogDescription>
                                Add a new lesson to a course. Fill in the lesson details below.
                              </DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="content" className="w-full mt-4">
                              <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="content">Content</TabsTrigger>
                                <TabsTrigger value="settings">Settings</TabsTrigger>
                                <TabsTrigger value="media">Media</TabsTrigger>
                                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                              </TabsList>

                              <TabsContent value="content" className="space-y-4 mt-4">
                                <FormField
                                  control={form.control}
                                  name="title"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Title *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Lesson title" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="Lesson description" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="content"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Content</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Lesson content (supports markdown)"
                                          className="min-h-[200px]"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>

                              <TabsContent value="settings" className="space-y-4 mt-4">
                                <FormField
                                  control={form.control}
                                  name="courseId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Course *</FormLabel>
                                      <div className="flex gap-2">
                                        <Select
                                          onValueChange={(value) => {
                                            field.onChange(value)
                                            // Fetch sections for the selected course
                                            fetchSectionsForCourse(value)
                                          }}
                                          value={field.value}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="flex-1">
                                              <SelectValue placeholder="Select course" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {isLoadingCourses ? (
                                              <div className="flex items-center justify-center p-2">
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Loading courses...
                                              </div>
                                            ) : courses.length === 0 ? (
                                              <div className="flex items-center justify-center p-2 text-muted-foreground">
                                                No courses available
                                              </div>
                                            ) : (
                                              courses.map((course) => (
                                                <SelectItem key={course.id} value={course.id}>
                                                  {course.title}
                                                </SelectItem>
                                              ))
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={fetchCourses}
                                          disabled={isLoadingCourses}
                                          title="Refresh courses"
                                        >
                                          {isLoadingCourses ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Eye className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="sectionId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Section (Optional)</FormLabel>
                                      <Select
                                        onValueChange={(value) =>
                                          field.onChange(value === "none" ? "" : value)
                                        }
                                        value={field.value || "none"}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select section (optional)" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="none">No section</SelectItem>
                                          {isLoadingSections ? (
                                            <div className="flex items-center justify-center p-2">
                                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                              Loading sections...
                                            </div>
                                          ) : sections.length === 0 ? (
                                            <div className="flex items-center justify-center p-2 text-muted-foreground">
                                              No sections available
                                            </div>
                                          ) : (
                                            sections.map((section) => (
                                              <SelectItem key={section.id} value={section.id}>
                                                {section.title}
                                              </SelectItem>
                                            ))
                                          )}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="type"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Type</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select lesson type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="video">Video</SelectItem>
                                          <SelectItem value="text">Text/Article</SelectItem>
                                          <SelectItem value="audio">Audio</SelectItem>
                                          <SelectItem value="image">Image Gallery</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="order"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Order</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="1"
                                          {...field}
                                          value={field.value || ""}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="duration"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Duration (MM:SS)</FormLabel>
                                      <FormControl>
                                        <Input placeholder="15:30" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="isPreview"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel>Allow preview without enrollment</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>

                              <TabsContent value="media" className="space-y-4 mt-4">
                                <div className="space-y-3">
                                  <FormItem>
                                    <FormLabel>Video Provision Type</FormLabel>
                                    <Select
                                      value={videoProvisionType}
                                      onValueChange={(value: "url" | "upload") => {
                                        setVideoProvisionType(value)
                                        form.setValue("videoProvisionType", value)
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose how to provide video" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="url">Video URL</SelectItem>
                                        <SelectItem value="upload">Upload Video File</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>

                                  {/* Video URL Input - Always rendered */}
                                  <FormField
                                    control={form.control}
                                    name="videoUrl"
                                    render={({ field }) => (
                                      <FormItem
                                        className={videoProvisionType === "upload" ? "hidden" : ""}
                                      >
                                        <FormLabel>Video URL</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="https://..."
                                            {...field}
                                            disabled={videoProvisionType === "upload"}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {/* Video File Input - Custom display with hidden native input */}
                                  <FormField
                                    control={form.control}
                                    name="videoFile"
                                    render={({ field }) => (
                                      <FormItem
                                        className={videoProvisionType === "url" ? "hidden" : ""}
                                      >
                                        <FormLabel>Upload Video File</FormLabel>
                                        <FormControl>
                                          <div className="space-y-2">
                                            {/* Hidden native file input */}
                                            <Input
                                              ref={fileInputRef}
                                              type="file"
                                              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                field.onChange(file || undefined)
                                                setSelectedFileName(file?.name || "")
                                              }}
                                              disabled={videoProvisionType === "url"}
                                              className="hidden"
                                            />
                                            {/* Custom display */}
                                            <div className="flex items-center gap-2">
                                              <Input
                                                type="text"
                                                value={selectedFileName || ""}
                                                placeholder="No file selected"
                                                readOnly
                                                className="flex-1"
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={videoProvisionType === "url"}
                                              >
                                                Browse
                                              </Button>
                                              {selectedFileName && (
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    field.onChange(undefined)
                                                    setSelectedFileName("")
                                                    if (fileInputRef.current) {
                                                      fileInputRef.current.value = ""
                                                    }
                                                  }}
                                                >
                                                  Clear
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor="thumbnail">Thumbnail</Label>
                                  <Input id="thumbnail" type="file" accept="image/*" />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="attachments">Attachments</Label>
                                  <Input id="attachments" type="file" multiple />
                                </div>
                              </TabsContent>

                              <TabsContent value="assessment" className="space-y-4 mt-4">
                                <FormField
                                  control={form.control}
                                  name="hasQuiz"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel>Include quiz</FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="hasAssignment"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel>Include assignment</FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="passingScore"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Passing Score (%)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="80"
                                          {...field}
                                          value={field.value || ""}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>
                            </Tabs>
                            <DialogFooter className="mt-6">
                              <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Creating...
                                  </>
                                ) : (
                                  "Create Lesson"
                                )}
                              </Button>
                            </DialogFooter>
                          </ScrollArea>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Lesson Dialog */}
                  <Dialog open={isEditLessonOpen} onOpenChange={setIsEditLessonOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh]">
                      <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onEditSubmit)}>
                          <ScrollArea className="max-h-[80vh] pr-4">
                            <DialogHeader>
                              <DialogTitle>Edit Lesson</DialogTitle>
                              <DialogDescription>
                                Update lesson details. Make changes below.
                              </DialogDescription>
                            </DialogHeader>
                            <Tabs defaultValue="content" className="w-full mt-4">
                              <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="content">Content</TabsTrigger>
                                <TabsTrigger value="settings">Settings</TabsTrigger>
                                <TabsTrigger value="media">Media</TabsTrigger>
                                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                              </TabsList>

                              <TabsContent value="content" className="space-y-4 mt-4">
                                <FormField
                                  control={editForm.control}
                                  name="title"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Title *</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Lesson title" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea placeholder="Lesson description" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="content"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Content</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Lesson content (supports markdown)"
                                          className="min-h-[200px]"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>

                              <TabsContent value="settings" className="space-y-4 mt-4">
                                <FormField
                                  control={editForm.control}
                                  name="courseId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Course *</FormLabel>
                                      <div className="flex gap-2">
                                        <Select
                                          onValueChange={(value) => {
                                            field.onChange(value)
                                            // Fetch sections for the selected course
                                            fetchSectionsForCourse(value)
                                          }}
                                          value={field.value}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="flex-1">
                                              <SelectValue placeholder="Select course" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {isLoadingCourses ? (
                                              <div className="flex items-center justify-center p-2">
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Loading courses...
                                              </div>
                                            ) : courses.length === 0 ? (
                                              <div className="flex items-center justify-center p-2 text-muted-foreground">
                                                No courses available
                                              </div>
                                            ) : (
                                              courses.map((course) => (
                                                <SelectItem key={course.id} value={course.id}>
                                                  {course.title}
                                                </SelectItem>
                                              ))
                                            )}
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={fetchCourses}
                                          disabled={isLoadingCourses}
                                          title="Refresh courses"
                                        >
                                          {isLoadingCourses ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Eye className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="sectionId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Section (Optional)</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select section (optional)" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="none">No section</SelectItem>
                                          {isLoadingSections ? (
                                            <div className="flex items-center justify-center p-2">
                                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                              Loading sections...
                                            </div>
                                          ) : sections.length === 0 ? (
                                            <div className="flex items-center justify-center p-2 text-muted-foreground">
                                              No sections available
                                            </div>
                                          ) : (
                                            sections.map((section) => (
                                              <SelectItem key={section.id} value={section.id}>
                                                {section.title}
                                              </SelectItem>
                                            ))
                                          )}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="type"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Type</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select lesson type" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="video">Video</SelectItem>
                                          <SelectItem value="text">Text/Article</SelectItem>
                                          <SelectItem value="audio">Audio</SelectItem>
                                          <SelectItem value="image">Image Gallery</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="order"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Order</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="1"
                                          {...field}
                                          value={field.value || ""}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="duration"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Duration (MM:SS)</FormLabel>
                                      <FormControl>
                                        <Input placeholder="15:30" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="isPreview"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel>Allow preview without enrollment</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>

                              <TabsContent value="media" className="space-y-4 mt-4">
                                <div className="space-y-3">
                                  <FormItem>
                                    <FormLabel>Video Provision Type</FormLabel>
                                    <Select
                                      value={editVideoProvisionType}
                                      onValueChange={(value: "url" | "upload") => {
                                        setEditVideoProvisionType(value)
                                        editForm.setValue("videoProvisionType", value)
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Choose how to provide video" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="url">Video URL</SelectItem>
                                        <SelectItem value="upload">Upload Video File</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>

                                  {/* Video URL Input - Always rendered */}
                                  <FormField
                                    control={editForm.control}
                                    name="videoUrl"
                                    render={({ field }) => (
                                      <FormItem
                                        className={
                                          editVideoProvisionType === "upload" ? "hidden" : ""
                                        }
                                      >
                                        <FormLabel>Video URL</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="https://..."
                                            {...field}
                                            disabled={editVideoProvisionType === "upload"}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {/* Video File Input - Custom display with hidden native input */}
                                  <FormField
                                    control={editForm.control}
                                    name="videoFile"
                                    render={({ field }) => (
                                      <FormItem
                                        className={editVideoProvisionType === "url" ? "hidden" : ""}
                                      >
                                        <FormLabel>Upload Video File</FormLabel>
                                        <FormControl>
                                          <div className="space-y-2">
                                            {/* Hidden native file input */}
                                            <Input
                                              ref={editFileInputRef}
                                              type="file"
                                              accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                field.onChange(file || undefined)
                                                setEditSelectedFileName(file?.name || "")
                                              }}
                                              disabled={editVideoProvisionType === "url"}
                                              className="hidden"
                                            />
                                            {/* Custom display */}
                                            <div className="flex items-center gap-2">
                                              <Input
                                                type="text"
                                                value={editSelectedFileName || ""}
                                                placeholder="No file selected"
                                                readOnly
                                                className="flex-1"
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => editFileInputRef.current?.click()}
                                                disabled={editVideoProvisionType === "url"}
                                              >
                                                Browse
                                              </Button>
                                              {editSelectedFileName && (
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    field.onChange(undefined)
                                                    setEditSelectedFileName("")
                                                    if (editFileInputRef.current) {
                                                      editFileInputRef.current.value = ""
                                                    }
                                                  }}
                                                >
                                                  Clear
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor="edit-thumbnail">Thumbnail</Label>
                                  <Input id="edit-thumbnail" type="file" accept="image/*" />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="edit-attachments">Attachments</Label>
                                  <Input id="edit-attachments" type="file" multiple />
                                </div>
                              </TabsContent>

                              <TabsContent value="assessment" className="space-y-4 mt-4">
                                <FormField
                                  control={editForm.control}
                                  name="hasQuiz"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel>Include quiz</FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="hasAssignment"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                        />
                                      </FormControl>
                                      <FormLabel>Include assignment</FormLabel>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="passingScore"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Passing Score (%)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          placeholder="80"
                                          {...field}
                                          value={field.value || ""}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>
                            </Tabs>
                            <DialogFooter className="mt-6">
                              <Button type="submit" disabled={isEditSubmitting}>
                                {isEditSubmitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Updating...
                                  </>
                                ) : (
                                  "Update Lesson"
                                )}
                              </Button>
                            </DialogFooter>
                          </ScrollArea>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>

                  {/* Delete Lesson Confirmation Dialog */}
                  <Dialog open={isDeleteLessonOpen} onOpenChange={setIsDeleteLessonOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Lesson</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete this lesson? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      {deletingLesson && (
                        <div className="py-4">
                          <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
                            <div className="flex-shrink-0">{getTypeIcon(deletingLesson.type)}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{deletingLesson.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {deletingLesson.description?.substring(0, 100)}
                                {deletingLesson.description?.length > 100 ? "..." : ""}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Course: {deletingLesson.course}</span>
                                <span>Type: {deletingLesson.type}</span>
                                <span>Status: {deletingLesson.status}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsDeleteLessonOpen(false)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={confirmDeleteLesson}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Lesson
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search lessons..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedLessons.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      {selectedLessons.length} selected
                    </span>
                    <Button size="sm" variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </Button>
                    <Button size="sm" variant="outline">
                      <Move className="h-4 w-4 mr-2" />
                      Move
                    </Button>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedLessons.length === sortedLessons.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="min-w-[300px]">Lesson</TableHead>
                      <TableHead className="min-w-[150px]">Course</TableHead>
                      <TableHead className="min-w-[120px]">Section</TableHead>
                      <TableHead className="min-w-[100px]">Type</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Duration</TableHead>
                      <TableHead className="min-w-[100px]">Views</TableHead>
                      <TableHead className="min-w-[150px]">Completion</TableHead>
                      <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLessons.map((lesson) => (
                      <TableRow key={lesson.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLessons.includes(lesson.id)}
                            onCheckedChange={(checked) =>
                              handleSelectLesson(lesson.id.toString(), checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={lesson.thumbnail || "/placeholder.svg"}
                              alt={lesson.title}
                              className="h-10 w-16 rounded object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{lesson.title}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {lesson.description.substring(0, 50)}...
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {lesson.isPreview && (
                                  <Badge variant="outline" className="text-xs">
                                    Preview
                                  </Badge>
                                )}
                                {lesson.hasQuiz && (
                                  <Badge variant="outline" className="text-xs">
                                    Quiz
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {lesson.course}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="whitespace-nowrap">
                            {lesson.section_title || "No Section"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            {getTypeIcon(lesson.type)}
                            <span className="capitalize">{lesson.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={lesson.status === "published" ? "default" : "secondary"}
                            className="whitespace-nowrap"
                          >
                            {lesson.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{lesson.duration}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {lesson.views.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className="text-sm">{lesson.completionRate.toFixed(1)}%</div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${lesson.completionRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  window.open(`/learn/lessonId/${lesson.id}`, "_blank")
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditLesson(lesson)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteLesson(lesson)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
