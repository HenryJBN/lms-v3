"use client"

import { useState } from "react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Upload,
  Eye,
  Play,
  FileText,
  Clock,
  Users,
  BarChart3,
  Video,
  ImageIcon,
  FileAudio,
  File,
  Copy,
  Move,
} from "lucide-react"

export default function LessonsManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [sortField, setSortField] = useState("order")
  const [sortDirection, setSortDirection] = useState("asc")
  const [selectedLessons, setSelectedLessons] = useState<number[]>([])

  // Mock lesson data
  const lessons = [
    {
      id: 1,
      title: "Introduction to Blockchain",
      description: "Learn the fundamental concepts of blockchain technology",
      course: "Blockchain Fundamentals",
      courseId: 1,
      type: "video",
      status: "published",
      order: 1,
      duration: "15:30",
      views: 1250,
      completions: 980,
      completionRate: 78.4,
      createdDate: "2023-10-15",
      lastUpdated: "2024-01-10",
      author: "Dr. Sarah Johnson",
      isPreview: true,
      hasQuiz: true,
      hasAssignment: false,
      videoUrl: "/videos/blockchain-intro.mp4",
      thumbnail: "/images/lessons/blockchain-intro.jpg",
    },
    {
      id: 2,
      title: "What is a Hash Function?",
      description: "Understanding cryptographic hash functions in blockchain",
      course: "Blockchain Fundamentals",
      courseId: 1,
      type: "video",
      status: "published",
      order: 2,
      duration: "12:45",
      views: 1100,
      completions: 850,
      completionRate: 77.3,
      createdDate: "2023-10-16",
      lastUpdated: "2024-01-10",
      author: "Dr. Sarah Johnson",
      isPreview: false,
      hasQuiz: true,
      hasAssignment: true,
      videoUrl: "/videos/hash-functions.mp4",
      thumbnail: "/images/lessons/hash-functions.jpg",
    },
    {
      id: 3,
      title: "Smart Contract Basics",
      description: "Introduction to smart contracts and their applications",
      course: "Smart Contract Development",
      courseId: 2,
      type: "video",
      status: "published",
      order: 1,
      duration: "18:20",
      views: 890,
      completions: 720,
      completionRate: 80.9,
      createdDate: "2023-11-20",
      lastUpdated: "2024-01-15",
      author: "Alex Rodriguez",
      isPreview: true,
      hasQuiz: true,
      hasAssignment: false,
      videoUrl: "/videos/smart-contracts.mp4",
      thumbnail: "/images/lessons/smart-contracts.jpg",
    },
    {
      id: 4,
      title: "Setting Up Development Environment",
      description: "Configure your development environment for smart contracts",
      course: "Smart Contract Development",
      courseId: 2,
      type: "text",
      status: "published",
      order: 2,
      duration: "10:00",
      views: 750,
      completions: 600,
      completionRate: 80.0,
      createdDate: "2023-11-21",
      lastUpdated: "2024-01-15",
      author: "Alex Rodriguez",
      isPreview: false,
      hasQuiz: false,
      hasAssignment: true,
      videoUrl: null,
      thumbnail: "/images/lessons/dev-setup.jpg",
    },
    {
      id: 5,
      title: "Neural Networks Introduction",
      description: "Understanding the basics of neural networks",
      course: "AI Fundamentals",
      courseId: 3,
      type: "video",
      status: "draft",
      order: 1,
      duration: "22:15",
      views: 0,
      completions: 0,
      completionRate: 0,
      createdDate: "2024-01-12",
      lastUpdated: "2024-01-18",
      author: "Dr. Michael Chen",
      isPreview: true,
      hasQuiz: true,
      hasAssignment: false,
      videoUrl: "/videos/neural-networks.mp4",
      thumbnail: "/images/lessons/neural-networks.jpg",
    },
  ]

  const courses = [
    { id: 1, title: "Blockchain Fundamentals" },
    { id: 2, title: "Smart Contract Development" },
    { id: 3, title: "AI Fundamentals" },
    { id: 4, title: "Advanced Cinematography" },
    { id: 5, title: "3D Animation Basics" },
  ]

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.author.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCourse = selectedCourse === "all" || lesson.courseId.toString() === selectedCourse
    const matchesType = selectedType === "all" || lesson.type === selectedType
    const matchesStatus = selectedStatus === "all" || lesson.status === selectedStatus
    return matchesSearch && matchesCourse && matchesType && matchesStatus
  })

  const sortedLessons = [...filteredLessons].sort((a, b) => {
    let aValue = a[sortField as keyof typeof a]
    let bValue = b[sortField as keyof typeof b]

    if (typeof aValue === "string") aValue = aValue.toLowerCase()
    if (typeof bValue === "string") bValue = bValue.toLowerCase()

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const stats = {
    totalLessons: lessons.length,
    publishedLessons: lessons.filter((l) => l.status === "published").length,
    draftLessons: lessons.filter((l) => l.status === "draft").length,
    totalViews: lessons.reduce((sum, lesson) => sum + lesson.views, 0),
    averageCompletion:
      lessons
        .filter((l) => l.completionRate > 0)
        .reduce((sum, lesson) => sum + lesson.completionRate, 0) /
      lessons.filter((l) => l.completionRate > 0).length,
    totalDuration: lessons.reduce((sum, lesson) => {
      const [minutes, seconds] = lesson.duration.split(":").map(Number)
      return sum + minutes + seconds / 60
    }, 0),
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLessons(sortedLessons.map((lesson) => lesson.id))
    } else {
      setSelectedLessons([])
    }
  }

  const handleSelectLesson = (lessonId: number, checked: boolean) => {
    if (checked) {
      setSelectedLessons([...selectedLessons, lessonId])
    } else {
      setSelectedLessons(selectedLessons.filter((id) => id !== lessonId))
    }
  }

  const exportLessons = (format: "csv" | "excel" | "pdf") => {
    const dataToExport =
      selectedLessons.length > 0
        ? sortedLessons.filter((lesson) => selectedLessons.includes(lesson.id))
        : sortedLessons

    console.log(`Exporting ${dataToExport.length} lessons as ${format}`)

    if (format === "csv") {
      const csvContent = [
        [
          "Title",
          "Course",
          "Type",
          "Status",
          "Duration",
          "Views",
          "Completion Rate",
          "Author",
          "Created Date",
        ].join(","),
        ...dataToExport.map((lesson) =>
          [
            lesson.title,
            lesson.course,
            lesson.type,
            lesson.status,
            lesson.duration,
            lesson.views,
            `${lesson.completionRate}%`,
            lesson.author,
            lesson.createdDate,
          ].join(",")
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `lessons-export-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />
      case "text":
        return <FileText className="h-4 w-4" />
      case "audio":
        return <FileAudio className="h-4 w-4" />
      case "image":
        return <ImageIcon className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6 space-y-4">
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalLessons}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Published</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.publishedLessons}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Drafts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.draftLessons}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Views</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {stats.totalViews.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Completion</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {stats.averageCompletion.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {Math.round(stats.totalDuration)}h
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lessons Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Lessons</CardTitle>
                  <CardDescription>Manage all lessons across courses</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        Import CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <File className="mr-2 h-4 w-4" />
                        Import Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => exportLessons("csv")}>
                        <FileText className="mr-2 h-4 w-4" />
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportLessons("excel")}>
                        <File className="mr-2 h-4 w-4" />
                        Export Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Lesson
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh]">
                      <ScrollArea className="max-h-[80vh] pr-4">
                        <DialogHeader>
                          <DialogTitle>Create New Lesson</DialogTitle>
                          <DialogDescription>
                            Add a new lesson to a course. Fill in the lesson details below.
                          </DialogDescription>
                        </DialogHeader>
                        <Tabs defaultValue="content" className="w-full mt-4">
                          <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="content">Content</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                            <TabsTrigger value="media">Media</TabsTrigger>
                            <TabsTrigger value="assessment">Assessment</TabsTrigger>
                          </TabsList>

                          <TabsContent value="content" className="space-y-4 mt-4">
                            <div className="grid gap-2">
                              <Label htmlFor="title">Title</Label>
                              <Input id="title" placeholder="Lesson title" />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="description">Description</Label>
                              <Textarea id="description" placeholder="Lesson description" />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="content">Content</Label>
                              <Textarea
                                id="content"
                                placeholder="Lesson content (supports markdown)"
                                className="min-h-[200px]"
                              />
                            </div>
                          </TabsContent>

                          <TabsContent value="settings" className="space-y-4 mt-4">
                            <div className="grid gap-2">
                              <Label htmlFor="course">Course</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select course" />
                                </SelectTrigger>
                                <SelectContent>
                                  {courses.map((course) => (
                                    <SelectItem key={course.id} value={course.id.toString()}>
                                      {course.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="type">Type</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select lesson type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="video">Video</SelectItem>
                                  <SelectItem value="text">Text/Article</SelectItem>
                                  <SelectItem value="audio">Audio</SelectItem>
                                  <SelectItem value="image">Image Gallery</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="order">Order</Label>
                              <Input id="order" type="number" placeholder="1" />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="duration">Duration</Label>
                              <Input id="duration" placeholder="15:30" />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="preview" />
                              <Label htmlFor="preview">Allow preview without enrollment</Label>
                            </div>
                          </TabsContent>

                          <TabsContent value="media" className="space-y-4 mt-4">
                            <div className="grid gap-2">
                              <Label htmlFor="video">Video URL</Label>
                              <Input id="video" placeholder="https://..." />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="thumbnail">Thumbnail</Label>
                              <Input id="thumbnail" type="file" accept="image/*" />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="attachments">Attachments</Label>
                              <Input id="attachments" type="file" multiple />
                            </div>
                          </TabsContent>

                          <TabsContent value="assessment" className="space-y-4 mt-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="hasQuiz" />
                              <Label htmlFor="hasQuiz">Include quiz</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="hasAssignment" />
                              <Label htmlFor="hasAssignment">Include assignment</Label>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="passingScore">Passing Score</Label>
                              <Input id="passingScore" type="number" placeholder="80" />
                            </div>
                          </TabsContent>
                        </Tabs>
                        <DialogFooter className="mt-6">
                          <Button type="submit">Create Lesson</Button>
                        </DialogFooter>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search lessons..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedLessons.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      {selectedLessons.length} selected
                    </span>
                    <Button size="sm" variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </Button>
                    <Button size="sm" variant="outline">
                      <Move className="h-4 w-4 mr-2" />
                      Move
                    </Button>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedLessons.length === sortedLessons.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="min-w-[300px]">Lesson</TableHead>
                      <TableHead className="min-w-[150px]">Course</TableHead>
                      <TableHead className="min-w-[100px]">Type</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Duration</TableHead>
                      <TableHead className="min-w-[100px]">Views</TableHead>
                      <TableHead className="min-w-[150px]">Completion</TableHead>
                      <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedLessons.map((lesson) => (
                      <TableRow key={lesson.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLessons.includes(lesson.id)}
                            onCheckedChange={(checked) =>
                              handleSelectLesson(lesson.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={lesson.thumbnail || "/placeholder.svg"}
                              alt={lesson.title}
                              className="h-10 w-16 rounded object-cover flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-medium truncate">{lesson.title}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {lesson.description.substring(0, 50)}...
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {lesson.isPreview && (
                                  <Badge variant="outline" className="text-xs">
                                    Preview
                                  </Badge>
                                )}
                                {lesson.hasQuiz && (
                                  <Badge variant="outline" className="text-xs">
                                    Quiz
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {lesson.course}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            {getTypeIcon(lesson.type)}
                            <span className="capitalize">{lesson.type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={lesson.status === "published" ? "default" : "secondary"}
                            className="whitespace-nowrap"
                          >
                            {lesson.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{lesson.duration}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {lesson.views.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className="text-sm">{lesson.completionRate.toFixed(1)}%</div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${lesson.completionRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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
        </div>
      </div>
    </div>
  )
}
