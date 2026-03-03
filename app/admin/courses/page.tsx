"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
  Calendar,
  Trophy,
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
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Use the new form hooks
  const createForm = useCourseCreateForm()
  const updateForm = useCourseUpdateForm(editingCourse?.id)

  // ======= LOAD DATA with useQuery =======
  const { data: initialData, isLoading: loading } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const [courseData, categoryData] = await Promise.all([
        courseService.getAdminCourses(),
        courseService.getCategories(),
      ])
      return { courses: courseData.items, categories: categoryData }
    },
  })

  const courses = initialData?.courses ?? []
  const categories = initialData?.categories ?? []

  // Handle successful course creation
  const handleCreateSuccess = async (newCourse: any) => {
    toast({ title: "Success", description: `Course "${newCourse.title}" created successfully!` })
    queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
    setIsAddCourseDialogOpen(false)
  }

  // Handle successful course update
  const handleUpdateSuccess = async (updatedCourse: any) => {
    toast({ title: "Success", description: `Course "${updatedCourse.title}" updated successfully!` })
    queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
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
    { title: "Total Courses", value: courses.length, icon: BookOpen },
    { title: "Published", value: courses.filter((c: any) => c.status === "published").length, icon: Eye },
    { title: "Drafts", value: courses.filter((c: any) => c.status === "draft").length, icon: FileText },
    { title: "Total Students", value: courses.reduce((sum: number, course: any) => sum + course.total_students, 0).toLocaleString(), icon: Users },
    {
      title: "Avg Rating",
      value: (() => {
        const ratedCourses = courses.filter((c: any) => c.rating > 0)
        if (ratedCourses.length === 0) return 0
        const totalRating = ratedCourses.reduce((sum: number, course: any) => sum + course.rating, 0)
        return totalRating / ratedCourses.length
      })(),
      icon: Star,
      formatter: (value: number) => value.toFixed(1),
    },
  ]

  // Mutations
  const publishMutation = useMutation({
    mutationFn: (courseToPublish: any) => courseService.publishCourse(courseToPublish.id),
    onSuccess: (_, courseToPublish) => {
      toast({ title: "Success", description: `Course "${courseToPublish.title}" published!` })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to publish course", variant: "destructive" })
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: (courseToUnpublish: any) => courseService.unpublishCourse(courseToUnpublish.id),
    onSuccess: (_, courseToUnpublish) => {
      toast({ title: "Success", description: `Course "${courseToUnpublish.title}" moved to draft!` })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to unpublish", variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (courseToDelete: any) => courseService.deleteCourse(courseToDelete.id),
    onSuccess: (_, courseToDelete) => {
      toast({ title: "Success", description: `Course "${courseToDelete.title}" deleted!` })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" })
    },
  })

  const handlePublishCourse = (course: any) => publishMutation.mutate(course)
  const handleUnpublishCourse = (course: any) => unpublishMutation.mutate(course)
  const handleDeleteCourse = (course: any) => deleteMutation.mutate(course)

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
      label: "Manage cohorts",
      icon: Calendar,
      onClick: (course: any) => {
        router.push(`/admin/courses/${course.id}/cohorts`)
      },
    },
    {
      label: "Milestones",
      icon: Trophy,
      onClick: (course: any) => {
        router.push(`/admin/courses/${course.id}/milestones`)
      },
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
      onClick: () => {}, // Required by DataTable type but overridden by render
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
            />
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </AdminLayout>
  )
}
