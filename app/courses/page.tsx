"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { Search, Star, Clock, Users, BookOpen, Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/contexts/auth-context"

import { courseService, type CourseReponse, type CourseFilters } from "@/lib/services/courses"
import { enrollmentsService } from "@/lib/services/enrollments"
import { useDebounce } from "@/hooks/use-debounce"
import { categoryService, type Category } from "@/lib/services/categories"
import { isGlobalDomain, buildTenantUrl } from "@/lib/utils/domain"

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all-categories")
  const [selectedLevel, setSelectedLevel] = useState<string>("all-levels")
  const [isGlobal, setIsGlobal] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const debouncedSearch = useDebounce(searchQuery, 400)
  const queryClient = useQueryClient()

  // Detect if we're on global domain (not a subdomain)
  useEffect(() => {
    setIsMounted(true)
    setIsGlobal(isGlobalDomain())
  }, [])

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", isGlobal],
    queryFn: () => categoryService.getAllCategories(),
  })

  // Fetch courses with filters - uses global endpoint if on global domain
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses", debouncedSearch, selectedCategory, selectedLevel, isGlobal],
    queryFn: async () => {
      const filters: CourseFilters = {}
      if (debouncedSearch) filters.search = debouncedSearch
      if (selectedCategory !== "all-categories") filters.category_id = selectedCategory
      if (selectedLevel !== "all-levels")
        filters.level = selectedLevel as "beginner" | "intermediate" | "advanced"
      
      let response
      if (isGlobal) {
        response = await courseService.getGlobalCourses(filters)
      } else {
        response = await courseService.getCourses(filters)
      }
      return (response.items || []).filter((c): c is CourseReponse => c !== null)
    },
    enabled: isMounted,
  })

  // Fetch user enrollments
  const { data: enrolledCourseIds = new Set<string>() } = useQuery({
    queryKey: ["enrollments"],
    queryFn: async () => {
      const enrollments = await enrollmentsService.getUserEnrollments()
      return new Set(enrollments.map((e) => String(e.course_id)))
    },
    enabled: isAuthenticated && !isGlobal, // Don't fetch enrollments in global view since users can't enroll directly
  })

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => enrollmentsService.enrollInCourse(courseId),
    onSuccess: () => {
      toast({ title: "Enrollment Successful", description: "You have been enrolled in the course!" })
      queryClient.invalidateQueries({ queryKey: ["enrollments"] })
      queryClient.invalidateQueries({ queryKey: ["courses"] })
    },
    onError: (err: any) => {
      toast({ title: "Enrollment Failed", description: err.message || "Failed to enroll.", variant: "destructive" })
    },
  })

  // Get tenant signup URL for enrollment redirect in global view
  const getTenantSignupUrl = (course: CourseReponse) => {
    if (!course.tenant_domain) return "/signup"
    return buildTenantUrl(course.tenant_domain, "/signup")
  }

  const handleEnroll = (course: CourseReponse) => {
    // In global view, redirect to tenant's signup portal
    if (isGlobal && course.tenant_domain) {
      const signupUrl = getTenantSignupUrl(course)
      window.location.href = signupUrl
      return
    }
    
    // In tenant view, enroll directly
    if (!isAuthenticated) {
      toast({ title: "Authentication Required", description: "Please sign in to enroll.", variant: "destructive" })
      return
    }
    enrollMutation.mutate(String(course.id))
  }

  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`
    }
    return `${hours}h`
  }

  const isCourseEnrolled = (course: CourseReponse) => {
    return course.is_enrolled || enrolledCourseIds.has(String(course.id))
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Explore Courses</h1>
        <p className="text-muted-foreground">
          Discover our comprehensive catalog of blockchain, AI, and technology courses
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-categories">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedLevel} onValueChange={setSelectedLevel}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-levels">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video relative overflow-hidden">
                <img
                  src={course.thumbnail_url || "/placeholder.svg"}
                  alt={course.title}
                  className="object-cover w-full h-full"
                />
                <Badge
                  className="absolute top-2 left-2"
                  variant={
                    course.level === "beginner"
                      ? "secondary"
                      : course.level === "intermediate"
                        ? "default"
                        : "destructive"
                  }
                >
                  {course.level}
                </Badge>
              </div>

              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  {/* Show tenant badge in global view */}
                  {isGlobal && course.tenant_name && (
                    <Badge variant="default" className="bg-primary/90 shrink-0 text-xs flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {course.tenant_name}
                    </Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2">
                  {course.short_description}
                </CardDescription>
                <div className="flex items-center text-sm text-muted-foreground">
                  <span>{course.instructor_name}</span>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(course.duration_hours)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {course.total_students}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {(course.rating ?? 0).toFixed(1)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {course.price > 0 ? (
                      <span className="text-lg font-bold">${course.price}</span>
                    ) : (
                      <span className="text-lg font-bold text-green-600">Free</span>
                    )}
                  </div>
                  <Badge variant="outline">+{course.token_reward} L-Tokens</Badge>
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button asChild variant="outline" className="flex-1 bg-transparent">
                  <Link href={`/courses/${course.slug}`}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>

                {isCourseEnrolled(course) ? (
                  <Button asChild className="flex-1">
                    <Link href={`/learn/${course.slug}`}>Continue Learning</Link>
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleEnroll(course)}
                    disabled={enrollMutation.isPending}
                    className="flex-1"
                  >
                    {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && courses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No courses found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search criteria or browse all courses.
          </p>
        </div>
      )}
    </div>
  )
}
