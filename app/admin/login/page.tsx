"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Smartphone,
} from "lucide-react"
import Cookies from "js-cookie" // Import js-cookie

export default function AdminLogin() {
  const router = useRouter()
  const [step, setStep] = useState<"login" | "2fa">("login")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Form data
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock validation
      if (email === "admin@dcalms.com" && password === "admin123") {
        setSuccess("Credentials verified. Please enter your 2FA code.")
        setStep("2fa")
      } else {
        setError("Invalid email or password. Please try again.")
      }
    } catch (err) {
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock 2FA validation
      if (otpCode === "123456") {
        // Set the admin-token cookie upon successful 2FA
        Cookies.set("admin-token", "mock-admin-token-123", { expires: 7, path: "/" }) // Expires in 7 days

        setSuccess("Login successful! Redirecting to admin dashboard...")
        setTimeout(() => {
          router.push("/admin")
        }, 1500)
      } else {
        setError("Invalid 2FA code. Please try again.")
      }
    } catch (err) {
      setError("2FA verification failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resend2FA = () => {
    setSuccess("New 2FA code sent to your authenticator app.")
    setTimeout(() => setSuccess(""), 3000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-slate-300">Secure access to DCA LMS administration</p>
        </div>

        {/* Back to main site */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to main site
          </Link>
        </div>

        {/* Login Form */}
        {step === "login" && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl text-white">Administrator Login</CardTitle>
              <CardDescription className="text-slate-300">
                Enter your admin credentials to access the dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@dcalms.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm text-slate-300">
                      Remember me
                    </Label>
                  </div>
                  <Link
                    href="/admin/forgot-password"
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <Alert className="border-red-500 bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-300">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-500 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-300">{success}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 2FA Form */}
        {step === "2fa" && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl text-white">Two-Factor Authentication</CardTitle>
              <CardDescription className="text-slate-300">
                Enter the 6-digit code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handle2FA} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white">Authentication Code</Label>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otpCode} onChange={(value) => setOtpCode(value)}>
                      <InputOTPGroup>
                        <InputOTPSlot
                          index={0}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <InputOTPSlot
                          index={1}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <InputOTPSlot
                          index={2}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <InputOTPSlot
                          index={3}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <InputOTPSlot
                          index={4}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <InputOTPSlot
                          index={5}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2 text-sm text-slate-300">
                  <Smartphone className="h-4 w-4" />
                  <span>Check your authenticator app for the code</span>
                </div>

                {error && (
                  <Alert className="border-red-500 bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-300">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-green-500 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-300">{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={isLoading || otpCode.length !== 6}
                  >
                    {isLoading ? "Verifying..." : "Verify & Sign In"}
                  </Button>

                  <div className="flex justify-between text-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-slate-300 hover:text-white"
                      onClick={() => setStep("login")}
                    >
                      ← Back to login
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-purple-400 hover:text-purple-300"
                      onClick={resend2FA}
                    >
                      Resend code
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
            <Shield className="h-3 w-3" />
            <span>Secured with enterprise-grade encryption</span>
          </div>
          <p className="text-xs text-slate-500">
            This is a restricted area. All access attempts are logged and monitored.
          </p>
        </div>

        {/* Demo Credentials */}
        <Card className="border-slate-700 bg-slate-800/30 backdrop-blur">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="text-sm font-medium text-white">Demo Credentials</h3>
              <div className="text-xs text-slate-300 space-y-1">
                <p>
                  <strong>Email:</strong> admin@dcalms.com
                </p>
                <p>
                  <strong>Password:</strong> admin123
                </p>
                <p>
                  <strong>2FA Code:</strong> 123456
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
