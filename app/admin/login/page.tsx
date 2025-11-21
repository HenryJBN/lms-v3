"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import Cookies from "js-cookie"
import {
  LoginSchema,
  TwoFactorSchema,
  type LoginFormData,
  type TwoFactorFormData,
} from "@/lib/schemas/login"
import { authService, type TwoFactorAuthResponse } from "@/lib/services/auth"

export default function AdminLogin() {
  const router = useRouter()
  const [step, setStep] = useState<"login" | "2fa">("login")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [sessionId, setSessionId] = useState("")

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // 2FA form
  const twoFactorForm = useForm<TwoFactorFormData>({
    resolver: zodResolver(TwoFactorSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      code: "",
    },
  })

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await authService.login(data)

      // Check if 2FA is required
      if ("requires_2fa" in response && response.requires_2fa) {
        const twoFAResponse = response as TwoFactorAuthResponse
        setSessionId(twoFAResponse.session_id)
        setSuccess(twoFAResponse.message)
        setStep("2fa")
      } else {
        // Direct login success (shouldn't happen for admin)
        setSuccess("Login successful! Redirecting to admin dashboard...")
        setTimeout(() => {
          router.push("/admin")
        }, 1000)
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handle2FA = async (data: TwoFactorFormData) => {
    setIsLoading(true)
    setError("")

    try {
      await authService.verify2FA({
        session_id: sessionId,
        code: data.code,
      })

      // Set the admin-token cookie upon successful 2FA
      Cookies.set("admin-token", "mock-admin-token-123", { expires: 7, path: "/" })

      setSuccess("Login successful! Redirecting to admin dashboard...")
      setTimeout(() => {
        router.push("/admin")
      }, 1500)
    } catch (err: any) {
      setError(err.message || "2FA verification failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resend2FA = async () => {
    try {
      const loginData = loginForm.getValues()
      const response = await authService.login(loginData)

      if ("requires_2fa" in response && response.requires_2fa) {
        const twoFAResponse = response as TwoFactorAuthResponse
        setSessionId(twoFAResponse.session_id)
        setSuccess("New 2FA code sent to your email.")
        setTimeout(() => setSuccess(""), 3000)
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend code.")
    }
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
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
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
                      {...loginForm.register("email")}
                      className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      disabled={isLoading}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-400">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
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
                      {...loginForm.register("password")}
                      className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-400">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
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
                Enter the 6-digit code sent to your email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={twoFactorForm.handleSubmit(handle2FA)} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white">Authentication Code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      {...twoFactorForm.register("code")}
                      value={twoFactorForm.watch("code")}
                      onChange={(value) => twoFactorForm.setValue("code", value)}
                    >
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
                  {twoFactorForm.formState.errors.code && (
                    <p className="text-sm text-red-400 text-center">
                      {twoFactorForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-2 text-sm text-slate-300">
                  <Mail className="h-4 w-4" />
                  <span>Check your email for the verification code</span>
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
                    disabled={isLoading || twoFactorForm.watch("code").length !== 6}
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
                  <strong>2FA Code:</strong> Check your email
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
