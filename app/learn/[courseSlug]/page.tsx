"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ChevronLeft, ChevronRight, Lock, CheckCircle, Play, AlertCircle } from "lucide-react"
import VideoPlayer from "@/components/video-player"
import LessonQuiz from "@/components/lesson-quiz"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"
import { courseService, progressService } from "@/lib/services/courses"
import { formatDuration } from "@/lib/utils"

export default function CourseLessonPage({ params }: { params: { courseSlug: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseSlug = params.courseSlug
  const lessonParam = searchParams.get("lesson")
  const cohortId = searchParams.get("cohort")

  const [course, setCourse] = useState<any>(null)
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [userProgress, setUserProgress] = useState<any>(null)
  const [showQuiz, setShowQuiz] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        setLoading(true)

        // Fetch course lessons, lesson progress, and enrollment progress
        const [lessons, lessonProgress, enrollmentProgress] = await Promise.all([
          courseService.getCourseLessons(courseSlug),
          progressService.getCourseProgress(courseSlug, cohortId || undefined).catch(() => ({
            courseId: courseSlug,
            completedLessons: [],
            completedQuizzes: [],
          })),
          progressService.getEnrollmentProgress(courseSlug, cohortId || undefined).catch(() => ({
            progress_percentage: 0,
          })),
        ])


        if (!lessons || lessons.length === 0) {
          router.push("/learn")
          return
        }

        // Transform lessons to match expected format
        const transformedLessons = lessons.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description || lesson.content || "",
          videoUrl: lesson.video_url || "",
          duration: formatDuration(lesson.video_duration || 0),
          hasQuiz: lesson.has_quiz || false,
          prerequisites: lesson.prerequisites || [],
          quiz: lesson.quiz || null,
        }))

        // Create course object with enrollment progress
        const courseData = {
          id: courseSlug,
          title: lessons[0]?.course_title || "Course",
          lessons: transformedLessons,
          progressPercentage: enrollmentProgress.progress_percentage || 0,
        }

        setCourse(courseData)
        setUserProgress(lessonProgress)

        // If there's a lesson ID in the URL, set the current lesson
        if (lessonParam) {
          const lessonIndex = transformedLessons.findIndex(
            (lesson: any) => lesson.id === lessonParam
          )
          if (lessonIndex !== -1) {
            setCurrentLessonIndex(lessonIndex)
          }
        }

        setLoading(false)
      } catch (error) {
        console.error("Failed to load course data:", error)
        router.push("/learn")
      }
    }

    fetchCourseData()
  }, [courseSlug, lessonParam, router])

  // Early return for loading state
  if (loading || !course || !userProgress) {
    return <div className="flex items-center justify-center min-h-screen">Loading course...</div>
  }

  const currentLesson = course.lessons[currentLessonIndex]
  const nextLesson =
    currentLessonIndex < course.lessons.length - 1 ? course.lessons[currentLessonIndex + 1] : null
  const previousLesson = currentLessonIndex > 0 ? course.lessons[currentLessonIndex - 1] : null

  const isLessonCompleted = userProgress.completedLessons?.includes(currentLesson.id) || false


  const isQuizCompleted = currentLesson.hasQuiz
    ? userProgress.completedQuizzes?.includes(currentLesson.id) || false
    : true

  // Check if the current lesson is accessible (either no prerequisites or all prerequisites completed)
  const isLessonAccessible =
    !currentLesson.prerequisites ||
    currentLesson.prerequisites.every(
      (prereqId: string) => userProgress.completedLessons?.includes(prereqId) || false
    )

  const handleVideoComplete = async () => {
    setVideoCompleted(true)
    if (!isLessonCompleted) {
      try {
        await progressService.updateLessonProgress(currentLesson.id, { progress_percentage: 100 }, cohortId || undefined)
        // Update local lesson progress state
        setUserProgress((prev: any) => ({
          ...prev,
          completedLessons: [...prev.completedLessons, currentLesson.id],
        }))

        // Fetch updated enrollment progress to update course progress UI
        const updatedEnrollmentProgress = await progressService.getEnrollmentProgress(courseSlug, cohortId || undefined)
        setCourse((prevCourse: any) => ({
          ...prevCourse,
          progressPercentage: updatedEnrollmentProgress.progress_percentage || 0,
        }))
      } catch (error) {
        console.error("Failed to mark lesson as completed:", error)
      }
    }

    // If the lesson has a quiz, show it after video completion
    if (currentLesson.hasQuiz && !isQuizCompleted) {
      setShowQuiz(true)
    } else if (canNavigateToNext) {
      // Auto-play next lesson after 2 seconds if no quiz
      setTimeout(() => {
        navigateToLesson(currentLessonIndex + 1)
      }, 2000)
    }
  }

  const handleTimeUpdate = async (currentTime: number, progress: number) => {
    try {
      // Update backend with current viewing position
      await progressService.updateLessonProgress(currentLesson.id, {
        progress_percentage: Math.round(progress),
        last_position: Math.round(currentTime),
      }, cohortId || undefined)
    } catch (error) {
      // Silently fail progress updates to not disturb user experience
      console.warn("Failed to update viewing progress:", error)
    }
  }

  const handleQuizComplete = async (passed: boolean) => {
    if (passed) {
      try {
        // Submit quiz attempt (assuming quiz ID is available)
        if (currentLesson.quiz?.id) {
          await progressService.submitQuizAttempt(currentLesson.quiz.id, {})
        }
        // Update local progress state
        setUserProgress((prev: any) => ({
          ...prev,
          completedQuizzes: [...prev.completedQuizzes, currentLesson.id],
        }))
        setShowQuiz(false)

        // Auto-play next lesson after passing quiz
        if (canNavigateToNext) {
          navigateToLesson(currentLessonIndex + 1)
        }
      } catch (error) {
        console.error("Failed to mark quiz as completed:", error)
      }
    }
  }
  const navigateToLesson = (index: number) => {
    // Check if the lesson is accessible
    const targetLesson = course.lessons[index]
    const isAccessible =
      !targetLesson.prerequisites ||
      targetLesson.prerequisites.every(
        (prereqId: string) => userProgress.completedLessons?.includes(prereqId) || false
      )

    if (isAccessible) {
      setCurrentLessonIndex(index)
      setShowQuiz(false)
      setVideoCompleted(userProgress.completedLessons?.includes(targetLesson.id) || false)
      const url = `/learn/${courseSlug}?lesson=${targetLesson.id}${cohortId ? `&cohort=${cohortId}` : ""}`
      router.push(url)
    }
  }

  const canNavigateToNext =
    nextLesson &&
    (!nextLesson.prerequisites ||
      nextLesson.prerequisites.every(
        (prereqId: string) => userProgress.completedLessons?.includes(prereqId) || false
      ))

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <span>
              Lesson {currentLessonIndex + 1} of {course.lessons.length}
            </span>
            <Separator orientation="vertical" className="mx-2 h-4" />
            <span>{Math.round(course.progressPercentage)}% Complete</span>
          </div>
          <Progress value={course.progressPercentage} className="h-2 mt-2" />
        </div>

        <div className="grid gap-6 md:grid-cols-[3fr_1fr]">
          <div className="space-y-6">
            {!isLessonAccessible ? (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center text-destructive">
                    <Lock className="mr-2 h-5 w-5" />
                    Lesson Locked
                  </CardTitle>
                  <CardDescription>
                    You need to complete the prerequisite lessons before accessing this content.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h3 className="font-medium">Required Prerequisites:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {currentLesson.prerequisites?.map((prereqId: string) => {
                        const prereq = course.lessons.find((l: any) => l.id === prereqId)
                        return (
                          <li key={prereqId} className="text-sm">
                            {prereq?.title}
                            {userProgress.completedLessons?.includes(prereqId) ? (
                              <CheckCircle className="inline ml-2 h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="inline ml-2 h-4 w-4 text-amber-500" />
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ) : showQuiz ? (
              <LessonQuiz quiz={currentLesson.quiz} onComplete={handleQuizComplete} />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{currentLesson.title}</CardTitle>
                    <CardDescription>{currentLesson.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VideoPlayer
                      videoUrl={currentLesson.videoUrl}
                      onComplete={handleVideoComplete}
                      onTimeUpdate={handleTimeUpdate}
                      isCompleted={isLessonCompleted}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => navigateToLesson(currentLessonIndex - 1)}
                      disabled={currentLessonIndex === 0}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous Lesson
                    </Button>

                    <Button
                      onClick={() => navigateToLesson(currentLessonIndex + 1)}
                      disabled={
                        !canNavigateToNext ||
                        (currentLesson.hasQuiz && !isQuizCompleted) ||
                        !videoCompleted
                      }
                    >
                      Next Lesson
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>

                {currentLesson.hasQuiz && !isQuizCompleted && videoCompleted && (
                  <Card className="border-red">
                    <CardHeader>
                      <CardTitle>Quiz Available</CardTitle>
                      <CardDescription>
                        You've completed the video lesson. Take the quiz to test your knowledge.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button onClick={() => setShowQuiz(true)}>Start Quiz</Button>
                    </CardFooter>
                  </Card>
                )}
              </>
            )}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {course.lessons.map((lesson: any, index: number) => {
                    const isCompleted = userProgress.completedLessons?.includes(lesson.id) || false
                    const hasCompletedQuiz = lesson.hasQuiz
                      ? userProgress.completedQuizzes?.includes(lesson.id) || false
                      : true
                    const isAccessible =
                      !lesson.prerequisites ||
                      lesson.prerequisites.every(
                        (prereqId: string) =>
                          userProgress.completedLessons?.includes(prereqId) || false
                      )

                    return (
                      <div
                        key={lesson.id}
                        className={`p-2 rounded-md flex items-center cursor-pointer ${
                          currentLessonIndex === index ? "bg-muted" : ""
                        } ${!isAccessible ? "opacity-60" : ""}`}
                        onClick={() => isAccessible && navigateToLesson(index)}
                      >
                        <div className="mr-2 flex-shrink-0">
                          {isCompleted && hasCompletedQuiz ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : !isAccessible ? (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Play className="h-5 w-5 text-red" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lesson.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {lesson.duration} {lesson.hasQuiz && "• Includes Quiz"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
