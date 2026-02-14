"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { systemAdminService, SystemConfig } from "@/lib/services/system-admin"

export default function SettingsPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const data = await systemAdminService.getSystemSettings()
      setConfigs(data)
    } catch (error) {
      toast.error("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string, value: string) => {
    setSaving(id)
    try {
      const updatedConfig = await systemAdminService.updateSystemSetting(id, value)
      toast.success("Setting updated")
      setConfigs(configs.map(c => c.id === id ? updatedConfig : c))
    } catch (error) {
      toast.error("Failed to update setting")
    } finally {
      setSaving(null)
    }
  }

  const handleInputChange = (id: string, value: string) => {
    setConfigs(configs.map(c => c.id === id ? { ...c, value } : c))
  }

  const renderConfigItem = (config: SystemConfig) => {
    const isBoolean = config.value === "true" || config.value === "false"
    
    return (
      <div key={config.id} className="space-y-2 border-b border-border/40 pb-4 last:border-0 last:pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-base font-semibold">{config.description || config.key}</Label>
            <p className="text-xs font-mono text-muted-foreground bg-muted w-fit px-1 rounded">{config.key}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {isBoolean ? (
              <Switch 
                checked={config.value === "true"} 
                onCheckedChange={(checked) => handleUpdate(config.id, checked.toString())}
                disabled={!!saving && saving !== config.id}
              />
            ) : (
              <div className="flex w-full sm:w-[300px] items-center space-x-2">
                <Input 
                  value={config.value} 
                  onChange={(e) => handleInputChange(config.id, e.target.value)}
                  disabled={!!saving && saving !== config.id}
                  className="bg-background"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleUpdate(config.id, config.value)}
                  disabled={!!saving && saving !== config.id}
                >
                  {saving === config.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading configurations...</p>
        </div>
      </div>
    )
  }

  const categories = ["general", "email", "security", "maintenance"]

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">System Configuration</h2>
        <p className="text-muted-foreground">
          Manage global platform settings and infrastructure parameters.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8 h-auto p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="general" className="py-2.5 rounded-lg">General</TabsTrigger>
          <TabsTrigger value="email" className="py-2.5 rounded-lg">Email</TabsTrigger>
          <TabsTrigger value="security" className="py-2.5 rounded-lg">Security</TabsTrigger>
          <TabsTrigger value="maintenance" className="py-2.5 rounded-lg">Maintenance</TabsTrigger>
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-4 focus-visible:outline-none">
            <Card className="border-none shadow-premium bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="capitalize text-xl">{category} Settings</CardTitle>
                <CardDescription>
                  Configure {category} parameters for the entire platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {configs
                  .filter((c) => c.category === category)
                  .map(renderConfigItem)}
                {configs.filter((c) => c.category === category).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl border-muted">
                    <p className="text-sm text-muted-foreground italic">No settings found in this category.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
