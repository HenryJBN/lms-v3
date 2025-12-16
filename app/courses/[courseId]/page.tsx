"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  Gem,
  Play,
  User,
  ChevronDown,
  ChevronUp,
  Lock,
  CreditCard,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import AIChatAssistant from "@/components/ai-chat-assistant"
import { courseService, type Course } from "@/lib/services/courses" // 👈 import your service

type Lesson = {
  id: string
  title: string
  duration: string
  completed: boolean
}

type Module = {
  id: string
  title: string
  duration: string
  completed: boolean
  lessons: Lesson[]
}

export default function CoursePage() {
  const params = useParams()
  const courseId = params?.courseId as string

  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true)
        const response = await courseService.getCourse(courseId)
        console.log(`One course Data ${response}`)

        setCourse(response)
        // if (response?.modules?.length > 0) {
        //   setExpandedModules({ [response.modules[0].id]: true });
        // }
      } catch (err: any) {
        console.error(err)
        setError("Failed to load course information.")
      } finally {
        setLoading(false)
      }
    }
    if (courseId) fetchCourse()
  }, [courseId])

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }))
  }

  const handlePurchaseCourse = () => {
    alert("Redirecting to payment gateway...")
  }

  if (loading)
    return (
      <div className="container py-10 text-center text-muted-foreground">
        Loading course information...
      </div>
    )

  if (error) return <div className="container py-10 text-center text-red-500">{error}</div>

  if (!course)
    return (
      <div className="container py-10 text-center text-muted-foreground">Course not found.</div>
    )

  const canAccessCourse = course.is_free

  return (
    <div className="container py-6">
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Banner / Hero Section */}
          <div className="relative rounded-lg overflow-hidden">
            <img
              src={course.thumbnail_url || "/placeholder.svg"}
              alt={course.title}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              {canAccessCourse ? (
                <Link href={`/learn/${course.id}`}>
                  <Button size="lg" className="rounded-full" variant="default">
                    <Play className="mr-2 h-4 w-4" />
                    Continue Learning
                  </Button>
                </Link>
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-white font-medium bg-black/50 px-4 py-2 rounded-md">
                    Purchase this course to start learning
                  </p>
                  <Button
                    size="lg"
                    className="rounded-full"
                    variant="default"
                    onClick={handlePurchaseCourse}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Purchase for {course.price}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Course Info */}
          <div>
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold">{course.title}</h1>
              {!course.is_free && (
                <div className="bg-red/10 text-red px-3 py-1 rounded-full font-medium">
                  {course.price}
                </div>
              )}
            </div>
            <p className="text-muted-foreground mt-2">{course.description}</p>

            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{course.instructor_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{course.duration_hours}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{course.total_students} students</span>
              </div>
              {course.is_free && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                  <span>Free Course</span>
                </div>
              )}
            </div>

            {/* Progress */}
            {/* <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Course Progress</span>
                <span className="text-sm font-medium">{course?.progress}%</span>
              </div>
              <Progress value={course?.progress} className="h-2" />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">
                  Tokens Earned: {course?.earnedTokens}/{course?.totalTokens}
                </span>
                <div className="flex items-center gap-1">
                  <Gem className="h-3 w-3 text-red" />
                  <span className="text-xs font-medium">
                    {course?.earnedTokens} tokens
                  </span>
                </div>
              </div>
            </div> */}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="modules">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="modules">Course Modules</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>

            {/* Modules */}
            <TabsContent value="modules" className="space-y-4 mt-6">
              {!canAccessCourse && (
                <Card className="border-red mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-red/10 p-2 rounded-full">
                        <Lock className="h-5 w-5 text-red" />
                      </div>
                      <div>
                        <h3 className="font-medium">This course requires purchase</h3>
                        <p className="text-sm text-muted-foreground">
                          Purchase this course to access all modules and lessons
                        </p>
                      </div>
                      <Button className="ml-auto" onClick={handlePurchaseCourse}>
                        Purchase for {course.price}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* 
              {course.modules.map((module, index) => (
                <Collapsible
                  key={module.id}
                  open={expandedModules[module.id]}
                  onOpenChange={() => toggleModule(module.id)}
                  className={`border rounded-lg overflow-hidden ${
                    module.completed ? "border-green-200" : ""
                  }`}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex justify-between items-center p-4 hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-start">
                        <div className="mr-2">
                          {module.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30"></div>
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="font-medium">
                            Module {index + 1}: {module.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {module.duration} • {module.lessons.length} lessons
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {!canAccessCourse && (
                          <Lock className="h-4 w-4 text-muted-foreground mr-2" />
                        )}
                        {expandedModules[module.id] ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 py-2 bg-muted/20">
                      <ul className="space-y-1">
                        {module.lessons.map((lesson) => (
                          <li
                            key={lesson.id}
                            className="text-sm flex justify-between items-center py-2 border-b last:border-0"
                          >
                            <div className="flex items-center">
                              {lesson.completed ? (
                                <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                              ) : (
                                <div className="h-3 w-3 border rounded-full mr-2"></div>
                              )}
                              <span
                                className={
                                  lesson.completed
                                    ? "text-muted-foreground"
                                    : ""
                                }
                              >
                                {lesson.title}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs text-muted-foreground mr-2">
                                {lesson.duration}
                              </span>
                              {!canAccessCourse && (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {canAccessCourse && (
                      <div className="p-4 border-t flex justify-end">
                        {module.completed ? (
                          <Button variant="outline" size="sm">
                            Review Module
                          </Button>
                        ) : (
                          <Button size="sm">
                            {index === 2 ? "Continue Module" : "Start Module"}
                          </Button>
                        )}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))} */}
            </TabsContent>

            {/* Resources Tab */}
            <TabsContent value="resources">
              <div className="grid gap-4 md:grid-cols-2 mt-6">
                {/* Reuse your static content for now */}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {!canAccessCourse && !course.is_free && (
            <Card className="border-red">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5 text-red" />
                  Purchase This Course
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Course Price</span>
                  <span className="font-bold text-lg">{course.price}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Access to all modules</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <Button className="w-full" onClick={handlePurchaseCourse}>
                  Purchase Now
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Gem className="mr-2 h-5 w-5 text-red" />
                Rewards & Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>{/* Keep existing layout */}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Learning Assistant</CardTitle>
              <CardDescription>Ask questions about this course</CardDescription>
            </CardHeader>
            <CardContent>
              <AIChatAssistant />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
