"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calendar,
  FileText,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Eye,
  Search,
  Filter,
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
  course_id: string
  lesson_id: string | null
}

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [courseFilter, setCourseFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [courses, setCourses] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch assignments and courses in parallel
        const [assignmentsResponse, coursesResponse] = await Promise.all([
          apiClient.get("/api/assignments?page=1&size=1000") as Promise<{ items: Assignment[] }>,
          apiClient.get("/api/courses?page=1&size=1000") as Promise<{ items: any[] }>,
        ])

        setAssignments(assignmentsResponse.items || [])
        setCourses(coursesResponse.items || [])
      } catch (err: any) {
        console.error("Failed to fetch data:", err)
        setError(err.message || "Failed to load assignments")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      if (
        !assignment.title.toLowerCase().includes(searchLower) &&
        !assignment.course_title.toLowerCase().includes(searchLower) &&
        !(assignment.lesson_title && assignment.lesson_title.toLowerCase().includes(searchLower))
      ) {
        return false
      }
    }

    // Course filter
    if (courseFilter !== "all" && assignment.course_id !== courseFilter) {
      return false
    }

    // Status filter
    if (statusFilter !== "all") {
      const submitted = assignment.total_submissions
      const graded = assignment.graded_submissions
      const pending = submitted - graded

      switch (statusFilter) {
        case "draft":
          if (assignment.is_published) return false
          break
        case "no_submissions":
          if (submitted > 0) return false
          break
        case "pending":
          if (pending === 0 || submitted === 0) return false
          break
        case "graded":
          if (pending > 0 || submitted === 0) return false
          break
      }
    }

    return true
  })

  // Calculate stats
  const stats = {
    totalAssignments: assignments.length,
    publishedAssignments: assignments.filter((a) => a.is_published).length,
    totalSubmissions: assignments.reduce((sum, a) => sum + a.total_submissions, 0),
    pendingGrading: assignments.reduce(
      (sum, a) => sum + (a.total_submissions - a.graded_submissions),
      0
    ),
    fullyGraded: assignments.filter(
      (a) => a.total_submissions > 0 && a.total_submissions === a.graded_submissions
    ).length,
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
        <p className="text-muted-foreground">View and manage all assignments across courses</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedAssignments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingGrading}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fully Graded</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fullyGraded}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="no_submissions">No Submissions</SelectItem>
                <SelectItem value="pending">Pending Grading</SelectItem>
                <SelectItem value="graded">Fully Graded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assignments ({filteredAssignments.length})</CardTitle>
          <CardDescription>
            {searchTerm || courseFilter !== "all" || statusFilter !== "all"
              ? `Showing ${filteredAssignments.length} of ${assignments.length} assignments`
              : "All assignments across courses"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Assignments Found</h3>
              <p className="text-muted-foreground">
                {assignments.length === 0
                  ? "No assignments have been created yet."
                  : "No assignments match your current filters."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
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
                      <Badge variant="outline">{assignment.course_title}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(assignment.due_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {assignment.total_submissions} submitted
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
                        href={`/admin/courses/${assignment.course_id}/assignments/${assignment.id}/submissions`}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
