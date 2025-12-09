"use client"

import type React from "react"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ChevronUp, ChevronDown } from "lucide-react"

interface Column {
  key: string
  label: string
  sortable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}

interface Action {
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: (row: any) => void
  variant?: "default" | "destructive"
  render?: (row: any) => React.ReactNode
}

interface DataTableProps {
  data: any[]
  columns: Column[]
  actions?: Action[]
  selectable?: boolean
  onSelectionChange?: (selectedIds: string[]) => void
  sortField?: string
  sortDirection?: "asc" | "desc"
  onSort?: (field: string, direction: "asc" | "desc") => void
  loading?: boolean
}

export function DataTable({
  data,
  columns,
  actions = [],
  selectable = false,
  onSelectionChange,
  sortField,
  sortDirection,
  onSort,
}: DataTableProps) {
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  const handleSelectAll = (checked: boolean) => {
    const newSelection = checked ? data.map((row) => row.id) : []
    setSelectedRows(newSelection)
    onSelectionChange?.(newSelection)
  }

  const handleSelectRow = (rowId: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedRows, rowId]
      : selectedRows.filter((id) => id !== rowId)
    setSelectedRows(newSelection)
    onSelectionChange?.(newSelection)
  }

  const handleSort = (field: string) => {
    if (!onSort) return
    const newDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc"
    onSort(field, newDirection)
  }

  const renderCellValue = (column: Column, row: any) => {
    const value = row[column.key]

    if (column.render) {
      return column.render(value, row)
    }

    // Default rendering for common data types
    if (typeof value === "boolean") {
      return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
    }

    if (Array.isArray(value)) {
      return value.join(", ")
    }

    return value
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedRows.length === data.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead key={column.key}>
                {column.sortable ? (
                  <Button
                    variant="ghost"
                    onClick={() => handleSort(column.key)}
                    className="h-auto p-0 font-medium"
                  >
                    {column.label}
                    {sortField === column.key &&
                      (sortDirection === "asc" ? (
                        <ChevronUp className="ml-2 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-2 h-4 w-4" />
                      ))}
                  </Button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
            {actions.length > 0 && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              {selectable && (
                <TableCell>
                  <Checkbox
                    checked={selectedRows.includes(row.id)}
                    onCheckedChange={(checked) => handleSelectRow(row.id, checked as boolean)}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.key}>{renderCellValue(column, row)}</TableCell>
              ))}
              {actions.length > 0 && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action, index) => (
                        <div key={index}>
                          {action.render ? (
                            action.render(row)
                          ) : (
                            <DropdownMenuItem
                              onClick={() => action.onClick(row)}
                              className={action.variant === "destructive" ? "text-destructive" : ""}
                            >
                              <action.icon className="mr-2 h-4 w-4" />
                              {action.label}
                            </DropdownMenuItem>
                          )}
                          {index < actions.length - 1 && action.variant === "destructive" && (
                            <DropdownMenuSeparator />
                          )}
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
