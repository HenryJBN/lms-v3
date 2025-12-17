"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
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
import { toast } from "@/hooks/use-toast"
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Upload,
  Eye,
  BookOpen,
  Clock,
  Users,
  BarChart3,
  FileText,
  Loader2,
} from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { SectionCreateFormSchema, type SectionCreateForm } from "@/lib/schemas/section"

export default function SectionsManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCourse, setSelectedCourse] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [sortField, setSortField] = useState("sort_order")
  const [sortDirection, setSortDirection] = useState("asc")
  const [selectedSections, setSelectedSections] = useState<number[]>([])

  // Data states
  const [sections, setSections] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [isLoadingSections, setIsLoadingSections] = useState(true)

  // Add/Edit section dialog state
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<any>(null)

  // React Hook Form setup
  const form = useForm<SectionCreateForm>({
    resolver: zodResolver(SectionCreateFormSchema),
    defaultValues: {
      title: "",
      description: "",
      courseId: "",
      sortOrder: "",
      isPublished: true,
    },
  })

  const isSubmitting = form.formState.isSubmitting

  // Fetch courses function
  const fetchCourses = async () => {
    try {
      setIsLoadingCourses(true)
      // Fetch all courses (published and drafts for admin)
      const response: { items: any[] } = await apiClient.get("/api/courses?page=1&size=100")
      setCourses(response.items || [])
    } catch (error) {
      console.error("Failed to fetch courses:", error)
      toast({
        title: "Error",
        description: "Failed to load courses. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingCourses(false)
    }
  }

  // Fetch sections function
  const fetchSections = async () => {
    try {
      setIsLoadingSections(true)
      const params = new URLSearchParams()
      if (selectedCourse !== "all") {
        params.append("course_id", selectedCourse)
      }
      const response: { items: any[] } = await apiClient.get(`/api/sections?${params}`)
      setSections(response.items || [])
    } catch (error) {
      console.error("Failed to fetch sections:", error)
      toast({
        title: "Error",
        description: "Failed to load sections. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingSections(false)
    }
  }

  // Fetch courses and sections on component mount
  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    fetchSections()
  }, [selectedCourse])

  // Handle opening edit dialog
  const handleEditSection = (section: any) => {
    setEditingSection(section)
    form.reset({
      title: section.title,
      description: section.description || "",
      courseId: section.course_id,
      sortOrder: section.sort_order?.toString() || "",
      isPublished: section.is_published,
    })
    setIsAddSectionOpen(true)
  }

  // Handle opening create dialog
  const handleCreateSection = () => {
    setEditingSection(null)
    form.reset({
      title: "",
      description: "",
      courseId: "",
      sortOrder: "",
      isPublished: true,
    })
    setIsAddSectionOpen(true)
  }

  // Handle form submission
  const onSubmit = async (values: SectionCreateForm) => {
    try {
      // Prepare section data
      const sectionData = {
        title: values.title.trim(),
        description: values.description?.trim() || "",
        course_id: values.courseId,
        sort_order: values.sortOrder ? parseInt(values.sortOrder) : 0,
        is_published: values.isPublished,
      }

      if (editingSection) {
        // Update existing section
        await apiClient.put(`/api/sections/${editingSection.id}`, sectionData)
        toast({
          title: "Success",
          description: "Section updated successfully!",
        })
      } else {
        // Create new section
        await apiClient.post("/api/sections", sectionData)
        toast({
          title: "Success",
          description: "Section created successfully!",
        })
      }

      // Reset form and close dialog
      form.reset({
        title: "",
        description: "",
        courseId: "",
        sortOrder: "",
        isPublished: true,
      })
      setEditingSection(null)
      setIsAddSectionOpen(false)

      // Refresh sections list
      fetchSections()
    } catch (error: any) {
      console.error("Failed to save section:", error)

      // Extract error message from API error
      let errorMessage = "Failed to save section. Please try again."
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.detail) {
        errorMessage = error.detail
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const filteredSections = sections.filter((section) => {
    const matchesSearch =
      (section.title?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (section.description?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    const matchesCourse =
      selectedCourse === "all" || section.course_id?.toString() === selectedCourse
    const matchesStatus = selectedStatus === "all" || section.status === selectedStatus
    return matchesSearch && matchesCourse && matchesStatus
  })

  const sortedSections = [...filteredSections].sort((a, b) => {
    let aValue = a[sortField as keyof typeof a] || ""
    let bValue = b[sortField as keyof typeof b] || ""

    if (typeof aValue === "string") aValue = aValue.toLowerCase()
    if (typeof bValue === "string") bValue = bValue.toLowerCase()

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const stats = {
    totalSections: sections.length,
    publishedSections: sections.filter((s) => s.is_published).length,
    draftSections: sections.filter((s) => !s.is_published).length,
    totalLessons: sections.reduce((sum, section) => sum + (section.lesson_count || 0), 0),
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSections(sortedSections.map((section) => section.id))
    } else {
      setSelectedSections([])
    }
  }

  const handleSelectSection = (sectionId: number, checked: boolean) => {
    if (checked) {
      setSelectedSections([...selectedSections, sectionId])
    } else {
      setSelectedSections(selectedSections.filter((id) => id !== sectionId))
    }
  }

  const exportSections = (format: "csv" | "excel" | "pdf") => {
    const dataToExport =
      selectedSections.length > 0
        ? sortedSections.filter((section) => selectedSections.includes(section.id))
        : sortedSections

    console.log(`Exporting ${dataToExport.length} sections as ${format}`)

    if (format === "csv") {
      const csvContent = [
        [
          "Title",
          "Description",
          "Course",
          "Status",
          "Sort Order",
          "Lessons Count",
          "Created Date",
        ].join(","),
        ...dataToExport.map((section) =>
          [
            section.title,
            section.description,
            section.course_title || "Unknown Course",
            section.is_published ? "Published" : "Draft",
            section.sort_order,
            section.lesson_count || 0,
            section.created_at,
          ].join(",")
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sections-export-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
    }
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6 space-y-4">
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalSections}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Published</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.publishedSections}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Drafts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.draftSections}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Lessons</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalLessons}</div>
              </CardContent>
            </Card>
          </div>

          {/* Sections Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Sections</CardTitle>
                  <CardDescription>Manage course sections and modules</CardDescription>
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
                      <DropdownMenuItem onClick={() => exportSections("csv")}>
                        <FileText className="mr-2 h-4 w-4" />
                        Export CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Dialog
                    open={isAddSectionOpen}
                    onOpenChange={(open) => {
                      setIsAddSectionOpen(open)
                      if (!open) {
                        setEditingSection(null)
                        form.reset({
                          title: "",
                          description: "",
                          courseId: "",
                          sortOrder: "",
                          isPublished: true,
                        })
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={handleCreateSection}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                          <DialogHeader>
                            <DialogTitle>
                              {editingSection ? "Edit Section" : "Create New Section"}
                            </DialogTitle>
                            <DialogDescription>
                              {editingSection
                                ? "Update the section details below."
                                : "Add a new section to organize lessons within a course."}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <FormField
                              control={form.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Title *</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Section title" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Section description" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="courseId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Course *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select course" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {isLoadingCourses ? (
                                        <div className="flex items-center justify-center p-2">
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          Loading courses...
                                        </div>
                                      ) : courses.length === 0 ? (
                                        <div className="flex items-center justify-center p-2 text-muted-foreground">
                                          No courses available
                                        </div>
                                      ) : (
                                        courses.map((course) => (
                                          <SelectItem key={course.id} value={course.id}>
                                            {course.title}
                                          </SelectItem>
                                        ))
                                      )}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="sortOrder"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sort Order</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="1"
                                      {...field}
                                      value={field.value || ""}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="isPublished"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel>Published</FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                          <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  {editingSection ? "Updating..." : "Creating..."}
                                </>
                              ) : editingSection ? (
                                "Update Section"
                              ) : (
                                "Create Section"
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
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
                      placeholder="Search sections..."
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

                {selectedSections.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg">
                    <span className="text-sm text-muted-foreground">
                      {selectedSections.length} selected
                    </span>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Bulk Edit
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
                          checked={selectedSections.length === sortedSections.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="min-w-[250px]">Section</TableHead>
                      <TableHead className="min-w-[200px]">Course</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[100px]">Sort Order</TableHead>
                      <TableHead className="min-w-[100px]">Lessons</TableHead>
                      <TableHead className="text-right w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSections.map((section) => (
                      <TableRow key={section.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSections.includes(section.id)}
                            onCheckedChange={(checked) =>
                              handleSelectSection(section.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{section.title}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {section.description?.substring(0, 60)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {courses.find((c) => c.id === section.course_id)?.title ||
                              "Unknown Course"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={section.is_published ? "default" : "secondary"}
                            className="whitespace-nowrap"
                          >
                            {section.is_published ? "Published" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{section.sort_order}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span>{section.lesson_count || 0}</span>
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
                                View Lessons
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditSection(section)}>
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
