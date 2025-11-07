"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"
import { courseService } from "@/lib/services/courses"
import {
  CourseCreateSchema,
  CourseUpdateSchema,
  type CourseCreate,
  type CourseUpdate,
} from "@/lib/schemas/course"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, Edit, Trash2 } from "lucide-react"
import { toast, Toaster } from "sonner"
import { FormDialog } from "@/components/admin/form-dialog"
import { DataTable } from "@/components/admin/data-table"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AdminLayout } from "@/components/admin/admin-layout"

export default function CoursesPage() {
  const router = useRouter()

  // ======= STATE =======
  const [courses, setCourses] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingCourse, setEditingCourse] = useState<any | null>(null)

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
      setCourses(courseData.items || [])
      setCategories(categoryData || [])
    } catch (err) {
      console.error("❌ Failed to load data", err)
      toast.error("Failed to load courses or categories")
    } finally {
      setLoading(false)
    }
  }

  // ======= CRUD =======
  const handleAddCourse = async (formData: FormData) => {
    try {
      setLoading(true)
      const courseData = Object.fromEntries(formData.entries())

      const newCourse = {
        id: uuidv4(), // ensure unique ID for frontend keying
        title: courseData.title as string,
        slug: (courseData.title as string).toLowerCase().replace(/\s+/g, "-"),
        description: courseData.description as string,
        short_description: courseData.short_description as string,
        category_id: courseData.category_id as string,
        duration_hours: Number(courseData.duration_hours),
        price: Number(courseData.price),
        level: courseData.level as "beginner" | "intermediate" | "advanced",
        language: courseData.language || "en",
        is_free: courseData.is_free === "true" || false,
        instructor_name: "Current User",
        total_students: 0,
        rating: 0,
        token_reward: 0,
        is_enrolled: false,
        status: courseData.status as "published" | "draft" | "archived",
        enrollment_limit: 100,
        thumbnail_url: "/placeholder.jpg",
        lessons: 0,
      }

      await courseService.createCourse(newCourse)
      toast.success("✅ Course created successfully")
      setCourses((prev) => [newCourse, ...prev])
      setShowFormDialog(false)
    } catch (err) {
      console.error("❌ Error creating course:", err)
      toast.error("Failed to create course")
    } finally {
      setLoading(false)
    }
  }

  const handleEditCourse = async (formData: FormData) => {
    if (!editingCourse) return

    try {
      setLoading(true)
      const updatedData: CourseUpdate = {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        short_description: formData.get("short_description") as string,
        category_id: formData.get("category_id") as string,
        level: formData.get("level") as "beginner" | "intermediate" | "advanced",
        price: Number(formData.get("price")),
        duration_hours: Number(formData.get("duration_hours")),
        language: formData.get("language") as string,
        is_free: formData.get("is_free") === "true",
      }

      await courseService.updateCourse(editingCourse.id, updatedData)
      toast.success("✅ Course updated successfully")
      setCourses((prev) =>
        prev.map((c) => (c.id === editingCourse.id ? { ...c, ...updatedData } : c))
      )
      setEditingCourse(null)
    } catch (err) {
      console.error("❌ Failed to update course:", err)
      toast.error("Failed to update course")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCourse = async (course: any) => {
    try {
      await courseService.deleteCourse(course.id)
      toast.success(`🗑️ Deleted course: ${course.title}`)
      setCourses((prev) => prev.filter((c) => c.id !== course.id))
    } catch (err) {
      console.error("❌ Error deleting course:", err)
      toast.error("Failed to delete course")
    }
  }

  // ======= FILTERS =======
  const filteredCourses = courses.filter(
    (c) =>
      (selectedCategory === "all" || c.category_id === selectedCategory) &&
      c.title.toLowerCase().includes(search.toLowerCase())
  )

  // ======= STATS =======
  const ratedCourses = courses.filter((c) => c.rating > 0)
  const stats = [
    { label: "Total Courses", value: courses.length },
    {
      label: "Published",
      value: courses.filter((c) => c.status === "published").length,
    },
    {
      label: "Drafts",
      value: courses.filter((c) => c.status === "draft").length,
    },
    {
      label: "Avg Rating",
      value: ratedCourses.length
        ? (ratedCourses.reduce((sum, c) => sum + c.rating, 0) / ratedCourses.length).toFixed(1)
        : "0.0",
    },
  ]

  // ======= TABLE CONFIG =======
  const courseColumns = [
    { key: "title", label: "Title" },
    { key: "category_id", label: "Category" },
    { key: "level", label: "Level" },
    { key: "instructor_name", label: "Instructor" },
    { key: "status", label: "Status" },
    { key: "price", label: "Price" },
    { key: "duration_hours", label: "Duration (hrs)" },
    {
      key: "actions",
      label: "Actions",
      render: (row: any) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/courses/${row.id}`)}>
            View
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditingCourse(row)}>
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Course</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to delete ?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteCourse(row)}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ]

  // ======= RENDER =======
  return (
    <AdminLayout title="Courses Management" description="Courses Management">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Courses</h1>
        <Button onClick={() => setShowFormDialog(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Course
        </Button>
      </div>

      {/* ===== Filters ===== */}
      <div className="flex gap-4 mb-6">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* ===== Stats ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===== Courses Table ===== */}
      <DataTable columns={courseColumns} data={filteredCourses} loading={loading} />

      {/* ===== Add Course Dialog ===== */}
      {showFormDialog && (
        <FormDialog
          title="Add New Course"
          open={showFormDialog}
          onOpenChange={setShowFormDialog}
          onSubmit={handleAddCourse}
          fields={[
            {
              value: "basic",
              label: "Basic Info",
              content: (
                <div className="space-y-4">
                  <Input name="title" required />
                  <Textarea name="description" required />
                  <Textarea name="short_description" required />
                  <Select name="category_id" required>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </Select>
                  <Input name="duration_hours" type="number" required />
                  <Input name="price" type="number" required />
                  <Select name="level" required>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </Select>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* ===== Edit Course Dialog ===== */}
      {editingCourse && (
        <FormDialog
          title={`Edit Course: ${editingCourse.title}`}
          open={!!editingCourse}
          onOpenChange={(v) => !v && setEditingCourse(null)}
          onSubmit={handleEditCourse}
          initialData={editingCourse}
          fields={[
            {
              value: "basic",
              label: "Basic Info",
              content: (
                <div className="space-y-4">
                  <Input name="title" defaultValue={editingCourse.title} required />
                  <Textarea name="description" defaultValue={editingCourse.description} required />
                  <Textarea
                    name="short_description"
                    defaultValue={editingCourse.short_description}
                    required
                  />
                  <Select name="category_id" defaultValue={editingCourse.category_id} required>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </Select>
                  <Input
                    name="duration_hours"
                    type="number"
                    defaultValue={editingCourse.duration_hours}
                    required
                  />
                  <Input name="price" type="number" defaultValue={editingCourse.price} required />
                  <Select name="level" defaultValue={editingCourse.level} required>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </Select>
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
