import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GraduationCap, Mail } from "lucide-react"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="container relative min-h-[calc(100vh-64px-200px)] flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
          <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
            <div className="absolute inset-0 bg-primary" />
            <div className="relative z-20 flex items-center text-lg font-medium">
              <GraduationCap className="mr-2 h-6 w-6" />
              DCA LMS
            </div>
            <div className="relative z-20 mt-auto">
              <blockquote className="space-y-2">
                <p className="text-lg">
                  "The blockchain-verified certificates from DCA have been invaluable for demonstrating my skills to
                  employers."
                </p>
                <footer className="text-sm">Michael Chen, Software Engineer</footer>
              </blockquote>
            </div>
          </div>
          <div className="lg:p-8">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
              <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email address and we'll send you a link to reset your password
                </p>
              </div>

              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-xl">Forgot password</CardTitle>
                  <CardDescription>We'll email you instructions on how to reset your password</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="your@email.com" className="pl-8" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">Send Reset Link</Button>
                </CardFooter>
              </Card>

              <p className="px-8 text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                  Back to login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
