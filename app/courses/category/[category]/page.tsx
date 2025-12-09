import { CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gem, Loader2 } from "lucide-react"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"
import { categoryService, type Category } from "@/lib/services/categories"
import { courseService, type CourseReponse } from "@/lib/services/courses"

interface CategoryPageProps {
  params: {
    category: string
  }
}

export default function CategoryCoursesPage({ params }: CategoryPageProps) {
  const [category, setCategory] = useState<Category | null>(null)
  const [categoryCourses, setCategoryCourses] = useState<CourseReponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadCategoryData()
  }, [params.category])

  const loadCategoryData = async () => {
    try {
      setLoading(true)
      setError("")

      // Try to get category by slug first, then by id
      let categoryData = await categoryService.getCategoryBySlug(params.category)
      if (!categoryData) {
        categoryData = await categoryService.getCategoryById(params.category)
      }

      if (!categoryData) {
        setError("Category not found")
        return
      }

      setCategory(categoryData)

      // Load courses for this category
      // Note: This assumes the backend has an endpoint to get courses by category
      // For now, we'll filter courses by category_id
      const allCourses = await courseService.getCourses()
      const filteredCourses = allCourses.items.filter(
        (course: CourseReponse) => course.category_id === categoryData.id
      )
      setCategoryCourses(filteredCourses)
    } catch (err: any) {
      console.error("Error loading category:", err)
      setError(err.message || "Failed to load category")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (error || !category) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
            <p className="text-muted-foreground mb-4">
              {error || "The category you're looking for doesn't exist."}
            </p>
            <Link href="/courses">
              <Button>Browse All Courses</Button>
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  {category.icon && <span className="mr-2">{category.icon}</span>}
                  {category.name} Courses
                </h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {category.description ||
                    `Explore our comprehensive ${category.name.toLowerCase()} courses.`}
                </p>
              </div>
            </div>

            <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {categoryCourses.length > 0 ? (
                categoryCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    id={String(course.id)}
                    title={course.title}
                    description={course.short_description || course.description || ""}
                    image={course.thumbnail_url || "/placeholder.svg"}
                    level={course.level || "Beginner"}
                    price={course.price > 0 ? `$${course.price}` : "Free"}
                    tokenReward={course.token_reward || 0}
                    featured={false}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">
                    No courses available in this category yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

// Course Card Component
function CourseCard({
  id,
  title,
  description,
  image,
  level,
  price,
  tokenReward,
  featured,
}: {
  id: string
  title: string
  description: string
  image: string
  level: string
  price: string
  tokenReward: number
  featured?: boolean
}) {
  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-md ${
        featured ? "border-primary/50" : ""
      }`}
    >
      <div className="relative">
        <img src={image || "/placeholder.svg"} alt={title} className="h-40 w-full object-cover" />
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
            {level}
          </Badge>
        </div>
        {featured && (
          <div className="absolute top-2 left-2">
            <Badge variant="default">Featured</Badge>
          </div>
        )}
      </div>
      <CardHeader className="p-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-1 text-sm">
          <Gem className="h-4 w-4 text-primary" />
          <span>Earn {tokenReward} L-Tokens</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center p-4 pt-0 border-t mt-2">
        <div className="font-medium">{price}</div>
        <Link href={`/courses/${id}`}>
          <Button size="sm">Enroll Now</Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
