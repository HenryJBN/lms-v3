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

export default function BusinessCoursesPage() {
  // Mock data for business courses
  const courses = [
    {
      id: "business-fundamentals",
      title: "Business Fundamentals",
      description: "Essential business concepts for entrepreneurs",
      image: "/images/courses/business-fundamentals.png",
      level: "Beginner",
      price: "Free",
      tokenReward: 25,
      featured: true,
    },
    {
      id: "crypto-economics",
      title: "Crypto Economics",
      description: "Understanding tokenomics and crypto business models",
      image: "/images/courses/crypto-economics.png",
      level: "Intermediate",
      price: "$49.99",
      tokenReward: 50,
      featured: false,
    },
    {
      id: "web3-business-strategy",
      title: "Web3 Business Strategy",
      description: "Building and scaling blockchain-based businesses",
      image: "/images/courses/web3-business-strategy.png",
      level: "Advanced",
      price: "$79.99",
      tokenReward: 75,
      featured: true,
    },
    {
      id: "digital-marketing",
      title: "Digital Marketing",
      description: "Modern marketing strategies for online businesses",
      image: "/images/courses/digital-marketing.png",
      level: "Beginner",
      price: "$39.99",
      tokenReward: 40,
      featured: false,
    },
    {
      id: "startup-finance",
      title: "Startup Finance",
      description: "Financial management for new ventures",
      image: "/images/courses/startup-finance.png",
      level: "Intermediate",
      price: "$59.99",
      tokenReward: 60,
      featured: false,
    },
    {
      id: "blockchain-for-business",
      title: "Blockchain for Business",
      description:
        "Implementing blockchain solutions in traditional businesses",
      image: "/images/courses/blockchain-for-business.png",
      level: "Intermediate",
      price: "$69.99",
      tokenReward: 65,
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
                  Business & Finance Courses
                </h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Learn essential business skills, crypto economics, and
                  entrepreneurship with our comprehensive courses.
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
                  Web3 Entrepreneur Path
                </h2>
                <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Follow our structured learning path to become a successful
                  Web3 entrepreneur.
                </p>
              </div>
            </div>

            <div className="mx-auto max-w-3xl mt-12 relative pl-8 before:absolute before:left-3 before:top-0 before:h-full before:w-0.5 before:bg-muted">
              <div className="mb-12 relative">
                <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-red text-red-foreground">
                  1
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Business Fundamentals
                </h3>
                <p className="text-muted-foreground mb-4">
                  Start with essential business concepts and entrepreneurial
                  mindset.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/business-fundamentals">
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
                  Blockchain for Business
                </h3>
                <p className="text-muted-foreground mb-4">
                  Understand how blockchain technology can transform business
                  models.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/blockchain-for-business">
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
                <h3 className="text-xl font-bold mb-2">Crypto Economics</h3>
                <p className="text-muted-foreground mb-4">
                  Learn about tokenomics and crypto-based business models.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/crypto-economics">
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
                  Web3 Business Strategy
                </h3>
                <p className="text-muted-foreground mb-4">
                  Develop strategies for building and scaling blockchain-based
                  businesses.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/web3-business-strategy">
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
