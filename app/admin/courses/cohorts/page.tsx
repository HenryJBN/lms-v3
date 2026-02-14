"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/admin/data-table"
import { Edit, Trash2, Users, Calendar, Plus } from "lucide-react"
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

export default function GlobalCohortsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [courses, setCourses] = useState<{ id: string; title: string }[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAddCohortOpen, setIsAddCohortOpen] = useState(false)
  const [isEditCohortOpen, setIsEditCohortOpen] = useState(false)
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadCohorts()
  }, [])

  const loadCohorts = async () => {
    try {
      setLoading(true)
      const [cohortData, coursesData] = await Promise.all([
        courseService.getAllCohorts(),
        courseService.getCourses()
      ])
      setCohorts(cohortData)
      setCourses(coursesData.items.map((c: any) => ({ id: c.id, title: c.title })))
    } catch (error) {
      console.error("Failed to load cohorts:", error)
      toast({
        title: "Error",
        description: "Failed to load cohorts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCohort = async (values: CohortFormValues) => {
    if (!values.course_id) {
        toast({
            title: "Error",
            description: "Please select a course",
            variant: "destructive",
        })
        return
    }
    try {
      setIsSubmitting(true)
      await courseService.createCohort({
        ...values,
        course_id: values.course_id,
        start_date: new Date(values.start_date).toISOString(),
        end_date: values.end_date ? new Date(values.end_date).toISOString() : undefined
      })
      toast({
        title: "Success",
        description: "Cohort created successfully",
      })
      setIsAddCohortOpen(false)
      loadCohorts()
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
      loadCohorts()
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
      loadCohorts()
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
      render: (value: string, row: Cohort) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-muted-foreground">ID: {row.course_id.substring(0, 8)}...</div>
        </div>
      )
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
        label: "Manage course cohorts",
        icon: Plus,
        onClick: (row: Cohort) => {
            router.push(`/admin/courses/${row.course_id}/cohorts`)
        }
    },
    {
      label: "Delete",
      icon: Trash2,
      variant: "destructive" as const,
      onClick: () => {},
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
      title="All Cohorts"
      description="Manage all course segments and registration status across the platform"
    >
      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Global Cohort Management</CardTitle>
              <CardDescription>
                Monitor and manage registration for all course intake groups.
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
            <DialogTitle>Add New Cohort</DialogTitle>
            <DialogDescription>
              Create a new registration group for a specific course.
            </DialogDescription>
          </DialogHeader>
          <CohortForm
            mode="create"
            onSubmit={handleCreateCohort}
            isLoading={isSubmitting}
            courses={courses || []}
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
