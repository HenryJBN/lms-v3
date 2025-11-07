"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

interface LessonQuizProps {
  quiz: {
    title: string
    description: string
    questions: QuizQuestion[]
    passingScore: number
  }
  onComplete: (passed: boolean) => void
}

export default function LessonQuiz({ quiz, onComplete }: LessonQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(
    Array(quiz.questions.length).fill(-1)
  )
  const [showResults, setShowResults] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const currentQuestion = quiz.questions[currentQuestionIndex]

  const handleAnswerSelect = (answerIndex: number) => {
    if (submitted) return

    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIndex] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSubmitted(false)
    } else {
      setShowResults(true)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setSubmitted(false)
    }
  }

  const handleSubmit = () => {
    setSubmitted(true)
  }

  const calculateScore = () => {
    let correctAnswers = 0

    quiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correctAnswers++
      }
    })

    return {
      score: correctAnswers,
      total: quiz.questions.length,
      percentage: Math.round((correctAnswers / quiz.questions.length) * 100),
    }
  }

  const handleFinish = () => {
    const { percentage } = calculateScore()
    const passed = percentage >= quiz.passingScore
    onComplete(passed)
  }

  if (showResults) {
    const { score, total, percentage } = calculateScore()
    const passed = percentage >= quiz.passingScore

    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
          <CardDescription>
            You scored {score} out of {total} questions ({percentage}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6">
            {passed ? (
              <>
                <div className="rounded-full bg-green-100 p-3 mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-600 mb-2">Congratulations!</h3>
                <p className="text-center text-muted-foreground">
                  You've passed the quiz and can now proceed to the next lesson.
                </p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-amber-100 p-3 mb-4">
                  <AlertTriangle className="h-12 w-12 text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-amber-600 mb-2">Almost there!</h3>
                <p className="text-center text-muted-foreground">
                  You need {quiz.passingScore}% to pass. Review the material and try again.
                </p>
              </>
            )}
          </div>

          <div className="space-y-4 mt-6">
            <h4 className="font-medium">Question Review:</h4>
            {quiz.questions.map((question, index) => (
              <div key={question.id} className="border rounded-md p-3">
                <div className="flex items-start">
                  {selectedAnswers[index] === question.correctAnswer ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">{question.question}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your answer:{" "}
                      {selectedAnswers[index] >= 0
                        ? question.options[selectedAnswers[index]]
                        : "Not answered"}
                    </p>
                    {selectedAnswers[index] !== question.correctAnswer && (
                      <p className="text-sm text-green-600 mt-1">
                        Correct answer: {question.options[question.correctAnswer]}
                      </p>
                    )}
                    {question.explanation && (
                      <p className="text-sm bg-muted p-2 rounded-md mt-2">{question.explanation}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleFinish} className="w-full">
            {passed ? "Continue to Next Lesson" : "Try Again"}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{quiz.title}</CardTitle>
        <CardDescription>{quiz.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between text-sm">
          <span>
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </span>
          <span>Passing score: {quiz.passingScore}%</span>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{currentQuestion.question}</h3>

          <RadioGroup
            value={
              selectedAnswers[currentQuestionIndex] >= 0
                ? selectedAnswers[currentQuestionIndex].toString()
                : undefined
            }
            onValueChange={(value) => handleAnswerSelect(Number.parseInt(value))}
            className="space-y-3"
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-start space-x-2">
                <RadioGroupItem
                  value={index.toString()}
                  id={`option-${index}`}
                  disabled={submitted}
                />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {submitted && (
            <div
              className={`p-3 rounded-md ${
                selectedAnswers[currentQuestionIndex] === currentQuestion.correctAnswer
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {selectedAnswers[currentQuestionIndex] === currentQuestion.correctAnswer ? (
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Correct!</p>
                    {currentQuestion.explanation && (
                      <p className="text-sm mt-1">{currentQuestion.explanation}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start">
                  <XCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Incorrect</p>
                    <p className="text-sm mt-1">
                      The correct answer is:{" "}
                      {currentQuestion.options[currentQuestion.correctAnswer]}
                    </p>
                    {currentQuestion.explanation && (
                      <p className="text-sm mt-1">{currentQuestion.explanation}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <div className="space-x-2">
          {!submitted ? (
            <Button onClick={handleSubmit} disabled={selectedAnswers[currentQuestionIndex] === -1}>
              Check Answer
            </Button>
          ) : (
            <Button onClick={handleNextQuestion}>
              {currentQuestionIndex < quiz.questions.length - 1 ? "Next Question" : "View Results"}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
