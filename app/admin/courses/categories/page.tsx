"use client"

import { useState, useEffect } from "react"
import { Plus, Folder, BookOpen, Users, Tag, Edit, Trash2, Eye, Copy } from "lucide-react"

import { AdminLayout } from "@/components/admin/admin-layout"
import { StatsGrid } from "@/components/admin/stats-grid"
import { SearchFilters } from "@/components/admin/search-filters"
import { ActionButtons } from "@/components/admin/action-buttons"
import { DataTable } from "@/components/admin/data-table"
import { CategoryForm } from "@/components/admin/category-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BulkActions } from "@/components/admin/bulk-actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { categoryService, type Category } from "@/lib/services/categories"
import { type CategoryCreateForm, type CategoryUpdateForm } from "@/lib/schemas/category"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await categoryService.getAllCategories()
      setCategories(data || [])
    } catch (error) {
      console.error("Failed to load categories:", error)
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const stats = [
    {
      title: "Total Categories",
      value: categories.length,
      description: `${categories.filter((c) => c.is_active !== false).length} active`,
      icon: Folder,
    },
    {
      title: "Total Courses",
      value: categories.reduce((sum: number, c: Category) => sum + (c.course_count || 0), 0),
      description: "Across all categories",
      icon: BookOpen,
    },
    {
      title: "Avg Courses/Category",
      value:
        categories.length > 0
          ? Math.round(
              categories.reduce((sum: number, c: Category) => sum + (c.course_count || 0), 0) /
                categories.length
            )
          : 0,
      description: "Distribution rate",
      icon: Tag,
    },
  ]

  // Filter data
  const filteredCategories = categories.filter((category: Category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description &&
        category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? category.is_active !== false : category.is_active === false)
    return matchesSearch && matchesStatus
  })

  // Table columns
  const columns = [
    {
      key: "name",
      label: "Category",
      sortable: true,
      render: (value: string, row: Category) => (
        <div className="flex items-center gap-2">
          <span className="text-lg">{row.icon || "📁"}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{value}</span>
              {row.parent_id && (
                <Badge variant="outline" className="text-blue-600">
                  Subcategory
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{row.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>{value ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "course_count",
      label: "Courses",
      sortable: true,
      render: (value: number) => value || 0,
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      render: (value: string) => (value ? new Date(value).toLocaleDateString() : "N/A"),
    },
  ]

  // Handle create category
  const handleCreateCategory = async (data: CategoryCreateForm) => {
    setIsSubmitting(true)
    try {
      await categoryService.createCategory({
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
        icon: data.icon || undefined,
        color: data.color || undefined,
        parent_id: data.parent_id || undefined,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })

      toast({
        title: "Success",
        description: `Category "${data.name}" created successfully`,
      })

      loadCategories()
      setIsCreateDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to create category:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle update category
  const handleUpdateCategory = async (data: CategoryUpdateForm) => {
    if (!editingCategory) return

    setIsSubmitting(true)
    try {
      await categoryService.updateCategory(editingCategory.id, {
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
        icon: data.icon || undefined,
        color: data.color || undefined,
        parent_id: data.parent_id || undefined,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })

      toast({
        title: "Success",
        description: `Category "${data.name}" updated successfully`,
      })

      loadCategories()
      setIsEditDialogOpen(false)
      setEditingCategory(null)
    } catch (error: any) {
      console.error("Failed to update category:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete category
  const handleDeleteCategory = async (category: Category) => {
    try {
      await categoryService.deleteCategory(category.id)
      toast({
        title: "Success",
        description: `Category "${category.name}" deleted successfully`,
      })
      loadCategories()
    } catch (error: any) {
      console.error("Failed to delete category:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      })
    }
  }

  // Table actions
  const actions = [
    {
      label: "Edit",
      icon: Edit,
      onClick: (row: Category) => {
        setEditingCategory(row)
        setIsEditDialogOpen(true)
      },
    },
    {
      label: "View Courses",
      icon: Eye,
      onClick: (row: Category) => console.log("View courses for", row.id),
    },
    {
      label: "Duplicate",
      icon: Copy,
      onClick: (row: Category) => console.log("Duplicate", row.id),
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (row: Category) => {},
      render: (row: Category) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete category
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the category "{row.name}"
                and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteCategory(row)}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ]

  // Bulk actions
  const bulkActions = [
    {
      label: "Delete Selected",
      icon: Trash2,
      onClick: async () => {
        try {
          for (const categoryId of selectedCategories) {
            await categoryService.deleteCategory(categoryId)
          }
          toast({
            title: "Success",
            description: `${selectedCategories.length} categories deleted successfully`,
          })
          loadCategories()
          setSelectedCategories([])
        } catch (error: any) {
          console.error("Failed to delete categories:", error)
          toast({
            title: "Error",
            description: error.message || "Failed to delete categories",
            variant: "destructive",
          })
        }
      },
      variant: "destructive" as const,
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

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>
              Add a new course category to organize your courses
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            categories={categories}
            onSubmit={handleCreateCategory}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={isSubmitting}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information and settings</DialogDescription>
          </DialogHeader>
          <CategoryForm
            category={editingCategory}
            categories={categories}
            onSubmit={handleUpdateCategory}
            onCancel={() => {
              setIsEditDialogOpen(false)
              setEditingCategory(null)
            }}
            isLoading={isSubmitting}
            mode="edit"
          />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
