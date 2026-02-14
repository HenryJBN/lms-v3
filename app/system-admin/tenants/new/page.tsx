"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { 
  Building2, 
  User, 
  Lock, 
  Globe, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Rocket
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { onboardingService } from "@/lib/services/system-admin"
import { toast } from "sonner"
import Link from "next/link"

import { tenantRegistrationSchema as registerSchema, TenantRegistrationValues as RegisterFormValues } from "@/lib/schemas/tenant"

export default function RegisterSitePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle')
  const [subdomainMessage, setSubdomainMessage] = useState("")
  const [step, setStep] = useState(1)
  const [successData, setSuccessData] = useState<any | null>(null)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      school_name: "",
      subdomain: "",
      admin_email: "",
      admin_password: "",
      admin_first_name: "",
      admin_last_name: "",
    },
  })

  const { watch, trigger } = form
  const watchedSubdomain = watch("subdomain")

  // Subdomain availability check
  useEffect(() => {
    if (!watchedSubdomain || watchedSubdomain.length < 2) {
      setSubdomainStatus('idle')
      setSubdomainMessage("")
      return
    }

    const checkAvailability = async () => {
      setSubdomainStatus('checking')
      try {
        const res = await onboardingService.checkSubdomain(watchedSubdomain)
        if (res.available) {
          setSubdomainStatus('available')
          setSubdomainMessage("Great! This subdomain is available.")
        } else {
          setSubdomainStatus('unavailable')
          setSubdomainMessage(res.message || "This subdomain is already taken.")
        }
      } catch (error) {
        setSubdomainStatus('idle')
      }
    }

    const timer = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timer)
  }, [watchedSubdomain])

  async function onSubmit(values: RegisterFormValues) {
    if (subdomainStatus !== 'available') {
      toast.error("Please choose an available subdomain")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await onboardingService.registerTenant(values)
      setSuccessData(res)
      toast.success("Academy registered successfully!")
      setStep(3)
    } catch (error: any) {
      console.error("Registration failed:", error)
      toast.error(error.response?.data?.detail || "Registration failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = async () => {
    const fields = step === 1 
      ? ['school_name', 'subdomain'] as const
      : ['admin_first_name', 'admin_last_name', 'admin_email', 'admin_password'] as const
    
    const isValid = await trigger(fields)
    
    if (isValid) {
      if (step === 1 && subdomainStatus !== 'available') {
        toast.error("Subdomain must be available to proceed")
        return
      }
      setStep(prev => prev + 1)
    }
  }

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <Card className="border-none shadow-2xl bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-green-800">Registration Complete!</CardTitle>
            <CardDescription className="text-green-700/70 text-lg">
              {successData.site.name} is now live and ready for configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-green-100 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-green-50 pb-3">
                    <span className="text-sm font-medium text-slate-500">Subdomain</span>
                    <span className="text-sm font-bold text-slate-800">{successData.site.subdomain}</span>
                </div>
                <div className="flex justify-between items-center border-b border-green-50 pb-3">
                    <span className="text-sm font-medium text-slate-500">Live Domain</span>
                    <span className="text-sm font-bold text-slate-800">{successData.site.domain}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">Platform URL</span>
                    <Link href={successData.login_url} target="_blank" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                        Go to Academy login <Globe className="h-3 w-3" />
                    </Link>
                </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800 flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>The academy administrator has been created. They can now log in using the email and password provided during registration.</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
             <Button className="w-full h-12 text-lg font-bold" onClick={() => window.open(successData.login_url, '_blank')}>
                Access Platform Now
             </Button>
             <Button variant="ghost" className="w-full text-slate-500" onClick={() => router.push('/system-admin')}>
                Return to Global Dashboard
             </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Deploy New Academy</h1>
      </div>

      {/* Progress Tracker */}
      <div className="flex items-center gap-4 px-2">
         {[1, 2].map(i => (
            <div key={i} className="flex-1 flex items-center gap-2">
               <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${step === i ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 
                    step > i ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}
               `}>
                  {step > i ? <CheckCircle2 className="h-5 w-5" /> : i}
               </div>
               <div className={`flex-1 h-1 rounded-full ${step > i ? 'bg-green-500' : 'bg-slate-100'}`} />
            </div>
         ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <Card className="border-none shadow-xl overflow-hidden">
              <div className="h-2 bg-primary" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Academy Identity
                </CardTitle>
                <CardDescription>Basic information and branding for the new tenant.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="school_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academy Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Nexus Tech Academy" {...field} className="h-11" />
                      </FormControl>
                      <FormDescription>The public name of the school or academy.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subdomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subdomain</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            placeholder="nexus-academy" 
                            {...field} 
                            className={`h-11 pr-24 ${
                                subdomainStatus === 'available' ? 'border-green-500 focus-visible:ring-green-100' :
                                subdomainStatus === 'unavailable' ? 'border-red-500 focus-visible:ring-red-100' : ''
                            }`} 
                          />
                        </FormControl>
                        <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-2">
                           {subdomainStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                           {subdomainStatus === 'available' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                           {subdomainStatus === 'unavailable' && <AlertCircle className="h-5 w-5 text-red-500" />}
                           <span className="text-slate-400 font-medium text-sm">.dcalms.com</span>
                        </div>
                      </div>
                      <FormDescription className={`text-xs ${
                         subdomainStatus === 'available' ? 'text-green-600' : 
                         subdomainStatus === 'unavailable' ? 'text-red-600' : ''
                      }`}>
                         {subdomainMessage || "This will be the academy's unique URL."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t px-6 py-4">
                 <Button type="button" className="ml-auto flex items-center gap-2" onClick={nextStep}>
                    Next: Admin Setup <ChevronRight className="h-4 w-4" />
                 </Button>
              </CardFooter>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-none shadow-xl overflow-hidden">
              <div className="h-2 bg-primary" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Primary Administrator
                </CardTitle>
                <CardDescription>Setup the initial admin account for this academy.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <FormField
                    control={form.control}
                    name="admin_first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="admin_last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="admin_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@academy.com" {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="admin_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="password" placeholder="••••••••" {...field} className="h-11 pl-10" />
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t px-6 py-4 flex justify-between">
                 <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                    Back
                 </Button>
                 <Button type="submit" className="flex items-center gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deploying Academy...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        Complete Deployment
                      </>
                    )}
                 </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>
    </div>
  )
}
