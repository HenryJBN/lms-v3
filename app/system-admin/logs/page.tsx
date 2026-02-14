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
  Activity, 
  Building2, 
  Users, 
  BookOpen, 
  Search,
  Filter,
  ArrowRight,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Calendar
} from "lucide-react"
import { 
  systemAdminService, 
  ActivityItem 
} from "@/lib/services/system-admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

const ACTIVITY_TYPE_LABELS = {
  site_registered: {
    label: "Site Registered",
    icon: Building2,
    color: "text-blue-500",
    bg: "bg-blue-500/10"
  },
  user_joined: {
    label: "User Joined",
    icon: Users,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10"
  },
  course_enrollment: {
    label: "Course Enrollment",
    icon: BookOpen,
    color: "text-purple-500",
    bg: "bg-purple-500/10"
  }
}

export default function SystemAdminLogsPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [activityType, setActivityType] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchLogs = async (p = page, type = activityType) => {
    setIsLoading(true)
    try {
      const params: any = { page: p, size: 10 }
      if (type !== "all") {
        params.activity_type = type
      }
      const data = await systemAdminService.getGlobalActivity(params)
      setActivities(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, activityType])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchLogs(page, activityType)
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              System Audit Logs
            </h1>
          </div>
          <p className="text-muted-foreground">
            Monitor platform-wide activity and security events in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="border-none bg-slate-900/50 backdrop-blur-md shadow-xl">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Search logs (coming soon)..." 
                className="pl-10 bg-slate-950/50 border-slate-800 text-slate-300 placeholder:text-slate-600 focus-visible:ring-primary/50"
                disabled
              />
            </div>
            <div className="w-full md:w-[200px]">
              <Select value={activityType} onValueChange={(val) => { setActivityType(val); setPage(1); }}>
                <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-300">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <SelectValue placeholder="All Activities" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="site_registered">Site Registrations</SelectItem>
                  <SelectItem value="user_joined">User Signups</SelectItem>
                  <SelectItem value="course_enrollment">Course Enrollments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-none bg-slate-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/20">
                <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-widest">Event Type</th>
                <th className="text-left py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-widest">Description</th>
                <th className="text-right py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-sm text-slate-500 font-medium">Synchronizing audit trail...</p>
                    </div>
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Clock className="h-10 w-10 opacity-20 mb-2" />
                      <p className="font-bold uppercase tracking-widest text-xs">No entries found</p>
                      <p className="text-xs">Try adjusting your filters or check back later.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                activities.map((log) => {
                  const Config = ACTIVITY_TYPE_LABELS[log.type as keyof typeof ACTIVITY_TYPE_LABELS]
                  return (
                    <tr key={log.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${Config?.bg || 'bg-slate-800'} ${Config?.color || 'text-slate-400'}`}>
                            {Config?.icon ? <Config.icon className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                          </div>
                          <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                            {Config?.label || log.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-slate-200">{log.title}</p>
                          <p className="text-xs text-slate-500">{log.description}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-slate-400">
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </span>
                          <span className="text-[10px] text-slate-600 font-medium uppercase tracking-tighter">
                            {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="border-t border-slate-800 bg-slate-900/30 px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing <span className="text-slate-300 font-bold">{activities.length}</span> of <span className="text-slate-300 font-bold">{total}</span> total events
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-slate-800 border-slate-700 hover:bg-slate-700 disabled:opacity-30"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(pages, 5) }).map((_, i) => {
                   const p = i + 1
                   return (
                     <Button
                       key={p}
                       variant={page === p ? "default" : "outline"}
                       size="sm"
                       className={`h-8 w-8 text-xs font-bold ${page === p ? 'bg-primary' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                       onClick={() => setPage(p)}
                     >
                       {p}
                     </Button>
                   )
                })}
                {pages > 5 && <span className="text-slate-600 px-1">...</span>}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-slate-800 border-slate-700 hover:bg-slate-700 disabled:opacity-30"
                onClick={() => setPage(page + 1)}
                disabled={page === pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Live Indicator */}
      <div className="flex items-center justify-center gap-2 py-4">
         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
         <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Real-time Audit Stream Active
         </p>
      </div>
    </div>
  )
}
