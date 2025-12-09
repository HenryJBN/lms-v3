"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CategoryCreateSchema,
  CategoryUpdateSchema,
  type CategoryCreateForm,
  type CategoryUpdateForm,
} from "@/lib/schemas/category"
import { type Category } from "@/lib/services/categories"

interface CategoryFormProps {
  category?: Category | null
  categories: Category[]
  onSubmit: (data: CategoryCreateForm) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  mode: "create" | "edit"
}

export function CategoryForm({
  category,
  categories,
  onSubmit,
  onCancel,
  isLoading = false,
  mode,
}: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CategoryCreateForm>({
    resolver: zodResolver(mode === "create" ? CategoryCreateSchema : CategoryUpdateSchema),
    defaultValues:
      mode === "edit" && category
        ? {
            name: category.name,
            slug: category.slug,
            description: category.description || "",
            icon: category.icon || "",
            color: category.color || "#3B82F6",
            parent_id: category.parent_id || "",
            sort_order: category.sort_order || 0,
            is_active: category.is_active !== false,
          }
        : {
            name: "",
            slug: "",
            description: "",
            icon: "",
            color: "#3B82F6",
            parent_id: "",
            sort_order: 0,
            is_active: true,
          },
  })

  const nameValue = watch("name")

  // Auto-generate slug from name
  useEffect(() => {
    if (nameValue) {
      const slug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
      setValue("slug", slug)
    }
  }, [nameValue, setValue])

  const onFormSubmit = async (data: CategoryCreateForm | CategoryUpdateForm) => {
    await onSubmit(data as CategoryCreateForm)
    if (mode === "create") {
      reset()
    }
  }

  // Filter out current category from parent options
  const availableParents = categories.filter((c) => c.id !== category?.id)

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="display">Display Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter category name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                {...register("slug")}
                placeholder="category-slug"
                className={errors.slug ? "border-red-500" : ""}
              />
              {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Category description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_id">Parent Category</Label>
            <Select
              value={watch("parent_id") || ""}
              onValueChange={(value) => setValue("parent_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Parent (Top Level)</SelectItem>
                {availableParents.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon && <span className="mr-2">{c.icon}</span>}
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="display" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input id="icon" {...register("icon")} placeholder="🎯" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" type="color" {...register("color")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input
              id="sort_order"
              type="number"
              {...register("sort_order", { valueAsNumber: true })}
              placeholder="0"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={watch("is_active")}
              onCheckedChange={(checked) => setValue("is_active", checked)}
            />
            <Label htmlFor="is_active">Active Category</Label>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : mode === "create" ? "Create Category" : "Update Category"}
        </Button>
      </div>
    </form>
  )
}
