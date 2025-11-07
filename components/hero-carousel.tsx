"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Play, ArrowRight, BookOpen, Award, Users } from "lucide-react"
import Link from "next/link"

const slides = [
  {
    id: 1,
    title: "Master Blockchain Technology",
    subtitle: "Build the Future with Web3",
    description:
      "Learn blockchain development, smart contracts, and DeFi applications from industry experts. Earn L-Tokens and NFT certificates as you progress.",
    image: "/images/hero-blockchain.png",
    cta: {
      primary: { text: "Start Learning", href: "/courses/category/blockchain" },
      secondary: { text: "Watch Demo", href: "#demo" },
    },
    stats: [
      { label: "Students", value: "15K+" },
      { label: "Courses", value: "50+" },
      { label: "Success Rate", value: "94%" },
    ],
    badge: "Most Popular",
  },
  {
    id: 2,
    title: "AI & Machine Learning Mastery",
    subtitle: "Shape Tomorrow with AI",
    description:
      "Dive deep into artificial intelligence, machine learning, and neural networks. Build real-world AI applications and advance your career in tech.",
    image: "/images/hero-ai.png",
    cta: {
      primary: { text: "Explore AI Courses", href: "/courses/category/ai" },
      secondary: { text: "Free Preview", href: "#preview" },
    },
    stats: [
      { label: "AI Projects", value: "200+" },
      { label: "Lab Hours", value: "500+" },
      { label: "Job Placement", value: "89%" },
    ],
    badge: "Trending",
  },
  {
    id: 3,
    title: "Creative Filmmaking",
    subtitle: "Tell Stories That Matter",
    description:
      "Master the art of filmmaking from pre-production to post. Learn cinematography, editing, and storytelling techniques from award-winning filmmakers.",
    image: "/images/hero-filmmaking.png",
    cta: {
      primary: { text: "Start Creating", href: "/courses/category/filmmaking" },
      secondary: { text: "View Portfolio", href: "#portfolio" },
    },
    stats: [
      { label: "Films Created", value: "1K+" },
      { label: "Awards Won", value: "50+" },
      { label: "Industry Mentors", value: "25+" },
    ],
    badge: "Creative",
  },
  {
    id: 4,
    title: "3D Animation & VFX",
    subtitle: "Bring Imagination to Life",
    description:
      "Create stunning 3D animations and visual effects. Master industry-standard tools like Blender, Maya, and After Effects with hands-on projects.",
    image: "/images/hero-3d-animation.png",
    cta: {
      primary: { text: "Start Animating", href: "/courses/category/3d-animation" },
      secondary: { text: "See Showcase", href: "#showcase" },
    },
    stats: [
      { label: "Animations", value: "800+" },
      { label: "Studio Partners", value: "15+" },
      { label: "Render Hours", value: "10K+" },
    ],
    badge: "New",
  },
]

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    setIsAutoPlaying(false)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    setIsAutoPlaying(false)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
  }

  const currentSlideData = slides[currentSlide]

  return (
    <div className="relative h-[600px] md:h-[700px] overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={currentSlideData.image || "/placeholder.svg"}
          alt={currentSlideData.title}
          className="w-full h-full object-cover transition-all duration-1000 ease-in-out"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
          {/* Text Content */}
          <div className="text-white space-y-6">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {currentSlideData.badge}
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {currentSlideData.title}
              </h1>
              <h2 className="text-xl md:text-2xl text-white/90 font-medium">
                {currentSlideData.subtitle}
              </h2>
              <p className="text-lg text-white/80 max-w-lg leading-relaxed">
                {currentSlideData.description}
              </p>
            </div>

            {/* Stats */}
            <div className="flex space-x-8">
              {currentSlideData.stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-white/70">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                <Link href={currentSlideData.cta.primary.href}>
                  <BookOpen className="mr-2 h-5 w-5" />
                  {currentSlideData.cta.primary.text}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white hover:text-primary"
              >
                <Link href={currentSlideData.cta.secondary.href}>
                  <Play className="mr-2 h-5 w-5" />
                  {currentSlideData.cta.secondary.text}
                </Link>
              </Button>
            </div>
          </div>

          {/* Visual Elements */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative">
              <div className="w-80 h-80 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <div className="w-60 h-60 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Award className="h-16 w-16 mx-auto text-white" />
                    <div className="text-white">
                      <div className="text-2xl font-bold">NFT Certificates</div>
                      <div className="text-sm text-white/70">Blockchain Verified</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white/20 backdrop-blur-sm rounded-lg p-3 border border-white/30">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all duration-200"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all duration-200"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentSlide ? "bg-white scale-110" : "bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
        <div
          className="h-full bg-white transition-all duration-300 ease-linear"
          style={{
            width: `${((currentSlide + 1) / slides.length) * 100}%`,
          }}
        />
      </div>
    </div>
  )
}
