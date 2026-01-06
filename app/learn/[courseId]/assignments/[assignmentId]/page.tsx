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
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface Assignment {
  id: string
  title: string
  description: string
  instructions: string
  due_date: string | null
  max_points: number
  submission_status: string
  user_grade: number | null
  submission_date: string | null
}

interface Submission {
  id: string
  content: string
  attachments: Array<{
    filename: string
    url: string
    size: number
  }>
  submitted_at: string
  grade: number | null
  feedback: string | null
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const assignmentId = params.assignmentId as string
  const { user } = useAuth()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [content, setContent] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        setLoading(true)
        const response = (await apiClient.get(`/api/assignments/${assignmentId}`)) as Assignment
        setAssignment(response)

        // If already submitted, fetch submission details
        if (response.submission_status !== "not_submitted") {
          await fetchSubmission()
        }
      } catch (err: any) {
        console.error("Failed to fetch assignment:", err)
        setError(err.message || "Failed to load assignment")
      } finally {
        setLoading(false)
      }
    }

    const fetchSubmission = async () => {
      try {
        // Note: This endpoint doesn't exist yet - we'll need to add it to the assignments router
        const response = (await apiClient.get(
          `/api/assignments/${assignmentId}/my-submission`
        )) as Submission
        setSubmission(response)
        setContent(response.content || "")
      } catch (err: any) {
        // Submission might not exist yet
        console.log("No existing submission found")
      }
    }

    if (assignmentId && user) {
      fetchAssignment()
    }
  }, [assignmentId, user])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadAttachments = async () => {
    if (attachments.length === 0) return []

    setUploadingFiles(true)
    try {
      const uploadedFiles = []

      for (const file of attachments) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await apiClient.postFormData(
          "/api/assignments/upload-attachment",
          formData
        )

        uploadedFiles.push({
          filename: response.filename,
          url: response.url,
          size: file.size,
        })
      }

      return uploadedFiles
    } catch (err: any) {
      console.error("Failed to upload files:", err)
      toast({
        title: "Upload Error",
        description: "Failed to upload some files. Please try again.",
        variant: "destructive",
      })
      return []
    } finally {
      setUploadingFiles(false)
    }
  }

  const handleSubmit = async () => {
    if (!assignment || !content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide content for your submission.",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      // Upload attachments first
      const uploadedFiles = await uploadAttachments()

      // Submit assignment
      const submissionData = {
        content: content.trim(),
        attachments: uploadedFiles,
      }

      await apiClient.post(`/api/assignments/${assignmentId}/submissions`, submissionData)

      toast({
        title: "Success",
        description: "Assignment submitted successfully!",
      })

      // Refresh assignment data
      const updatedAssignment = (await apiClient.get(
        `/api/assignments/${assignmentId}`
      )) as Assignment
      setAssignment(updatedAssignment)

      // Clear form
      setContent("")
      setAttachments([])
    } catch (err: any) {
      console.error("Failed to submit assignment:", err)
      toast({
        title: "Submission Error",
        description: err.message || "Failed to submit assignment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "graded":
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      case "late":
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "submitted":
        return "Submitted"
      case "graded":
        return "Graded"
      case "late":
        return "Late Submission"
      default:
        return "Not Submitted"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-green-100 text-green-800"
      case "graded":
        return "bg-blue-100 text-blue-800"
      case "late":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date"
    return new Date(dateString).toLocaleDateString()
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
          <p className="text-muted-foreground">Loading assignment...</p>
        </div>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <div className="container py-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Assignment</h2>
          <p className="text-muted-foreground">{error || "Assignment not found"}</p>
          <Link href={`/learn/${courseId}/assignments`}>
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assignments
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date()
  const canSubmit =
    assignment.submission_status === "not_submitted" || assignment.submission_status === "late"

  return (
    <div className="container py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/learn/${courseId}/assignments`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assignments
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{assignment.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Due: {formatDate(assignment.due_date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{assignment.max_points} points</span>
              </div>
            </div>
          </div>

          <Badge className={getStatusColor(assignment.submission_status)}>
            <div className="flex items-center gap-1">
              {getStatusIcon(assignment.submission_status)}
              <span>{getStatusText(assignment.submission_status)}</span>
            </div>
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Assignment Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Assignment Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{assignment.description}</p>
              {assignment.instructions && (
                <div>
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {assignment.instructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Form - Only show if not submitted or can resubmit */}
          {canSubmit && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Assignment</CardTitle>
                <CardDescription>
                  {isOverdue ? "This assignment is overdue." : "Complete your submission below."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="content">Your Submission *</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your assignment submission here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[200px] mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="attachments">Attachments (Optional)</Label>
                  <div className="mt-1 space-y-2">
                    <Input
                      id="attachments"
                      type="file"
                      multiple
                      accept="image/*,application/pdf,text/*,.doc,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("attachments")?.click()}
                      disabled={uploadingFiles}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingFiles ? "Uploading..." : "Add Files"}
                    </Button>

                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({formatFileSize(file.size)})
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !content.trim()}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Assignment"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Previous Submission */}
          {submission && (
            <Card>
              <CardHeader>
                <CardTitle>Your Submission</CardTitle>
                <CardDescription>
                  Submitted on {new Date(submission.submitted_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Content</h4>
                  <div className="p-3 bg-muted rounded whitespace-pre-wrap text-sm">
                    {submission.content}
                  </div>
                </div>

                {submission.attachments && submission.attachments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Attachments</h4>
                    <div className="space-y-2">
                      {submission.attachments.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline"
                          >
                            {file.filename}
                          </a>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {submission.grade !== null && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-800">Graded</span>
                    </div>
                    <div className="text-sm text-green-700">
                      <strong>Grade:</strong> {submission.grade}/{assignment.max_points}
                      {submission.feedback && (
                        <div className="mt-2">
                          <strong>Feedback:</strong> {submission.feedback}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submission Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Status</span>
                  <Badge className={getStatusColor(assignment.submission_status)}>
                    {getStatusText(assignment.submission_status)}
                  </Badge>
                </div>

                {assignment.submission_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Submitted</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(assignment.submission_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm">Points</span>
                  <span className="text-sm font-medium">
                    {assignment.user_grade !== null
                      ? `${assignment.user_grade}/${assignment.max_points}`
                      : `${assignment.max_points} pts`}
                  </span>
                </div>

                {assignment.due_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Due Date</span>
                    <span
                      className={`text-sm ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}
                    >
                      {formatDate(assignment.due_date)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/learn/${courseId}`}>
                <Button variant="outline" className="w-full justify-start">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Course
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
