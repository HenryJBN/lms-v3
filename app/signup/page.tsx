import type { Metadata } from "next"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { GraduationCap, User, WalletIcon } from "lucide-react"
import SiteHeader from "@/components/site-header"
import SiteFooter from "@/components/site-footer"
import RegistrationForm from "./components/RegistrationForm"

export const metadata: Metadata = {
  title: "Sign Up - DCA LMS",
  description: "Create your DCA Learning Management System account",
}

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="container relative min-h-[calc(100vh-64px-200px)] flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
          <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/images/lms-background.png')" }}
            />
            <div className="relative z-20 flex items-center text-lg font-medium">
              <GraduationCap className="mr-2 h-6 w-6" />
              DCA LMS
            </div>
            <div className="relative z-20 mt-auto">
              <blockquote className="space-y-2">
                <p className="text-lg">
                  "Join our community of learners and start your journey to earning
                  blockchain-verified credentials that stand out in the job market."
                </p>
                <footer className="text-sm">The DCA Team</footer>
              </blockquote>
            </div>
          </div>
          <div className="lg:p-8">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
              <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
                <p className="text-sm text-muted-foreground">
                  Sign up to start learning and earning credentials
                </p>
              </div>

              <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="wallet">Web3 Wallet</TabsTrigger>
                </TabsList>

                <TabsContent value="email">
                  <RegistrationForm />
                </TabsContent>

                <TabsContent value="wallet">
                  <Card>
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-xl">Connect your wallet</CardTitle>
                      <CardDescription>
                        Use your Web3 wallet to create an account securely
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button className="w-full bg-transparent" variant="outline">
                        <WalletIcon className="mr-2 h-4 w-4" />
                        Connect with MetaMask
                      </Button>

                      <Button className="w-full bg-transparent" variant="outline">
                        <WalletIcon className="mr-2 h-4 w-4" />
                        Connect with WalletConnect
                      </Button>

                      <Button className="w-full bg-transparent" variant="outline">
                        <WalletIcon className="mr-2 h-4 w-4" />
                        Connect with Coinbase Wallet
                      </Button>

                      <div className="text-center text-sm text-muted-foreground">
                        By connecting your wallet, you agree to our{" "}
                        <Link
                          href="/terms"
                          className="text-primary underline underline-offset-4 hover:text-primary/90"
                        >
                          terms of service
                        </Link>{" "}
                        and{" "}
                        <Link
                          href="/privacy"
                          className="text-primary underline underline-offset-4 hover:text-primary/90"
                        >
                          privacy policy
                        </Link>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="text-center w-full text-sm text-muted-foreground">
                        After connecting your wallet, you'll be prompted to complete your profile
                      </div>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>

              <p className="px-8 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                  Sign in
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
