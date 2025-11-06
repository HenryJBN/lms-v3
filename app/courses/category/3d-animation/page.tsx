import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gem } from "lucide-react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

export default function ThreeDAnimationCoursesPage() {
  // Mock data for 3D animation courses
  const courses = [
    {
      id: "3d-animation-basics",
      title: "3D Animation Fundamentals",
      description:
        "Introduction to 3D modeling, rigging, and animation principles",
      image: "/images/courses/3d-animation-basics.png",
      level: "Beginner",
      price: "Free",
      tokenReward: 35,
      featured: true,
    },
    {
      id: "blender-mastery",
      title: "Blender Mastery",
      description: "Complete guide to 3D creation with Blender",
      image: "/images/courses/blender-mastery.png",
      level: "Intermediate",
      price: "$79.99",
      tokenReward: 80,
      featured: false,
    },
    {
      id: "character-animation",
      title: "Character Animation",
      description:
        "Bring characters to life with advanced animation techniques",
      image: "/images/courses/character-animation.png",
      level: "Advanced",
      price: "$99.99",
      tokenReward: 95,
      featured: false,
    },
    {
      id: "vfx-compositing",
      title: "VFX & Compositing",
      description: "Create stunning visual effects and composite shots",
      image: "/images/courses/vfx-compositing.png",
      level: "Advanced",
      price: "$89.99",
      tokenReward: 85,
      featured: true,
    },
    {
      id: "3d-modeling-fundamentals",
      title: "3D Modeling Fundamentals",
      description: "Master the art of creating 3D models and environments",
      image: "/images/courses/3d-modeling-fundamentals.png",
      level: "Beginner",
      price: "$49.99",
      tokenReward: 50,
      featured: false,
    },
    {
      id: "motion-graphics",
      title: "Motion Graphics Design",
      description: "Create dynamic graphics and animations for media",
      image: "/images/courses/motion-graphics.png",
      level: "Intermediate",
      price: "$69.99",
      tokenReward: 70,
      featured: false,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  3D Animation Courses
                </h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Master 3D animation, modeling, and visual effects with our
                  comprehensive courses covering industry-standard tools and
                  techniques.
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
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  3D Artist Path
                </h2>
                <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Follow our structured learning path to become a professional
                  3D artist and animator.
                </p>
              </div>
            </div>

            <div className="mx-auto max-w-3xl mt-12 relative pl-8 before:absolute before:left-3 before:top-0 before:h-full before:w-0.5 before:bg-muted">
              <div className="mb-12 relative">
                <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-red text-red-foreground">
                  1
                </div>
                <h3 className="text-xl font-bold mb-2">
                  3D Animation Fundamentals
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start with the basics of 3D modeling, rigging, and animation
                  principles.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/3d-animation-basics">
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
                <h3 className="text-xl font-bold mb-2">
                  3D Modeling Fundamentals
                </h3>
                <p className="text-muted-foreground mb-4">
                  Learn to create detailed 3D models and environments.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/3d-modeling-fundamentals">
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
                <h3 className="text-xl font-bold mb-2">Blender Mastery</h3>
                <p className="text-muted-foreground mb-4">
                  Master the complete 3D creation pipeline with Blender.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/blender-mastery">
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
                <h3 className="text-xl font-bold mb-2">
                  Character Animation & VFX
                </h3>
                <p className="text-muted-foreground mb-4">
                  Bring characters to life and create stunning visual effects.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/character-animation">
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
  );
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
  id: string;
  title: string;
  description: string;
  image: string;
  level: string;
  price: string;
  tokenReward: number;
  featured?: boolean;
}) {
  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-md ${
        featured ? "border-primary/50" : ""
      }`}
    >
      <div className="relative">
        <img
          src={image || "/placeholder.svg"}
          alt={title}
          className="h-40 w-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <Badge
            variant="secondary"
            className="bg-background/80 backdrop-blur-sm"
          >
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
  );
}
