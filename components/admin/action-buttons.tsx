"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, Upload, type LucideIcon } from "lucide-react"

interface ActionButton {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: "default" | "outline" | "destructive"
}

interface ActionButtonsProps {
  primaryAction?: ActionButton
  exportActions?: { label: string; onClick: () => void }[]
  importActions?: { label: string; onClick: () => void }[]
  customActions?: ActionButton[]
}

export function ActionButtons({
  primaryAction,
  exportActions = [],
  importActions = [],
  customActions = [],
}: ActionButtonsProps) {
  return (
    <div className="flex items-center space-x-2">
      {customActions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || "outline"}
          size="sm"
          onClick={action.onClick}
        >
          <action.icon className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      ))}

      {exportActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {exportActions.map((action, index) => (
              <DropdownMenuItem key={index} onClick={action.onClick}>
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {importActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {importActions.map((action, index) => (
              <DropdownMenuItem key={index} onClick={action.onClick}>
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {primaryAction && (
        <Button size="sm" onClick={primaryAction.onClick}>
          <primaryAction.icon className="mr-2 h-4 w-4" />
          {primaryAction.label}
        </Button>
      )}
    </div>
  )
}
