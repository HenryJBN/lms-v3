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
import { Settings, Shield, Users, BookOpen, Save, Loader2, Palette } from "lucide-react"
import { ImageUpload } from "@/components/admin/image-upload"
import { useToast } from "@/hooks/use-toast"

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
}

export default function AdminSettings() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<SiteSettings>({
    name: "",
    description: null,
    support_email: null,
    logo_url: null,
    theme_config: {},
    is_active: true,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings/site")
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        })
      }
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
      const response = await fetch("/api/admin/settings/site", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: settings.name,
          description: settings.description,
          support_email: settings.support_email,
          theme_config: settings.theme_config,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        toast({
          title: "Success",
          description: "Settings saved successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to save settings",
          variant: "destructive",
        })
      }
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

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/api/admin/settings/site/logo", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to upload logo")
    }

    const result = await response.json()
    
    // Update local state
    setSettings(prev => ({ ...prev, logo_url: result.url }))
    
    toast({
      title: "Success",
      description: "Logo uploaded successfully",
    })
    
    return result
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
                        Allow new users to register for accounts
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
                        Require users to verify their email address
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
                        Allow students to review and rate courses
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
                        Automatically approve new courses without admin review
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
                        Award tokens for course completion and achievements
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
                      value={settings.theme_config.default_token_reward || 25}
                      onChange={(e) =>
                        updateThemeColor("default_token_reward", Number.parseInt(e.target.value))
                      }
                    />
                    <div className="text-sm text-muted-foreground">
                      Default number of tokens awarded for course completion
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
                        Send email notifications to users
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
                        Enable to temporarily disable access to the platform
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
