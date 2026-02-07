"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Building2, 
  Users, 
  BookOpen, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  RefreshCcw,
  Activity,
  TrendingUp,
  PlusCircle,
  LayoutGrid
} from "lucide-react"
import { 
  systemAdminService, 
  GlobalStats, 
  ActivityItem, 
  GrowthData 
} from "@/lib/services/system-admin"
import { Button } from "@/components/ui/button"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import Link from "next/link"

export default function SystemAdminDashboard() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [growthData, setGrowthData] = useState<GrowthData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setIsLoading(true)
    
    setError(null)
    try {
      const [statsRes, activityRes, growthRes] = await Promise.allSettled([
        systemAdminService.getGlobalStats(),
        systemAdminService.getGlobalActivity(8),
        systemAdminService.getGrowthStats(6)
      ])

      if (statsRes.status === 'fulfilled') setStats(statsRes.value)
      if (activityRes.status === 'fulfilled') setActivity(activityRes.value)
      if (growthRes.status === 'fulfilled') setGrowthData(growthRes.value)
      
    } catch (err: any) {
      console.error("Failed to fetch dashboard data:", err)
      setError("Failed to load platform analytics.")
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Synchronizing platform metrics...</p>
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Sites",
      value: stats?.total_sites || 0,
      icon: Building2,
      description: "Active academies",
      change: stats?.new_sites_30d ? `+${stats.new_sites_30d} this month` : "Stable",
      trendType: (stats?.new_sites_30d ?? 0) > 0 ? "up" : "neutral",
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "Active Users",
      value: stats?.total_users || 0,
      icon: Users,
      description: "Total registrations",
      change: stats?.new_users_30d ? `+${stats.new_users_30d} this month` : "Stable",
      trendType: (stats?.new_users_30d ?? 0) > 0 ? "up" : "neutral",
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      title: "Courses",
      value: stats?.total_courses || 0,
      icon: BookOpen,
      description: "Across all sites",
      change: "Global library",
      trendType: "neutral",
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      title: "Enrollments",
      value: stats?.total_enrollments || 0,
      icon: CreditCard,
      description: "Total learning activity",
      change: "Platform reach",
      trendType: "neutral",
      color: "text-orange-600",
      bg: "bg-orange-50"
    }
  ]

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            System Insights
          </h2>
          <p className="text-muted-foreground">
            Aggregated performance metrics and real-time platform activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
             variant="outline" 
             size="sm" 
             onClick={() => fetchData(true)} 
             disabled={refreshing}
             className="relative"
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh Data
          </Button>
          <Link href="/system-admin/tenants/new">
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Register Site
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              <div className={`flex items-center text-xs mt-3 font-medium ${
                card.trendType === 'up' ? 'text-green-600' : card.trendType === 'down' ? 'text-red-600' : 'text-slate-500'
              }`}>
                {card.trendType === 'up' && <ArrowUpRight className="mr-1 h-3 w-3" />}
                {card.trendType === 'down' && <ArrowDownRight className="mr-1 h-3 w-3" />}
                {card.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Growth Chart */}
        <Card className="lg:col-span-4 border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Platform Growth</CardTitle>
                <CardDescription>Monthly sites and users trend</CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[350px] w-full">
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSites" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 12}} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 12}} 
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorUsers)" 
                      name="New Users"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sites" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorSites)" 
                      name="New Sites"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed rounded-xl">
                   <p className="text-muted-foreground italic">Insufficient historical data for visualization</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3 border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Global Pulse</CardTitle>
                <CardDescription>Live activity across all sites</CardDescription>
              </div>
              <Activity className="h-4 w-4 text-primary animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activity.length > 0 ? (
                activity.map((item, idx) => (
                  <div key={item.id} className="flex gap-4 relative">
                    {idx !== activity.length - 1 && (
                      <div className="absolute left-[17px] top-[30px] w-0.5 h-[calc(100%-8px)] bg-slate-100" />
                    )}
                    <div className={`mt-1 h-9 w-9 shrink-0 rounded-full flex items-center justify-center ring-4 ring-white shadow-sm
                      ${item.type === 'site_registered' ? 'bg-blue-100 text-blue-600' : 
                        item.type === 'user_joined' ? 'bg-green-100 text-green-600' : 
                        'bg-purple-100 text-purple-600'}
                    `}>
                      {item.type === 'site_registered' ? <Building2 className="h-4 w-4" /> :
                       item.type === 'user_joined' ? <Users className="h-4 w-4" /> :
                       <CreditCard className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1 pt-1">
                      <p className="text-sm font-semibold leading-none">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{item.description}</p>
                      <p className="text-[10px] text-muted-foreground opacity-70">
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <LayoutGrid className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                   <p className="text-sm text-muted-foreground">No recent activity detected</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions / Integration Status */}
      <div className="grid gap-6 md:grid-cols-3">
         <Card className="border-none bg-primary text-primary-foreground shadow-lg overflow-hidden relative">
            <div className="absolute right-[-20px] top-[-20px] opacity-10">
               <Building2 size={120} />
            </div>
            <CardHeader>
               <CardTitle className="text-lg">Quick Setup</CardTitle>
               <CardDescription className="text-primary-foreground/70">Deploy a new white-label academy in seconds.</CardDescription>
            </CardHeader>
            <CardContent>
               <Link href="/system-admin/onboarding">
                  <Button variant="secondary" className="w-full font-semibold">
                     Launch Onboarding Flow
                  </Button>
               </Link>
            </CardContent>
         </Card>
         
         <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
               <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Site Health
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-muted-foreground">Main API Cluster</span>
                     <span className="flex items-center gap-1 text-green-600 font-medium">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        Operational
                     </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-muted-foreground">Tenant Isolation</span>
                     <span className="flex items-center gap-1 text-green-600 font-medium">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        Active
                     </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                     <span className="text-muted-foreground">Media Encoding</span>
                     <span className="flex items-center gap-1 text-orange-600 font-medium">
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-600 animate-pulse" />
                        Processing
                     </span>
                  </div>
               </div>
            </CardContent>
         </Card>

         <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
               <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-purple-500" />
                  Global Shortcuts
               </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
               <Button variant="outline" size="sm" className="text-[10px] h-8 justify-start px-2" asChild>
                  <Link href="/system-admin/tenants">
                     Manage Sites
                  </Link>
               </Button>
               <Button variant="outline" size="sm" className="text-[10px] h-8 justify-start px-2" asChild>
                  <Link href="/system-admin/users">
                     Global Users
                  </Link>
               </Button>
               <Button variant="outline" size="sm" className="text-[10px] h-8 justify-start px-2" asChild>
                  <Link href="/system-admin/analytics">
                     Full Analytics
                  </Link>
               </Button>
               <Button variant="outline" size="sm" className="text-[10px] h-8 justify-start px-2" asChild>
                  <Link href="/system-admin/settings">
                     Global Settings
                  </Link>
               </Button>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
