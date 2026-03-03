"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Award, Check, Lock, ChevronRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  milestonesService, 
  type MilestoneWithProgress, 
  type CourseMilestonesProgress 
} from "@/lib/services/milestones"

interface MilestoneProgressIndicatorProps {
  courseId: string
  currentProgress: number
  milestones?: MilestoneWithProgress[]
  onMilestoneClick?: (milestone: MilestoneWithProgress) => void
  compact?: boolean
}

export function MilestoneProgressIndicator({
  courseId,
  currentProgress,
  milestones: propMilestones,
  onMilestoneClick,
  compact = false,
}: MilestoneProgressIndicatorProps) {
  const [milestonesData, setMilestonesData] = useState<CourseMilestonesProgress | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (propMilestones) {
      return // Use provided milestones
    }
    
    // Fetch milestones progress
    const fetchMilestones = async () => {
      setIsLoading(true)
      try {
        const data = await milestonesService.getCourseMilestonesProgress(courseId)
        setMilestonesData(data)
      } catch (error) {
        console.error("Failed to fetch milestones:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMilestones()
  }, [courseId, propMilestones])

  const milestones = propMilestones || milestonesData?.milestones || []

  if (milestones.length === 0 && !isLoading) {
    return null
  }

  // Get the next unachieved milestone
  const nextMilestone = milestones.find(m => !m.is_achieved)
  const achievedCount = milestones.filter(m => m.is_achieved).length

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1">
          {milestones.slice(0, 5).map((milestone, index) => (
            <motion.div
              key={milestone.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-background",
                milestone.is_achieved 
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              style={milestone.is_achieved ? { backgroundColor: milestone.badge_color } : undefined}
            >
              {milestone.is_achieved ? (
                <Check className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
            </motion.div>
          ))}
          {milestones.length > 5 && (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
              +{milestones.length - 5}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {achievedCount}/{milestones.length} milestones
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Overall progress header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Milestones</h4>
        <Badge variant="secondary">
          {achievedCount}/{milestones.length} achieved
        </Badge>
      </div>

      {/* Milestone timeline */}
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
        
        {/* Milestones */}
        <div className="space-y-4">
          {milestones.map((milestone, index) => {
            const progressInfo = milestonesService.formatMilestoneProgress(milestone)
            const icon = milestonesService.getBadgeIcon(milestone)
            
            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-10"
              >
                {/* Milestone node */}
                <div
                  className={cn(
                    "absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 border-background",
                    milestone.is_achieved
                      ? "text-white shadow-md"
                      : progressInfo.status === 'in_progress'
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-muted text-muted-foreground"
                  )}
                  style={milestone.is_achieved ? { backgroundColor: milestone.badge_color } : undefined}
                >
                  {milestone.is_achieved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{icon}</span>
                  )}
                </div>

                {/* Milestone content */}
                <div
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    milestone.is_achieved
                      ? "bg-primary/5 border-primary/20"
                      : progressInfo.status === 'in_progress'
                        ? "bg-background border-primary/30 hover:border-primary/50"
                        : "bg-muted/30 border-muted hover:bg-muted/50"
                  )}
                  onClick={() => onMilestoneClick?.(milestone)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className={cn(
                        "text-sm font-medium",
                        !milestone.is_achieved && progressInfo.status !== 'in_progress' && "text-muted-foreground"
                      )}>
                        {milestone.name}
                      </h5>
                      {milestone.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                    
                    {milestone.is_achieved ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 shrink-0">
                        Achieved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        {milestonesService.getRewardDescription(milestone)}
                      </Badge>
                    )}
                  </div>

                  {/* Progress bar for in-progress milestones */}
                  {!milestone.is_achieved && progressInfo.status === 'in_progress' && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{progressInfo.progressText}</span>
                        <span>{Math.round(progressInfo.progressPercent)}%</span>
                      </div>
                      <Progress value={progressInfo.progressPercent} className="h-1.5" />
                    </div>
                  )}

                  {/* Achievement date */}
                  {milestone.is_achieved && milestone.user_milestone && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Achieved on {new Date(milestone.user_milestone.achieved_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Next milestone card */}
      {nextMilestone && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
              style={{ backgroundColor: nextMilestone.badge_color }}
            >
              {milestonesService.getBadgeIcon(nextMilestone)}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Next milestone</p>
              <p className="font-medium">{nextMilestone.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="font-semibold">{Math.round(nextMilestone.progress_towards)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Minimal progress bar showing milestones
export function MilestoneProgressBar({
  courseId,
  currentProgress,
  className,
}: {
  courseId: string
  currentProgress: number
  className?: string
}) {
  const [milestones, setMilestones] = useState<MilestoneWithProgress[]>([])

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const data = await milestonesService.getCourseMilestonesProgress(courseId)
        setMilestones(data.milestones)
      } catch (error) {
        console.error("Failed to fetch milestones:", error)
      }
    }

    fetchMilestones()
  }, [courseId])

  if (milestones.length === 0) {
    return null
  }

  // Sort milestones by threshold value
  const sortedMilestones = [...milestones].sort((a, b) => a.threshold_value - b.threshold_value)

  return (
    <div className={cn("relative", className)}>
      {/* Base progress bar */}
      <Progress value={currentProgress} className="h-2" />
      
      {/* Milestone markers */}
      <div className="absolute inset-0">
        {sortedMilestones.map((milestone) => {
          const position = milestone.threshold_value
          
          return (
            <div
              key={milestone.id}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${position}%` }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "w-4 h-4 rounded-full border-2 border-background flex items-center justify-center",
                  milestone.is_achieved
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground"
                )}
                style={milestone.is_achieved ? { backgroundColor: milestone.badge_color } : undefined}
                title={milestone.name}
              >
                {milestone.is_achieved && <Check className="w-2.5 h-2.5" />}
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MilestoneProgressIndicator