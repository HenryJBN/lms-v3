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

export function GlobalMilestonesTab() {
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
    mutationFn: (data: typeof form) => milestonesService.createMilestone({
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
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: milestone.badge_color }}
                  >
                    <Globe className="h-5 w-5" />
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
              { name: "First Course", desc: "Complete 1 course", threshold: 1, type: "progress", icon: BookOpen, color: "#10b981" },
              { name: "Dedicated Learner", desc: "Complete 5 courses", threshold: 5, type: "progress", icon: Trophy, color: "#f59e0b" },
              { name: "Week Warrior", desc: "7-day streak", threshold: 7, type: "streak", icon: Flame, color: "#ef4444" },
              { name: "Time Master", desc: "100 hours learning", threshold: 6000, type: "time", icon: Clock, color: "#8b5cf6" },
            ].map((example, i) => (
              <Button
                key={i}
                variant="outline"
                className="h-auto py-2 justify-start"
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
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Dedicated Learner" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g., Complete 5 courses" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "progress" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GLOBAL_MILESTONE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{getThresholdLabel(form.type)}</Label>
                <Input type="number" value={form.threshold_value} onChange={(e) => setForm({ ...form, threshold_value: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reward Type</Label>
                <Select value={form.reward_type} onValueChange={(v) => setForm({ ...form, reward_type: v as "tokens" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REWARD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reward Value</Label>
                <Input type="number" value={form.reward_value} onChange={(e) => setForm({ ...form, reward_value: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Badge Color</Label>
              <div className="flex gap-2 mt-2">
                {BADGE_COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`w-8 h-8 rounded-full ${form.badge_color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, badge_color: c })} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Milestone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Threshold</Label>
                <Input type="number" value={form.threshold_value} onChange={(e) => setForm({ ...form, threshold_value: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>Reward Value</Label>
                <Input type="number" value={form.reward_value} onChange={(e) => setForm({ ...form, reward_value: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Badge Color</Label>
              <div className="flex gap-2 mt-2">
                {BADGE_COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`w-8 h-8 rounded-full ${form.badge_color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, badge_color: c })} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={() => editing && updateMutation.mutate({ id: editing.id, data: form })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
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