"use client"

import { useState } from "react"
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
} from "lucide-react"

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

  // Mock completion data
  const completions = [
    {
      id: 1,
      userId: 101,
      userName: "John Doe",
      userEmail: "john.doe@example.com",
      courseId: "blockchain-fundamentals",
      courseTitle: "Blockchain Fundamentals",
      enrollmentDate: "2024-01-15",
      completionDate: "2024-01-28",
      progress: 100,
      timeSpent: "24h 30m",
      lessonsCompleted: 12,
      totalLessons: 12,
      quizzesPassed: 8,
      totalQuizzes: 8,
      finalScore: 92,
      certificateIssued: true,
      certificateId: "CERT-BF-001",
      tokensEarned: 150,
      status: "completed",
    },
    {
      id: 2,
      userId: 102,
      userName: "Jane Smith",
      userEmail: "jane.smith@example.com",
      courseId: "ai-fundamentals",
      courseTitle: "AI Fundamentals",
      enrollmentDate: "2024-01-10",
      completionDate: null,
      progress: 75,
      timeSpent: "18h 45m",
      lessonsCompleted: 9,
      totalLessons: 12,
      quizzesPassed: 6,
      totalQuizzes: 8,
      finalScore: 0,
      certificateIssued: false,
      certificateId: null,
      tokensEarned: 90,
      status: "in_progress",
    },
    {
      id: 3,
      userId: 103,
      userName: "Mike Johnson",
      userEmail: "mike.johnson@example.com",
      courseId: "smart-contracts",
      courseTitle: "Smart Contract Development",
      enrollmentDate: "2024-01-05",
      completionDate: "2024-01-25",
      progress: 100,
      timeSpent: "32h 15m",
      lessonsCompleted: 15,
      totalLessons: 15,
      quizzesPassed: 10,
      totalQuizzes: 10,
      finalScore: 88,
      certificateIssued: true,
      certificateId: "CERT-SC-001",
      tokensEarned: 200,
      status: "completed",
    },
    {
      id: 4,
      userId: 104,
      userName: "Sarah Wilson",
      userEmail: "sarah.wilson@example.com",
      courseId: "web-development",
      courseTitle: "Web Development Fundamentals",
      enrollmentDate: "2024-01-20",
      completionDate: null,
      progress: 45,
      timeSpent: "12h 20m",
      lessonsCompleted: 5,
      totalLessons: 11,
      quizzesPassed: 3,
      totalQuizzes: 7,
      finalScore: 0,
      certificateIssued: false,
      certificateId: null,
      tokensEarned: 45,
      status: "in_progress",
    },
    {
      id: 5,
      userId: 105,
      userName: "Alex Rodriguez",
      userEmail: "alex.rodriguez@example.com",
      courseId: "3d-animation",
      courseTitle: "3D Animation Basics",
      enrollmentDate: "2024-01-12",
      completionDate: "2024-01-30",
      progress: 100,
      timeSpent: "28h 50m",
      lessonsCompleted: 14,
      totalLessons: 14,
      quizzesPassed: 9,
      totalQuizzes: 9,
      finalScore: 95,
      certificateIssued: true,
      certificateId: "CERT-3D-001",
      tokensEarned: 175,
      status: "completed",
    },
  ]

  // Mock course data for filtering
  const courses = [
    { id: "blockchain-fundamentals", title: "Blockchain Fundamentals" },
    { id: "ai-fundamentals", title: "AI Fundamentals" },
    { id: "smart-contracts", title: "Smart Contract Development" },
    { id: "web-development", title: "Web Development Fundamentals" },
    { id: "3d-animation", title: "3D Animation Basics" },
  ]

  // Analytics data
  const completionTrends = [
    { month: "Jan", completions: 45, enrollments: 120 },
    { month: "Feb", completions: 52, enrollments: 135 },
    { month: "Mar", completions: 48, enrollments: 128 },
    { month: "Apr", completions: 61, enrollments: 145 },
    { month: "May", completions: 58, enrollments: 142 },
    { month: "Jun", completions: 67, enrollments: 158 },
  ]

  const courseCompletionRates = [
    { course: "Blockchain Fundamentals", rate: 85, color: "#8884d8" },
    { course: "AI Fundamentals", rate: 72, color: "#82ca9d" },
    { course: "Smart Contracts", rate: 68, color: "#ffc658" },
    { course: "Web Development", rate: 79, color: "#ff7300" },
    { course: "3D Animation", rate: 81, color: "#00ff88" },
  ]

  const timeToCompletion = [
    { range: "< 1 week", count: 12 },
    { range: "1-2 weeks", count: 28 },
    { range: "2-4 weeks", count: 45 },
    { range: "1-2 months", count: 32 },
    { range: "> 2 months", count: 18 },
  ]

  const filteredCompletions = completions.filter((completion) => {
    const matchesSearch =
      completion.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      completion.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      completion.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = selectedCourse === "all" || completion.courseId === selectedCourse
    const matchesStatus = selectedStatus === "all" || completion.status === selectedStatus
    return matchesSearch && matchesCourse && matchesStatus
  })

  const stats = {
    totalCompletions: completions.filter((c) => c.status === "completed").length,
    totalEnrollments: completions.length,
    averageCompletionRate: Math.round(
      (completions.filter((c) => c.status === "completed").length / completions.length) * 100
    ),
    averageTimeToComplete: "3.2 weeks",
    certificatesIssued: completions.filter((c) => c.certificateIssued).length,
    totalTokensEarned: completions.reduce((sum, c) => sum + c.tokensEarned, 0),
  }

  const exportData = (format: string) => {
    const dataToExport = filteredCompletions.map((completion) => ({
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
      console.log("Mock: Exporting to Excel", dataToExport)
      alert("Mock: Exporting to Excel. Check console for data.")
    } else if (format === "pdf") {
      console.log("Mock: Exporting to PDF", dataToExport)
      alert("Mock: Exporting to PDF. Check console for data.")
    }
    // Add other export formats as needed
  }

  const handleViewDetails = (completion: any) => {
    console.log("Mock: Viewing details for completion ID:", completion.id, completion)
    alert(
      `Mock: Viewing details for ${completion.userName}'s completion of ${completion.courseTitle}`
    )
  }

  const handleSendReminder = (completion: any) => {
    console.log("Mock: Sending reminder to user:", completion.userEmail, completion.id)
    alert(`Mock: Sending reminder to ${completion.userName} for ${completion.courseTitle}`)
  }

  const handleViewCertificate = (completion: any) => {
    console.log(
      "Mock: Viewing certificate for completion ID:",
      completion.certificateId,
      completion
    )
    alert(`Mock: Viewing certificate ${completion.certificateId} for ${completion.userName}`)
  }

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
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Custom Range
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
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
                <div className="text-2xl font-bold">{stats.totalCompletions}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+12%</span> from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageCompletionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+3%</span> from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Time to Complete</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageTimeToComplete}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-600">+0.2w</span> from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Certificates Issued</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.certificatesIssued}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+8</span> this week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+15</span> this week
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tokens Earned</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTokensEarned.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+125</span> this week
                </p>
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
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by course" />
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
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
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

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Course</TableHead>
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
                        {filteredCompletions.map((completion) => (
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
                                  Enrolled: {completion.enrollmentDate}
                                </div>
                              </div>
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
                              {completion.finalScore > 0 ? (
                                <Badge
                                  variant={completion.finalScore >= 80 ? "default" : "secondary"}
                                >
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
                                    <DropdownMenuItem
                                      onClick={() => handleViewCertificate(completion)}
                                    >
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Course Completion Rates</CardTitle>
                    <CardDescription>Completion percentage by course</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={courseCompletionRates}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="course" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value}%`} />
                        <Bar dataKey="rate" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={timeToCompletion}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {timeToCompletion.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Completion Insights</CardTitle>
                    <CardDescription>Key metrics and insights</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                          {Math.round((stats.certificatesIssued / stats.totalCompletions) * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.round(
                          (stats.certificatesIssued / stats.totalCompletions) * 100
                        )}
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
