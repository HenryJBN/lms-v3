"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import {
  Search,
  Download,
  CalendarIcon,
  MoreHorizontal,
  Eye,
  Award,
  TrendingUp,
  Users,
  BookOpen,
  Clock,
  Target,
  FileText,
  Mail,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { enrollmentsService, type CompletionRecord, type CompletionsStats } from "@/lib/services/enrollments"
import { courseService } from "@/lib/services/courses"
import type { DateRange } from "react-day-picker"

export default function CourseCompletionsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedTimeRange, setSelectedTimeRange] = useState("30d")
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: undefined,
    to: undefined,
  })
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Calculate date range based on selected time range
  const dateParams = useMemo(() => {
    const now = new Date()
    let startDate: Date | undefined
    let endDate: Date | undefined = now

    switch (selectedTimeRange) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case "all":
        startDate = undefined
        endDate = undefined
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Override with custom date range if set
    if (dateRange.from) {
      startDate = dateRange.from
    }
    if (dateRange.to) {
      endDate = dateRange.to
    }

    return {
      start_date: startDate?.toISOString(),
      end_date: endDate?.toISOString(),
    }
  }, [selectedTimeRange, dateRange])

  // Fetch completions data
  const { data: completionsData, isLoading: completionsLoading, error: completionsError } = useQuery({
    queryKey: ["admin-completions", page, searchTerm, selectedCourse, selectedStatus, dateParams],
    queryFn: () => enrollmentsService.getCompletions({
      page,
      size: pageSize,
      search: searchTerm || undefined,
      course_id: selectedCourse !== "all" ? selectedCourse : undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      ...dateParams,
    }),
  })

  // Fetch completions stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-completions-stats", dateParams],
    queryFn: () => enrollmentsService.getCompletionsStats(dateParams),
  })

  // Fetch courses for filter dropdown
  const { data: coursesData } = useQuery({
    queryKey: ["courses"],
    queryFn: () => courseService.getCourses(),
  })

  const courses = useMemo(() => {
    if (!coursesData?.items) return []
    return coursesData.items.map((course: any) => ({
      id: course.id,
      title: course.title,
    }))
  }, [coursesData])

  // Transform stats data for charts
  const completionTrends = useMemo(() => {
    if (!statsData?.completionTrends) return []
    return statsData.completionTrends.map((trend) => ({
      month: trend.month,
      completions: trend.completions,
      enrollments: trend.completions * 2, // Approximate for visualization
    }))
  }, [statsData])

  const courseCompletionRates = useMemo(() => {
    if (!statsData?.courseCompletionRates) return []
    return statsData.courseCompletionRates.map((course, index) => ({
      course: course.course,
      rate: course.rate,
      color: `hsl(${index * 45}, 70%, 60%)`,
    }))
  }, [statsData])

  const timeToCompletion = useMemo(() => {
    if (!statsData?.timeToCompletionDistribution) return []
    return statsData.timeToCompletionDistribution.map((item, index) => ({
      range: item.range,
      count: item.count,
      color: `hsl(${index * 45}, 70%, 60%)`,
    }))
  }, [statsData])


  const stats = {
    totalCompletions: statsData?.totalCompletions ?? 0,
    totalEnrollments: statsData?.totalEnrollments ?? 0,
    averageCompletionRate: statsData?.averageCompletionRate ?? 0,
    averageTimeToComplete: statsData?.averageTimeToComplete ?? "N/A",
    certificatesIssued: statsData?.certificatesIssued ?? 0,
    totalTokensEarned: statsData?.totalTokensEarned ?? 0,
  }

  const exportData = (format: string) => {
    if (!completionsData?.items) return
    
    const dataToExport = completionsData.items.map((completion) => ({
      "User Name": completion.userName,
      "User Email": completion.userEmail,
      "Course Title": completion.courseTitle,
      "Enrollment Date": completion.enrollmentDate,
      "Completion Date": completion.completionDate || "In Progress",
      "Progress %": completion.progress,
      "Time Spent": completion.timeSpent,
      "Lessons Completed": `${completion.lessonsCompleted}/${completion.totalLessons}`,
      "Quizzes Passed": `${completion.quizzesPassed}/${completion.totalQuizzes}`,
      "Final Score": completion.finalScore || "N/A",
      "Certificate Issued": completion.certificateIssued ? "Yes" : "No",
      "Certificate ID": completion.certificateId || "N/A",
      "Tokens Earned": completion.tokensEarned,
      Status: completion.status,
    }))

    if (format === "csv") {
      const csv = [
        Object.keys(dataToExport[0]).join(","),
        ...dataToExport.map((row) => Object.values(row).join(",")),
      ].join("\n")

      const blob = new Blob([csv], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `course-completions-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
    } else if (format === "excel") {
      console.log("Exporting to Excel", dataToExport)
      alert("Excel export coming soon. Data logged to console.")
    } else if (format === "pdf") {
      console.log("Exporting to PDF", dataToExport)
      alert("PDF export coming soon. Data logged to console.")
    }
  }

  const handleViewDetails = (completion: CompletionRecord) => {
    console.log("Viewing details for completion:", completion)
    alert(`Viewing details for ${completion.userName}'s completion of ${completion.courseTitle}`)
  }

  const handleSendReminder = (completion: CompletionRecord) => {
    console.log("Sending reminder to user:", completion.userEmail)
    alert(`Sending reminder to ${completion.userName} for ${completion.courseTitle}`)
  }

  const handleViewCertificate = (completion: CompletionRecord) => {
    if (completion.certificateId) {
      window.open(`/certificates/${completion.certificateId}`, "_blank")
    }
  }

  const totalPages = completionsData?.pages ?? 1

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Course Completion Tracking</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant={dateRange.from ? "default" : "outline"} 
                  size="sm"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </>
                    ) : (
                      dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    )
                  ) : (
                    "Custom Range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="px-10 py-3 border-b flex items-center justify-between relative z-20">
                  <span className="text-sm font-medium">Select Date Range</span>
                  {dateRange.from && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setDateRange({ from: undefined, to: undefined })}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={1}
                  className="rounded-md border-0 mt-2"
                />
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => exportData("csv")}>
                  <FileText className="mr-2 h-4 w-4" />
                  CSV File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportData("excel")}>
                  <FileText className="mr-2 h-4 w-4" />
                  Excel File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportData("pdf")}>
                  <FileText className="mr-2 h-4 w-4" />
                  PDF Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 space-y-4 p-4 lg:p-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Completions</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalCompletions}</div>
                    <p className="text-xs text-muted-foreground">
                      Completed courses
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.averageCompletionRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      Average progress
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Time to Complete</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.averageTimeToComplete}</div>
                    <p className="text-xs text-muted-foreground">
                      Average duration
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Certificates Issued</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.certificatesIssued}</div>
                    <p className="text-xs text-muted-foreground">
                      Total certificates
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
                    <p className="text-xs text-muted-foreground">
                      Active enrollments
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tokens Earned</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalTokensEarned.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Total tokens
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="completions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="completions">Completion Data</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="completions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Course Completions</CardTitle>
                  <CardDescription>
                    Track and manage user course completion progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users or courses..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value)
                          setPage(1) // Reset to first page on search
                        }}
                        className="pl-8"
                      />
                    </div>
                    <Select value={selectedCourse} onValueChange={(value) => {
                      setSelectedCourse(value)
                      setPage(1)
                    }}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {courses.map((course: any) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedStatus} onValueChange={(value) => {
                      setSelectedStatus(value)
                      setPage(1)
                    }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="not_started">Not Started</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {completionsLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 py-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-3 w-[150px]" />
                          </div>
                          <Skeleton className="h-4 w-[100px]" />
                          <Skeleton className="h-4 w-[80px]" />
                          <Skeleton className="h-6 w-[60px]" />
                        </div>
                      ))}
                    </div>
                  ) : completionsError ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Error loading completions. Please try again.
                    </div>
                  ) : (
                    <>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Course</TableHead>
                              <TableHead>Cohort</TableHead>
                              <TableHead>Progress</TableHead>
                              <TableHead>Time Spent</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Certificate</TableHead>
                              <TableHead>Tokens</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {completionsData?.items?.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                  No completions found matching your criteria.
                                </TableCell>
                              </TableRow>
                            ) : (
                              completionsData?.items?.map((completion) => (
                                <TableRow key={completion.id}>
                                  <TableCell className="font-medium">
                                    <div>
                                      <div className="font-medium">{completion.userName}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {completion.userEmail}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{completion.courseTitle}</div>
                                      <div className="text-sm text-muted-foreground">
                                        Enrolled: {completion.enrollmentDate ? new Date(completion.enrollmentDate).toLocaleDateString() : 'N/A'}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {completion.cohortName ? (
                                      <Badge variant="outline">
                                        {completion.cohortName}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">No Cohort</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <Progress value={completion.progress} className="h-2 w-20" />
                                      <div className="text-sm">{completion.progress}%</div>
                                      <div className="text-xs text-muted-foreground">
                                        {completion.lessonsCompleted}/{completion.totalLessons} lessons
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>{completion.timeSpent}</TableCell>
                                  <TableCell>
                                    {completion.finalScore && completion.finalScore > 0 ? (
                                      <Badge variant={completion.finalScore >= 80 ? "default" : "secondary"}>
                                        {completion.finalScore}%
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">N/A</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        completion.status === "completed"
                                          ? "default"
                                          : completion.status === "in_progress"
                                            ? "secondary"
                                            : "outline"
                                      }
                                    >
                                      {completion.status.replace("_", " ")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {completion.certificateIssued ? (
                                      <div className="flex items-center gap-1">
                                        <Award className="h-4 w-4 text-yellow-500" />
                                        <span className="text-sm">{completion.certificateId}</span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">Not issued</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{completion.tokensEarned}</TableCell>
                                  <TableCell className="text-right">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                          <span className="sr-only">Open menu</span>
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleViewDetails(completion)}>
                                          <Eye className="mr-2 h-4 w-4" />
                                          View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleSendReminder(completion)}>
                                          <Mail className="mr-2 h-4 w-4" />
                                          Send Reminder
                                        </DropdownMenuItem>
                                        {completion.certificateIssued && (
                                          <DropdownMenuItem onClick={() => handleViewCertificate(completion)}>
                                            <Award className="mr-2 h-4 w-4" />
                                            View Certificate
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => exportData("csv")}>
                                          <Download className="mr-2 h-4 w-4" />
                                          Export Data (CSV)
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              disabled={page === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              disabled={page === totalPages}
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Completion Trends</CardTitle>
                    <CardDescription>Monthly completion vs enrollment trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="space-y-3 h-[300px] flex flex-col justify-center">
                        <Skeleton className="h-[250px] w-full" />
                      </div>
                    ) : completionTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={completionTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="completions"
                            stroke="#8884d8"
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="enrollments"
                            stroke="#82ca9d"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No trend data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Course Completion Rates</CardTitle>
                    <CardDescription>Completion percentage by course</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="space-y-3 h-[300px] flex flex-col justify-center">
                        <Skeleton className="h-[250px] w-full" />
                      </div>
                    ) : courseCompletionRates.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={courseCompletionRates}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="course" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Bar dataKey="rate" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No course data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Time to Completion</CardTitle>
                    <CardDescription>Distribution of completion timeframes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="space-y-3 h-[300px] flex flex-col justify-center">
                        <Skeleton className="h-[250px] w-full" />
                      </div>
                    ) : timeToCompletion.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={timeToCompletion}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="range"
                            label
                          >
                            {timeToCompletion.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No time to completion data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Completion Insights</CardTitle>
                    <CardDescription>Key metrics and insights</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {statsLoading ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-10" />
                          </div>
                          <Skeleton className="h-2 w-full" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-4 w-10" />
                          </div>
                          <Skeleton className="h-2 w-full" />
                        </div>
                        <div className="pt-4 space-y-2">
                          <Skeleton className="h-4 w-36" />
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex justify-between">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-10" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Average completion rate</span>
                            <span className="font-medium">{stats.averageCompletionRate}%</span>
                          </div>
                          <Progress value={stats.averageCompletionRate} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Certificate issuance rate</span>
                            <span className="font-medium">
                              {stats.totalCompletions > 0
                                ? Math.round((stats.certificatesIssued / stats.totalCompletions) * 100)
                                : 0}%
                            </span>
                          </div>
                          <Progress
                            value={stats.totalCompletions > 0
                              ? Math.round((stats.certificatesIssued / stats.totalCompletions) * 100)
                              : 0}
                            className="h-2"
                          />
                        </div>
                        <div className="pt-4 space-y-2">
                          <div className="text-sm font-medium">Top performing courses:</div>
                          {courseCompletionRates
                            .sort((a, b) => b.rate - a.rate)
                            .slice(0, 3)
                            .map((course, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{course.course}</span>
                                <span className="font-medium">{course.rate}%</span>
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Generate Custom Report</CardTitle>
                    <CardDescription>
                      Create detailed completion reports with custom filters
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Report Type</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="completion-summary">Completion Summary</SelectItem>
                          <SelectItem value="detailed-progress">Detailed Progress</SelectItem>
                          <SelectItem value="certificate-report">Certificate Report</SelectItem>
                          <SelectItem value="time-analysis">Time Analysis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date Range</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last-week">Last Week</SelectItem>
                          <SelectItem value="last-month">Last Month</SelectItem>
                          <SelectItem value="last-quarter">Last Quarter</SelectItem>
                          <SelectItem value="last-year">Last Year</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Include</label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="include-progress" defaultChecked />
                          <label htmlFor="include-progress" className="text-sm">
                            Progress details
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="include-certificates" defaultChecked />
                          <label htmlFor="include-certificates" className="text-sm">
                            Certificate information
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="include-tokens" defaultChecked />
                          <label htmlFor="include-tokens" className="text-sm">
                            Token earnings
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="include-analytics" />
                          <label htmlFor="include-analytics" className="text-sm">
                            Analytics data
                          </label>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full">Generate Report</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Scheduled Reports</CardTitle>
                    <CardDescription>Automate report generation and delivery</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Report Frequency</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email Recipients</label>
                      <Input placeholder="admin@example.com, manager@example.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Report Format</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF Report</SelectItem>
                          <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                          <SelectItem value="csv">CSV Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full">Schedule Report</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}