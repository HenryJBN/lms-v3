"use client"

import { useState } from "react"
import Link from "next/link"
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
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChartContainer } from "@/components/ui/chart"
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

// Mock data for charts
const userActivityData = [
  { name: "Jan", users: 400, courses: 240 },
  { name: "Feb", users: 300, courses: 139 },
  { name: "Mar", users: 200, courses: 980 },
  { name: "Apr", users: 278, courses: 390 },
  { name: "May", users: 189, courses: 480 },
  { name: "Jun", users: 239, courses: 380 },
  { name: "Jul", users: 349, courses: 430 },
]

const revenueData = [
  { name: "Jan", revenue: 4000 },
  { name: "Feb", revenue: 3000 },
  { name: "Mar", revenue: 2000 },
  { name: "Apr", revenue: 2780 },
  { name: "May", revenue: 1890 },
  { name: "Jun", revenue: 2390 },
  { name: "Jul", revenue: 3490 },
]

const courseCompletionData = [
  { name: "Blockchain", value: 400 },
  { name: "AI & ML", value: 300 },
  { name: "Web Dev", value: 300 },
  { name: "Filmmaking", value: 200 },
  { name: "3D Animation", value: 100 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

// Mock data for alerts
const alerts = [
  {
    id: 1,
    title: "New User Registration Spike",
    description: "User registrations increased by 25% in the last 24 hours.",
    type: "info",
    time: "2 hours ago",
  },
  {
    id: 2,
    title: "Payment Processing Error",
    description: "3 payment transactions failed due to gateway timeout.",
    type: "error",
    time: "4 hours ago",
  },
  {
    id: 3,
    title: "Course Completion Milestone",
    description: "Blockchain Fundamentals course has reached 1,000 completions!",
    type: "success",
    time: "Yesterday",
  },
  {
    id: 4,
    title: "Storage Space Warning",
    description: "Media storage is at 85% capacity. Consider upgrading or cleaning up.",
    type: "warning",
    time: "2 days ago",
  },
]

// Mock data for recent activities
const recentActivities = [
  {
    id: 1,
    user: "Alex Johnson",
    action: "completed",
    item: "Blockchain Fundamentals",
    time: "10 minutes ago",
    avatar: "/placeholder.svg?key=2udjt",
  },
  {
    id: 2,
    user: "Maria Rodriguez",
    action: "enrolled in",
    item: "AI & Machine Learning",
    time: "25 minutes ago",
    avatar: "/placeholder.svg?key=937l0",
  },
  {
    id: 3,
    user: "David Kim",
    action: "received certificate for",
    item: "Smart Contract Development",
    time: "1 hour ago",
    avatar: "/placeholder.svg?key=6v9e6",
  },
  {
    id: 4,
    user: "Sarah Williams",
    action: "submitted assignment for",
    item: "Advanced Cinematography",
    time: "2 hours ago",
    avatar: "/placeholder.svg?key=9ofk5",
  },
  {
    id: 5,
    user: "James Brown",
    action: "earned 50 tokens in",
    item: "3D Animation Basics",
    time: "3 hours ago",
    avatar: "/placeholder.svg?key=1vxqz",
  },
]

export default function AdminDashboard() {
  const [timeRange, setTimeRange] = useState("7d")

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your learning platform.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button>Quick Actions</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,845</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 font-medium inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" /> +12.5%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">36</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 font-medium inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" /> +3
              </span>{" "}
              new this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Course Completions</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,245</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 font-medium inline-flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" /> +18.2%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$24,389</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500 font-medium inline-flex items-center">
                <ArrowDownRight className="h-3 w-3 mr-1" /> -4.5%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Activity</CardTitle>
              <Tabs defaultValue="7d" className="w-[200px]">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="7d" onClick={() => setTimeRange("7d")}>
                    7d
                  </TabsTrigger>
                  <TabsTrigger value="30d" onClick={() => setTimeRange("30d")}>
                    30d
                  </TabsTrigger>
                  <TabsTrigger value="90d" onClick={() => setTimeRange("90d")}>
                    90d
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <CardDescription>User registrations and course enrollments over time</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer
              config={{
                users: {
                  label: "Users",
                  color: "hsl(var(--chart-1))",
                },
                courses: {
                  label: "Course Enrollments",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="aspect-[4/3]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart
                  data={userActivityData}
                  margin={{
                    top: 5,
                    right: 10,
                    left: 10,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="var(--color-users)" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="courses" stroke="var(--color-courses)" />
                </RechartsLineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Recent system notifications and alerts</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[350px]">
              <div className="px-4 py-2">
                {alerts.map((alert) => (
                  <div key={alert.id} className="mb-4 last:mb-0">
                    <div className="flex items-start gap-4 rounded-lg border p-3">
                      {alert.type === "info" && <Bell className="h-5 w-5 text-blue-500" />}
                      {alert.type === "error" && <XCircle className="h-5 w-5 text-red-500" />}
                      {alert.type === "success" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {alert.type === "warning" && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">{alert.title}</h4>
                          <span className="text-xs text-muted-foreground">{alert.time}</span>
                        </div>
                        <p className="mt-1 text-xs">{alert.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest user actions across the platform</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[350px]">
              <div className="px-4 py-2">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <img
                        src={activity.avatar || "/placeholder.svg"}
                        alt={activity.user}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user}</span>{" "}
                        <span className="text-muted-foreground">{activity.action}</span>{" "}
                        <span className="font-medium">{activity.item}</span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" /> {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-3">
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/admin/users">View All Activity</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Monthly revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="aspect-[4/3]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueData}
                  margin={{
                    top: 5,
                    right: 10,
                    left: 10,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Course Completions</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Completions",
                  color: "hsl(var(--chart-4))",
                },
              }}
              className="aspect-[4/3]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={courseCompletionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {courseCompletionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quick Stats</CardTitle>
            <BarChart4 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Average Course Rating</span>
              <span className="font-medium">4.8/5.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Course Completion Rate</span>
              <span className="font-medium">73%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Active Instructors</span>
              <span className="font-medium">24</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Certificates Issued</span>
              <span className="font-medium">1,892</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Performing Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Blockchain Fundamentals</span>
              <Badge variant="secondary">1,245 enrolled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">AI & Machine Learning</span>
              <Badge variant="secondary">987 enrolled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Smart Contract Dev</span>
              <Badge variant="secondary">756 enrolled</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Advanced Cinematography</span>
              <Badge variant="secondary">623 enrolled</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Server Status</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Operational
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Database</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Healthy
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">CDN</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Online
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Blockchain Network</span>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                Slow
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
