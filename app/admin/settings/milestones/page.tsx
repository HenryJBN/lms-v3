"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { milestonesService, type Milestone } from "@/lib/services/milestones"
import { useToast } from "@/hooks/use-toast"

const BADGE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#14b8a6"]

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

export default function GlobalMilestonesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Milestone | null>(null)

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "progress" as const,
    threshold_value: 5,
    threshold_type: "courses",
    reward_type: "tokens" as const,
    reward_value: 50,
    badge_color: "#6366f1",
    celebration_message: "",
    is_active: true,
  })

  // Fetch global milestones (course_id = null or "global")
  const { data: milestonesData, isLoading } = useQuery({
    queryKey: ["global-milestones"],
    queryFn: async () => {
      // Fetch all milestones and filter for global ones (no course_id)
      const result = await milestonesService.getMyMilestones(undefined, 1, 100)
      // For admin, we need a different approach - let's fetch course milestones with a special flag
      // For now, we'll use the course milestones endpoint with a placeholder
      return { items: [], total: 0 }
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof form) => milestonesService.createMilestone({
      ...data,
      course_id: undefined, // No course_id = global milestone
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
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
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
    setForm({
      name: "",
      description: "",
      type: "progress",
      threshold_type: "courses",
      threshold_value: 5,
      reward_type: "tokens",
      reward_value: 50,
      badge_color: "#6366f1",
      celebration_message: "",
      is_active: true,
    })
  }

  const handleEdit = (milestone: Milestone) => {
    setEditing(milestone)
    setForm({
      name: milestone.name,
      description: milestone.description || "",
      type: milestone.type as "progress",
      threshold_type: milestone.threshold_type,
      threshold_value: milestone.threshold_value,
      reward_type: milestone.reward_type as "tokens",
      reward_value: milestone.reward_value,
      badge_color: milestone.badge_color,
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Global Milestones</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Configure platform-wide achievements for all courses
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Global Milestone
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Award className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">About Global Milestones</p>
              <p className="text-sm text-muted-foreground mt-1">
                Global milestones apply across all courses on your platform. Users earn these achievements
                based on their overall learning progress, not just a single course. Examples include 
                completing multiple courses, maintaining learning streaks, or reaching total learning time goals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : milestones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No global milestones yet</h3>
            <p className="text-muted-foreground mt-2 mb-4">
              Create platform-wide achievements to motivate your learners
            </p>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Global Milestone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {milestones.map((milestone) => (
            <Card key={milestone.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl shrink-0"
                  style={{ backgroundColor: milestone.badge_color }}
                >
                  <Globe className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{milestone.name}</h3>
                    {!milestone.is_active && (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {milestone.description || `${milestone.threshold_value} ${milestone.threshold_type}`}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Threshold: {milestone.threshold_value}</span>
                    <span>Reward: {milestone.reward_value} {milestone.reward_type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={milestone.is_active}
                    onCheckedChange={(checked) => {
                      updateMutation.mutate({
                        id: milestone.id,
                        data: { is_active: checked }
                      })
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={() => handleEdit(milestone)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingId(milestone.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Example Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Suggested Global Milestones</CardTitle>
          <CardDescription>Quick-start templates you can create</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "First Course", desc: "Complete 1 course", threshold: 1, type: "progress", icon: BookOpen, color: "#10b981" },
              { name: "Dedicated Learner", desc: "Complete 5 courses", threshold: 5, type: "progress", icon: Trophy, color: "#f59e0b" },
              { name: "Week Warrior", desc: "7-day learning streak", threshold: 7, type: "streak", icon: Flame, color: "#ef4444" },
              { name: "Time Master", desc: "100 hours of learning", threshold: 6000, type: "time", icon: Clock, color: "#8b5cf6" },
            ].map((example, i) => (
              <Card key={i} className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setForm({
                    ...form,
                    name: example.name,
                    description: example.desc,
                    type: example.type as "progress",
                    threshold_value: example.threshold,
                    badge_color: example.color,
                  })
                  setIsCreateOpen(true)
                }}
              >
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: example.color }}>
                    <example.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{example.name}</p>
                    <p className="text-xs text-muted-foreground">{example.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Global Milestone</DialogTitle>
            <DialogDescription>
              This milestone will apply to all users across your platform
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Milestone Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Dedicated Learner"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g., Complete 5 courses to earn this achievement"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Milestone Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as "progress" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GLOBAL_MILESTONE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{getThresholdLabel(form.type)}</Label>
                <Input
                  type="number"
                  value={form.threshold_value}
                  onChange={(e) => setForm({ ...form, threshold_value: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reward Type</Label>
                <Select
                  value={form.reward_type}
                  onValueChange={(v) => setForm({ ...form, reward_type: v as "tokens" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REWARD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reward Value</Label>
                <Input
                  type="number"
                  value={form.reward_value}
                  onChange={(e) => setForm({ ...form, reward_value: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Badge Color</Label>
              <div className="flex gap-2 mt-2">
                {BADGE_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full transition-all ${
                      form.badge_color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, badge_color: c })}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Celebration Message (Optional)</Label>
              <Input
                value={form.celebration_message}
                onChange={(e) => setForm({ ...form, celebration_message: e.target.value })}
                placeholder="e.g., Amazing! You're on fire! 🔥"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.name}
            >
              {createMutation.isPending ? "Creating..." : "Create Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Global Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Milestone Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Threshold</Label>
                <Input
                  type="number"
                  value={form.threshold_value}
                  onChange={(e) => setForm({ ...form, threshold_value: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Reward Value</Label>
                <Input
                  type="number"
                  value={form.reward_value}
                  onChange={(e) => setForm({ ...form, reward_value: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Badge Color</Label>
              <div className="flex gap-2 mt-2">
                {BADGE_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full transition-all ${
                      form.badge_color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, badge_color: c })}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editing && updateMutation.mutate({ id: editing.id, data: form })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Global Milestone?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}