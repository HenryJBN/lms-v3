"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CohortSchema, type CohortFormValues } from "@/lib/schemas/cohort"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CohortFormProps {
  initialData?: Partial<CohortFormValues>
  onSubmit: (values: CohortFormValues) => void
  isLoading?: boolean
  mode: "create" | "update"
  courses?: { id: string; title: string }[]
}

export function CohortForm({ initialData, onSubmit, isLoading, mode, courses }: CohortFormProps) {
  const form = useForm<CohortFormValues>({
    resolver: zodResolver(CohortSchema),
    defaultValues: {
      name: initialData?.name || "",
      start_date: initialData?.start_date ? new Date(initialData.start_date).toISOString().split("T")[0] : "",
      end_date: initialData?.end_date ? new Date(initialData.end_date).toISOString().split("T")[0] : "",
      max_students: initialData?.max_students || undefined,
      registration_open: initialData?.registration_open ?? true,
      course_id: initialData?.course_id || undefined,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {courses && mode === "create" && (
          <FormField
            control={form.control}
            name="course_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cohort Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Spring 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="max_students"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Students (Optional)</FormLabel>
              <FormControl>
                <Input 
                    type="number" 
                    placeholder="Unlimited" 
                    {...field} 
                    value={field.value || ""} 
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                />
              </FormControl>
              <FormDescription>Leave empty for no limit.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="registration_open"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Registration Open</FormLabel>
                <FormDescription>
                  Whether students can currently register for this cohort.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : mode === "create" ? "Create Cohort" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
