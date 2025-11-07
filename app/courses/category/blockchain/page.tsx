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

export default function BlockchainCoursesPage() {
  // Mock data for blockchain courses
  const courses = [
    {
      id: "blockchain-fundamentals",
      title: "Blockchain Fundamentals",
      description: "Learn the core concepts of blockchain technology",
      image: "/images/courses/blockchain-fundamentals.png",
      level: "Beginner",
      price: "Free",
      tokenReward: 25,
      featured: true,
    },
    {
      id: "smart-contract-development",
      title: "Smart Contract Development",
      description: "Build and deploy smart contracts on Ethereum",
      image: "/images/courses/smart-contract-development.png",
      level: "Intermediate",
      price: "$49.99",
      tokenReward: 50,
      featured: false,
    },
    {
      id: "defi-applications",
      title: "DeFi Applications",
      description: "Understand decentralized finance protocols and applications",
      image: "/images/courses/defi-applications.png",
      level: "Advanced",
      price: "$79.99",
      tokenReward: 75,
      featured: false,
    },
    {
      id: "blockchain-security",
      title: "Blockchain Security",
      description: "Learn security best practices for blockchain applications",
      image: "/images/courses/blockchain-security.png",
      level: "Intermediate",
      price: "$59.99",
      tokenReward: 60,
      featured: false,
    },
    {
      id: "nft-development",
      title: "NFT Development",
      description: "Create and deploy NFT collections and marketplaces",
      image: "/images/courses/nft-development.png",
      level: "Intermediate",
      price: "$69.99",
      tokenReward: 65,
      featured: true,
    },
    {
      id: "consensus-mechanisms",
      title: "Consensus Mechanisms",
      description: "Deep dive into PoW, PoS, and other consensus algorithms",
      image: "/images/courses/consensus-mechanisms.png",
      level: "Advanced",
      price: "$89.99",
      tokenReward: 80,
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
                  Blockchain & Cryptocurrency Courses
                </h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Master blockchain technology, smart contracts, and decentralized applications with
                  our comprehensive courses.
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
                  Blockchain Developer Path
                </h2>
                <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Follow our structured learning path to become a professional blockchain developer.
                </p>
              </div>
            </div>

            <div className="mx-auto max-w-3xl mt-12 relative pl-8 before:absolute before:left-3 before:top-0 before:h-full before:w-0.5 before:bg-muted">
              <div className="mb-12 relative">
                <div className="absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full bg-red text-red-foreground">
                  1
                </div>
                <h3 className="text-xl font-bold mb-2">Blockchain Fundamentals</h3>
                <p className="text-muted-foreground mb-4">
                  Start with the basics of blockchain technology, distributed ledgers, and
                  cryptocurrencies.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/blockchain-fundamentals">
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
                <h3 className="text-xl font-bold mb-2">Smart Contract Development</h3>
                <p className="text-muted-foreground mb-4">
                  Learn to write, test, and deploy smart contracts on Ethereum and other platforms.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/smart-contract-development">
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
                <h3 className="text-xl font-bold mb-2">DeFi Applications</h3>
                <p className="text-muted-foreground mb-4">
                  Explore decentralized finance protocols and build DeFi applications.
                </p>
                <div className="flex gap-2">
                  <Link href="/courses/defi-applications">
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
                <h3 className="text-xl font-bold mb-2">Full-Stack Web3 Development</h3>
                <p className="text-muted-foreground mb-4">
                  Build complete decentralized applications with front-end integration.
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
