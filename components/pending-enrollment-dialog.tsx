"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, BookOpen, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { getPendingEnrollment, clearPendingEnrollment, type PendingEnrollment } from "@/lib/utils/enrollment"
import { enrollmentsService } from "@/lib/services/enrollments"

interface PendingEnrollmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingEnrollment: PendingEnrollment | null
}

export function PendingEnrollmentDialog({
  open,
  onOpenChange,
  pendingEnrollment,
}: PendingEnrollmentDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => enrollmentsService.enrollInCourse(courseId),
    onSuccess: () => {
      toast({ 
        title: "Enrollment Successful!", 
        description: `You have been enrolled in "${pendingEnrollment?.courseTitle}".` 
      })
      queryClient.invalidateQueries({ queryKey: ["enrollments"] })
      clearPendingEnrollment()
      onOpenChange(false)
      
      // Route to the learn page after successful enrollment
      if (pendingEnrollment?.courseSlug) {
        router.push(`/learn/${pendingEnrollment.courseSlug}`)
      }
    },
    onError: (err: any) => {
      toast({ 
        title: "Enrollment Failed", 
        description: err.message || "Failed to complete enrollment. Please try again.", 
        variant: "destructive" 
      })
    },
  })

  const handleEnroll = () => {
    if (!pendingEnrollment) return
    enrollMutation.mutate(String(pendingEnrollment.courseId))
  }

  const handleDismiss = () => {
    clearPendingEnrollment()
    onOpenChange(false)
  }

  const handleViewCourses = () => {
    clearPendingEnrollment()
    onOpenChange(false)
    router.push("/courses")
  }

  if (!pendingEnrollment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Complete Your Enrollment
          </DialogTitle>
          <DialogDescription>
            You were about to enroll in a course before creating your account.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <BookOpen className="h-8 w-8 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">
                {pendingEnrollment.courseTitle}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Would you like to complete your enrollment now?
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleViewCourses}
            disabled={enrollMutation.isPending}
          >
            Maybe Later
          </Button>
          <Button 
            onClick={handleEnroll}
            disabled={enrollMutation.isPending}
          >
            {enrollMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enrolling...
              </>
            ) : (
              "Complete Enrollment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to manage pending enrollment dialog state
 */
export function usePendingEnrollment() {
  const [pendingEnrollment, setPendingEnrollment] = useState<PendingEnrollment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    // Check for pending enrollment on mount (after user logs in/registers)
    const pending = getPendingEnrollment()
    if (pending) {
      setPendingEnrollment(pending)
      setDialogOpen(true)
    }
  }, [])

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      // Clear the pending enrollment when dialog closes
      clearPendingEnrollment()
      setPendingEnrollment(null)
    }
  }

  return {
    pendingEnrollment,
    dialogOpen,
    setDialogOpen: handleOpenChange,
  }
}
