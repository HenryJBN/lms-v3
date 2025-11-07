import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gem } from "lucide-react"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"

export default function FilmmakingCoursesPage() {
  // Mock data for filmmaking courses
  const courses = [
    {
      id: "filmmaking-fundamentals",
      title: "Filmmaking Fundamentals",
      description: "Learn the basics of storytelling, cinematography, and film production",
      image: "/images/courses/filmmaking-fundamentals.png",
      level: "Beginner",
      price: "Free",
      tokenReward: 30,
      featured: true,
    },
    {
      id: "advanced-cinematography",
      title: "Advanced Cinematography",
      description: "Master camera techniques, lighting, and visual composition",
      image: "/images/courses/advanced-cinematography.png",
      level: "Intermediate",
      price: "$69.99",
      tokenReward: 70,
      featured: false,
    },
    {
      id: "video-editing-premiere",
      title: "Video Editing with Premiere Pro",
      description: "Professional video editing and post-production workflows",
      image: "/images/courses/video-editing-premiere.png",
      level: "Intermediate",
      price: "$59.99",
      tokenReward: 60,
      featured: false,
    },
    {
      id: "documentary-filmmaking",
      title: "Documentary Filmmaking",
      description: "Create compelling non-fiction films and documentaries",
      image: "/images/courses/documentary-filmmaking.png",
      level: "Advanced",
      price: "$79.99",
      tokenReward: 75,
      featured: false,
    },
    {
      id: "screenwriting-essentials",
      title: "Screenwriting Essentials",
      description: "Write compelling scripts for film and television",
      image: "/images/courses/screenwriting-essentials.png",
      level: "Beginner",
      price: "$49.99",
      tokenReward: 45,
      featured: true,
    },
    {
      id: "film-production-management",
      title: "Film Production Management",
      description: "Manage film projects from pre-production to distribution",
      image: "/images/courses/film-production-management.png",
      level: "Intermediate",
      price: "$69.99",
      tokenReward: 65,
      featured: false,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Filmmaking Courses
                </h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Master the art of filmmaking with our comprehensive courses covering storytelling,
                  cinematography, and post-production.
                </p>
              </div>
            </div>

            <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  image={course.image}
                  level={course.level}
                  price={course.price}
                  tokenReward={course.tokenReward}
                  featured={course.featured}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Learning Path Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Filmmaker Path</h2>
                <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Follow our structured learning path to become a professional filmmaker.
                </p>
              </div>
            </div>

            <div className="mx-auto max-w-3xl mt-12 relative pl-8 before:absolute before:left-3 before:top-0 before:h-full before:w-0.5 before:bg-muted">
              <div className="mb-12 relative">
                <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-red text-red-foreground">
                  1
                </div>
                <h3 className="text-xl font-bold mb-2">Filmmaking Fundamentals</h3>
                <p className="text-muted-foreground mb-4">
                  Start with the basics of storytelling, cinematography, and film production.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/filmmaking-fundamentals">
                    <Button variant="outline" size="sm">
                      View Course
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mb-12 relative">
                <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-red text-red-foreground">
                  2
                </div>
                <h3 className="text-xl font-bold mb-2">Screenwriting Essentials</h3>
                <p className="text-muted-foreground mb-4">
                  Learn to write compelling scripts that engage audiences.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/screenwriting-essentials">
                    <Button variant="outline" size="sm">
                      View Course
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mb-12 relative">
                <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-red text-red-foreground">
                  3
                </div>
                <h3 className="text-xl font-bold mb-2">Advanced Cinematography</h3>
                <p className="text-muted-foreground mb-4">
                  Master camera techniques, lighting, and visual composition.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/advanced-cinematography">
                    <Button variant="outline" size="sm">
                      View Course
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-red text-red-foreground">
                  4
                </div>
                <h3 className="text-xl font-bold mb-2">Video Editing & Post-Production</h3>
                <p className="text-muted-foreground mb-4">
                  Learn professional editing techniques and post-production workflows.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/video-editing-premiere">
                    <Button variant="outline" size="sm">
                      View Course
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-12">
              <Link href="/learning-paths">
                <Button>View All Learning Paths</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
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
