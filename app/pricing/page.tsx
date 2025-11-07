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
import { Check, Gem, HelpCircle } from "lucide-react"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                  Flexible Plans for Everyone
                </h1>
                <p className="max-w-[700px] text-muted-foreground md:text-xl">
                  Choose the perfect plan for your learning journey, from free courses to premium
                  certifications.
                </p>
              </div>
            </div>

            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8 py-8 md:py-12">
              {/* Free Plan */}
              <Card className="flex flex-col">
                <CardHeader className="flex flex-col space-y-1.5 pb-4">
                  <CardTitle className="text-xl">Explorer</CardTitle>
                  <CardDescription>Perfect for beginners</CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Access to free courses</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Basic AI learning tools</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Community forum access</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Earn L-Tokens for activities</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/signup" className="w-full">
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Premium Plan */}
              <Card className="flex flex-col border-primary">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Popular
                </div>
                <CardHeader className="flex flex-col space-y-1.5 pb-4">
                  <CardTitle className="text-xl">Pro Learner</CardTitle>
                  <CardDescription>For serious learners</CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">$19.99</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>All Explorer features</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Unlimited access to all courses</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Advanced AI learning assistant</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Personalized learning paths</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Blockchain certificates (3/month)</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>50% more L-Tokens for activities</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/signup" className="w-full">
                    <Button className="w-full">Subscribe Now</Button>
                  </Link>
                </CardFooter>
              </Card>

              {/* Enterprise Plan */}
              <Card className="flex flex-col">
                <CardHeader className="flex flex-col space-y-1.5 pb-4">
                  <CardTitle className="text-xl">Enterprise</CardTitle>
                  <CardDescription>For teams and organizations</CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">$49.99</span>
                    <span className="text-muted-foreground">/user/month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>All Pro Learner features</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Team management dashboard</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Custom learning paths</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Unlimited blockchain certificates</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>API access for integrations</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>Dedicated account manager</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/contact" className="w-full">
                    <Button variant="outline" className="w-full">
                      Contact Sales
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>

            <div className="mt-8 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="flex items-center space-x-2">
                <Gem className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  All plans earn L-Tokens that can be redeemed for rewards
                </span>
              </div>
              <div className="flex items-center">
                <Button variant="link" className="text-sm">
                  <HelpCircle className="mr-1 h-4 w-4" />
                  Need help choosing? Take our plan recommendation quiz
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  Frequently Asked Questions
                </h2>
                <p className="max-w-[700px] text-muted-foreground">
                  Find answers to common questions about our pricing plans and features.
                </p>
              </div>
            </div>

            <div className="mx-auto grid max-w-3xl gap-6 py-8 md:py-12">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I switch between plans?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll
                    get immediate access to new features. When downgrading, changes will take effect
                    at the end of your current billing cycle.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How do L-Tokens work?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    L-Tokens are earned by completing courses, quizzes, and other learning
                    activities. They can be redeemed for premium content, certificate fees, or
                    exclusive learning resources. Higher-tier plans earn tokens at an accelerated
                    rate.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Are blockchain certificates included in all plans?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Free users can purchase blockchain certificates for completed courses at $15
                    each. Pro Learners get 3 free certificates per month. Enterprise users get
                    unlimited certificates for their team members.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Do you offer discounts for students or educators?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes, we offer a 50% discount on Pro Learner plans for verified students and
                    educators. Contact our support team with your academic credentials to apply for
                    the discount.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
