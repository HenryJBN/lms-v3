"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Calendar,
  FileText,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Save,
  X,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "@/hooks/use-toast"
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
}

interface Assignment {
  id: string
  title: string
  description: string
  instructions: string
  due_date: string | null
  max_points: number
}

export default function GradeSubmissionPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const assignmentId = params.assignmentId as string
  const submissionId = params.submissionId as string

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Grading form state
  const [grade, setGrade] = useState("")
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch assignment and submission data
        const [assignmentResponse, submissionResponse] = await Promise.all([
          apiClient.get(`/api/assignments/${assignmentId}`),
          // Note: We'll need to add an endpoint to get individual submission details
          apiClient.get(`/api/assignments/submissions/${submissionId}`),
        ])

        setAssignment(assignmentResponse as Assignment)
        const submissionData = submissionResponse as Submission
        setSubmission(submissionData)

        // Pre-fill form if already graded
        if (submissionData.grade !== null) {
          setGrade(submissionData.grade.toString())
          setFeedback(submissionData.feedback || "")
        }
      } catch (err: any) {
        console.error("Failed to fetch data:", err)
        setError(err.message || "Failed to load submission")
      } finally {
        setLoading(false)
      }
    }

    if (assignmentId && submissionId) {
      fetchData()
    }
  }, [assignmentId, submissionId])

  const handleSaveGrade = async () => {
    if (!assignment || !submission) return

    const gradeValue = parseInt(grade)
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > assignment.max_points) {
      toast({
        title: "Invalid Grade",
        description: `Grade must be between 0 and ${assignment.max_points}`,
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      await apiClient.put(`/api/assignments/submissions/${submissionId}/grade`, {
        grade: gradeValue,
        feedback: feedback.trim() || null,
      })

      toast({
        title: "Success",
        description: "Grade saved successfully!",
      })

      // Refresh submission data
      const updatedSubmission = await apiClient.get(`/api/assignments/submissions/${submissionId}`)
      setSubmission(updatedSubmission as Submission)

      // Navigate back to submissions list
      router.push(`/admin/courses/${courseId}/assignments/${assignmentId}/submissions`)
    } catch (err: any) {
      console.error("Failed to save grade:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to save grade",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getSubmissionStatus = (submission: Submission, assignment: Assignment) => {
    if (submission.status === "graded") {
      return { text: "Graded", color: "bg-green-100 text-green-800" }
    }

    const submittedDate = new Date(submission.submitted_at)
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null

    if (dueDate && submittedDate > dueDate) {
      return { text: "Late Submission", color: "bg-red-100 text-red-800" }
    }

    return { text: "Submitted", color: "bg-blue-100 text-blue-800" }
  }

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading submission...</p>
        </div>
      </div>
    )
  }

  if (error || !assignment || !submission) {
    return (
      <div className="container py-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Submission</h2>
          <p className="text-muted-foreground">{error || "Submission not found"}</p>
          <Link href={`/admin/courses/${courseId}/assignments/${assignmentId}/submissions`}>
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Submissions
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const submissionStatus = getSubmissionStatus(submission, assignment)
  const isGraded = submission.status === "graded"

  return (
    <div className="container py-6 max-w-6xl">
      <div className="mb-6">
        <Link href={`/admin/courses/${courseId}/assignments/${assignmentId}/submissions`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{assignment.title}</h1>
            <p className="text-muted-foreground mt-1">
              Submitted by {submission.first_name} {submission.last_name}
            </p>
          </div>

          <Badge className={submissionStatus.color}>{submissionStatus.text}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student Submission */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assignment Info */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground">{assignment.description}</p>
                </div>
                {assignment.instructions && (
                  <div>
                    <h4 className="font-semibold mb-2">Instructions</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {assignment.instructions}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-4 pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Due: {formatDate(assignment.due_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{assignment.max_points} points</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Submission Content */}
          <Card>
            <CardHeader>
              <CardTitle>Student Submission</CardTitle>
              <CardDescription>
                Submitted on {formatDate(submission.submitted_at)} at{" "}
                {new Date(submission.submitted_at).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Submission Content</h4>
                <div className="p-4 bg-muted rounded whitespace-pre-wrap text-sm">
                  {submission.content || "No text content provided"}
                </div>
              </div>

              {submission.attachments && submission.attachments.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Attachments</h4>
                  <div className="space-y-2">
                    {submission.attachments.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline truncate block"
                          >
                            {file.filename}
                          </a>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={file.url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Grading Panel */}
        <div className="space-y-6">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="font-medium">
                    {submission.first_name} {submission.last_name}
                  </div>
                  <div className="text-sm text-muted-foreground">{submission.email}</div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm">
                    <span className="font-medium">Submitted:</span>{" "}
                    {formatDate(submission.submitted_at)}
                  </div>
                  <div className="text-sm mt-1">
                    <span className="font-medium">Status:</span>{" "}
                    <Badge className={submissionStatus.color}>{submissionStatus.text}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grading Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Grade Submission</CardTitle>
              <CardDescription>Assign a grade and provide feedback</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="grade">Grade (0 - {assignment.max_points})</Label>
                <Input
                  id="grade"
                  type="number"
                  min="0"
                  max={assignment.max_points}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Enter grade"
                  className="mt-1"
                />
                {grade && !isNaN(parseInt(grade)) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round((parseInt(grade) / assignment.max_points) * 100)}% of maximum
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="feedback">Feedback (Optional)</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback to the student..."
                  className="mt-1 min-h-[100px]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveGrade}
                  disabled={saving || !grade.trim()}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isGraded ? "Update Grade" : "Save Grade"}
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/admin/courses/${courseId}/assignments/${assignmentId}/submissions`}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Link>
                </Button>
              </div>

              {isGraded && submission.graded_at && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Last graded: {formatDate(submission.graded_at)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
