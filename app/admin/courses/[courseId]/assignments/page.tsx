"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Calendar,
  FileText,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"

interface Assignment {
  id: string
  title: string
  description: string
  due_date: string | null
  max_points: number
  is_published: boolean
  total_submissions: number
  graded_submissions: number
  created_date: string
  course_title: string
  lesson_title: string | null
}

export default function CourseAssignmentsAdminPage() {
  const params = useParams()
  const courseId = params.courseId as string

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true)
        const response = (await apiClient.get(
          `/api/assignments?course_id=${courseId}&page=1&size=100`
        )) as { items: Assignment[] }

        setAssignments(response.items || [])
      } catch (err: any) {
        console.error("Failed to fetch assignments:", err)
        setError(err.message || "Failed to load assignments")
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      fetchAssignments()
    }
  }, [courseId])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date"
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (assignment: Assignment) => {
    const submitted = assignment.total_submissions
    const graded = assignment.graded_submissions
    const pending = submitted - graded

    if (!assignment.is_published) {
      return <Badge variant="secondary">Draft</Badge>
    }

    if (submitted === 0) {
      return <Badge variant="outline">No Submissions</Badge>
    }

    if (pending === 0) {
      return <Badge className="bg-green-100 text-green-800">All Graded</Badge>
    }

    return <Badge className="bg-orange-100 text-orange-800">{pending} Pending</Badge>
  }

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assignments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Assignments</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Assignment Management</h1>
        <p className="text-muted-foreground">View and grade student assignment submissions</p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Assignments</h3>
              <p className="text-muted-foreground">
                No assignments have been created for this course yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignments.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Published</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assignments.filter((a) => a.is_published).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assignments.reduce((sum, a) => sum + a.total_submissions, 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Grading</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assignments.reduce(
                    (sum, a) => sum + (a.total_submissions - a.graded_submissions),
                    0
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assignments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Manage assignments and view submission statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{assignment.title}</div>
                          {assignment.lesson_title && (
                            <div className="text-sm text-muted-foreground">
                              Lesson: {assignment.lesson_title}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(assignment.due_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{assignment.max_points}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">{assignment.total_submissions}</span>{" "}
                            submitted
                          </div>
                          {assignment.total_submissions > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {assignment.graded_submissions} graded
                              {assignment.total_submissions - assignment.graded_submissions > 0 && (
                                <span className="text-orange-600 ml-1">
                                  ({assignment.total_submissions - assignment.graded_submissions}{" "}
                                  pending)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(assignment)}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/courses/${courseId}/assignments/${assignment.id}/submissions`}
                        >
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Submissions
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
