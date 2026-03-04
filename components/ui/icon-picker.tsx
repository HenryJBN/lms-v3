"use client"

import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageUpload } from "@/components/admin/image-upload"

// Popular icons for milestones
const MILESTONE_ICONS = [
  "Trophy", "Award", "Medal", "Crown", "Star", "Sparkles", "Zap", "Flame",
  "BookOpen", "GraduationCap", "Lightbulb", "Brain", "Target", "Flag",
  "TrendingUp", "BarChart", "CheckCircle", "CheckSquare", "CircleCheck",
  "Clock", "Timer", "Calendar", "CalendarCheck", "Hourglass",
  "Gem", "Diamond", "Rocket", "Heart", "ThumbsUp", "BadgeCheck", "ShieldCheck",
]

const BADGE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#f59e0b", "#10b981", "#14b8a6", "#3b82f6", "#64748b",
]

interface IconPickerProps {
  value: string | null
  onChange: (value: string | null) => void
  iconColor?: string
  onColorChange?: (color: string) => void
  imageUrl?: string | null
  onImageUrlChange?: (url: string | null) => void
  onUpload?: (file: File) => Promise<{ url: string } | null>
  className?: string
}

export function IconPicker({
  value,
  onChange,
  iconColor = "#6366f1",
  onColorChange,
  imageUrl,
  onImageUrlChange,
  onUpload,
  className,
}: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"icon" | "upload">("icon")

  // Get icon component by name
  const getIconComponent = (iconName: string): React.ComponentType<{ className?: string }> | null => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>
    return icons[iconName] || null
  }

  // Filter icons by search
  const filteredIcons = useMemo(() => {
    if (!search) return MILESTONE_ICONS
    return MILESTONE_ICONS.filter((name) =>
      name.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  // Render preview
  const renderPreview = () => {
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt="Badge"
          className="w-10 h-10 rounded-full object-cover"
        />
      )
    }
    if (value && value !== "") {
      const IconComponent = getIconComponent(value)
      if (IconComponent) {
        return (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: iconColor }}
          >
            <IconComponent className="h-5 w-5 text-white" />
          </div>
        )
      }
    }
    return (
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: iconColor }}
      >
        <LucideIcons.Award className="h-5 w-5 text-white" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-10 h-10 p-0">
              {renderPreview()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "icon" | "upload")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="icon">Icon Library</TabsTrigger>
                <TabsTrigger value="upload">Upload Image</TabsTrigger>
              </TabsList>

              <TabsContent value="icon" className="space-y-3">
                <Input
                  placeholder="Search icons..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mt-2"
                />
                
                <ScrollArea className="h-48">
                  <div className="grid grid-cols-5 gap-2">
                    {filteredIcons.map((iconName) => {
                      const IconComponent = getIconComponent(iconName)
                      if (!IconComponent) return null
                      return (
                        <button
                          key={iconName}
                          type="button"
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-105",
                            value === iconName
                              ? "ring-2 ring-primary bg-primary/10"
                              : "bg-muted hover:bg-muted/80"
                          )}
                          style={{ backgroundColor: value === iconName ? iconColor : undefined }}
                          onClick={() => {
                            onChange(iconName)
                            onImageUrlChange?.(null)
                            setOpen(false)
                          }}
                          title={iconName}
                        >
                          <IconComponent className={cn("h-5 w-5", value === iconName && "text-white")} />
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>

                {/* Color Selection */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Badge Color</p>
                  <div className="flex gap-1 flex-wrap">
                    {BADGE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={cn(
                          "w-6 h-6 rounded-full transition-all",
                          iconColor === color && "ring-2 ring-offset-2 ring-primary"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => onColorChange?.(color)}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="space-y-3">
                <ImageUpload
                  value={imageUrl ?? null}
                  onChange={(url) => {
                    onImageUrlChange?.(url ?? null)
                    onChange(null)
                  }}
                  onUpload={onUpload}
                  label="Badge Image"
                />
                <p className="text-xs text-muted-foreground">
                  Upload a custom badge image. Recommended: square image, 128x128px or larger.
                </p>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        {/* Quick color selection outside popover */}
        {onColorChange && (
          <div className="flex gap-1">
            {BADGE_COLORS.slice(0, 5).map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "w-6 h-6 rounded-full transition-all",
                  iconColor === color && "ring-2 ring-offset-1 ring-primary scale-110"
                )}
                style={{ backgroundColor: color }}
                onClick={() => onColorChange(color)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}