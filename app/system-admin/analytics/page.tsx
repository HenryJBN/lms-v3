"use client"

import { useEffect, useState } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card"
import { 
  Building2, 
  Users, 
  BookOpen, 
  CreditCard, 
  TrendingUp,
  Activity,
  ArrowUpRight,
  Loader2,
  RefreshCcw,
  BarChart3,
  PieChart as PieChartIcon,
  LayoutDashboard,
  Calendar,
  ChevronRight,
  TrendingDown
} from "lucide-react"
import { 
  systemAdminService, 
  GlobalStats, 
  ActivityItem, 
  GrowthData,
  SiteResponse
} from "@/lib/services/system-admin"
import { Button } from "@/components/ui/button"
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts'
import { format } from "date-fns"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899']

export default function SystemAdminAnalytics() {
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [growthData, setGrowthData] = useState<GrowthData[]>([])
  const [sites, setSites] = useState<SiteResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rangeMonths, setRangeMonths] = useState("12")

  const fetchData = async (isRefresh = false, months = parseInt(rangeMonths)) => {
    if (isRefresh) setRefreshing(true)
    else setIsLoading(true)
    
    setError(null)
    try {
      const [statsRes, growthRes, sitesRes] = await Promise.allSettled([
        systemAdminService.getGlobalStats(),
        systemAdminService.getGrowthStats(months),
        systemAdminService.getAllSites({ size: 10, page: 1 })
      ])

      if (statsRes.status === 'fulfilled') setStats(statsRes.value)
      if (growthRes.status === 'fulfilled') setGrowthData(growthRes.value)
      if (sitesRes.status === 'fulfilled') setSites(sitesRes.value.items)
      
    } catch (err: any) {
      console.error("Failed to fetch analytics data:", err)
      setError("Failed to load platform intelligence.")
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchData(false)
  }, [rangeMonths])

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="relative h-16 w-16 mb-6">
          <div className="absolute inset-0 border-t-4 border-primary rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-t-4 border-primary/40 rounded-full animate-spin-slow"></div>
        </div>
        <p className="text-muted-foreground font-medium animate-pulse tracking-wide">
          AGGREGATING PLATFORM INTELLIGENCE...
        </p>
      </div>
    )
  }

  const kpiStats = [
    {
      title: "Total Academies",
      value: stats?.total_sites || 0,
      icon: Building2,
      trend: stats?.new_sites_30d || 0,
      description: "Sites currently provisioned",
      color: "blue"
    },
    {
      title: "Active Learners",
      value: stats?.total_users || 0,
      icon: Users,
      trend: stats?.new_users_30d || 0,
      description: "Unique user registrations",
      color: "green"
    },
    {
      title: "Platform courses",
      value: stats?.total_courses || 0,
      icon: BookOpen,
      trend: 0,
      description: "Available learning paths",
      color: "purple"
    },
    {
      title: "Total Enrollments",
      value: stats?.total_enrollments || 0,
      icon: CreditCard,
      trend: 0,
      description: "Lifetime course signups",
      color: "orange"
    }
  ]

  // Prepare distribution data for Pie Chart
  const distributionData = [
    { name: 'Users', value: stats?.total_users || 0 },
    { name: 'Enrollments', value: stats?.total_enrollments || 0 },
    { name: 'Courses', value: stats?.total_courses || 0 }
  ]

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Platform Analytics
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            A comprehensive look at growth trends, academy performance, and global platform health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Period:
            </span>
            <Select value={rangeMonths} onValueChange={setRangeMonths}>
              <SelectTrigger className="w-[140px] h-9 border-slate-800 bg-slate-900/50 text-slate-300">
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                <SelectItem value="3">Last 3 Months</SelectItem>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last 12 Months</SelectItem>
                <SelectItem value="24">Last 24 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fetchData(true)} 
            disabled={refreshing}
            className="rounded-full hover:bg-primary/10 transition-colors"
          >
            <RefreshCcw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-500">
              <Activity className="h-5 w-5" />
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiStats.map((kpi, idx) => (
          <Card key={idx} className="relative overflow-hidden group border-none shadow-xl bg-slate-900/50 backdrop-blur-md">
            <div className={`absolute top-0 left-0 w-1 h-full bg-${kpi.color}-500/50`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-slate-400 group-hover:text-primary transition-colors uppercase tracking-wider">
                {kpi.title}
              </CardTitle>
              <div className={`p-2 rounded-xl bg-${kpi.color}-500/10 text-${kpi.color}-500`}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2 tabular-nums">
                {kpi.value.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                {kpi.trend > 0 ? (
                  <span className="flex items-center text-green-500 font-bold">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{kpi.trend}
                  </span>
                ) : kpi.trend < 0 ? (
                  <span className="flex items-center text-red-500 font-bold">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {kpi.trend}
                  </span>
                ) : null}
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Growth Trends */}
        <Card className="lg:col-span-2 border-none shadow-2xl bg-slate-900/40 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl text-white">Cumulative Growth</CardTitle>
              <CardDescription className="text-slate-400">Monthly trajectory for key platform nodes.</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-slate-300">Users</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Sites</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsersAn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSitesAn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 11}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 11}} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorUsersAn)" 
                  name="Learners"
                />
                <Area 
                  type="monotone" 
                  dataKey="sites" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSitesAn)" 
                  name="Academies"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Distribution */}
        <Card className="border-none shadow-2xl bg-slate-900/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl text-white">Platform Mix</CardTitle>
            <CardDescription className="text-slate-400">Proportional activity breakdown.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-4 w-full mt-4">
               {distributionData.map((item, idx) => (
                 <div key={idx} className="flex flex-col items-center">
                    <div className="h-1.5 w-8 rounded-full mb-1" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-[10px] text-slate-500 uppercase font-black">{item.name}</span>
                    <span className="text-sm font-bold text-white">{item.value}</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Site Performance Ranking */}
      <Card className="border-none shadow-2xl bg-slate-900/40 backdrop-blur-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <CardTitle className="text-xl text-white">Academy Leaderboard</CardTitle>
            <CardDescription className="text-slate-400">Top sites ranked by user engagement and content volume.</CardDescription>
          </div>
          <Link href="/system-admin/tenants">
            <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300">
              Show All Sites
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/20">
                <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-widest">Academy Name</th>
                <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-widest">Subdomain</th>
                <th className="text-center py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-widest text-blue-500">Learners</th>
                <th className="text-center py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-widest text-purple-500">Courses</th>
                <th className="text-right py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-widest">Provisioned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sites.map((site) => (
                <tr key={site.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-lg">
                        {site.name.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{site.name}</p>
                        <Badge variant="outline" className={`text-[10px] h-4 mt-1 leading-none ${site.is_active ? 'border-emerald-500/50 text-emerald-500' : 'border-slate-600 text-slate-500'}`}>
                          {site.is_active ? 'ACTIVE' : 'SUSPENDED'}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <code className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                      {site.subdomain}
                    </code>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-sm font-bold text-white">{site.user_count}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-sm font-bold text-white">{site.course_count}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-xs text-slate-500 italic">
                      {format(new Date(site.created_at), 'MMM dd, yyyy')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 py-4">
         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Live Intelligence Feed • Updated globally in real-time
         </p>
      </div>
    </div>
  )
}
