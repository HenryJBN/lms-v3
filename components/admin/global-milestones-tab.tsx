"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { MilestoneCreateSchema, MilestoneUpdateSchema, type MilestoneCreateForm, type MilestoneUpdateForm } from "@/lib/schemas/milestones"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Globe, Plus, Edit, Trash2, Award, Loader2, Clock, BookOpen, Trophy, Flame } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { milestonesService, type Milestone } from "@/lib/services/milestones"
import { useToast } from "@/hooks/use-toast"
import { IconPicker } from "@/components/ui/icon-picker"

const GLOBAL_MILESTONE_TYPES = [
  { value: "progress", label: "Total Courses Completed", description: "Based on number of courses completed", icon: BookOpen },
  { value: "time", label: "Total Learning Time", description: "Based on total hours spent learning", icon: Clock },
  { value: "streak", label: "Learning Streak", description: "Based on consecutive days of learning", icon: Flame },
  { value: "lesson", label: "Total Certificates", description: "Based on certificates earned", icon: Trophy },
]

const REWARD_TYPES = [
  { value: "tokens", label: "Tokens" },
  { value: "gift_card", label: "Gift Card" },
  { value: "airtime_voucher", label: "Airtime Voucher" },
  { value: "certificate_bonus", label: "Certificate Bonus" },
]

export function GlobalMilestonesTab() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Milestone | null>(null)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<MilestoneCreateForm>({
    resolver: zodResolver(MilestoneCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "progress",
      threshold_value: 5,
      threshold_type: "courses",
      reward_type: "tokens",
      reward_value: 50,
      badge_color: "#6366f1",
      badge_icon: undefined,
      badge_image_url: undefined,
      celebration_message: "",
      is_active: true,
    },
  })

  // Watch values for conditional rendering if needed or for the suggested templates
  const formValues = watch()

  // Fetch global milestones
  const { data: milestonesData, isLoading } = useQuery({
    queryKey: ["global-milestones"],
    queryFn: async () => {
      const result = await milestonesService.getMyMilestones(undefined, 1, 100)
      return { items: [], total: 0 }
    },
  })

  // Create mutation
const createMutation = useMutation({
  mutationFn: (data: MilestoneCreateForm) => milestonesService.createMilestone({
    ...data,
    course_id: undefined,
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["global-milestones"] })
    setIsCreateOpen(false)
    resetForm()
    toast({ title: "Global milestone created!" })
  },
  onError: (e: any) => {
    toast({ title: "Error", description: e.message, variant: "destructive" })
  },
})

  // Update mutation
const updateMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: Partial<MilestoneUpdateForm> }) =>
    milestonesService.updateMilestone(id, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["global-milestones"] })
    setIsEditOpen(false)
    setEditing(null)
    resetForm()
    toast({ title: "Milestone updated!" })
  },
  onError: (e: any) => {
    toast({ title: "Error", description: e.message, variant: "destructive" })
  },
})

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => milestonesService.deleteMilestone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-milestones"] })
      setDeletingId(null)
      toast({ title: "Milestone deleted!" })
    },
  })

const resetForm = () => {
  reset({
    name: "",
    description: "",
    type: "progress",
    threshold_type: "courses",
    threshold_value: 5,
    reward_type: "tokens",
    reward_value: 50,
    badge_color: "#6366f1",
    badge_icon: undefined,
    badge_image_url: undefined,
    celebration_message: "",
    is_active: true,
  })
}

