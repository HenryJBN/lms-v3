"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Building2, 
  Users, 
  BookOpen, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  RefreshCcw
} from "lucide-react"
import { systemAdminService, GlobalStats } from "@/lib/services/system-admin"
import { Button } from "@/components/ui/button"

export default function SystemAdminDashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await systemAdminService.getGlobalStats()
      setStats(data)
    } catch (err: any) {
      console.error("Failed to fetch global stats:", err)
      setError("Failed to load platform statistics.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Gathering platform analytics...</p>
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Sites (Tenants)",
      value: stats?.total_sites || 0,
      icon: Building2,
      description: "Active schools and academies",
      trend: "+12% from last month",
      trendType: "up"
    },
    {
      title: "Active Users",
      value: stats?.total_users || 0,
      icon: Users,
      description: "Students and instructors across all sites",
      trend: "+5.4% from last month",
      trendType: "up"
    },
    {
      title: "Published Courses",
      value: stats?.total_courses || 0,
      icon: BookOpen,
      description: "Combined content library",
      trend: "+2 new this week",
      trendType: "up"
    },
    {
      title: "Total Enrollments",
      value: stats?.total_enrollments || 0,
      icon: CreditCard,
      description: "Total course registrations",
      trend: "-1.2% from last week",
      trendType: "down"
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Overview</h2>
          <p className="text-muted-foreground">
            Platform-wide performance and engagement metrics.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="mr-2 h-4 w-4" />
          )}
          Refresh Data
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              <div className={`flex items-center text-xs mt-2 ${
                card.trendType === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {card.trendType === 'up' ? (
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                ) : (
                  <ArrowDownRight className="mr-1 h-3 w-3" />
                )}
                {card.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-8">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Tenant Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg m-6 mt-0">
             <p className="text-muted-foreground italic">Growth Chart Visualization Integration Pending</p>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Site Activity</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                       <Building2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                       <p className="text-sm font-medium leading-none">New Site Registered</p>
                       <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
