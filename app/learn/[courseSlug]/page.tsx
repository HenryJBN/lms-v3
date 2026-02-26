"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
import { ChevronLeft, ChevronRight, Lock, CheckCircle, Play, AlertCircle, Trophy, Award, Gem } from "lucide-react"
import VideoPlayer from "@/components/video-player"
import LessonQuiz from "@/components/lesson-quiz"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"
import Link from "next/link"
import { courseService, progressService } from "@/lib/services/courses"
import { formatDuration } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

const PLAYBACK_RATE_STORAGE_KEY = "lms-playback-rate"

// Default token reward for lesson completion (should match backend settings)
const LESSON_TOKEN_REWARD = 10
const QUIZ_TOKEN_REWARD = 15

export default function CourseLessonPage({ params }: { params: { courseSlug: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseSlug = params.courseSlug
  const lessonParam = searchParams.get("lesson")
  const cohortId = searchParams.get("cohort")

  const queryClient = useQueryClient()
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0)
  const [showQuiz, setShowQuiz] = useState(false)
  const [videoCompleted, setVideoCompleted] = useState(false)
  const [autoPlayNext, setAutoPlayNext] = useState(false)
  const [savedPlaybackRate, setSavedPlaybackRate] = useState(1)
  const prevLessonCompletedRef = useRef(false)
  const [justEarnedTokens, setJustEarnedTokens] = useState<{ amount: number; type: string } | null>(null)

  // 1. Fetch Course Lessons
  const { data: rawLessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ["course", courseSlug, "lessons"],
    queryFn: ({ signal }) => courseService.getCourseLessons(courseSlug, signal),
  })

  // 2. Fetch User Progress (completed lessons/quizzes)
  const { data: userProgress, isLoading: progressLoading } = useQuery({
    queryKey: ["course", courseSlug, "progress", cohortId],
    queryFn: ({ signal }) => progressService.getCourseProgress(courseSlug, cohortId || undefined, signal),
  })

  // 3. Fetch Enrollment Progress (percentage)
  const { data: enrollmentProgress, isLoading: enrollmentLoading } = useQuery({
    queryKey: ["course", courseSlug, "enrollment", cohortId],
    queryFn: ({ signal }) => progressService.getEnrollmentProgress(courseSlug, cohortId || undefined, signal),
  })

  // 4. Combined Course Data
  const course = useMemo(() => {
    if (!rawLessons.length) return null

    const transformedLessons = rawLessons.map((lesson: any) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description || lesson.content || "",
      videoUrl: lesson.video_url || "",
      duration: formatDuration(lesson.estimated_duration || lesson.video_duration || 0),
      hasQuiz: lesson.has_quiz || false,
      prerequisites: lesson.prerequisites || [],
      quiz: lesson.quiz || null,
    }))

    return {
      id: courseSlug,
      title: rawLessons[0]?.course_title || "Course",
      lessons: transformedLessons,
      progressPercentage: enrollmentProgress?.progress_percentage || 0,
    }
  }, [rawLessons, enrollmentProgress, courseSlug])

  const loading = lessonsLoading || progressLoading || enrollmentLoading

  // Load saved playback rate from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRate = localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY)
      if (storedRate) {
        setSavedPlaybackRate(parseFloat(storedRate))
      }
    }
  }, [])

  // Show reward toast when tokens are earned
  useEffect(() => {
    if (justEarnedTokens) {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <Gem className="h-5 w-5 text-amber-500" />
            <span>+{justEarnedTokens.amount} Tokens Earned!</span>
          </div>
        ),
        description: justEarnedTokens.type === 'lesson' 
          ? `You earned ${justEarnedTokens.amount} tokens for completing the lesson.`
          : `You earned ${justEarnedTokens.amount} tokens for passing the quiz!`,
        duration: 5000,
        className: "border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800",
      })
      setJustEarnedTokens(null)
    }
  }, [justEarnedTokens])

  // Track when previous lesson was completed to trigger autoplay
  useEffect(() => {
    if (lessonParam && userProgress && course) {
      const currentLesson = course.lessons.find((l: any) => l.id === lessonParam)
      if (currentLesson) {
        const isCompleted = userProgress.completedLessons?.includes(currentLesson.id) || false
        
        // If lesson was already completed before this page load, trigger autoplay
        if (isCompleted && !prevLessonCompletedRef.current) {
          setAutoPlayNext(true)
        }
        
        // Update ref for next comparison
        prevLessonCompletedRef.current = isCompleted
      }
    }
  }, [lessonParam, userProgress, course])

  // Reset autoplay after it's been used
  useEffect(() => {
    if (autoPlayNext) {
      const timer = setTimeout(() => {
        setAutoPlayNext(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [autoPlayNext])

  // Define navigateToLesson function first to avoid reference errors
  const navigateToLesson = (index: number) => {
    if (!course || !userProgress) return

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

  // Handle target lesson index when lessonParam changes or rawLessons load
  useEffect(() => {
    if (!course || !userProgress) return

    // If lessonParam is provided, navigate to that specific lesson
    if (lessonParam) {
      const targetIndex = course.lessons.findIndex((l: any) => l.id === lessonParam)
      if (targetIndex !== -1 && targetIndex !== currentLessonIndex) {
        setCurrentLessonIndex(targetIndex)
        setShowQuiz(false)
        setVideoCompleted(userProgress.completedLessons?.includes(course.lessons[targetIndex].id) || false)
      }
    } else {
      // No lessonParam - find the first lesson that hasn't been completed (not_started)
      const completedLessons = userProgress.completedLessons || []
      const firstIncompleteIndex = course.lessons.findIndex(
        (lesson: any) => !completedLessons.includes(lesson.id)
      )
      
      // If there's an incomplete lesson, navigate to it; otherwise go to first lesson
      const targetIndex = firstIncompleteIndex !== -1 ? firstIncompleteIndex : 0
      
      if (targetIndex !== currentLessonIndex) {
        setCurrentLessonIndex(targetIndex)
        setShowQuiz(false)
        setVideoCompleted(completedLessons.includes(course.lessons[targetIndex].id) || false)
        
        // Update URL to reflect the current lesson
        const targetLesson = course.lessons[targetIndex]
        const url = `/learn/${courseSlug}?lesson=${targetLesson.id}${cohortId ? `&cohort=${cohortId}` : ""}`
        router.replace(url)
      }
    }
  }, [lessonParam, course, userProgress, currentLessonIndex, cohortId, courseSlug, router])

  // Initial redirect if no lessons or invalid slug (handled by query success/error later if needed)
  useEffect(() => {
    if (!lessonsLoading && rawLessons.length === 0) {
      router.push("/learn")
    }
  }, [lessonsLoading, rawLessons, router])


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
    
    // Track if this is a NEW completion (not previously completed)
    const isNewCompletion = !isLessonCompleted

    // Always check if we need to mark the lesson as completed
    if (!isLessonCompleted) {
      try {
        await progressService.updateLessonProgress(currentLesson.id, { progress_percentage: 100 }, cohortId || undefined)
        
        // Show reward notification for NEW completions
        if (isNewCompletion) {
          setJustEarnedTokens({ amount: LESSON_TOKEN_REWARD, type: 'lesson' })
        }
        
        // Sync progress and enrollment data
        queryClient.invalidateQueries({ queryKey: ["course", courseSlug, "progress"] })
        queryClient.invalidateQueries({ queryKey: ["course", courseSlug, "enrollment"] })
      } catch (error) {
        console.error("Failed to mark lesson as completed:", error)
      }
    }

    // Auto-navigate logic - this should work for both new and already-completed lessons
    if (currentLesson.hasQuiz && !isQuizCompleted) {
      setShowQuiz(true)
    } else if (nextLesson) {
      // Check if next lesson is accessible with current progress
      const currentCompleted = userProgress.completedLessons || []
      const canGoNext = !nextLesson.prerequisites ||
        nextLesson.prerequisites.every(
          (prereqId: string) => currentCompleted.includes(prereqId) || prereqId === currentLesson.id
        )
      
      if (canGoNext) {
        setTimeout(() => {
          const url = `/learn/${courseSlug}?lesson=${nextLesson.id}${cohortId ? `&cohort=${cohortId}` : ""}`
          router.push(url)
        }, 2000)
      }
    }
  }

  const handleQuizComplete = async (passed: boolean) => {
    if (passed) {
      const isNewQuizCompletion = !isQuizCompleted
      
      try {
        // Submit quiz attempt (assuming quiz ID is available)
        if (currentLesson.quiz?.id) {
          await progressService.submitQuizAttempt(currentLesson.quiz.id, {})
        }

        // Re-call progress update to sync completion status now that quiz is passed
        await progressService.updateLessonProgress(currentLesson.id, { progress_percentage: 100 }, cohortId || undefined)

        // Show reward notification for NEW quiz completions
        if (isNewQuizCompletion) {
          setJustEarnedTokens({ amount: QUIZ_TOKEN_REWARD, type: 'quiz' })
        }

        // Sync progress and enrollment data
        queryClient.invalidateQueries({ queryKey: ["course", courseSlug, "progress"] })
        queryClient.invalidateQueries({ queryKey: ["course", courseSlug, "enrollment"] })

        setShowQuiz(false)

        // Auto-play next lesson after passing quiz
        if (nextLesson) {
          const currentCompleted = userProgress.completedLessons || []
          const canGoNext = !nextLesson.prerequisites ||
            nextLesson.prerequisites.every(
              (prereqId: string) => currentCompleted.includes(prereqId) || prereqId === currentLesson.id
            )

          if (canGoNext) {
            setTimeout(() => {
              const url = `/learn/${courseSlug}?lesson=${nextLesson.id}${cohortId ? `&cohort=${cohortId}` : ""}`
              router.push(url)
            }, 1500)
          }
        }
      } catch (error) {
        console.error("Failed to mark quiz as completed:", error)
      }
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

        {/* Course Completion Banner */}
        {course.progressPercentage >= 100 && (
          <div className="mb-6 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Trophy className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">🎉 Course Completed!</h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Congratulations! You've completed all lessons in this course.
                </p>
                <div className="flex gap-3 mt-3">
                  <Link href="/certificates">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <Award className="mr-2 h-4 w-4" />
                      View Certificates
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900">
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

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
                      key={currentLesson.id}
                      videoUrl={currentLesson.videoUrl}
                      onComplete={handleVideoComplete}
                      isCompleted={isLessonCompleted}
                      initialPlaybackRate={savedPlaybackRate}
                      autoPlay={autoPlayNext}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => navigateToLesson(currentLessonIndex - 1)}
                      disabled={!previousLesson}
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous Lesson
                    </Button>

                    <Button
                      onClick={() => navigateToLesson(currentLessonIndex + 1)}
                      disabled={!nextLesson}
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
