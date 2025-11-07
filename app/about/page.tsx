import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GraduationCap, Users, Award, BrainCircuit, Shield, Globe, BookOpen } from "lucide-react"
import Link from "next/link"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_500px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Revolutionizing Education Through Technology
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    DCA LMS is on a mission to transform learning with blockchain verification and
                    AI-powered adaptive education.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/courses">
                    <Button size="lg">Explore Our Courses</Button>
                  </Link>
                  <Link href="/contact">
                    <Button size="lg" variant="outline">
                      Contact Us
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-full aspect-video overflow-hidden rounded-xl border bg-background shadow-xl">
                  <img
                    src="/placeholder.svg?height=500&width=800"
                    alt="DCA Team"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Our Story
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Founded in 2022, DCA LMS was born from a vision to make education more accessible,
                  verifiable, and personalized.
                </p>
              </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-8 py-8 md:py-12">
              <p className="text-muted-foreground">
                DCA LMS was founded by a team of educators, technologists, and blockchain
                enthusiasts who saw the potential to transform education through emerging
                technologies. We recognized two major problems in online education: the lack of
                verifiable credentials and the one-size-fits-all approach to learning.
              </p>

              <p className="text-muted-foreground">
                Our solution combines blockchain technology for secure, tamper-proof certification
                with artificial intelligence for adaptive learning experiences. By leveraging these
                technologies, we've created a platform that not only verifies achievements but also
                personalizes the learning journey for each student.
              </p>

              <p className="text-muted-foreground">
                Today, DCA LMS serves thousands of learners worldwide, offering courses in
                blockchain, artificial intelligence, web development, and business. Our platform
                continues to evolve, with a focus on creating the most effective and engaging
                learning experience possible.
              </p>

              <div className="flex justify-center">
                <Link href="/careers">
                  <Button>Join Our Team</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Our Values
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  The principles that guide everything we do at DCA LMS.
                </p>
              </div>
            </div>

            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-3">
              <Card className="flex flex-col items-center text-center p-6">
                <BookOpen className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Accessible Education</h3>
                <CardContent className="p-0">
                  <p className="text-muted-foreground">
                    We believe quality education should be accessible to everyone, regardless of
                    location or background.
                  </p>
                </CardContent>
              </Card>

              <Card className="flex flex-col items-center text-center p-6">
                <BrainCircuit className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Personalized Learning</h3>
                <CardContent className="p-0">
                  <p className="text-muted-foreground">
                    We're committed to creating adaptive learning experiences that meet each student
                    where they are.
                  </p>
                </CardContent>
              </Card>

              <Card className="flex flex-col items-center text-center p-6">
                <Shield className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Verified Achievement</h3>
                <CardContent className="p-0">
                  <p className="text-muted-foreground">
                    We ensure that accomplishments are securely verified and recognized through
                    blockchain technology.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Our Leadership Team
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Meet the passionate individuals driving our mission forward.
                </p>
              </div>
            </div>

            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 py-12 md:grid-cols-2 lg:grid-cols-3">
              {/* Team Member 1 */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative h-40 w-40 overflow-hidden rounded-full">
                  <img
                    src="/placeholder.svg?height=160&width=160"
                    alt="Sarah Chen"
                    className="object-cover"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold">Sarah Chen</h3>
                  <p className="text-muted-foreground">CEO & Co-Founder</p>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Former EdTech executive with 15+ years experience in digital learning platforms.
                </p>
              </div>

              {/* Team Member 2 */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative h-40 w-40 overflow-hidden rounded-full">
                  <img
                    src="/placeholder.svg?height=160&width=160"
                    alt="Marcus Johnson"
                    className="object-cover"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold">Marcus Johnson</h3>
                  <p className="text-muted-foreground">CTO & Co-Founder</p>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Blockchain developer and AI researcher with multiple patents in educational
                  technology.
                </p>
              </div>

              {/* Team Member 3 */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative h-40 w-40 overflow-hidden rounded-full">
                  <img
                    src="/placeholder.svg?height=160&width=160"
                    alt="Elena Rodriguez"
                    className="object-cover"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold">Elena Rodriguez</h3>
                  <p className="text-muted-foreground">Chief Learning Officer</p>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  PhD in Educational Psychology with expertise in adaptive learning systems.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-red text-red-foreground">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <Users className="h-10 w-10" />
                <div className="text-4xl font-bold">10,000+</div>
                <div className="text-sm font-medium">Active Learners</div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <GraduationCap className="h-10 w-10" />
                <div className="text-4xl font-bold">200+</div>
                <div className="text-sm font-medium">Courses</div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <Award className="h-10 w-10" />
                <div className="text-4xl font-bold">5,000+</div>
                <div className="text-sm font-medium">Certificates Issued</div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-2 text-center">
                <Globe className="h-10 w-10" />
                <div className="text-4xl font-bold">50+</div>
                <div className="text-sm font-medium">Countries</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
