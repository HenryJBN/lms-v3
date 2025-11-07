"use client"

import { useState } from "react"
import { Plus, Folder, BookOpen, Users, Tag, Star, Edit, Trash2, Eye, Copy } from "lucide-react"

import { AdminLayout } from "@/components/admin/admin-layout"
import { StatsGrid } from "@/components/admin/stats-grid"
import { SearchFilters } from "@/components/admin/search-filters"
import { ActionButtons } from "@/components/admin/action-buttons"
import { DataTable } from "@/components/admin/data-table"
import { FormDialog } from "@/components/admin/form-dialog"
import { BulkActions } from "@/components/admin/bulk-actions"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

// Mock data
const mockCategories = [
  {
    id: "1",
    name: "Technology",
    slug: "technology",
    description: "Courses related to technology and programming",
    parentId: null,
    courseCount: 45,
    enrollmentCount: 1250,
    status: "active",
    featured: true,
    icon: "💻",
    color: "#3B82F6",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Blockchain",
    slug: "blockchain",
    description: "Blockchain and cryptocurrency courses",
    parentId: "1",
    courseCount: 15,
    enrollmentCount: 450,
    status: "active",
    featured: true,
    icon: "⛓️",
    color: "#F59E0B",
    createdAt: "2024-01-16",
  },
  {
    id: "3",
    name: "Creative Arts",
    slug: "creative-arts",
    description: "Design, filmmaking, and creative courses",
    parentId: null,
    courseCount: 28,
    enrollmentCount: 680,
    status: "active",
    featured: false,
    icon: "🎨",
    color: "#8B5CF6",
    createdAt: "2024-01-18",
  },
]

export default function CategoriesPage() {
  const [categories] = useState(mockCategories)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)

  // Calculate statistics
  const stats = [
    {
      title: "Total Categories",
      value: categories.length,
      description: `${categories.filter((c) => c.status === "active").length} active`,
      icon: Folder,
    },
    {
      title: "Total Courses",
      value: categories.reduce((sum, c) => sum + c.courseCount, 0),
      description: "Across all categories",
      icon: BookOpen,
    },
    {
      title: "Total Enrollments",
      value: categories.reduce((sum, c) => sum + c.enrollmentCount, 0).toLocaleString(),
      description: "Student enrollments",
      icon: Users,
    },
    {
      title: "Avg Courses/Category",
      value: Math.round(categories.reduce((sum, c) => sum + c.courseCount, 0) / categories.length),
      description: "Distribution rate",
      icon: Tag,
    },
  ]

  // Filter data
  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || category.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Table columns
  const columns = [
    {
      key: "name",
      label: "Category",
      sortable: true,
      render: (value: string, row: any) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{row.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{value}</span>
              {row.featured && (
                <Badge variant="outline" className="text-yellow-600">
                  <Star className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge variant={value === "active" ? "default" : "secondary"}>{value}</Badge>
      ),
    },
    {
      key: "courseCount",
      label: "Courses",
      sortable: true,
    },
    {
      key: "enrollmentCount",
      label: "Enrollments",
      sortable: true,
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
    },
  ]

  // Table actions
  const actions = [
    {
      label: "Edit",
      icon: Edit,
      onClick: (row: any) => {
        setEditingCategory(row)
        setIsEditDialogOpen(true)
      },
    },
    {
      label: "View Courses",
      icon: Eye,
      onClick: (row: any) => console.log("View courses for", row.id),
    },
    {
      label: "Duplicate",
      icon: Copy,
      onClick: (row: any) => console.log("Duplicate", row.id),
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (row: any) => console.log("Delete", row.id),
      variant: "destructive" as const,
    },
  ]

  // Bulk actions
  const bulkActions = [
    {
      label: "Delete Selected",
      icon: Trash2,
      onClick: () => console.log("Bulk delete", selectedCategories),
      variant: "destructive" as const,
    },
  ]

  // Form tabs
  const formTabs = [
    {
      value: "basic",
      label: "Basic",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                placeholder="Enter category name"
                defaultValue={editingCategory?.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" placeholder="category-slug" defaultValue={editingCategory?.slug} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Category description"
              defaultValue={editingCategory?.description}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="parent">Parent Category</Label>
            <Select defaultValue={editingCategory?.parentId || "none"}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Parent (Top Level)</SelectItem>
                {categories
                  .filter((c) => c.id !== editingCategory?.id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    },
    {
      value: "display",
      label: "Display",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input id="icon" placeholder="🎯" defaultValue={editingCategory?.icon} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" type="color" defaultValue={editingCategory?.color || "#3B82F6"} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select defaultValue={editingCategory?.status || "active"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="featured" defaultChecked={editingCategory?.featured} />
            <Label htmlFor="featured">Featured Category</Label>
          </div>
        </div>
      ),
    },
  ]

  return (
    <AdminLayout title="Course Categories" description="Organize and manage your course categories">
      <StatsGrid stats={stats} />

      <div className="flex items-center justify-between">
        <SearchFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search categories..."
          filters={[
            {
              value: statusFilter,
              onChange: setStatusFilter,
              placeholder: "Status",
              options: [
                { value: "all", label: "All Status" },
                { value: "active", label: "Active" },
                { value: "hidden", label: "Hidden" },
                { value: "archived", label: "Archived" },
              ],
            },
          ]}
        />

        <ActionButtons
          primaryAction={{
            label: "Add Category",
            icon: Plus,
            onClick: () => setIsCreateDialogOpen(true),
          }}
          exportActions={[
            { label: "Export as CSV", onClick: () => console.log("Export CSV") },
            { label: "Export as Excel", onClick: () => console.log("Export Excel") },
            { label: "Export as PDF", onClick: () => console.log("Export PDF") },
          ]}
          importActions={[
            { label: "Import CSV", onClick: () => console.log("Import CSV") },
            { label: "Import Excel", onClick: () => console.log("Import Excel") },
          ]}
        />
      </div>

      <BulkActions selectedCount={selectedCategories.length} actions={bulkActions} />

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            {filteredCategories.length} of {categories.length} categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredCategories}
            columns={columns}
            actions={actions}
            selectable
            onSelectionChange={setSelectedCategories}
          />
        </CardContent>
      </Card>

      <FormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Create New Category"
        description="Add a new course category"
        tabs={formTabs}
        onSave={() => setIsCreateDialogOpen(false)}
        onCancel={() => setIsCreateDialogOpen(false)}
      />

      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="Edit Category"
        description="Update category information"
        tabs={formTabs}
        onSave={() => {
          setIsEditDialogOpen(false)
          setEditingCategory(null)
        }}
        onCancel={() => {
          setIsEditDialogOpen(false)
          setEditingCategory(null)
        }}
        saveLabel="Update Category"
      />
    </AdminLayout>
  )
}