const handleEdit = (milestone: Milestone) => {
  setEditing(milestone)
  reset({
    name: milestone.name,
    description: milestone.description || "",
    type: milestone.type as any,
    threshold_type: milestone.threshold_type as any,
    threshold_value: milestone.threshold_value,
    reward_type: milestone.reward_type as any,
    reward_value: milestone.reward_value,
    badge_color: milestone.badge_color,
    badge_icon: milestone.badge_icon || undefined,
    badge_image_url: milestone.badge_image_url || undefined,
    celebration_message: milestone.celebration_message || "",
    is_active: milestone.is_active,
  })
  setIsEditOpen(true)
}

  const getThresholdLabel = (type: string) => {
    switch (type) {
      case "progress": return "Courses to complete"
      case "time": return "Minutes of learning"
      case "streak": return "Consecutive days"
      case "lesson": return "Certificates to earn"
      default: return "Threshold"
    }
  }

  const milestones: Milestone[] = milestonesData?.items || []

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Global Milestones</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Platform-wide achievements for all courses
            </p>
          </div>
          <Button onClick={() => { resetForm(); setIsCreateOpen(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <Award className="h-4 w-4 text-primary mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Global milestones apply across all courses. Users earn these based on overall learning progress.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Milestones List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : milestones.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Globe className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No global milestones yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Create platform-wide achievements to motivate learners
              </p>
              <Button size="sm" onClick={() => { resetForm(); setIsCreateOpen(true) }}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Milestone
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {milestones.map((milestone) => (
              <Card key={milestone.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 overflow-hidden"
                    style={{ backgroundColor: milestone.badge_color }}
                  >
                    {milestone.badge_image_url ? (
                      <img src={milestone.badge_image_url} alt="" className="w-full h-full object-cover" />
                    ) : milestone.badge_icon && (LucideIcons as any)[milestone.badge_icon] ? (
                      React.createElement((LucideIcons as any)[milestone.badge_icon], { className: "h-5 w-5" })
                    ) : (
                      <Globe className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{milestone.name}</span>
                      {!milestone.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {milestone.description || `${milestone.threshold_value} ${milestone.threshold_type}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={milestone.is_active}
                      onCheckedChange={(checked) => {
                        updateMutation.mutate({ id: milestone.id, data: { is_active: checked } })
                      }}
                    />
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(milestone)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeletingId(milestone.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Suggested Milestones */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Quick Templates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "First Course", desc: "Complete 1 course", threshold: 1, threshold_type: "courses", type: "progress", icon: BookOpen, iconName: "BookOpen", color: "#10b981" },
              { name: "Dedicated Learner", desc: "Complete 5 courses", threshold: 5, threshold_type: "courses", type: "progress", icon: Trophy, iconName: "Trophy", color: "#f59e0b" },
              { name: "Week Warrior", desc: "7-day streak", threshold: 7, threshold_type: "days", type: "streak", icon: Flame, iconName: "Flame", color: "#ef4444" },
              { name: "Time Master", desc: "100 hours learning", threshold: 6000, threshold_type: "minutes", type: "time", icon: Clock, iconName: "Clock", color: "#8b5cf6" },
            ].map((example, i) => (
              <Button
                key={i}
                variant="outline"
                className="h-auto py-2 justify-start"
                  onClick={() => {
                    reset({
                      ...formValues,
                      name: example.name,
                      description: example.desc,
                      type: example.type as any,
                      threshold_type: example.threshold_type as any,
                      threshold_value: example.threshold,
                      badge_icon: example.iconName,
                      badge_color: example.color,
                    })
                    setIsCreateOpen(true)
                  }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white mr-2 shrink-0"
                  style={{ backgroundColor: example.color }}>
                  <example.icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium">{example.name}</p>
                  <p className="text-xs text-muted-foreground">{example.desc}</p>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Global Milestone</DialogTitle>
            <DialogDescription>This will apply to all users platform-wide</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input {...register("name")} placeholder="e.g., Dedicated Learner" />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Description</Label>
              <Input {...register("description")} placeholder="e.g., Complete 5 courses" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GLOBAL_MILESTONE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label>{getThresholdLabel(formValues.type)}</Label>
                <Input type="number" {...register("threshold_value")} />
                {errors.threshold_value && <p className="text-xs text-destructive mt-1">{errors.threshold_value.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reward Type</Label>
                <Controller
                  name="reward_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {REWARD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label>Reward Value</Label>
                <Input type="number" {...register("reward_value")} />
                {errors.reward_value && <p className="text-xs text-destructive mt-1">{errors.reward_value.message}</p>}
              </div>
            </div>
            <div>
              <Label>Badge</Label>
              <Controller
                name="badge_icon"
                control={control}
                render={({ field: iconField }) => (
                  <Controller
                    name="badge_color"
                    control={control}
                    render={({ field: colorField }) => (
                      <Controller
                        name="badge_image_url"
                        control={control}
                        render={({ field: imageField }) => (
                          <IconPicker
                            value={iconField.value ?? null}
                            onChange={(icon) => iconField.onChange(icon ?? undefined)}
                            iconColor={colorField.value}
                            onColorChange={colorField.onChange}
                            imageUrl={imageField.value ?? null}
                            onImageUrlChange={(url) => imageField.onChange(url ?? undefined)}
                            onUpload={milestonesService.uploadBadgeImage.bind(milestonesService)}
                          />
                        )}
                      />
                    ) }
                  />
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Milestone</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((data) => editing && updateMutation.mutate({ id: editing.id, data }))} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label>Description</Label>
              <Input {...register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Threshold</Label>
                <Input type="number" {...register("threshold_value")} />
                {errors.threshold_value && <p className="text-xs text-destructive mt-1">{errors.threshold_value.message}</p>}
              </div>
              <div>
                <Label>Reward Value</Label>
                <Input type="number" {...register("reward_value")} />
                {errors.reward_value && <p className="text-xs text-destructive mt-1">{errors.reward_value.message}</p>}
              </div>
            </div>
            <div>
              <Label>Badge</Label>
              <Controller
                name="badge_icon"
                control={control}
                render={({ field: iconField }) => (
                  <Controller
                    name="badge_color"
                    control={control}
                    render={({ field: colorField }) => (
                      <Controller
                        name="badge_image_url"
                        control={control}
                        render={({ field: imageField }) => (
                          <IconPicker
                            value={iconField.value ?? null}
                            onChange={(icon) => iconField.onChange(icon ?? undefined)}
                            iconColor={colorField.value}
                            onColorChange={colorField.onChange}
                            imageUrl={imageField.value ?? null}
                            onImageUrlChange={(url) => imageField.onChange(url ?? undefined)}
                            onUpload={milestonesService.uploadBadgeImage.bind(milestonesService)}
                          />
                        )}
                      />
                    ) }
                  />
                )}
              />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label>Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this milestone?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && deleteMutation.mutate(deletingId)} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}