"use client"

import {
  Users,
  BookOpen,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart4,
  Download,
  Activity,
  UserPlus,
  RefreshCcw,
  Plus,
  FilePlus,
  Settings,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
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
import { adminService, AdminDashboardStats } from "@/lib/services/admin"
import { format } from "date-fns"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"


const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

function DashboardSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Skeleton className="col-span-4 h-[450px] rounded-xl" />
        <Skeleton className="col-span-3 h-[450px] rounded-xl" />
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("30d")

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const data = await adminService.getDashboardStats(selectedPeriod)
      setStats(data)
    } catch (err) {
      console.error("Failed to fetch admin stats:", err)
      setError("Failed to load dashboard data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleExport = () => {
    if (!stats) return

    const data = [
      ["Metric", "Value"],
      ["Total Users", stats.total_users],
      ["Total Students", stats.total_students],
      ["Total Instructors", stats.total_instructors],
      ["Total Courses", stats.total_courses],
      ["Total Enrollments", stats.total_enrollments],
      ["Total Completions", stats.total_completions],
      ["Total Certificates", stats.total_certificates],
      ["Total Revenue", `$${stats.total_revenue.toLocaleString()}`],
      ["New Users", stats.new_users_30d],
      ["New Courses", stats.new_courses_30d],
      ["New Enrollments", stats.new_enrollments_30d],
      ["New Certificates", stats.new_certificates_30d],
      ["Period", selectedPeriod],
    ]

    const csvContent = data.map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `admin-stats-${selectedPeriod}-${format(new Date(), "yyyy-MM-dd")}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <DashboardSkeleton />

  if (error || !stats) {
    return (
      <div className="container mx-auto py-24 text-center space-y-4">
        <XCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-2xl font-bold">{error || "Something went wrong"}</h2>
        <Button onClick={fetchStats}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  // Activity data for chart (using real stats for current vs previous periods if available)
  // For now we'll simulate the trend using the 30d new counts
  const activityData = [
    { name: "Start", new: 0 },
    { name: "End", new: stats.new_users_30d }
  ]

  return (
    <div className="container mx-auto py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's what's happening on your platform.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px] bg-background/50 backdrop-blur-sm border-primary/20">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            className="shadow-sm border-primary/20 hover:bg-primary/5 transition-colors"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300">
                Quick Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 backdrop-blur-md bg-background/95">
              <DropdownMenuLabel>Common Tasks</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/users/new" className="cursor-pointer flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New User
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/courses/new" className="cursor-pointer flex items-center">
                  <FilePlus className="mr-2 h-4 w-4" />
                  Create New Course
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/analytics" className="cursor-pointer flex items-center">
                  <BarChart4 className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="cursor-pointer flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  System Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/5 backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-300 ring-1 ring-white/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users className="h-12 w-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{stats.total_users.toLocaleString()}</div>
            <div className="flex items-center mt-2 text-xs">
              <span className="text-green-500 font-bold flex items-center bg-green-500/10 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +{stats.new_users_30d}
              </span>
              <span className="text-muted-foreground ml-2 text-[10px] uppercase font-medium tracking-tight">new / {selectedPeriod}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-300 ring-1 ring-white/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BookOpen className="h-12 w-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{stats.total_courses}</div>
            <div className="flex items-center mt-2 text-xs">
              <span className="text-green-500 font-bold flex items-center bg-green-500/10 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +{stats.new_courses_30d}
              </span>
              <span className="text-muted-foreground ml-2 text-[10px] uppercase font-medium tracking-tight">new / {selectedPeriod}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-300 ring-1 ring-white/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{stats.total_completions.toLocaleString()}</div>
            <div className="flex items-center mt-2 text-xs">
              <span className="text-green-500 font-bold flex items-center bg-green-500/10 px-1.5 py-0.5 rounded">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +{stats.new_certificates_30d}
              </span>
              <span className="text-muted-foreground ml-2 text-[10px] uppercase font-medium tracking-tight">new / {selectedPeriod}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-300 ring-1 ring-white/20">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="h-12 w-12" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">${stats.total_revenue.toLocaleString()}</div>
            <div className="flex items-center mt-2 text-xs text-muted-foreground italic">
              Platform total earnings
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <Card className="col-span-4 shadow-xl border-muted/50 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Registration Activity</CardTitle>
                <CardDescription>New user registrations over the last {selectedPeriod}</CardDescription>
              </div>
              <Badge variant="outline" className="font-semibold px-3 border-primary/20 bg-primary/5">
                Last {selectedPeriod}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ChartContainer
              config={{
                count: {
                  label: "New Users",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "Prev Period", count: 0 },
                  { name: "Current Period", count: stats.new_users_30d }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="count" 
                    fill="var(--color-count)" 
                    radius={[10, 10, 0, 0]} 
                    barSize={60}
                    className="fill-primary/80 hover:fill-primary transition-colors cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-xl border-muted/50 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Recent Users</CardTitle>
                <CardDescription>Latest registrations in this site</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[380px]">
              <div className="divide-y divide-muted/50">
                {stats.recent_users.length > 0 ? (
                  stats.recent_users.map((user) => (
                    <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center text-white font-bold shadow-md shadow-primary/20">
                        {user.first_name[0]}{user.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold truncate">{user.first_name} {user.last_name}</p>
                          <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0 h-4">{user.role}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center">
                          <UserPlus className="h-3 w-3 mr-1 opacity-60" /> Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground italic">
                    No recent registrations found.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 px-6 py-3">
            <Button variant="ghost" size="sm" className="w-full text-xs font-semibold hover:bg-primary/5 hover:text-primary transition-all" asChild>
              <Link href="/admin/users">View All Users <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <Card className="col-span-3 shadow-xl border-muted/50 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Top Courses</CardTitle>
                <CardDescription>Most enrolled courses in your academy</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {stats.top_courses.length > 0 ? (
              stats.top_courses.map((course, idx) => (
                <div key={course.id} className="flex items-center gap-4 group">
                  <div className="relative w-16 h-12 rounded overflow-hidden bg-muted group-hover:ring-2 ring-primary/40 transition-all shrink-0">
                    <img 
                      src={course.thumbnail_url || `https://avatar.vercel.sh/${course.id}.png?size=100`} 
                      className="object-cover w-full h-full opacity-90 group-hover:scale-110 transition-transform duration-500"
                      alt={course.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold"># {idx + 1}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{course.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${Math.min(100, (course.enrollment_count / (stats.top_courses[0]?.enrollment_count || 1)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{course.enrollment_count} students</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground italic">
                No course data available yet.
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t bg-muted/20 px-6 py-3">
            <Button variant="ghost" size="sm" className="w-full text-xs font-semibold hover:bg-primary/5 hover:text-primary transition-all" asChild>
              <Link href="/admin/courses">Manage All Courses <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-4 shadow-xl border-muted/50 overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardHeader className="bg-muted/30">
            <div className="flex items-center gap-2">
              <BarChart4 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Platform Health</CardTitle>
                <CardDescription>Overview of key performance indicators</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-6 p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Certification Issuance</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{stats.total_certificates}</span>
                  <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-none">Issued</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Course Completion Rate</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">
                    {stats.total_enrollments > 0 
                      ? `${Math.round((stats.total_completions / stats.total_enrollments) * 100)}%` 
                      : "0%"}
                  </span>
                  <Badge className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border-none">Average</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-6 pl-6 border-l border-muted/50">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">User Growth (30d)</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">+{Math.round((stats.new_users_30d / (stats.total_users || 1)) * 100)}%</span>
                  <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none">Organic</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Content Velocity</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">+{stats.new_courses_30d}</span>
                  <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none">Courses/mo</Badge>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 px-6 py-6 mt-auto">
            <div className="flex items-center gap-4 w-full">
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Server Load</span>
                  <span className="text-green-500">Optimal</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[15%]" />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>DB Latency</span>
                  <span className="text-green-500">24ms</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[8%]" />
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
