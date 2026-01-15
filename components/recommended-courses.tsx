import React, { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Gem } from "lucide-react"
import Link from "next/link"
import { apiClient } from "@/lib/api-client"
import { API_ENDPOINTS } from "@/lib/api-config"

interface RecommendedCourse {
  id: string
  title: string
  short_description: string
  level: string
  token_reward: number
  thumbnail_url: string
  slug: string
}

export default function RecommendedCourses() {
  const [recommendations, setRecommendations] = useState<RecommendedCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRecommendations()
  }, [])

  const fetchRecommendations = async () => {
    try {
      setIsLoading(true)
      // Try to get featured courses first
      const featured = await apiClient.get<RecommendedCourse[]>(`${API_ENDPOINTS.courses}/featured/`)
      
      if (featured && featured.length > 0) {
        setRecommendations(featured.slice(0, 3))
      } else {
        // Fallback to latest courses
        const coursesRes = await apiClient.get<{ items: RecommendedCourse[] }>(API_ENDPOINTS.courses)
        const items = coursesRes?.items || []
        setRecommendations(items.slice(0, 3))
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground">No recommendations available.</p>
  }

  return (
    <div className="space-y-3">
      {recommendations.map((course) => (
        <Link key={course.id} href={`/courses/${course.slug}`}>
          <Card className="overflow-hidden hover:bg-muted/50 transition-colors">
            <CardContent className="p-0">
              <div className="flex">
                <img
                  src={course.thumbnail_url || "/placeholder.svg"}
                  alt={course.title}
                  className="h-20 w-20 object-cover sm:w-24 md:w-32"
                />
                <div className="flex flex-1 flex-col justify-between p-3">
                  <div>
                    <h3 className="font-medium text-sm line-clamp-1">{course.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{course.short_description}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                      {course.level}
                    </span>
                    <div className="flex items-center gap-1">
                      <Gem className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium">{course.token_reward || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
