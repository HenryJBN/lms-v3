"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  Star,
  Play,
  FileText,
  Upload,
  ImageIcon,
} from "lucide-react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { StatsGrid } from "@/components/admin/stats-grid"
import { SearchFilters } from "@/components/admin/search-filters"
import { ActionButtons } from "@/components/admin/action-buttons"
import { DataTable } from "@/components/admin/data-table"
import { FormDialog } from "@/components/admin/form-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { courseService } from "@/lib/services/courses"
import { categoryService } from "@/lib/services/categories"

export default function CoursesManagement() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isAddCourseDialogOpen, setIsAddCourseDialogOpen] = useState(false)
  const [isEditCourseDialogOpen, setIsEditCourseDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("")
  const [trailerFile, setTrailerFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [courses, setCourses] = useState<any[]>([])

  // ======= LOAD DATA =======
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [courseData, categoryData] = await Promise.all([
        courseService.getCourses(),
        courseService.getCategories(),
      ])
      setCourses(courseData.items)
      setCategories(categoryData)
    } catch (err) {
      console.error("❌ Failed to load data", err)
      toast({
        title: "Course Creation",
        description: "Failed to load data",
        variant: "destructive",
      })
      // toast.error("Failed to load courses or categories");
    } finally {
      setLoading(false)
    }
  }

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setThumbnailFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTrailerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTrailerFile(file)
    }
  }

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || course.category === selectedCategory
    const matchesStatus = selectedStatus === "all" || course.status === selectedStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const stats = [
    {
      title: "Total Courses",
      value: courses.length,
      icon: BookOpen,
    },
    {
      title: "Published",
      value: courses.filter((c) => c.status === "published").length,
      icon: Eye,
    },
    {
      title: "Drafts",
      value: courses.filter((c) => c.status === "draft").length,
      icon: FileText,
    },
    {
      title: "Total Students",
      value: courses.reduce((sum, course) => sum + course.students, 0).toLocaleString(),
      icon: Users,
    },
    {
      title: "Avg Rating",
      value: (() => {
        const ratedCourses = courses.filter((c) => c.rating > 0)
        if (ratedCourses.length === 0) return 0 // prevent NaN
        const totalRating = ratedCourses.reduce((sum, course) => sum + course.rating, 0)
        return totalRating / ratedCourses.length
      })(),
      icon: Star,
      formatter: (value: number) => value.toFixed(1),
    },
  ]

  const handleAddCourse = async (formData: FormData) => {
    setIsLoading(true)
    try {
      let thumbnailUrl = ""
      let trailerUrl = ""

      // Upload thumbnail if provided
      if (thumbnailFile) {
        try {
          const uploadResult = await courseService.uploadThumbnail(thumbnailFile)
          thumbnailUrl = uploadResult.url
          toast({
            title: "File Upload",
            description: "Thumbnail uploaded successfully",
          })
        } catch (uploadError) {
          console.error("Thumbnail upload failed:", uploadError)
          toast({
            title: "Upload Warning",
            description: "Thumbnail upload failed, continuing without it",
            variant: "destructive",
          })
        }
      }

      // Upload trailer if provided
      if (trailerFile) {
        try {
          const uploadResult = await courseService.uploadTrailer(trailerFile)
          trailerUrl = uploadResult.url
          toast({
            title: "File Upload",
            description: "Trailer video uploaded successfully",
          })
        } catch (uploadError) {
          console.error("Trailer upload failed:", uploadError)
          toast({
            title: "Upload Warning",
            description: "Trailer upload failed, continuing without it",
            variant: "destructive",
          })
        }
      }

      const courseData = {
        title: formData.get("title") as string,
        slug: (formData.get("title") as string).toLowerCase().replace(/\s+/g, "-"),
        description: formData.get("description") as string,
        short_description: formData.get("short_description") as string,
        category_id: formData.get("category_id") as string,
        level: formData.get("level") as string,
        price: Number.parseFloat(formData.get("price") as string) || 0,
        duration_hours: Number.parseInt(formData.get("duration_hours") as string) || 0,
        language: (formData.get("language") as string) || "en",
        requirements: (formData.get("requirements") as string)?.split("\n").filter(Boolean) || [],
        learning_outcomes:
          (formData.get("learning_outcomes") as string)?.split("\n").filter(Boolean) || [],
        target_audience: formData.get("target_audience") as string,
        is_free: formData.get("price") === "0" || formData.get("price") === "",
        thumbnail_url: thumbnailUrl,
        trailer_video_url: trailerUrl,
      }

      // Create course via API
      const newCourse = await courseService.createCourse(courseData)

      toast({
        title: "Success",
        description: `Course "${courseData.title}" created successfully!`,
      })

      // Refresh courses list
      loadInitialData()

      setIsAddCourseDialogOpen(false)
      setThumbnailFile(null)
      setThumbnailPreview("")
      setTrailerFile(null)
    } catch (error: any) {
      console.error("Failed to create course:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create course",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditCourse = async (formData: FormData) => {
    if (!editingCourse) return

    setIsLoading(true)
    try {
      let thumbnailUrl = editingCourse.thumbnail
      let trailerUrl = ""

      if (thumbnailFile) {
        thumbnailUrl = thumbnailPreview
      }

      if (trailerFile) {
        trailerUrl = URL.createObjectURL(trailerFile)
      }

      const courseData = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        short_description: formData.get("short_description") as string,
        category_id: formData.get("category_id") as string,
        level: formData.get("level") as string,
        price: Number.parseFloat(formData.get("price") as string) || 0,
        duration_hours: Number.parseInt(formData.get("duration_hours") as string) || 0,
        language: (formData.get("language") as string) || "en",
        requirements: (formData.get("requirements") as string)?.split("\n").filter(Boolean) || [],
        learning_outcomes:
          (formData.get("learning_outcomes") as string)?.split("\n").filter(Boolean) || [],
        target_audience: formData.get("target_audience") as string,
        thumbnail_url: thumbnailUrl,
        trailer_video_url: trailerUrl,
      }

      toast({
        title: "Success",
        description: `Course "${courseData.title}" updated successfully!`,
      })

      setCourses((prev) =>
        prev.map((course) =>
          course.id === editingCourse.id
            ? {
                ...course,
                title: courseData.title,
                description: courseData.description,
                short_description: courseData.short_description,
                category: courseData.category_id,
                price: courseData.price === 0 ? "Free" : `$${courseData.price}`,
                duration: `${courseData.duration_hours} hours`,
                thumbnail: thumbnailUrl,
                lastUpdated: new Date().toISOString().split("T")[0],
              }
            : course
        )
      )

      setIsEditCourseDialogOpen(false)
      setEditingCourse(null)
      setThumbnailFile(null)
      setThumbnailPreview("")
      setTrailerFile(null)
    } catch (error: any) {
      console.error("Failed to update course:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update course",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteCourse = async (courseToDelete: any) => {
    try {
      setCourses((prev) => prev.filter((course) => course.id !== courseToDelete.id))
      toast({
        title: "Success",
        description: `Course "${courseToDelete.title}" deleted successfully!`,
      })
    } catch (error: any) {
      console.error("Failed to delete course:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete course",
        variant: "destructive",
      })
    }
  }

  const handleViewCourse = (course: any) => {
    router.push(`/courses/${course.id}`)
  }

  const handleManageLessons = (course: any) => {
    router.push(`/admin/courses/lessons`)
  }

  const handleViewStudents = (course: any) => {
    toast({
      title: "View Students",
      description: `Viewing students for "${course.title}"`,
    })
  }

  const handleExportCsv = () => {
    toast({
      title: "Exporting Data",
      description: "Exporting courses to CSV",
    })
  }

  const handleExportExcel = () => {
    toast({
      title: "Exporting Data",
      description: "Exporting courses to Excel",
    })
  }

  const handleImportCsv = () => {
    toast({
      title: "Importing Data",
      description: "Importing courses from CSV",
    })
  }

  const courseColumns = [
    {
      key: "thumbnail",
      label: "Course",
      render: (value: string, row: any) => (
        <div className="flex items-center gap-3">
          <img
            src={value || "/placeholder.svg?height=100&width=160&query=course thumbnail"}
            alt={row.title}
            className="h-10 w-16 rounded object-cover"
          />
          <div>
            <div className="font-medium">{row.title}</div>
            <div className="text-sm text-muted-foreground">
              {row.lessons} lessons • {row.duration}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (value: string) => {
        const category = categories.find((c) => c.id === value)
        return <Badge variant="outline">{category?.name || value}</Badge>
      },
    },
    { key: "instructor", label: "Instructor" },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge variant={value === "published" ? "default" : "secondary"}>{value}</Badge>
      ),
    },
    { key: "students", label: "Students" },
    {
      key: "rating",
      label: "Rating",
      render: (value: number) =>
        value > 0 ? (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{value}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">No ratings</span>
        ),
    },
    { key: "price", label: "Price" },
  ]

  const courseActions = [
    {
      label: "View course",
      icon: Eye,
      onClick: handleViewCourse,
    },
    {
      label: "Edit course",
      icon: Edit,
      onClick: (course: any) => {
        setEditingCourse(course)
        setIsEditCourseDialogOpen(true)
      },
    },
    {
      label: "Manage lessons",
      icon: Play,
      onClick: handleManageLessons,
    },
    {
      label: "View students",
      icon: Users,
      onClick: handleViewStudents,
    },
    {
      label: "Delete course",
      icon: Trash2,
      variant: "destructive" as const,
      onClick: (course: any) => {},
      render: (row: any) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete course
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the course &quot;
                {row.title}&quot; and remove its data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteCourse(row)}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ]

  return (
    <AdminLayout
      title="Course Management"
      description="Course management module"
      headerActions={
        <ActionButtons
          primaryAction={{
            label: "Add Course",
            icon: Plus,
            onClick: () => setIsAddCourseDialogOpen(true),
          }}
          exportActions={[
            { label: "Export CSV", onClick: handleExportCsv },
            { label: "Export Excel", onClick: handleExportExcel },
          ]}
          importActions={[{ label: "Import CSV", onClick: handleImportCsv }]}
        />
      }
    >
      <StatsGrid stats={stats} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Courses</CardTitle>
              <CardDescription>Manage all courses in the system</CardDescription>
            </div>
            <Button onClick={() => setIsAddCourseDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Course
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            filters={[
              {
                value: selectedCategory,
                onChange: setSelectedCategory,
                placeholder: "Select category",
                options: [
                  { label: "All Categories", value: "all" },
                  ...categories.map((cat) => ({
                    label: cat.name,
                    value: cat.id,
                  })),
                ],
              },
              {
                value: selectedStatus,
                onChange: setSelectedStatus,
                placeholder: "Select status",
                options: [
                  { label: "All Status", value: "all" },
                  { label: "Published", value: "published" },
                  { label: "Draft", value: "draft" },
                ],
              },
            ]}
          />

          <DataTable
            data={filteredCourses}
            columns={courseColumns}
            selectable
            actions={courseActions}
          />
        </CardContent>
      </Card>

      <FormDialog
        title="Create New Course"
        description="Add a new course to the platform. Fill in the course details below."
        open={isAddCourseDialogOpen}
        onOpenChange={setIsAddCourseDialogOpen}
        onSave={handleAddCourse}
        onCancel={() => {
          setIsAddCourseDialogOpen(false)
          setThumbnailFile(null)
          setThumbnailPreview("")
          setTrailerFile(null)
        }}
        saveLabel="Create Course"
        isLoading={isLoading}
        formId="add-course-form"
        tabs={[
          {
            value: "basic",
            label: "Basic Info",
            content: (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title *
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Course title"
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="short_description" className="text-right">
                    Short Description
                  </Label>
                  <Textarea
                    id="short_description"
                    name="short_description"
                    placeholder="Brief course overview (1-2 sentences)"
                    className="col-span-3"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Detailed course description"
                    className="col-span-3"
                    rows={4}
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category_id" className="text-right">
                    Category *
                  </Label>
                  <Select name="category_id" required>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="level" className="text-right">
                    Level *
                  </Label>
                  <Select name="level" defaultValue="beginner">
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ),
          },
          {
            value: "media",
            label: "Media Files",
            content: (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="thumbnail" className="text-right pt-2">
                    Thumbnail Image
                  </Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id="thumbnail"
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="flex-1"
                      />
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {thumbnailPreview && (
                      <div className="mt-2">
                        <img
                          src={thumbnailPreview || "/placeholder.svg"}
                          alt="Thumbnail preview"
                          className="h-32 w-48 rounded object-cover border"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Recommended size: 1280x720px (16:9 ratio). Max file size: 5MB
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="trailer" className="text-right pt-2">
                    Trailer Video
                  </Label>
                  <div className="col-span-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id="trailer"
                        type="file"
                        accept="video/*"
                        onChange={handleTrailerChange}
                        className="flex-1"
                      />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {trailerFile && (
                      <p className="text-sm text-green-600">
                        Selected: {trailerFile.name} ({(trailerFile.size / 1024 / 1024).toFixed(2)}{" "}
                        MB)
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload a promotional video for your course. Max file size: 100MB
                    </p>
                  </div>
                </div>
              </div>
            ),
          },
          {
            value: "pricing",
            label: "Pricing & Duration",
            content: (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    Price *
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00 (Free)"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration_hours" className="text-right">
                    Duration (hours)
                  </Label>
                  <Input
                    id="duration_hours"
                    name="duration_hours"
                    type="number"
                    min="0"
                    placeholder="0"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="language" className="text-right">
                    Language
                  </Label>
                  <Select name="language" defaultValue="en">
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ),
          },
          {
            value: "details",
            label: "Course Details",
            content: (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="target_audience" className="text-right pt-2">
                    Target Audience
                  </Label>
                  <Textarea
                    id="target_audience"
                    name="target_audience"
                    placeholder="Who is this course for?"
                    className="col-span-3"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="requirements" className="text-right pt-2">
                    Requirements
                  </Label>
                  <Textarea
                    id="requirements"
                    name="requirements"
                    placeholder="Enter each requirement on a new line"
                    className="col-span-3"
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="learning_outcomes" className="text-right pt-2">
                    Learning Outcomes
                  </Label>
                  <Textarea
                    id="learning_outcomes"
                    name="learning_outcomes"
                    placeholder="Enter each learning outcome on a new line"
                    className="col-span-3"
                    rows={4}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />

      {editingCourse && (
        <FormDialog
          title="Edit Course"
          description="Update the course details below."
          open={isEditCourseDialogOpen}
          onOpenChange={setIsEditCourseDialogOpen}
          onSave={handleEditCourse}
          onCancel={() => {
            setIsEditCourseDialogOpen(false)
            setEditingCourse(null)
            setThumbnailFile(null)
            setThumbnailPreview("")
            setTrailerFile(null)
          }}
          saveLabel="Save Changes"
          isLoading={isLoading}
          formId="edit-course-form"
          tabs={[
            {
              value: "basic",
              label: "Basic Info",
              content: (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-title" className="text-right">
                      Title *
                    </Label>
                    <Input
                      id="edit-title"
                      name="title"
                      defaultValue={editingCourse.title}
                      placeholder="Course title"
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-short_description" className="text-right">
                      Short Description
                    </Label>
                    <Textarea
                      id="edit-short_description"
                      name="short_description"
                      defaultValue={editingCourse.short_description}
                      placeholder="Brief course overview"
                      className="col-span-3"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-description" className="text-right">
                      Description *
                    </Label>
                    <Textarea
                      id="edit-description"
                      name="description"
                      defaultValue={editingCourse.description}
                      placeholder="Course description"
                      className="col-span-3"
                      rows={4}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-category_id" className="text-right">
                      Category *
                    </Label>
                    <Select name="category_id" defaultValue={editingCourse.category}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-level" className="text-right">
                      Level *
                    </Label>
                    <Select name="level" defaultValue="beginner">
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ),
            },
            {
              value: "media",
              label: "Media Files",
              content: (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="edit-thumbnail" className="text-right pt-2">
                      Thumbnail Image
                    </Label>
                    <div className="col-span-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          id="edit-thumbnail"
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          className="flex-1"
                        />
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      {(thumbnailPreview || editingCourse.thumbnail) && (
                        <div className="mt-2">
                          <img
                            src={thumbnailPreview || editingCourse.thumbnail}
                            alt="Thumbnail preview"
                            className="h-32 w-48 rounded object-cover border"
                          />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Recommended size: 1280x720px (16:9 ratio). Max file size: 5MB
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="edit-trailer" className="text-right pt-2">
                      Trailer Video
                    </Label>
                    <div className="col-span-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          id="edit-trailer"
                          type="file"
                          accept="video/*"
                          onChange={handleTrailerChange}
                          className="flex-1"
                        />
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                      {trailerFile && (
                        <p className="text-sm text-green-600">
                          Selected: {trailerFile.name} (
                          {(trailerFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Upload a promotional video for your course. Max file size: 100MB
                      </p>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              value: "pricing",
              label: "Pricing & Duration",
              content: (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-price" className="text-right">
                      Price *
                    </Label>
                    <Input
                      id="edit-price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={editingCourse.price === "Free" ? "0" : editingCourse.price}
                      placeholder="0.00"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-duration_hours" className="text-right">
                      Duration (hours)
                    </Label>
                    <Input
                      id="edit-duration_hours"
                      name="duration_hours"
                      type="number"
                      min="0"
                      defaultValue={Number.parseInt(editingCourse.duration) || 0}
                      placeholder="0"
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-language" className="text-right">
                      Language
                    </Label>
                    <Select name="language" defaultValue="en">
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}

      <Toaster />
    </AdminLayout>
  )
}
