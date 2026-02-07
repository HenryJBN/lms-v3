"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pagination } from "@/components/ui/pagination"
import { 
  Building2, 
  Search, 
  Filter, 
  RefreshCcw, 
  ExternalLink, 
  Power, 
  PowerOff,
  MoreVertical,
  Loader2,
  Users,
  BookOpen,
  LayoutDashboard
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { systemAdminService, SiteResponse } from "@/lib/services/system-admin"
import { useDebounce } from "@/hooks/use-debounce"
import { toast } from "sonner"
import { format } from "date-fns"

function TenantsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sites, setSites] = useState<SiteResponse[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  const page = parseInt(searchParams.get("page") || "1")
  const size = 10
  const debouncedSearch = useDebounce(searchTerm, 500)

  const fetchSites = async () => {
    setIsLoading(true)
    try {
      const params: any = {
        page,
        size,
        name: debouncedSearch || undefined,
        is_active: statusFilter === "all" ? undefined : statusFilter === "active"
      }
      const data = await systemAdminService.getAllSites(params)
      setSites(data.items)
      setTotal(data.total)
    } catch (err: any) {
      console.error("Failed to fetch sites:", err)
      toast.error("Error loading tenants. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSites()
  }, [page, debouncedSearch, statusFilter])

  const toggleSiteStatus = async (site: SiteResponse) => {
    try {
      const newStatus = !site.is_active
      await systemAdminService.updateSiteStatus(site.id, { is_active: newStatus })
      toast.success(`Site ${site.name} ${newStatus ? 'activated' : 'suspended'} successfully.`)
      fetchSites()
    } catch (err: any) {
      toast.error("Failed to update site status.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Tenant Management</h2>
          <p className="text-muted-foreground italic text-sm">Monitor and manage all schools on the platform.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => fetchSites()} disabled={isLoading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
           </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by school name or subdomain..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={statusFilter === "all" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Badge>
              <Badge 
                variant={statusFilter === "active" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setStatusFilter("active")}
              >
                Active
              </Badge>
              <Badge 
                variant={statusFilter === "suspended" ? "default" : "outline"} 
                className="cursor-pointer"
                onClick={() => setStatusFilter("suspended")}
              >
                Suspended
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">School Name</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && sites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-50" />
                    <p className="mt-2 text-muted-foreground">Loading site data...</p>
                  </TableCell>
                </TableRow>
              ) : sites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                    No tenants found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-primary/10 rounded flex items-center justify-center text-primary font-bold">
                          {site.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{site.name}</div>
                          <div className="text-xs text-muted-foreground">{site.domain}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {site.subdomain}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{site.user_count} Users</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-muted-foreground" />
                          <span>{site.course_count} Courses</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground italic">
                      {format(new Date(site.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={site.is_active ? "outline" : "destructive"} className={site.is_active ? "border-green-500 text-green-600 bg-green-50" : ""}>
                        {site.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Manage Tenant</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => window.open(`http://${site.domain}`, "_blank")}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visit Site
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.location.href = `http://${site.subdomain}.dcalms.test:3000/admin`}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Jump to Dashboard
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/system-admin/tenants/${site.id}`)}>
                            <Filter className="mr-2 h-4 w-4" />
                            Site Deep Dive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => toggleSiteStatus(site)}
                            className={site.is_active ? "text-destructive" : "text-green-600"}
                          >
                            {site.is_active ? (
                              <>
                                <PowerOff className="mr-2 h-4 w-4" />
                                Suspend Site
                              </>
                            ) : (
                              <>
                                <Power className="mr-2 h-4 w-4" />
                                Activate Site
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="border-t px-6">
          <Pagination 
            page={page} 
            size={size} 
            total={total} 
            model="sites"
          />
        </div>
      </Card>
    </div>
  )
}

export default function TenantsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin h-8 w-8" /></div>}>
      <TenantsContent />
    </Suspense>
  )
}
