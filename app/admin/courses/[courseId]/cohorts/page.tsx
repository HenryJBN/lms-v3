"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/admin/data-table"
import { Plus, Edit, Trash2, Calendar, Users, ArrowLeft } from "lucide-react"
import { courseService, type Cohort } from "@/lib/services/courses"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CohortForm } from "@/components/admin/cohort-form"
import { type CohortFormValues } from "@/lib/schemas/cohort"
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

export default function CourseCohortsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const courseId = params.courseId as string
  
  const [course, setCourse] = useState<any>(null)
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddCohortOpen, setIsAddCohortOpen] = useState(false)
  const [isEditCohortOpen, setIsEditCohortOpen] = useState(false)
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [courseId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [courseData, cohortData] = await Promise.all([
        courseService.getCourseById(courseId as any), // courseService might need UUID string or number
        courseService.getCourseCohorts(courseId)
      ])
      setCourse(courseData)
      setCohorts(cohortData)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast({
        title: "Error",
        description: "Failed to load course or cohorts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCohort = async (values: CohortFormValues) => {
    try {
      setIsSubmitting(true)
      await courseService.createCohort({
        ...values,
        course_id: courseId,
        start_date: new Date(values.start_date).toISOString(),
        end_date: values.end_date ? new Date(values.end_date).toISOString() : undefined
      })
      toast({
        title: "Success",
        description: "Cohort created successfully",
      })
      setIsAddCohortOpen(false)
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create cohort",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditCohort = async (values: CohortFormValues) => {
    if (!editingCohort) return
    try {
      setIsSubmitting(true)
      await courseService.updateCohort(editingCohort.id, {
        ...values,
        start_date: new Date(values.start_date).toISOString(),
        end_date: values.end_date ? new Date(values.end_date).toISOString() : undefined
      })
      toast({
        title: "Success",
        description: "Cohort updated successfully",
      })
      setIsEditCohortOpen(false)
      setEditingCohort(null)
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cohort",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCohort = async (id: string) => {
    try {
      await courseService.deleteCohort(id)
      toast({
        title: "Success",
        description: "Cohort deleted successfully",
      })
      loadData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete cohort",
        variant: "destructive",
      })
    }
  }

  const columns = [
    {
      key: "name",
      label: "Cohort Name",
      render: (value: string) => <div className="font-medium">{value}</div>
    },
    {
      key: "start_date",
      label: "Duration",
      render: (_: any, row: Cohort) => (
        <div className="text-sm text-muted-foreground">
          {new Date(row.start_date).toLocaleDateString()} - {row.end_date ? new Date(row.end_date).toLocaleDateString() : "Ongoing"}
        </div>
      )
    },
    {
      key: "current_enrollment_count",
      label: "Students",
      render: (value: number, row: Cohort) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{value} / {row.max_students || "∞"}</span>
        </div>
      )
    },
    {
      key: "registration_open",
      label: "Status",
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Open" : "Closed"}
        </Badge>
      )
    }
  ]

  const actions = [
    {
      label: "Edit",
      icon: Edit,
      onClick: (row: Cohort) => {
        setEditingCohort(row)
        setIsEditCohortOpen(true)
      }
    },
    {
      label: "Delete",
      icon: Trash2,
      variant: "destructive" as const,
      onClick: () => {}, // Required by DataTable type but overridden by render
      render: (row: Cohort) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive h-8 px-2 flex w-full justify-start">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Cohort</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this cohort? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteCohort(row.id)}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )
    }
  ]

  return (
    <AdminLayout
      title={course ? `Cohorts - ${course.title}` : "Manage Cohorts"}
      description="Manage course scheduling and enrollment groups"
    >
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push("/admin/courses")} className="pl-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Cohorts</CardTitle>
              <CardDescription>
                Configure different time-based groups for this course.
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddCohortOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cohort
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={cohorts}
              loading={loading}
              actions={actions}
            />
          </CardContent>
        </Card>
      </div>

      {/* Add Cohort Dialog */}
      <Dialog open={isAddCohortOpen} onOpenChange={setIsAddCohortOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Cohort</DialogTitle>
            <DialogDescription>
              Define a new group for {course?.title}.
            </DialogDescription>
          </DialogHeader>
          <CohortForm
            mode="create"
            onSubmit={handleAddCohort}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Cohort Dialog */}
      <Dialog open={isEditCohortOpen} onOpenChange={setIsEditCohortOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cohort</DialogTitle>
            <DialogDescription>
              Update settings for the {editingCohort?.name} cohort.
            </DialogDescription>
          </DialogHeader>
          {editingCohort && (
            <CohortForm
              mode="update"
              initialData={editingCohort}
              onSubmit={handleEditCohort}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
