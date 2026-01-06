"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import AdaptiveLearningEngine from "@/components/adaptive-learning-engine"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrainCircuit, ChevronLeft, ChevronRight, Gem, Play, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export default function LessonPage() {
  const params = useParams()
  const lessonId = params.lessonId as string

  const [lesson, setLesson] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log("LessonPage mounted with params:", params)
    console.log("lessonId from useParams:", lessonId)

    const fetchLesson = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log("About to fetch lesson data for:", lessonId)

        // Fetch lesson data using the lessonId from URL params
        const lessonData = await apiClient.get(`/api/lessons/${lessonId}`)
        console.log("Lesson Data received:", lessonData)
        setLesson(lessonData)
      } catch (err: any) {
        console.error("Failed to fetch lesson:", err)
        setError(err.message || "Failed to load lesson")
      } finally {
        setLoading(false)
      }
    }

    if (lessonId) {
      console.log("Calling fetchLesson")
      fetchLesson()
    } else {
      console.log("No lessonId provided")
      setLoading(false)
    }
  }, [lessonId])

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Lesson Not Found</h2>
          <p className="text-muted-foreground">
            {error || "The requested lesson could not be loaded."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <span>{lesson.course || "Course"}</span>
        <ChevronRight className="h-4 w-4" />
        <span>{lesson.section_title || "Section"}</span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
          <Gem className="h-4 w-4" />
          <span>+5 tokens on completion</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
            {lesson.video_url ? (
              <video
                src={lesson.video_url}
                poster="/placeholder.svg"
                className="w-full h-full object-cover"
                controls
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No video available</p>
                </div>
              </div>
            )}
          </div>

          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Lesson Content</TabsTrigger>
              <TabsTrigger value="transcript">Video Transcript</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="mt-6">
              {lesson.content ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: lesson.content }}
                />
              ) : (
                <div className="text-muted-foreground italic">
                  No content available for this lesson.
                </div>
              )}
            </TabsContent>
            <TabsContent value="transcript" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground italic">
                    Video transcript not available for this lesson.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="resources" className="mt-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground italic">
                    No additional resources available for this lesson.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-4">
            <div></div> {/* Placeholder for previous lesson */}
            <div></div> {/* Placeholder for next lesson */}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BrainCircuit className="mr-2 h-5 w-5 text-primary" />
                Lesson Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Type</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {lesson.type || "Unknown"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Status</h4>
                  <p className="text-sm text-muted-foreground capitalize">
                    {lesson.status || "Unknown"}
                  </p>
                </div>
                {lesson.views !== undefined && (
                  <div>
                    <h4 className="text-sm font-medium">Views</h4>
                    <p className="text-sm text-muted-foreground">{lesson.views.toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium">Duration</h4>
                  <p className="text-sm text-muted-foreground">
                    {lesson.duration || "Not specified"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
