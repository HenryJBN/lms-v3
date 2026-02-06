"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  Globe, 
  User, 
  Mail, 
  Lock, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Star,
  Sparkles
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
import { useDebounce } from "@/hooks/use-debounce"
import { toast } from "sonner"

const formSchema = z.object({
  school_name: z.string().min(3, "School name must be at least 3 characters"),
  subdomain: z.string()
    .min(3, "Subdomain must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  admin_email: z.string().email("Invalid email address"),
  admin_password: z.string().min(8, "Password must be at least 8 characters"),
  admin_first_name: z.string().min(2, "First name is required"),
  admin_last_name: z.string().min(2, "Last name is required"),
})

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubdomainAvailable, setIsSubdomainAvailable] = useState<boolean | null>(null)
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false)
  const [subdomainMessage, setSubdomainMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      school_name: "",
      subdomain: "",
      admin_email: "",
      admin_password: "",
      admin_first_name: "",
      admin_last_name: "",
    },
  })

  const subdomainValue = form.watch("subdomain")
  const debouncedSubdomain = useDebounce(subdomainValue, 600)

  useEffect(() => {
    const checkSubdomain = async () => {
      if (!debouncedSubdomain || debouncedSubdomain.length < 3) {
        setIsSubdomainAvailable(null)
        setSubdomainMessage("")
        return
      }

      setIsCheckingSubdomain(true)
      try {
        const result = await onboardingService.checkSubdomain(debouncedSubdomain)
        setIsSubdomainAvailable(result.available)
        setSubdomainMessage(result.message)
      } catch (error) {
        console.error("Subdomain check failed:", error)
        setIsSubdomainAvailable(null)
      } finally {
        setIsCheckingSubdomain(false)
      }
    }

    checkSubdomain()
  }, [debouncedSubdomain])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isSubdomainAvailable) {
      toast.error("Please choose an available subdomain")
      return
    }

    setIsSubmitting(true)
    try {
      await onboardingService.registerTenant(values)
      toast.success("School registered successfully! Redirecting to your new dashboard...")
      
      // Redirect to the new subdomain
      setTimeout(() => {
        window.location.href = `http://${values.subdomain}.dcalms.com:3000/login`
      }, 2000)
    } catch (error: any) {
      console.error("Registration failed:", error)
      toast.error(error.response?.data?.detail || "Registration failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = async () => {
    const fieldsToValidate = step === 1 
      ? ["school_name", "subdomain"] as const 
      : ["admin_first_name", "admin_last_name", "admin_email", "admin_password"] as const
    
    const isValid = await form.trigger(fieldsToValidate)
    
    if (isValid) {
      if (step === 1 && !isSubdomainAvailable) {
        toast.error("Subdomain is not available")
        return
      }
      setStep(step + 1)
    }
  }

  const prevStep = () => setStep(step - 1)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side: Marketing/Value Prop */}
        <div className="hidden lg:flex flex-col space-y-8 pr-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
              <Sparkles className="h-4 w-4" />
              <span>Next-Gen Education Platform</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Empower Your Institution with <span className="text-primary italic">DCA LMS</span>
            </h1>
            <p className="text-lg text-slate-600">
              Launch your private academy in minutes. Secure, scalable, and built for modern learning.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="mt-1 bg-white p-2 rounded-lg shadow-sm">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Custom Subdomains</h4>
                <p className="text-slate-600 text-sm">Your own unique URL (e.g., academy.dcalms.com)</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="mt-1 bg-white p-2 rounded-lg shadow-sm">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Enterprise Security</h4>
                <p className="text-slate-600 text-sm">Isolated tenant data and robust access controls.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="mt-1 bg-white p-2 rounded-lg shadow-sm">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Smart Automation</h4>
                <p className="text-slate-600 text-sm">Automated course management and analytics.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-4 text-sm text-slate-500 font-medium">
             <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200" />
                ))}
             </div>
             <span>Joined by 50+ leading academies worldwide</span>
          </div>
        </div>

        {/* Right Side: Onboarding Form */}
        <Card className="border-none shadow-2xl overflow-hidden">
          <div className="h-2 bg-primary w-full transition-all duration-500" style={{ width: `${(step/2)*100}%` }} />
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              {step === 1 ? <Building2 className="h-6 w-6 text-primary" /> : <User className="h-6 w-6 text-primary" />}
              {step === 1 ? "School Identity" : "Administrator Details"}
            </CardTitle>
            <CardDescription>
              {step === 1 ? "Choose your school's name and digital address." : "Set up the primary administrator account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {step === 1 && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                    <FormField
                      control={form.control}
                      name="school_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-semibold">Academy Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <Input placeholder="E.g. Quantum Learning Academy" className="pl-10 h-11" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subdomain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-700 font-semibold">Choose Subdomain</FormLabel>
                          <FormControl>
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center">
                                <div className="relative flex-1">
                                  <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                  <Input 
                                    placeholder="my-academy" 
                                    className="pl-10 h-11 rounded-r-none border-r-0" 
                                    {...field} 
                                    onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                                  />
                                </div>
                                <div className="bg-slate-100 border border-l-0 rounded-r-md px-3 h-11 flex items-center text-slate-500 font-medium text-sm">
                                  .dcalms.com
                                </div>
                              </div>
                              <div className="flex items-center gap-2 min-h-[20px]">
                                {isCheckingSubdomain && (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Verifying availability...
                                  </div>
                                )}
                                {!isCheckingSubdomain && isSubdomainAvailable === true && (
                                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {subdomainMessage}
                                  </div>
                                )}
                                {!isCheckingSubdomain && isSubdomainAvailable === false && (
                                  <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                                    <XCircle className="h-3 w-3" />
                                    {subdomainMessage}
                                  </div>
                                )}
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            This will be your permanent url for your school.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="admin_first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-semibold">First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" className="h-11" {...field} />
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
                            <FormLabel className="text-slate-700 font-semibold">Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" className="h-11" {...field} />
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
                          <FormLabel className="text-slate-700 font-semibold">Work Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <Input placeholder="admin@my-academy.com" className="pl-10 h-11" {...field} />
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
                        <FormItem>
                          <FormLabel className="text-slate-700 font-semibold">Admin Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                              <Input type="password" placeholder="••••••••" className="pl-10 h-11" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="pt-4 flex gap-4">
                  {step > 1 && (
                    <Button type="button" variant="outline" className="flex-1 h-12" onClick={prevStep}>
                      Back
                    </Button>
                  )}
                  {step < 2 ? (
                    <Button type="button" className="flex-1 h-12 font-bold text-lg" onClick={nextStep}>
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  ) : (
                    <Button type="submit" className="flex-1 h-12 font-bold text-lg" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating Academy...
                        </>
                      ) : (
                        "Launch Academy"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t py-4 justify-center">
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
               <ShieldCheck className="h-4 w-4" />
               Secure SSL Encrypted Registration
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
