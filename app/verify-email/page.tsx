"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/contexts/auth-context"
import { toast } from "sonner"

export default function VerifyEmailPage() {
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [email, setEmail] = useState("")
  const { verifyEmailCode, resendVerificationCode } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get("email")
    const storedEmail = localStorage.getItem("verification_email")

    if (emailParam) {
      setEmail(emailParam)
      localStorage.setItem("verification_email", emailParam)
    } else if (storedEmail) {
      setEmail(storedEmail)
    } else {
      // No email found, redirect to signup
      router.push("/signup")
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (code.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code")
      return
    }

    setIsLoading(true)
    try {
      await verifyEmailCode(code, email)
      toast.success("Email verified successfully! Welcome to DCA LMS!")
      localStorage.removeItem("verification_email")
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Verification error:", error)
      toast.error(error.message || "Verification failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsResending(true)
    try {
      await resendVerificationCode(email)
      toast.success("Verification code sent! Please check your email.")
    } catch (error: any) {
      console.error("Resend error:", error)
      toast.error(error.message || "Failed to resend verification code. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a 6-digit verification code to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-center block">
                Enter Verification Code
              </Label>
              <div className="flex justify-center">
                <InputOTP value={code} onChange={setCode} maxLength={6} disabled={isLoading}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Check your email (including spam folder) for the verification code. The code will
                expire in 24 hours.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Email
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-primary hover:underline disabled:opacity-50"
                  disabled={isLoading || isResending}
                >
                  {isResending ? "Sending..." : "Resend code"}
                </button>
              </p>

              <p className="text-sm text-muted-foreground">
                Wrong email?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up again
                </Link>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
