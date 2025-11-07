"use client"

import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"

interface BulkAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: "default" | "outline" | "destructive"
}

interface BulkActionsProps {
  selectedCount: number
  actions: BulkAction[]
}

export function BulkActions({ selectedCount, actions }: BulkActionsProps) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-lg">
      <span className="text-sm text-muted-foreground">{selectedCount} item(s) selected</span>
      {actions.map((action, index) => (
        <Button
          key={index}
          size="sm"
          variant={action.variant || "outline"}
          onClick={action.onClick}
        >
          <action.icon className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      ))}
    </div>
  )
}
