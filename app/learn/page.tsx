import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, Code, Database } from "lucide-react"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"

export default function CoursesPage() {
  // In a real app, this would be fetched from an API
  const courses = [
    {
      id: "web-development",
      title: "Web Development Fundamentals",
      description: "Learn the basics of web development with HTML, CSS, and JavaScript",
      lessons: 5,
      duration: "2 hours",
      icon: Code,
      level: "Beginner",
    },
    {
      id: "data-science",
      title: "Introduction to Data Science",
      description: "Learn the fundamentals of data science and analysis",
      lessons: 2,
      duration: "50 minutes",
      icon: Database,
      level: "Beginner",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 container py-12">
        <div className="flex flex-col items-center text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Available Courses
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
            Explore our courses with video lessons, quizzes, and interactive content. Track your
            progress and earn certificates as you learn.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-md bg-primary/10">
                    <course.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{course.level}</span>
                </div>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <GraduationCap className="mr-1 h-4 w-4 text-muted-foreground" />
                    <span>{course.lessons} lessons</span>
                  </div>
                  <span>{course.duration}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/learn/${course.id}`} className="w-full">
                  <Button className="w-full">Start Learning</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
