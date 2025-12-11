"use client"

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
  Download,
} from "lucide-react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { StatsGrid } from "@/components/admin/stats-grid"
import { SearchFilters } from "@/components/admin/search-filters"
import { ActionButtons } from "@/components/admin/action-buttons"
import { DataTable } from "@/components/admin/data-table"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Course, courseService } from "@/lib/services/courses"
import { useCourseCreateForm, useCourseUpdateForm } from "@/lib/hooks/use-course-form"
import { CourseCreateForm as CourseFormComponent } from "@/components/course-form"

export default function CoursesManagement() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isAddCourseDialogOpen, setIsAddCourseDialogOpen] = useState(false)
  const [isEditCourseDialogOpen, setIsEditCourseDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Use the new form hooks
  const createForm = useCourseCreateForm()
  const updateForm = useCourseUpdateForm(editingCourse?.id)

  // ======= LOAD DATA =======
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [courseData, categoryData] = await Promise.all([
        courseService.getAdminCourses(),
        courseService.getCategories(),
      ])
      setCourses(courseData.items)
      setCategories(categoryData)
    } catch (err) {
      console.error("❌ Failed to load data", err)
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle successful course creation
  const handleCreateSuccess = async (newCourse: any) => {
    toast({
      title: "Success",
      description: `Course "${newCourse.title}" created successfully!`,
    })
    loadInitialData() // Refresh the list
    setIsAddCourseDialogOpen(false)
  }

  // Handle successful course update
  const handleUpdateSuccess = async (updatedCourse: any) => {
    toast({
      title: "Success",
      description: `Course "${updatedCourse.title}" updated successfully!`,
    })
    loadInitialData() // Refresh the list
    setIsEditCourseDialogOpen(false)
    setEditingCourse(null)
  }

  const filteredCourses = courses.filter((course: Course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || course.category_id === selectedCategory
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
      value: courses.reduce((sum, course) => sum + course.total_students, 0).toLocaleString(),
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

  const handlePublishCourse = async (courseToPublish: any) => {
    try {
      await courseService.publishCourse(courseToPublish.id)
      toast({
        title: "Success",
        description: `Course "${courseToPublish.title}" published successfully!`,
      })
      loadInitialData() // Refresh the list
    } catch (error: any) {
      console.error("Failed to publish course:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to publish course",
        variant: "destructive",
      })
    }
  }

  const handleUnpublishCourse = async (courseToUnpublish: any) => {
    try {
      await courseService.unpublishCourse(courseToUnpublish.id)
      toast({
        title: "Success",
        description: `Course "${courseToUnpublish.title}" moved back to draft!`,
      })
      loadInitialData() // Refresh the list
    } catch (error: any) {
      console.error("Failed to unpublish course:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to unpublish course",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCourse = async (courseToDelete: any) => {
    try {
      await courseService.deleteCourse(courseToDelete.id)
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
      key: "thumbnail_url",
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
              {row.lessons} lessons • {row.duration_hours}h
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category_id",
      label: "Category",
      render: (value: string) => {
        const category = categories.find((c) => c.id === value)
        return <Badge variant="outline">{category?.name || value}</Badge>
      },
    },
    { key: "instructor_name", label: "Instructor" },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge variant={value === "published" ? "default" : "secondary"}>{value}</Badge>
      ),
    },
    { key: "total_students", label: "Students" },
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
      label: (course: any) => (course.status === "draft" ? "Publish course" : "Unpublish course"),
      icon: (course: any) => (course.status === "draft" ? Upload : Download),
      onClick: (course: any) =>
        course.status === "draft" ? handlePublishCourse(course) : handleUnpublishCourse(course),
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
                This action cannot be undone. This will permanently delete the course "{row.title}"
                and remove its data from our servers.
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

      {/* Create Course Dialog */}
      <Dialog open={isAddCourseDialogOpen} onOpenChange={setIsAddCourseDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Add a new course to the platform with proper validation and file uploads.
            </DialogDescription>
          </DialogHeader>
          <CourseFormComponent
            mode="create"
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsAddCourseDialogOpen(false)}
            isSubmitting={createForm.isSubmitting}
            uploadProgress={createForm.uploadProgress}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={isEditCourseDialogOpen} onOpenChange={setIsEditCourseDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details with proper validation and file uploads.
            </DialogDescription>
          </DialogHeader>
          {editingCourse && (
            <CourseFormComponent
              mode="update"
              courseId={editingCourse.id}
              initialData={editingCourse}
              onSuccess={handleUpdateSuccess}
              onCancel={() => {
                setIsEditCourseDialogOpen(false)
                setEditingCourse(null)
              }}
              isSubmitting={updateForm.isSubmitting}
              uploadProgress={updateForm.uploadProgress}
            />
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </AdminLayout>
  )
}
