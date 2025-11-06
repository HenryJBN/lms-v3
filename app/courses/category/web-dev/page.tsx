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

export default function WebDevCoursesPage() {
  // Mock data for web development courses
  const courses = [
    {
      id: "html-css-fundamentals",
      title: "HTML & CSS Fundamentals",
      description: "Master the building blocks of the web",
      image: "/images/courses/html-css-fundamentals.png",
      level: "Beginner",
      price: "Free",
      tokenReward: 20,
      featured: true,
    },
    {
      id: "javascript-essentials",
      title: "JavaScript Essentials",
      description: "Learn modern JavaScript programming",
      image: "/images/courses/javascript-essentials.png",
      level: "Intermediate",
      price: "$39.99",
      tokenReward: 40,
      featured: false,
    },
    {
      id: "react-fundamentals",
      title: "React Fundamentals",
      description: "Build interactive UIs with React",
      image: "/images/courses/react-fundamentals.png",
      level: "Intermediate",
      price: "$49.99",
      tokenReward: 50,
      featured: true,
    },
    {
      id: "nodejs-backend",
      title: "Node.js Backend Development",
      description: "Create scalable server-side applications",
      image: "/images/courses/nodejs-backend.png",
      level: "Intermediate",
      price: "$59.99",
      tokenReward: 55,
      featured: false,
    },
    {
      id: "fullstack-web3-development",
      title: "Full-Stack Web3 Development",
      description: "Build decentralized applications with modern frameworks",
      image: "/images/courses/fullstack-web3-development.png",
      level: "Advanced",
      price: "$99.99",
      tokenReward: 100,
      featured: false,
    },
    {
      id: "responsive-design",
      title: "Responsive Web Design",
      description: "Create websites that work on any device",
      image: "/images/courses/responsive-design.png",
      level: "Beginner",
      price: "$29.99",
      tokenReward: 30,
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
                  Web Development Courses
                </h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Learn frontend, backend, and full-stack development with our
                  comprehensive web development courses.
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
                  Web Developer Path
                </h2>
                <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Follow our structured learning path to become a professional
                  web developer.
                </p>
              </div>
            </div>

            <div className="mx-auto max-w-3xl mt-12 relative pl-8 before:absolute before:left-3 before:top-0 before:h-full before:w-0.5 before:bg-muted">
              <div className="mb-12 relative">
                <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-red text-red-foreground">
                  1
                </div>
                <h3 className="text-xl font-bold mb-2">
                  HTML & CSS Fundamentals
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start with the basics of web development and learn to create
                  structured, styled web pages.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/html-css-fundamentals">
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
                  JavaScript Essentials
                </h3>
                <p className="text-muted-foreground mb-4">
                  Learn the programming language of the web and add
                  interactivity to your websites.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/javascript-essentials">
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
                <h3 className="text-xl font-bold mb-2">React Fundamentals</h3>
                <p className="text-muted-foreground mb-4">
                  Master the popular React library for building user interfaces.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/react-fundamentals">
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
                  Full-Stack Development
                </h3>
                <p className="text-muted-foreground mb-4">
                  Combine frontend and backend skills to build complete web
                  applications.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/fullstack-web3-development">
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
