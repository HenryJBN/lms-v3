"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Upload,
  Shield,
  UserCheck,
  UserX,
  Mail,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { UserFormData, UserSchema } from "@/lib/schemas/user"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { usersService } from "@/lib/services/users"
import { handleApiError } from "@/lib/utils/form-errors"
import { User } from "@/lib/services/auth"
import { formatDate } from "date-fns"
import { useSearchParams } from "next/navigation"
import { analyticsService, type UserAnalyticsSummary } from "@/lib/services/analytics"
import { useDebounce } from "@/hooks/use-debounce"

export default function UsersManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [initialized, setInitialized] = useState(false)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [analytics, setAnalytics] = useState<UserAnalyticsSummary | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [targetUser, setTargetUser] = useState<User | null>(null)
  const [actionType, setActionType] = useState<"deactivate" | "reactivate" | "soft-delete">(
    "deactivate"
  )
  const [actionReason, setActionReason] = useState("")

  const searchParams = useSearchParams()

  // Sync page/size from URL on mount and when URL changes
  useEffect(() => {
    const p = parseInt(searchParams.get("page") || "1", 10)
    const s = parseInt(searchParams.get("size") || "20", 10)
    if (!Number.isNaN(p)) setPage(p)
    if (!Number.isNaN(s)) setSize(s)
    setInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Fetch user analytics once (admin-only)
  useEffect(() => {
    const run = async () => {
      try {
        const res = await analyticsService.getUserAnalytics()
        setAnalytics(res)
      } catch (err) {
        console.error("Failed to load user analytics:", err)
      }
    }
    run()
  }, [])

  const debouncedSearch = useDebounce(searchTerm, 400)

  // Fetch after URL params are applied
  useEffect(() => {
    if (!initialized) return
    const fetchUsers = async () => {
      try {
        const roleParam = selectedRole !== "all" ? selectedRole : undefined
        const statusParam = selectedStatus !== "all" ? selectedStatus : undefined
        const searchParam = debouncedSearch || undefined
        const response = await usersService.getUsers({
          page,
          size,
          role: roleParam,
          status: statusParam,
          search: searchParam,
        })
        setUsers(response.items as any)
        setTotalPages(response.pages)
        setTotalItems(response.total)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }
    fetchUsers()
  }, [initialized, page, size, selectedRole, selectedStatus, debouncedSearch])

  // Mock user data
  // const users = [
  //   {
  //     id: 1,
  //     name: "John Doe",
  //     email: "john.doe@example.com",
  //     role: "student",
  //     status: "active",
  //     joinDate: "2024-01-15",
  //     lastLogin: "2024-01-20",
  //     coursesEnrolled: 3,
  //     coursesCompleted: 1,
  //     tokensEarned: 150,
  //     avatar: "/placeholder.svg?height=32&width=32",
  //   },
  //   {
  //     id: 2,
  //     name: "Jane Smith",
  //     email: "jane.smith@example.com",
  //     role: "instructor",
  //     status: "active",
  //     joinDate: "2023-11-20",
  //     lastLogin: "2024-01-19",
  //     coursesEnrolled: 0,
  //     coursesCompleted: 0,
  //     tokensEarned: 0,
  //     avatar: "/placeholder.svg?height=32&width=32",
  //   },
  //   {
  //     id: 3,
  //     name: "Mike Johnson",
  //     email: "mike.johnson@example.com",
  //     role: "student",
  //     status: "inactive",
  //     joinDate: "2023-12-05",
  //     lastLogin: "2024-01-10",
  //     coursesEnrolled: 2,
  //     coursesCompleted: 0,
  //     tokensEarned: 75,
  //     avatar: "/placeholder.svg?height=32&width=32",
  //   },
  //   {
  //     id: 4,
  //     name: "Sarah Wilson",
  //     email: "sarah.wilson@example.com",
  //     role: "admin",
  //     status: "active",
  //     joinDate: "2023-10-01",
  //     lastLogin: "2024-01-20",
  //     coursesEnrolled: 0,
  //     coursesCompleted: 0,
  //     tokensEarned: 0,
  //     avatar: "/placeholder.svg?height=32&width=32",
  //   },
  //   {
  //     id: 5,
  //     name: "Alex Rodriguez",
  //     email: "alex.rodriguez@example.com",
  //     role: "student",
  //     status: "active",
  //     joinDate: "2024-01-08",
  //     lastLogin: "2024-01-18",
  //     coursesEnrolled: 5,
  //     coursesCompleted: 3,
  //     tokensEarned: 320,
  //     avatar: "/placeholder.svg?height=32&width=32",
  //   },
  // ]

  const filteredUsers = users

  const stats = {
    totalUsers: analytics?.total_users ?? totalItems,
    activeUsers: analytics?.active_users ?? users.filter((u) => u.status === "active").length,
    students: analytics?.students ?? users.filter((u) => u.role === "student").length,
    instructors: analytics?.instructors ?? users.filter((u) => u.role === "instructor").length,
    admins: analytics?.admins ?? users.filter((u) => u.role === "admin").length,
  }

  const roles = [
    { value: "student", label: "Student" },
    { value: "instructor", label: "Instructor" },
    { value: "admin", label: "Admin" },
  ]

  const form = useForm<UserFormData>({
    resolver: zodResolver(UserSchema),
    defaultValues: {
      email: "",
      name: "",
      role: "admin",
    },
  })

  const onSubmit = async (data: UserFormData) => {
    const [first_name, last_name = ""] = data.name.split(" ")
    const payload = {
      first_name,
      last_name,
      email: data.email,
      role: data.role,
    }
    setIsLoading(true)
    try {
      if (isEditMode && editingUserId) {
        await usersService.updateUser(editingUserId, payload as any)
        toast.success("User updated successfully!")
      } else {
        await usersService.addUser(payload as any)
        toast.success("User created successfully!")
      }
      form.reset()
      setIsCreateDialogOpen(false)
      setIsEditMode(false)
      setEditingUserId(null)
      // refresh list
      const response = await usersService.getUsers({ page, size })
      setUsers(response.items as any)
      setTotalPages(response.pages)
      setTotalItems(response.total)
    } catch (error: any) {
      handleApiError(error, form.setError, {
        defaultMessage:
          error.message || (isEditMode ? "Failed to update user" : "Failed to create user"),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const reload = async () => {
    const roleParam = selectedRole !== "all" ? selectedRole : undefined
    const statusParam = selectedStatus !== "all" ? selectedStatus : undefined
    const searchParam = debouncedSearch || undefined
    const response = await usersService.getUsers({
      page,
      size,
      role: roleParam,
      status: statusParam,
      search: searchParam,
    })
    setUsers(response.items as any)
    setTotalPages(response.pages)
    setTotalItems(response.total)
  }

  const handleConfirm = async () => {
    if (!targetUser) return
    setIsLoading(true)
    try {
      if (actionType === "deactivate") {
        await usersService.deactivateUser(String(targetUser.id), actionReason)
        toast.success("User deactivated")
      } else if (actionType === "reactivate") {
        await usersService.reactivateUser(String(targetUser.id), actionReason)
        toast.success("User reactivated")
      } else if (actionType === "soft-delete") {
        await usersService.softDeleteUser(String(targetUser.id), actionReason)
        toast.success("User soft deleted")
      }
      setConfirmOpen(false)
      setActionReason("")
      await reload()
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${actionType} user`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <div className="flex-1">
            <h1 className="text-lg font-semibold">User Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={(open) => {
                setIsCreateDialogOpen(open)
                if (!open) {
                  setIsEditMode(false)
                  setEditingUserId(null)
                  form.reset({ name: "", email: "", role: "admin" })
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => {
                    setIsEditMode(false)
                    setEditingUserId(null)
                    form.reset({ name: "", email: "", role: "admin" })
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <DialogHeader>
                      <DialogTitle>{isEditMode ? "Edit User" : "Add New User"}</DialogTitle>
                      <DialogDescription>
                        {isEditMode
                          ? "Update the user information below."
                          : "Create a new user account. Fill in the required information below."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel htmlFor="name" className="text-right">
                              Name
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" className="col-span-3" {...field} />
                            </FormControl>
                            <FormMessage className="col-start-2 col-span-3" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel htmlFor="name" className="text-right">
                              Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="john@example.com"
                                className="col-span-3"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="col-start-2 col-span-3" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem className="grid grid-cols-4 items-center gap-4">
                            <FormLabel htmlFor="role" className="text-right">
                              Role
                            </FormLabel>
                            <FormControl>
                              <Select defaultValue={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage className="col-start-2 col-span-3" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit">
                        {!isLoading
                          ? isEditMode
                            ? "Save Changes"
                            : "Create User"
                          : isEditMode
                            ? "Saving..."
                            : "Creating..."}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 space-y-4 p-4 lg:p-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.students}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Instructors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.instructors}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.admins}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage all users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setPage(1)
                    }}
                    className="pl-8"
                  />
                </div>
                <Select
                  value={selectedRole}
                  onValueChange={(v) => {
                    setSelectedRole(v)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Students</SelectItem>
                    <SelectItem value="instructor">Instructors</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={selectedStatus}
                  onValueChange={(v) => {
                    setSelectedStatus(v)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Users Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Tokens</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar_url || "/placeholder.svg"}
                              alt={user.name}
                              className="h-8 w-8 rounded-full"
                            />
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin"
                                ? "default"
                                : user.role === "instructor"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.status === "active"
                                ? "default"
                                : user.status === "deleted"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.created_at ? formatDate(new Date(user.created_at), "PP") : " "}
                        </TableCell>
                        <TableCell>
                          {user.last_login_at
                            ? formatDate(new Date(user.last_login_at), "PP")
                            : " "}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{user.total_enrollments} enrolled</div>
                            <div className="text-muted-foreground">
                              {user.completed_courses} completed
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.token_balance}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setIsEditMode(true)
                                  setEditingUserId(String(user.id))
                                  const fullName =
                                    user.name ||
                                    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                                  form.reset({
                                    name: fullName,
                                    email: user.email,
                                    role: user.role,
                                  })
                                  setIsCreateDialogOpen(true)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit user
                              </DropdownMenuItem>
                              {/* <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Send email
                              </DropdownMenuItem> */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setTargetUser(user)
                                  const nextAction =
                                    user.status === "active" ? "deactivate" : "reactivate"
                                  setActionType(nextAction)
                                  setConfirmOpen(true)
                                }}
                              >
                                {user.status === "active" ? (
                                  <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setTargetUser(user)
                                  setActionType("soft-delete")
                                  setConfirmOpen(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete user
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                page={page}
                size={size}
                total={totalItems}
                onChange={({ page: nextPage }) => setPage(nextPage)}
              />
            </CardContent>
          </Card>
        </main>
      </div>
      {/* Confirm modal */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "deactivate"
                ? "Deactivate user?"
                : actionType === "reactivate"
                  ? "Reactivate user?"
                  : "Soft delete user?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "deactivate"
                ? "This will immediately prevent the user from logging in or accessing any content. You can reactivate later."
                : actionType === "reactivate"
                  ? "This will restore the user's access to the platform."
                  : "This will mark the user as deleted. The user data will be preserved but the account will be permanently inaccessible. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="Add a short reason for audit"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
              {isLoading
                ? "Processing..."
                : actionType === "deactivate"
                  ? "Deactivate"
                  : actionType === "reactivate"
                    ? "Reactivate"
                    : "Soft Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
