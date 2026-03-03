"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { ArrowLeft, Plus, Sparkles, Edit, Trash2, Award, Loader2 } from "lucide-react"
import { milestonesService, type Milestone } from "@/lib/services/milestones"
import { useToast } from "@/hooks/use-toast"

const BADGE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#3b82f6"]

export default function MilestonesPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const courseId = params.courseId as string

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAutoOpen, setIsAutoOpen] = useState(false)
  const [editing, setEditing] = useState<Milestone | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "", description: "", type: "progress" as const,
    threshold_value: 25, reward_type: "tokens" as const,
    reward_value: 10, badge_color: "#6366f1", celebration_message: "",
  })

  const { data, isLoading } = useQuery({
    queryKey: ["milestones", courseId],
    queryFn: () => milestonesService.getCourseMilestones(courseId),
  })

  const createMut = useMutation({
    mutationFn: (d: typeof form) => milestonesService.createMilestone({ ...d, course_id: courseId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["milestones", courseId] }); setIsCreateOpen(false); reset(); toast({ title: "Created!" }) },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) => milestonesService.updateMilestone(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["milestones", courseId] }); setIsEditOpen(false); setEditing(null); reset(); toast({ title: "Updated!" }) },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => milestonesService.deleteMilestone(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["milestones", courseId] }); setDeletingId(null); toast({ title: "Deleted!" }) },
  })

  const autoMut = useMutation({
    mutationFn: () => milestonesService.autoGenerateMilestones({ course_id: courseId, generate_section_milestones: true }),
    onSuccess: (r) => { queryClient.invalidateQueries({ queryKey: ["milestones", courseId] }); setIsAutoOpen(false); toast({ title: `Created ${r.created_count} milestones!` }) },
  })

  const reset = () => setForm({ name: "", description: "", type: "progress", threshold_value: 25, reward_type: "tokens", reward_value: 10, badge_color: "#6366f1", celebration_message: "" })

  const handleEdit = (m: Milestone) => {
    setEditing(m)
    setForm({ name: m.name, description: m.description || "", type: m.type as "progress", threshold_value: m.threshold_value, reward_type: m.reward_type as "tokens", reward_value: m.reward_value, badge_color: m.badge_color, celebration_message: m.celebration_message || "" })
    setIsEditOpen(true)
  }

  const milestones = data?.items || []

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-bold">Milestones</h1><p className="text-muted-foreground">Manage course achievements</p></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAutoOpen(true)}><Sparkles className="h-4 w-4 mr-2" />Auto-Generate</Button>
          <Button onClick={() => { reset(); setIsCreateOpen(true) }}><Plus className="h-4 w-4 mr-2" />Add</Button>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : milestones.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No milestones yet</h3>
          <p className="text-muted-foreground mt-2">Create milestones or auto-generate them</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {milestones.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl shrink-0" style={{ backgroundColor: m.badge_color }}>{m.is_auto_created ? "🎯" : "🏆"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><h3 className="font-semibold truncate">{m.name}</h3>{m.is_auto_created && <Badge variant="secondary">Auto</Badge>}</div>
                  <p className="text-sm text-muted-foreground truncate">{m.description || `${m.threshold_value}% ${m.type}`}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground"><span>Type: {m.type}</span><span>Reward: {m.reward_value} {m.reward_type}</span></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(m)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => setDeletingId(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Milestone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "progress" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="progress">Progress %</SelectItem><SelectItem value="section">Section</SelectItem><SelectItem value="lesson">Lesson</SelectItem><SelectItem value="time">Time</SelectItem></SelectContent></Select></div>
              <div><Label>Threshold</Label><Input type="number" value={form.threshold_value} onChange={(e) => setForm({ ...form, threshold_value: parseInt(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Reward Type</Label><Select value={form.reward_type} onValueChange={(v) => setForm({ ...form, reward_type: v as "tokens" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tokens">Tokens</SelectItem><SelectItem value="gift_card">Gift Card</SelectItem><SelectItem value="airtime_voucher">Airtime</SelectItem></SelectContent></Select></div>
              <div><Label>Reward Value</Label><Input type="number" value={form.reward_value} onChange={(e) => setForm({ ...form, reward_value: parseFloat(e.target.value) })} /></div>
            </div>
            <div><Label>Badge Color</Label><div className="flex gap-2 mt-2">{BADGE_COLORS.map((c) => <button key={c} className={`w-8 h-8 rounded-full ${form.badge_color === c ? "ring-2 ring-offset-2" : ""}`} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, badge_color: c })} />)}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button><Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>{createMut.isPending ? "Creating..." : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Milestone</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Threshold</Label><Input type="number" value={form.threshold_value} onChange={(e) => setForm({ ...form, threshold_value: parseInt(e.target.value) })} /></div>
              <div><Label>Reward Value</Label><Input type="number" value={form.reward_value} onChange={(e) => setForm({ ...form, reward_value: parseFloat(e.target.value) })} /></div>
            </div>
            <div><Label>Badge Color</Label><div className="flex gap-2 mt-2">{BADGE_COLORS.map((c) => <button key={c} className={`w-8 h-8 rounded-full ${form.badge_color === c ? "ring-2 ring-offset-2" : ""}`} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, badge_color: c })} />)}</div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button><Button onClick={() => editing && updateMut.mutate({ id: editing.id, data: form })} disabled={updateMut.isPending}>{updateMut.isPending ? "Saving..." : "Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Generate Dialog */}
      <Dialog open={isAutoOpen} onOpenChange={setIsAutoOpen}>
        <DialogContent><DialogHeader><DialogTitle>Auto-Generate Milestones</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">This will create default milestones at 10%, 25%, 50%, 75%, and 100% completion with token rewards. Section completion milestones will also be created.</p>
          <DialogFooter><Button variant="outline" onClick={() => setIsAutoOpen(false)}>Cancel</Button><Button onClick={() => autoMut.mutate()} disabled={autoMut.isPending}>{autoMut.isPending ? "Generating..." : "Generate"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Milestone?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deletingId && deleteMut.mutate(deletingId)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}