"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowRight, BookOpen, Award, Users, TrendingUp, Star, Play, Globe, CheckCircle2, ChevronRight, Zap } from "lucide-react"
import { courseService, type CourseReponse } from "@/lib/services/courses"
import { apiClient } from "@/lib/api-client"
import { API_ENDPOINTS } from "@/lib/api-config"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion"
import { useRef } from "react"

function AnimatedCounter({ from = 0, to, duration = 2 }: { from?: number, to: number, duration?: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const inView = useInView(nodeRef, { once: true, margin: "-50px" })
  const motionValue = useMotionValue(from)
  const rounded = useTransform(motionValue, (latest) => Math.round(latest).toLocaleString())

  useEffect(() => {
    if (inView) {
      animate(motionValue, to, { duration })
    }
  }, [inView, to, motionValue, duration])

  return <motion.span ref={nodeRef}>{rounded}</motion.span>
}

export default function HomePage() {
  const { toast } = useToast()
  const [isGlobal, setIsGlobal] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "dcalms.test"

  useEffect(() => {
    setIsMounted(true)
    const hostname = window.location.hostname
    // Determine if we are on the global domain or a tenant subdomain
    if (
      hostname === baseDomain || 
      hostname === "localhost" || 
      hostname === "127.0.0.1" || 
      hostname === `www.${baseDomain}`
    ) {
      setIsGlobal(true)
    } else {
      setIsGlobal(false)
    }
  }, [baseDomain])

  const { data: featuredCourses = [], isLoading } = useQuery({
    queryKey: ["featuredCourses", isGlobal],
    queryFn: async () => {
      if (!isMounted) return []
      try {
          if (isGlobal) {
            return await courseService.getGlobalFeaturedCourses()
          } else {
            const res = await courseService.getFeaturedCourses()
            // @ts-ignore
            return res.items || res || []
          }
      } catch (err) {
          console.error(err)
          return []
      }
    },
    enabled: isMounted,
  })

  // Fetch dynamic stats for global homepage
  const { data: globalStats } = useQuery({
    queryKey: ["globalStats", isGlobal],
    queryFn: async () => {
      if (!isMounted || !isGlobal) return null
      try {
        const res = await apiClient.get<any>(API_ENDPOINTS.siteGlobalStats)
        return res
      } catch (err) {
        console.error(err)
        return null
      }
    },
    enabled: isMounted && isGlobal,
  })

  // Dynamic Routing Logic for courses
  const getCourseUrl = (course: CourseReponse) => {
    if (isGlobal && course.tenant_domain) {
      const protocol = window.location.protocol
      const isLocalhost = window.location.hostname === "localhost"
      const port = window.location.port ? `:${window.location.port}` : ""
      const domain = isLocalhost ? `localhost${port}` : baseDomain
      return `${protocol}//${course.tenant_domain}.${domain}/courses/${course.slug || course.id}`
    }
    return `/courses/${course.slug || course.id}`
  }

  const stats = [
    { 
      label: "Active Students", 
      value: isGlobal && globalStats ? globalStats.total_students : 50000, 
      suffix: "+",
      icon: Users 
    },
    { 
      label: "Courses Available", 
      value: isGlobal && globalStats ? globalStats.total_courses : 500, 
      suffix: "+",
      icon: BookOpen 
    },
    { 
      label: isGlobal ? "Partner Academies" : "Certificates Issued", 
      value: isGlobal && globalStats ? globalStats.total_schools : 25000, 
      suffix: "+",
      icon: Award 
    },
    { 
      label: isGlobal ? "Total Enrollments" : "Success Rate", 
      value: isGlobal && globalStats ? globalStats.total_enrollments : 94, 
      suffix: isGlobal ? "+" : "%",
      icon: TrendingUp 
    },
  ]

  const testimonials = [
    {
      name: "Alex Johnson",
      role: "Blockchain Developer",
      image: "/images/testimonials/alex-johnson.png",
      content:
        "The blockchain courses transformed my career. The hands-on approach and real-world projects gave me the confidence to transition into Web3 development.",
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
        "Learning web development through this platform was an amazing experience. The instructors are industry experts and the content is always current.",
      rating: 5,
    },
  ]

  const features = [
    {
      title: "Blockchain-Powered Certificates",
      description: "Earn verifiable NFT certificates stored directly on the blockchain.",
      icon: Award,
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      title: "Token Rewards System",
      description: "Get L-Tokens for completing courses and achieving milestones.",
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    },
    {
      title: "Interactive Learning",
      description: "Hands-on projects, quizzes, and real-world applicable skills.",
      icon: Play,
      color: "text-green-500",
      bg: "bg-green-500/10"
    },
    {
      title: "Expert Instructors",
      description: "Learn from industry professionals and verified thought leaders.",
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
  ]

  const renderCourseSkeleton = () => (
    <Card className="overflow-hidden border-border/40 bg-card/40 backdrop-blur-sm">
      <Skeleton className="h-48 w-full rounded-none" />
      <CardHeader className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-6 w-1/4 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-x-hidden selection:bg-primary/30">
      <Toaster />

      {/* Modern Premium Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Animated Background Gradients & Video */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Free Tech Network Background Video */}
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover opacity-60 dark:opacity-40"
          >
            <source src="https://static.vecteezy.com/system/resources/previews/039/848/974/mp4/african-american-woman-student-sitting-on-the-floor-use-a-tablet-in-the-university-new-modern-fully-functional-education-facility-concept-of-online-education-free-video.mp4" type="video/mp4" />
          </video>
          
          {/* Dimming overlay on top of video, below orbs */}
          <div className="absolute inset-0 bg-background/80 dark:bg-background/80" />
          
          {/* Glowing orbs on top of the dimmed video */}
          <div className="absolute -top-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary/40 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/30 blur-[100px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 py-1.5 px-4 backdrop-blur-md bg-background/50 border-primary/30 text-primary animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Zap className="w-4 h-4 mr-2 fill-primary" />
              <span>Next-Generation Learning Experience</span>
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
              Master the Future of <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-purple-600">
                Web3 & Technology
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              {isGlobal 
                ? "Explore top-tier courses across multiple academies. Earn blockchain certificates and token rewards as you learn."
                : "Transform your career with our specialized, hands-on curriculum taught by industry experts."}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500">
              <Button asChild size="lg" className="rounded-full px-8 h-14 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <Link href="/courses">
                  Explore Courses
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 h-14 text-base font-medium border-border/50 bg-background/50 backdrop-blur-sm hover:bg-muted transition-all duration-300">
                <Link href="/signup">
                  Start Learning Free
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Stats Section */}
      <section className="py-16 relative border-y border-border/40 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm border border-primary/20">
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="text-3xl md:text-4xl font-bold mb-2 tracking-tight flex justify-center">
                  <AnimatedCounter to={stat.value} duration={2.5} />
                  <span className="text-primary ml-1">{stat.suffix}</span>
                </div>
                <div className="text-sm md:text-base text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Featured Courses Showcase */}
      <section className="py-24 relative">
        {/* Subtle background element */}
        <div className="absolute top-1/2 left-0 w-1/3 h-1/2 bg-primary/5 blur-[150px] -z-10 rounded-full" />
        
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-1 bg-primary rounded-full"></div>
                <h2 className="text-primary font-semibold uppercase tracking-wider text-sm">Top Rated</h2>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                {isGlobal ? "Featured Global Courses" : "Featured Courses"}
              </h2>
              <p className="text-lg text-muted-foreground">
                {isGlobal 
                  ? "Discover exceptional programs hand-picked from across our academy network."
                  : "Start your journey with our most popular and highly-rated programs."}
              </p>
            </div>
            
            <Button asChild variant="ghost" className="hidden md:flex group hover:bg-transparent hover:text-primary">
              <Link href="/courses">
                View All Courses 
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading || !isMounted ? (
              // Enhanced Skeleton Loaders
              Array.from({ length: 3 }).map((_, i) => <div key={i}>{renderCourseSkeleton()}</div>)
            ) : featuredCourses.length > 0 ? (
              featuredCourses.map((course: CourseReponse) => (
                <Card 
                  key={course.id} 
                  className="group overflow-hidden border-border/40 bg-card/40 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 flex flex-col h-full"
                >
                  <div className="aspect-[16/9] relative overflow-hidden">
                    <img
                      src={course.thumbnail_url || "/placeholder.svg"}
                      alt={course.title}
                      className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                    
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <Badge className="bg-background/90 text-foreground backdrop-blur px-3 py-1 font-medium border-none shadow-sm">
                        {course.level || "Beginner"}
                      </Badge>
                      
                      {/* Global Tenant Badge Indicator */}
                      {isGlobal && course.tenant_name && (
                        <Badge variant="default" className="bg-primary/90 hover:bg-primary text-primary-foreground backdrop-blur px-3 py-1 font-medium border-none shadow-sm flex items-center gap-1.5 shadow-primary/20">
                          <Globe className="w-3 h-3" />
                          {course.tenant_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <CardHeader className="pb-3 flex-none">
                    <CardTitle className="text-xl line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {course.title}
                    </CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mt-2 font-medium">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center mr-2 text-xs text-foreground">
                        {course.instructor_first_name?.[0] || 'I'}
                      </span>
                      {course.instructor_name}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-4 flex-grow flex flex-col justify-end">
                    <CardDescription className="line-clamp-2 mb-6">
                      {course.description || course.short_description || "Explore this course to master new skills."}
                    </CardDescription>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center space-x-4 text-sm font-medium">
                        <div className="flex items-center text-yellow-500">
                          <Star className="h-4 w-4 fill-current mr-1" />
                          <span className="text-foreground">{course.rating || "5.0"}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Users className="h-4 w-4 mr-1.5" />
                          {course.total_students?.toLocaleString?.() ?? 0}
                        </div>
                      </div>
                      
                      <div className="text-xl font-bold font-mono">
                        {course.is_free || course.price === 0 ? "Free" : `$${course.price}`}
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-0 flex-none gap-3">
                    <Button asChild className="w-full font-medium" variant={isGlobal ? "default" : "secondary"}>
                      <Link href={getCourseUrl(course)}>
                        View Details
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No featured courses currently available.</p>
              </div>
            )}
          </div>
          
          <div className="mt-10 text-center md:hidden">
            <Button asChild variant="outline" className="w-full">
              <Link href="/courses">View All Courses</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Showcase - Glassmorphism */}
      <section className="py-24 relative overflow-hidden bg-muted/10">
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent -z-10" />
        
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Why Choose DCA LMS?</h2>
            <p className="text-lg text-muted-foreground">
              Experience the future of education with a platform built to reward your progress and certify your skills on the blockchain.
            </p>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              visible: { transition: { staggerChildren: 0.15 } }
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, scale: 0.95, y: 30 },
                  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
                }}
              >
                <Card className="h-full border-none bg-background/60 backdrop-blur-xl shadow-xl shadow-black/5 hover:-translate-y-2 transition-transform duration-500">
                  <CardHeader>
                    <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                      <feature.icon className={`h-7 w-7 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl leading-tight">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials - Rich Masonry / Grid */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
             <div className="inline-flex items-center justify-center p-1.5 mb-4 rounded-full bg-primary/10 text-primary uppercase text-xs font-bold tracking-widest px-4">
               Community Feedback
             </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">What Our Students Say</h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of successful learners who transformed their careers.
            </p>
          </div>

          <div 
            className="relative overflow-hidden py-4 -mx-4 md:mx-0" 
            style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
          >
            <div 
              className="flex w-max gap-8 hover:[animation-play-state:paused]"
              style={{ animation: 'testimonialMarquee 35s linear infinite' }}
            >
              {[...testimonials, ...testimonials].map((testimonial, index) => (
                <div key={index} className="w-[320px] md:w-[400px]">
                  <Card className="h-full border-border/50 hover:border-primary/50 transition-colors bg-card/40 hover:shadow-lg hover:-translate-y-1 duration-300">
                    <CardHeader className="flex flex-row items-center gap-4 pb-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-background ring-2 ring-primary/20">
                        <img
                          src={testimonial.image || "/placeholder.svg"}
                          alt={testimonial.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=random`
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                        <CardDescription className="opacity-80">{testimonial.role}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center mb-4">
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <p className="text-muted-foreground leading-relaxed italic">"{testimonial.content}"</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes testimonialMarquee {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}} />
        </div>
      </section>

      {/* Premium Gradient CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-600 to-purple-700 mx-4 md:mx-8 rounded-3xl shadow-2xl flex items-center justify-center text-white">
          <div className="absolute inset-0 opacity-20 bg-[url('/noise.png')] mix-blend-overlay"></div>
          
          <div className="container mx-auto px-6 relative z-10 text-center py-20">
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 drop-shadow-sm">
              Ready to Accelerate Your Career?
            </h2>
            <p className="text-xl md:text-2xl mb-10 opacity-90 max-w-2xl mx-auto font-medium">
              Join our dynamic community of learners and start earning verifiable blockchain certificates today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary" className="hover:scale-105 transition-transform h-14 px-8 text-base font-bold shadow-xl text-primary">
                <Link href="/signup">
                  Start For Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="hover:scale-105 transition-transform h-14 px-8 text-base font-bold bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white backdrop-blur"
              >
                <Link href="/courses">Browse Catalog</Link>
              </Button>
            </div>
            
            <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6 text-sm font-medium opacity-80">
              <div className="flex items-center"><CheckCircle2 className="w-5 h-5 mr-2" /> No credit card required</div>
              <div className="flex items-center"><CheckCircle2 className="w-5 h-5 mr-2" /> Cancel anytime</div>
              <div className="flex items-center"><CheckCircle2 className="w-5 h-5 mr-2" /> Earn while you learn</div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Bottom padding to prevent footer clipping */}
      <div className="h-12 border-t border-transparent"></div>
    </div>
  )
}
