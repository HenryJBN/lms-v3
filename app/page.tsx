"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, BookOpen, Award, Users, TrendingUp, Star, Play } from "lucide-react"
import HeroCarousel from "@/components/hero-carousel"
import { courseService } from "@/lib/services/courses"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function HomePage() {
  const { toast } = useToast()
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([])

  useEffect(() => {
    loadFeaturedCourses()
  }, [])

  const loadFeaturedCourses = async () => {
    try {
      const loadedFeaturedCourses = await courseService.getFeaturedCourses()
      setFeaturedCourses(loadedFeaturedCourses.items)
      console.log("Featured courses", loadedFeaturedCourses.items)
    } catch (err) {
      console.error("❌ Failed to load data", err)
      toast({
        title: "Course Loading Error",
        description: "Failed to load featured courses.",
        variant: "destructive",
      })
    }
  }

  const stats = [
    { label: "Active Students", value: "50,000+", icon: Users },
    { label: "Courses Available", value: "500+", icon: BookOpen },
    { label: "Certificates Issued", value: "25,000+", icon: Award },
    { label: "Success Rate", value: "94%", icon: TrendingUp },
  ]

  const testimonials = [
    {
      name: "Alex Johnson",
      role: "Blockchain Developer",
      image: "/images/testimonials/alex-johnson.png",
      content:
        "DCA's blockchain courses transformed my career. The hands-on approach and real-world projects gave me the confidence to transition into Web3 development.",
      rating: 5,
    },
    {
      name: "Maria Rodriguez",
      role: "AI Researcher",
      image: "/images/testimonials/maria-rodriguez.png",
      content:
        "The AI curriculum is comprehensive and up-to-date. I particularly loved the practical machine learning projects and the supportive community.",
      rating: 5,
    },
    {
      name: "David Kim",
      role: "Full-Stack Developer",
      image: "/images/testimonials/david-kim.png",
      content:
        "Learning web development through DCA was an amazing experience. The instructors are industry experts and the content is always current.",
      rating: 5,
    },
  ]

  const features = [
    {
      title: "Blockchain-Powered Certificates",
      description: "Earn verifiable NFT certificates stored on the blockchain",
      icon: Award,
    },
    {
      title: "Token Rewards System",
      description: "Get L-Tokens for completing courses and achieving milestones",
      icon: TrendingUp,
    },
    {
      title: "Interactive Learning",
      description: "Hands-on projects, quizzes, and real-world applications",
      icon: Play,
    },
    {
      title: "Expert Instructors",
      description: "Learn from industry professionals and thought leaders",
      icon: Users,
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <Toaster />

      {/* Hero Section */}
      <section className="relative">
        <HeroCarousel />
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <stat.icon className="h-8 w-8 mx-auto mb-4 text-primary" />
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Featured Courses</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover our most popular courses designed by industry experts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {featuredCourses.map((course) => (
              <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative">
                  <img
                    src={course.image || "/placeholder.svg"}
                    alt={course.title}
                    className="object-cover w-full h-full"
                  />
                  <Badge className="absolute top-4 left-4" variant="secondary">
                    {course.level}
                  </Badge>
                </div>
                <CardHeader>
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>{course.instructor}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                        {course.rating}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {course.students?.toLocaleString?.() ?? 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl font-bold">${course.price}</div>
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 border-yellow-200"
                    >
                      +{course.tokens} L-Tokens
                    </Badge>
                  </div>

                  <div className="flex space-x-2">
                    <Button asChild variant="outline" className="flex-1 bg-transparent">
                      <Link href={`/courses/${course.slug}`}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link href={`/courses/${course.id}`}>Enroll Now</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button asChild size="lg">
              <Link href="/courses">
                View All Courses
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose DCA LMS?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of education with blockchain-powered learning
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <feature.icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Our Students Say</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of successful learners who transformed their careers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <img
                      src={testimonial.image || "/placeholder.svg"}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                      <CardDescription>{testimonial.role}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{testimonial.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join our community of learners and start earning blockchain certificates today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
            >
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
