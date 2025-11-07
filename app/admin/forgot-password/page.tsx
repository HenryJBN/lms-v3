"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Mail, AlertCircle, CheckCircle2, ArrowLeft, Clock } from "lucide-react"

export default function AdminForgotPassword() {
  const [step, setStep] = useState<"email" | "sent">("email")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock validation
      if (email.includes("@") && email.includes(".")) {
        setStep("sent")
      } else {
        setError("Please enter a valid email address.")
      }
    } catch (err) {
      setError("Failed to send reset email. Please try again.")
    } finally {
      setIsLoading(false)
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
          <h1 className="text-2xl font-bold text-white">Reset Admin Password</h1>
          <p className="text-slate-300">Secure password recovery for administrators</p>
        </div>

        {/* Back to login */}
        <div className="text-center">
          <Link
            href="/admin/login"
            className="inline-flex items-center text-sm text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to login
          </Link>
        </div>

        {step === "email" && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl text-white">Password Reset</CardTitle>
              <CardDescription className="text-slate-300">
                Enter your admin email address and we'll send you a secure reset link
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Admin Email Address
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

                {error && (
                  <Alert className="border-red-500 bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-300">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "sent" && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-xl text-white">Reset Link Sent</CardTitle>
              <CardDescription className="text-slate-300">
                We've sent a secure password reset link to your email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-500 bg-green-500/10">
                <Mail className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-300">
                  Check your email for the reset link. It will expire in 15 minutes for security.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-300">
                  <Clock className="h-4 w-4" />
                  <span>Link expires in 15 minutes</span>
                </div>

                <Button
                  onClick={() => setStep("email")}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  Send Another Link
                </Button>

                <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  <Link href="/admin/login">Return to Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
            <Shield className="h-3 w-3" />
            <span>All password reset attempts are logged and monitored</span>
          </div>
          <p className="text-xs text-slate-500">
            If you continue to have issues, contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  )
}
