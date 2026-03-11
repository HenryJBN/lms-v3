"use client"

import { useQuery } from "@tanstack/react-query"
import { useParams, useSearchParams } from "next/navigation"
import { QuizBuilder } from "@/components/admin/quiz-builder"
import { quizService } from "@/lib/services/quiz"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LessonQuizPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const lessonId = params.lessonId as string
  const courseId = searchParams.get("courseId") || undefined

  const { data: quizzes, isLoading, error } = useQuery({
    queryKey: ["quizzes", lessonId],
    queryFn: () => quizService.getLessonQuizzes(lessonId),
    enabled: !!lessonId,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse text-lg font-medium">Initialising quiz workspace...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4">
        <Alert variant="destructive" className="rounded-2xl border-2 shadow-xl shadow-destructive/10">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">System Connection Interrupted</AlertTitle>
          <AlertDescription className="mt-2 opacity-90">
            We encountered a technical issue while retrieving the assessment data for this lesson. 
            This could be due to a network timeout or a temporary server error.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Current implementation assumes one quiz per lesson
  const initialQuiz = quizzes && quizzes.length > 0 ? quizzes[0] : null

  return (
    <div className="min-h-screen bg-background/30 backdrop-blur-sm">
      <QuizBuilder lessonId={lessonId} initialQuiz={initialQuiz} courseId={courseId} />
    </div>
  )
}
