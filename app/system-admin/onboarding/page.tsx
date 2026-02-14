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
  Rocket,
  ShieldCheck,
  Mail,
  ArrowRight,
  Sparkles,
  Zap,
  Activity
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

export default function SystemAdminOnboardingPage() {
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

  const handleCopyCredentials = () => {
    const values = form.getValues()
    const text = `Email: ${values.admin_email}\nPassword: ${values.admin_password}`
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Credentials copied to clipboard!")
    }).catch(() => {
      toast.error("Failed to copy credentials.")
    })
  }

  if (successData) {
    return (
      <div className="max-w-4xl mx-auto py-10 animate-in fade-in zoom-in duration-500">
        <Card className="border-none shadow-2xl bg-gradient-to-br from-white to-slate-50 overflow-hidden">
          <div className="h-3 bg-green-500 w-full" />
          <CardHeader className="text-center pb-6">
            <div className="mx-auto h-24 w-24 rounded-full bg-green-100 flex items-center justify-center mb-6 ring-8 ring-green-50">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-4xl font-extrabold text-slate-900 tracking-tight">Deployment Successful!</CardTitle>
            <CardDescription className="text-slate-600 text-lg mt-2 font-medium">
              <span className="text-primary font-bold">{successData.site.name}</span> is now active in the platform pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-6 px-10">
            <div className="grid md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Academy Infrastructure</h4>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                          <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
                             <Globe className="h-4 w-4" /> Subdomain
                          </span>
                          <span className="text-sm font-bold text-slate-800">{successData.site.subdomain}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                          <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
                             <Activity className="h-4 w-4" /> Instance Status
                          </span>
                          <span className="text-xs font-bold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">ACTIVE</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500 flex items-center gap-2">
                             <Rocket className="h-4 w-4" /> Live URL
                          </span>
                          <Link href={successData.login_url} target="_blank" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                              View Login Page <ArrowRight className="h-3 w-3" />
                          </Link>
                      </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Admin Credentials</h4>
                  <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl space-y-4 shadow-lg relative overflow-hidden">
                      <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                         <ShieldCheck size={100} />
                      </div>
                      <div className="space-y-1">
                         <p className="text-xs text-slate-400">Master Email</p>
                         <p className="font-mono text-sm">{successData.admin?.email || form.getValues().admin_email}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-xs text-slate-400">Initial Password</p>
                         <p className="font-mono text-sm">•••••••••••• (Active)</p>
                      </div>
                      <div className="pt-2">
                         <Button variant="secondary" size="sm" className="w-full text-xs font-bold" onClick={handleCopyCredentials}>
                            Copy Login Credentials
                         </Button>
                      </div>
                  </div>
               </div>
            </div>
            
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-sm text-blue-800 flex gap-4">
                <div className="h-10 w-10 shrink-0 bg-blue-100 rounded-lg flex items-center justify-center">
                   <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                   <p className="font-bold">Automated Setup in Progress</p>
                   <p className="text-blue-700/80">Default course templates and system configurations are being injected into the new tenant environment.</p>
                </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 bg-slate-50/80 border-t py-8 px-10">
             <div className="grid grid-cols-2 gap-4 w-full">
                <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20" onClick={() => window.open(successData.login_url, '_blank')}>
                   Launch Platform <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" className="w-full h-14 text-lg font-bold bg-white text-slate-900" onClick={() => router.push('/system-admin/tenants')}>
                   Manage All Sites
                </Button>
             </div>
             <Button variant="ghost" className="text-slate-400 text-sm" onClick={() => router.push('/system-admin')}>
                Return to Dashboard Overview
             </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-slate-900 rounded-3xl p-8 mb-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute right-[-20px] top-[-20px] opacity-10">
           <Rocket size={200} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-sm">
                <Rocket className="h-3 w-3" />
                <span>Provisioning Pipeline</span>
             </div>
             <h1 className="text-4xl font-extrabold tracking-tight text-white">Academy Onboarding</h1>
             <p className="text-slate-300 text-lg max-w-2xl">Guided workflow to deploy and configure a new white-label academy instance with isolated infrastructure.</p>
          </div>
          <Button variant="ghost" onClick={() => router.back()} className="rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Modern Progress Steps */}
      <div className="relative">
         <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2" />
         <div className="relative flex justify-between">
            {[
               { id: 1, label: "Academy Identity", icon: Building2 },
               { id: 2, label: "Admin Configuration", icon: User },
               { id: 3, label: "Final Review", icon: Sparkles }
            ].map((s) => (
               <div key={s.id} className="flex flex-col items-center gap-3 relative bg-background px-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm
                     ${step === s.id ? 'bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/20 ring-4 ring-primary/10' : 
                       step > s.id ? 'bg-green-500 text-white' : 'bg-slate-50 text-slate-400'}
                  `}>
                     {step > s.id ? <CheckCircle2 className="h-6 w-6" /> : <s.icon className="h-6 w-6" />}
                  </div>
                  <span className={`text-xs font-bold tracking-tight ${step === s.id ? 'text-slate-900' : 'text-slate-400'}`}>
                     {s.label}
                  </span>
               </div>
            ))}
         </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {step === 1 && (
            <Card className="border-none shadow-2xl overflow-hidden bg-gradient-to-br from-white to-slate-50/50">
              <div className="h-2 bg-primary w-full" />
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl font-bold">Domain & Brand</CardTitle>
                <CardDescription className="text-base">Define the digital identity of the new academy instance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                   <FormField
                     control={form.control}
                     name="school_name"
                     render={({ field }) => (
                       <FormItem className="space-y-3">
                         <FormLabel className="text-sm font-bold text-slate-700">Display Name</FormLabel>
                         <FormControl>
                           <div className="relative group">
                             <Building2 className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                             <Input placeholder="e.g. Nexus Tech Academy" {...field} className="h-12 pl-10 bg-white text-slate-900 border-slate-200 focus:border-primary transition-all shadow-sm" />
                           </div>
                         </FormControl>
                         <FormDescription className="text-xs text-slate-400 italic">This is how the academy will appear on certificates and emails.</FormDescription>
                         <FormMessage />
                       </FormItem>
                     )}
                   />

                   <FormField
                     control={form.control}
                     name="subdomain"
                     render={({ field }) => (
                       <FormItem className="space-y-3">
                         <FormLabel className="text-sm font-bold text-slate-700">Network Identifier</FormLabel>
                         <div className="relative">
                           <FormControl>
                             <div className="relative group">
                                <Globe className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <Input 
                                  placeholder="nexus-academy" 
                                  {...field} 
                                  className={`h-12 pl-10 pr-28 bg-white text-slate-900 ${
                                      subdomainStatus === 'available' ? 'border-green-500 focus-visible:ring-green-100' :
                                      subdomainStatus === 'unavailable' ? 'border-red-500 focus-visible:ring-red-100' : 
                                      'border-slate-200 focus:border-primary'
                                  } transition-all shadow-sm`}
                                />
                                <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center gap-2">
                                   {subdomainStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                                   <span className="text-slate-400 font-bold text-xs bg-slate-50 px-2 py-1.5 rounded-md border">.dcalms.com</span>
                                </div>
                             </div>
                           </FormControl>
                         </div>
                         <div className="min-h-[20px] pt-1">
                            {subdomainStatus === 'available' && (
                               <p className="text-[11px] font-bold text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Subdomain verified and ready for deployment.
                               </p>
                            )}
                            {subdomainStatus === 'unavailable' && (
                               <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> {subdomainMessage}
                               </p>
                            )}
                         </div>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                </div>

                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex gap-4">
                   <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                      <ShieldCheck className="h-6 w-6 text-primary" />
                   </div>
                   <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">Dynamic DNS Configuration</p>
                      <p className="text-xs text-slate-500 leading-relaxed">The system will automatically configure SSL certificates and global CDN edge points for this subdomain upon deployment.</p>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t px-8 py-6">
                 <Button type="button" className="ml-auto h-12 px-8 font-bold transition-all hover:translate-x-1" onClick={nextStep}>
                    Next: Administrator Setup <ChevronRight className="ml-2 h-4 w-4" />
                 </Button>
              </CardFooter>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-none shadow-2xl overflow-hidden bg-gradient-to-br from-white to-slate-50/50 animate-in slide-in-from-right-8 duration-500">
              <div className="h-2 bg-primary w-full" />
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl font-bold">Master Account</CardTitle>
                <CardDescription className="text-base">Configure the primary administrative account for this tenant instance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                   <FormField
                    control={form.control}
                    name="admin_first_name"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-sm font-bold text-slate-700">First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} className="h-12 bg-white text-slate-900 border-slate-200 shadow-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="admin_last_name"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-sm font-bold text-slate-700">Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} className="h-12 bg-white text-slate-900 border-slate-200 shadow-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <FormField
                    control={form.control}
                    name="admin_email"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-sm font-bold text-slate-700">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative group">
                             <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                             <Input type="email" placeholder="admin@academy.com" {...field} className="h-12 pl-10 bg-white text-slate-900 border-slate-200 shadow-sm" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="admin_password"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-sm font-bold text-slate-700">Security Password</FormLabel>
                        <FormControl>
                          <div className="relative group">
                            <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input type="password" placeholder="••••••••" {...field} className="h-12 pl-10 bg-white text-slate-900 border-slate-200 shadow-sm" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
                   <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                   </div>
                   <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-900">Privileged Account Creation</p>
                      <p className="text-xs text-amber-700 leading-relaxed">This account will have full access to the tenant's data, courses, and financial records. Ensure the email address provided is secure.</p>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 border-t px-8 py-6 flex justify-between gap-4">
                 <Button type="button" variant="outline" className="h-12 px-8 bg-white text-slate-900 transition-all hover:bg-slate-50" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                 </Button>
                 <Button type="submit" className="h-12 px-10 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Provisioning Pipeline...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-5 w-5" />
                        Execute Deployment
                      </>
                    )}
                 </Button>
              </CardFooter>
            </Card>
          )}
        </form>
      </Form>

      {/* Feature Comparison or Guide */}
      <div className="grid md:grid-cols-3 gap-6 pt-10 bg-slate-900 p-8 rounded-3xl mt-12 shadow-xl">
         <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
               <ShieldCheck className="h-5 w-5 text-blue-400" />
            </div>
            <h4 className="font-bold text-white">Isolaton Layer</h4>
            <p className="text-xs text-slate-400 leading-relaxed">Every academy is deployed into a logic-isolated environment with its own database schema branch.</p>
         </div>
         <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
               <Zap className="h-5 w-5 text-purple-400" />
            </div>
            <h4 className="font-bold text-white">Instant Activation</h4>
            <p className="text-xs text-slate-400 leading-relaxed">Propagate DNS changes across the platform network in less than 30 seconds for immediate access.</p>
         </div>
         <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
               <Activity className="h-5 w-5 text-green-400" />
            </div>
            <h4 className="font-bold text-white">Telemetry Ready</h4>
            <p className="text-xs text-slate-400 leading-relaxed">Automatic integration with global analytics and health monitoring sensors from the moment of launch.</p>
         </div>
      </div>
    </div>
  )
}
