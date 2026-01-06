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
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  ArrowLeft,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import Link from "next/link"

interface Submission {
  id: string
  user_id: string
  assignment_id: string
  course_id: string
  content: string
  attachments: Array<{
    filename: string
    url: string
    size: number
  }>
  submitted_at: string
  status: string
  grade: number | null
  feedback: string | null
  graded_at: string | null
  graded_by: string | null
  first_name: string
  last_name: string
  email: string
  is_graded: boolean
}

interface Assignment {
  id: string
  title: string
  description: string
  due_date: string | null
  max_points: number
  total_submissions: number
  graded_submissions: number
}

export default function AssignmentSubmissionsPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const assignmentId = params.assignmentId as string

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch assignment details and submissions in parallel
        const [assignmentResponse, submissionsResponse] = await Promise.all([
          apiClient.get(`/api/assignments/${assignmentId}`),
          apiClient.get(`/api/assignments/${assignmentId}/submissions`),
        ])

        setAssignment(assignmentResponse as Assignment)
        setSubmissions(submissionsResponse as Submission[])
      } catch (err: any) {
        console.error("Failed to fetch data:", err)
        setError(err.message || "Failed to load assignment submissions")
      } finally {
        setLoading(false)
      }
    }

    if (assignmentId) {
      fetchData()
    }
  }, [assignmentId])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (submission: Submission) => {
    if (submission.status === "graded") {
      return <Badge className="bg-green-100 text-green-800">Graded</Badge>
    }

    const submittedDate = new Date(submission.submitted_at)
    const dueDate = assignment?.due_date ? new Date(assignment.due_date) : null

    if (dueDate && submittedDate > dueDate) {
      return <Badge className="bg-red-100 text-red-800">Late</Badge>
    }

    return <Badge className="bg-blue-100 text-blue-800">Submitted</Badge>
  }

  const getGradeDisplay = (grade: number | null, maxPoints: number) => {
    if (grade === null) return "Not graded"

    const percentage = Math.round((grade / maxPoints) * 100)
    return `${grade}/${maxPoints} (${percentage}%)`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="container py-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Submissions</h2>
          <p className="text-muted-foreground">{error || "Assignment not found"}</p>
          <Link href={`/admin/courses/${courseId}/assignments`}>
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assignments
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <Link href={`/admin/courses/${courseId}/assignments`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{assignment.title}</h1>
            <p className="text-muted-foreground mt-1">
              {assignment.total_submissions} submissions • {assignment.graded_submissions} graded
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground">Due Date</div>
            <div className="font-medium">{formatDate(assignment.due_date)}</div>
            <div className="text-sm text-muted-foreground mt-1">{assignment.max_points} points</div>
          </div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Submissions</h3>
              <p className="text-muted-foreground">
                No students have submitted this assignment yet.
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
                <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignment.total_submissions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Graded</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignment.graded_submissions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assignment.total_submissions - assignment.graded_submissions}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assignment.graded_submissions > 0
                    ? `${Math.round(
                        (submissions
                          .filter((s) => s.grade !== null)
                          .reduce((sum, s) => sum + (s.grade || 0), 0) /
                          assignment.graded_submissions /
                          assignment.max_points) *
                          100
                      )}%`
                    : "N/A"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submissions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Student Submissions</CardTitle>
              <CardDescription>Review and grade student assignment submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {submission.first_name} {submission.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">{submission.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDate(submission.submitted_at)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(submission.submitted_at).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(submission)}</TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {getGradeDisplay(submission.grade, assignment.max_points)}
                        </div>
                        {submission.graded_at && (
                          <div className="text-xs text-muted-foreground">
                            Graded: {formatDate(submission.graded_at)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {submission.attachments && submission.attachments.length > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {submission.attachments.length} file
                              {submission.attachments.length !== 1 ? "s" : ""}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total:{" "}
                              {formatFileSize(
                                submission.attachments.reduce((sum, file) => sum + file.size, 0)
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No attachments</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/courses/${courseId}/assignments/${assignmentId}/submissions/${submission.id}`}
                        >
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            {submission.is_graded ? "View Grade" : "Grade"}
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
