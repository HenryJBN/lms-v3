"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Shield, Users, BookOpen, Save, Loader2, Palette, Mail, Send, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ImageUpload } from "@/components/admin/image-upload"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api-client"
import { useTenantTheme } from "@/components/tenant-theme-provider"

interface SiteSettings {
  name: string
  description: string | null
  support_email: string | null
  logo_url: string | null
  theme_config: {
    description?: string
    support_email?: string
    primary_color?: string
    secondary_color?: string
    accent_color?: string
    allow_registration?: boolean
    require_email_verification?: boolean
    enable_course_reviews?: boolean
    auto_approve_courses?: boolean
    enable_token_rewards?: boolean
    default_token_reward?: number
    enable_notifications?: boolean
    maintenance_mode?: boolean
    [key: string]: any  // Allow additional dynamic properties
  }
  is_active: boolean
  // Email configuration fields (masked for security)
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_username?: string | null
  smtp_password?: string | null  // Shows "***configured***" if set
  smtp_from_email?: string | null
  smtp_from_name?: string | null
}

export default function AdminSettings() {
  const { toast } = useToast()
  const { refreshTheme } = useTenantTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>({
    name: "",
    description: null,
    support_email: null,
    logo_url: null,
    theme_config: {},
    is_active: true,
  })

  // Email configuration state
  const [emailConfig, setEmailConfig] = useState({
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_password: "",
    smtp_from_email: "",
    smtp_from_name: "",
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const data = await apiClient.get<SiteSettings>("/api/admin/settings/site")
      setSettings(data)

      // Populate email config
      // Note: Masked values (like "itq***") are shown as placeholders
      // We'll only send values that the user actually changes
      setEmailConfig({
        smtp_host: data.smtp_host || "",
        smtp_port: data.smtp_port || 587,
        smtp_username: data.smtp_username || "", // Will be masked like "itq***"
        smtp_password: "", // Never populated (write-only)
        smtp_from_email: data.smtp_from_email || "", // Will be masked like "con***@***.com"
        smtp_from_name: data.smtp_from_name || "",
      })
    } catch (error) {
      console.error("Failed to fetch settings:", error)
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const data = await apiClient.patch<SiteSettings>("/api/admin/settings/site", {
        name: settings.name,
        description: settings.description,
        support_email: settings.support_email,
        theme_config: settings.theme_config,
      })

      setSettings(data)

      // Refresh theme to apply new colors immediately
      await refreshTheme()

      toast({
        title: "Success",
        description: "Settings saved successfully. Theme colors have been updated.",
      })
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEmailSave = async () => {
    setIsSaving(true)
    try {
      // Build email data, excluding masked values (containing ***)
      const emailData: any = {
        smtp_host: emailConfig.smtp_host || null,
        smtp_port: emailConfig.smtp_port || null,
        smtp_from_name: emailConfig.smtp_from_name || null,
      }

      // Only include username if it's not masked (doesn't contain ***)
      if (emailConfig.smtp_username && !emailConfig.smtp_username.includes("***")) {
        emailData.smtp_username = emailConfig.smtp_username
      }

      // Only include from_email if it's not masked (doesn't contain ***)
      if (emailConfig.smtp_from_email && !emailConfig.smtp_from_email.includes("***")) {
        emailData.smtp_from_email = emailConfig.smtp_from_email
      }

      // Only include password if user entered a new one
      if (emailConfig.smtp_password) {
        emailData.smtp_password = emailConfig.smtp_password
      }

      const data = await apiClient.patch<SiteSettings>("/api/admin/settings/site", emailData)

      setSettings(data)
      // Clear password field after save (write-only)
      setEmailConfig(prev => ({ ...prev, smtp_password: "" }))

      toast({
        title: "Success",
        description: "Email settings saved successfully",
      })
    } catch (error) {
      console.error("Failed to save email settings:", error)
      toast({
        title: "Error",
        description: "Failed to save email settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestEmail = async () => {
    setIsTestingEmail(true)
    try {
      const result = await apiClient.testEmailConfig({
        smtp_host: emailConfig.smtp_host || undefined,
        smtp_port: emailConfig.smtp_port || undefined,
        smtp_username: emailConfig.smtp_username || undefined,
        smtp_password: emailConfig.smtp_password || undefined,
        smtp_from_email: emailConfig.smtp_from_email || undefined,
        smtp_from_name: emailConfig.smtp_from_name || undefined,
      })

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        })
      } else {
        toast({
          title: "Test Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to test email:", error)
      toast({
        title: "Error",
        description: "Failed to test email configuration",
        variant: "destructive",
      })
    } finally {
      setIsTestingEmail(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    try {
      const result = await apiClient.uploadFile<{ url: string }>("/api/admin/settings/site/logo", file)

      // Update local state
      setSettings(prev => ({ ...prev, logo_url: result.url }))

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      })
      
      return result
    } catch (error) {
      console.error("Failed to upload logo:", error)
      throw new Error("Failed to upload logo")
    }
  }

  const updateThemeColor = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      theme_config: {
        ...prev.theme_config,
        [key]: value,
      },
    }))
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="hidden w-64 flex-col border-r bg-muted/40 lg:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/admin" className="flex items-center gap-2 font-bold">
            <Shield className="h-6 w-6" />
            <span>Admin Panel</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-muted"
            >
              <Shield className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-muted"
            >
              <Users className="h-4 w-4" />
              Users
            </Link>
            <Link
              href="/admin/courses"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-all hover:bg-muted"
            >
              <BookOpen className="h-4 w-4" />
              Courses
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-3 rounded-lg bg-red/10 px-3 py-2 text-red transition-all"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Site Settings</h1>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </header>

        {/* Content */}
        <main className="flex-1 space-y-4 p-4 lg:p-6">
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Site Information</CardTitle>
                  <CardDescription>Basic information about your academy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteDescription">Site Description</Label>
                    <Textarea
                      id="siteDescription"
                      value={settings.description || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={settings.support_email || ""}
                      onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Logo</CardTitle>
                  <CardDescription>Upload your academy logo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUpload
                    value={settings.logo_url}
                    onChange={(url) => setSettings(prev => ({ ...prev, logo_url: url }))}
                    onUpload={handleLogoUpload}
                    label="Academy Logo"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Theme Colors
                    </div>
                  </CardTitle>
                  <CardDescription>Customize your academy's color scheme</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={settings.theme_config.primary_color || "#ef4444"}
                          onChange={(e) => updateThemeColor("primary_color", e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          type="text"
                          value={settings.theme_config.primary_color || "#ef4444"}
                          onChange={(e) => updateThemeColor("primary_color", e.target.value)}
                          placeholder="#ef4444"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={settings.theme_config.secondary_color || "#3b82f6"}
                          onChange={(e) => updateThemeColor("secondary_color", e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          type="text"
                          value={settings.theme_config.secondary_color || "#3b82f6"}
                          onChange={(e) => updateThemeColor("secondary_color", e.target.value)}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accentColor">Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accentColor"
                          type="color"
                          value={settings.theme_config.accent_color || "#8b5cf6"}
                          onChange={(e) => updateThemeColor("accent_color", e.target.value)}
                          className="h-10 w-20"
                        />
                        <Input
                          type="text"
                          value={settings.theme_config.accent_color || "#8b5cf6"}
                          onChange={(e) => updateThemeColor("accent_color", e.target.value)}
                          placeholder="#8b5cf6"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Theme Preview */}
                  <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                    <h4 className="text-sm font-medium mb-3">Theme Preview</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="default" size="sm">Primary Button</Button>
                      <Button variant="secondary" size="sm">Secondary Button</Button>
                      <Button variant="outline" size="sm">Outline Button</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Save your changes to see the theme applied across your academy
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Configuration
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Configure SMTP settings for sending emails from your academy.
                    Credentials are encrypted and write-only for security.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status indicator */}
                  {settings.smtp_host && (
                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertDescription>
                        Using custom email configuration
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_host">SMTP Host *</Label>
                      <Input
                        id="smtp_host"
                        placeholder="smtp.gmail.com"
                        value={emailConfig.smtp_host}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtp_host: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp_port">SMTP Port *</Label>
                      <Input
                        id="smtp_port"
                        type="number"
                        placeholder="587"
                        value={emailConfig.smtp_port}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtp_port: parseInt(e.target.value) || 587 })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_username">SMTP Username *</Label>
                    <Input
                      id="smtp_username"
                      placeholder="your-email@example.com"
                      value={emailConfig.smtp_username}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_username: e.target.value })}
                    />
                    {settings.smtp_username && settings.smtp_username.includes("***") && (
                      <p className="text-xs text-muted-foreground">
                        Current: {settings.smtp_username}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_password">SMTP Password *</Label>
                    <Input
                      id="smtp_password"
                      type="password"
                      placeholder={settings.smtp_password === "***configured***" ? "Leave empty to keep current password" : "Enter password"}
                      value={emailConfig.smtp_password}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtp_password: e.target.value })}
                    />
                    {settings.smtp_password === "***configured***" && (
                      <p className="text-xs text-muted-foreground">
                        Password is configured. Leave empty to keep current password.
                      </p>
                    )}
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        For security, passwords cannot be viewed after saving. You can update them anytime without entering the old password.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_from_email">From Email</Label>
                      <Input
                        id="smtp_from_email"
                        type="email"
                        placeholder="noreply@example.com"
                        value={emailConfig.smtp_from_email}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtp_from_email: e.target.value })}
                      />
                      {settings.smtp_from_email && settings.smtp_from_email.includes("***") && (
                        <p className="text-xs text-muted-foreground">
                          Current: {settings.smtp_from_email}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp_from_name">From Name</Label>
                      <Input
                        id="smtp_from_name"
                        placeholder={settings.name}
                        value={emailConfig.smtp_from_name}
                        onChange={(e) => setEmailConfig({ ...emailConfig, smtp_from_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleEmailSave} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Email Settings
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleTestEmail}
                      disabled={isTestingEmail}
                    >
                      {isTestingEmail ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Test Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Registration</CardTitle>
                  <CardDescription>
                    Configure user registration and verification settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow User Registration</Label>
                      <div className="text-sm text-muted-foreground">
                        When disabled, new users cannot create accounts. Existing users can still log in.
                      </div>
                    </div>
                    <Switch
                      checked={settings.theme_config.allow_registration !== false}
                      onCheckedChange={(checked) =>
                        updateThemeColor("allow_registration", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Email Verification</Label>
                      <div className="text-sm text-muted-foreground">
                        When disabled, new users can log in immediately without verifying their email address.
                      </div>
                    </div>
                    <Switch
                      checked={settings.theme_config.require_email_verification !== false}
                      onCheckedChange={(checked) =>
                        updateThemeColor("require_email_verification", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="courses" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Course Settings</CardTitle>
                  <CardDescription>Configure course-related settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Course Reviews</Label>
                      <div className="text-sm text-muted-foreground">
                        Allow students to review and rate courses after completion.
                      </div>
                    </div>
                    <Switch
                      checked={settings.theme_config.enable_course_reviews !== false}
                      onCheckedChange={(checked) =>
                        updateThemeColor("enable_course_reviews", checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-approve Courses</Label>
                      <div className="text-sm text-muted-foreground">
                        Automatically publish new courses without admin review. Disable for manual approval workflow.
                      </div>
                    </div>
                    <Switch
                      checked={settings.theme_config.auto_approve_courses === true}
                      onCheckedChange={(checked) =>
                        updateThemeColor("auto_approve_courses", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blockchain" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Token Rewards</CardTitle>
                  <CardDescription>Configure blockchain and token reward settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Token Rewards</Label>
                      <div className="text-sm text-muted-foreground">
                        Award L-tokens for course completion, lesson progress, and quiz achievements.
                      </div>
                    </div>
                    <Switch
                      checked={settings.theme_config.enable_token_rewards !== false}
                      onCheckedChange={(checked) =>
                        updateThemeColor("enable_token_rewards", checked)
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultTokenReward">Default Token Reward</Label>
                    <Input
                      id="defaultTokenReward"
                      type="number"
                      min="0"
                      value={settings.theme_config.default_token_reward || 25}
                      onChange={(e) =>
                        updateThemeColor("default_token_reward", Number.parseInt(e.target.value))
                      }
                    />
                    <div className="text-sm text-muted-foreground">
                      Number of L-tokens awarded for completing a course (lessons: 10, quizzes: 15).
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>Configure system notification settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Notifications</Label>
                      <div className="text-sm text-muted-foreground">
                        Send email notifications for important events (enrollments, completions, announcements).
                      </div>
                    </div>
                    <Switch
                      checked={settings.theme_config.enable_notifications !== false}
                      onCheckedChange={(checked) =>
                        updateThemeColor("enable_notifications", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Control system-wide settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <div className="text-sm text-muted-foreground">
                        <span className="text-orange-600 dark:text-orange-400 font-medium">Warning:</span> Temporarily disable public access. Admins can still access the platform.
                      </div>
                    </div>
                    <Switch
                      checked={settings.theme_config.maintenance_mode === true}
                      onCheckedChange={(checked) =>
                        updateThemeColor("maintenance_mode", checked)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
