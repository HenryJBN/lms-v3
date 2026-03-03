"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Gift, Sparkles, Award, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { milestonesService, type MilestoneCelebration, type Milestone, type UserMilestone } from "@/lib/services/milestones"

interface MilestoneCelebrationModalProps {
  celebration: MilestoneCelebration | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClaimReward?: (milestoneId: string) => Promise<void>
  onNextMilestone?: () => void
}

// Confetti particle component
function ConfettiParticle({ color, delay, x }: { color: string; delay: number; x: number }) {
  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ 
        backgroundColor: color,
        left: `${x}%`,
        top: -20,
      }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: [0, 600],
        opacity: [1, 1, 0],
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
      }}
      transition={{
        duration: 3,
        delay,
        ease: "easeOut",
      }}
    />
  )
}

// Badge display component
function MilestoneBadge({ milestone, size = "large" }: { milestone: Milestone; size?: "small" | "large" }) {
  const icon = milestonesService.getBadgeIcon(milestone)
  const sizeClasses = size === "large" ? "w-24 h-24 text-4xl" : "w-12 h-12 text-xl"
  
  return (
    <motion.div
      className={`${sizeClasses} rounded-full flex items-center justify-center shadow-lg`}
      style={{ backgroundColor: milestone.badge_color || "#6366f1" }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", duration: 0.8, delay: 0.2 }}
    >
      <span className="text-white">{icon}</span>
    </motion.div>
  )
}

export function MilestoneCelebrationModal({
  celebration,
  open,
  onOpenChange,
  onClaimReward,
  onNextMilestone,
}: MilestoneCelebrationModalProps) {
  const [isClaiming, setIsClaiming] = useState(false)
  const [isClaimed, setIsClaimed] = useState(false)
  const [confettiColors] = useState(() => [
    "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"
  ])

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: confettiColors[i % confettiColors.length],
    delay: Math.random() * 0.5,
    x: Math.random() * 100,
  }))

  useEffect(() => {
    if (open && celebration) {
      // Reset claim state when modal opens with new celebration
      setIsClaimed(celebration.user_milestone.reward_claimed)
    }
  }, [open, celebration])

  const handleClaimReward = async () => {
    if (!celebration || !onClaimReward) return
    
    setIsClaiming(true)
    try {
      await onClaimReward(celebration.milestone.id)
      setIsClaimed(true)
    } catch (error) {
      console.error("Failed to claim reward:", error)
    } finally {
      setIsClaiming(false)
    }
  }

  if (!celebration) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        {/* Confetti animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confettiParticles.map((particle) => (
            <ConfettiParticle
              key={particle.id}
              color={particle.color}
              delay={particle.delay}
              x={particle.x}
            />
          ))}
        </div>

        <DialogHeader className="text-center items-center pt-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <DialogTitle className="text-2xl font-bold text-center">
              {celebration.celebration_title}
            </DialogTitle>
          </motion.div>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          {/* Badge */}
          <MilestoneBadge milestone={celebration.milestone} />

          {/* Milestone name */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <h3 className="text-xl font-semibold">{celebration.milestone.name}</h3>
            <p className="text-muted-foreground mt-1">
              {celebration.celebration_message}
            </p>
          </motion.div>

          {/* Reward section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="w-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reward</p>
                  <p className="font-semibold">{celebration.reward_description}</p>
                </div>
              </div>
              
              {!isClaimed && celebration.milestone.reward_type === 'tokens' && (
                <Button
                  onClick={handleClaimReward}
                  disabled={isClaiming}
                  size="sm"
                  className="bg-gradient-to-r from-indigo-500 to-purple-500"
                >
                  {isClaiming ? "Claiming..." : "Claim"}
                </Button>
              )}
              
              {isClaimed && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Claimed!
                </Badge>
              )}
            </div>
          </motion.div>

          {/* Next milestone teaser */}
          {celebration.next_milestone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="w-full text-center"
            >
              <p className="text-sm text-muted-foreground mb-2">Next milestone:</p>
              <Button
                variant="outline"
                onClick={onNextMilestone}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <MilestoneBadge milestone={celebration.next_milestone} size="small" />
                  <span>{celebration.next_milestone.name}</span>
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>

        <div className="flex justify-center pb-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Continue Learning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Lightweight badge component for profile display
export function MilestoneBadgeDisplay({ 
  milestone, 
  achievedAt,
  showDate = true,
  size = "default"
}: { 
  milestone: Milestone
  achievedAt?: string
  showDate?: boolean
  size?: "small" | "default" | "large"
}) {
  const icon = milestonesService.getBadgeIcon(milestone)
  
  const sizeClasses = {
    small: "w-8 h-8 text-sm",
    default: "w-12 h-12 text-xl",
    large: "w-16 h-16 text-2xl"
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center shadow-md`}
        style={{ backgroundColor: milestone.badge_color || "#6366f1" }}
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <span className="text-white">{icon}</span>
      </motion.div>
      
      {showDate && achievedAt && (
        <span className="text-xs text-muted-foreground">
          {new Date(achievedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  )
}

export default MilestoneCelebrationModal