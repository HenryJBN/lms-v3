"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Shield,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Eye,
  EyeOff,
  User,
  Clock,
  Activity,
} from "lucide-react"

export default function SecurityManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedSeverity, setSelectedSeverity] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // Mock security data
  const securityLogs = [
    {
      id: 1,
      event: "Failed Login Attempt",
      user: "admin@dcalms.com",
      ipAddress: "192.168.1.100",
      location: "New York, US",
      timestamp: "2024-01-20 14:30:00",
      severity: "medium",
      status: "blocked",
      details: "Multiple failed login attempts detected",
    },
    {
      id: 2,
      event: "Suspicious API Access",
      user: "api_user_123",
      ipAddress: "203.0.113.45",
      location: "Unknown",
      timestamp: "2024-01-20 13:15:00",
      severity: "high",
      status: "investigating",
      details: "Unusual API request pattern detected",
    },
    {
      id: 3,
      event: "Password Reset",
      user: "john.doe@example.com",
      ipAddress: "198.51.100.25",
      location: "London, UK",
      timestamp: "2024-01-20 12:45:00",
      severity: "low",
      status: "resolved",
      details: "User requested password reset",
    },
    {
      id: 4,
      event: "Admin Panel Access",
      user: "admin@dcalms.com",
      ipAddress: "192.168.1.50",
      location: "San Francisco, US",
      timestamp: "2024-01-20 11:20:00",
      severity: "low",
      status: "allowed",
      details: "Successful admin login",
    },
  ]

  const accessRules = [
    {
      id: 1,
      name: "Admin IP Whitelist",
      type: "ip_whitelist",
      target: "192.168.1.0/24",
      action: "allow",
      priority: 1,
      status: "active",
      createdAt: "2024-01-15",
      lastTriggered: "2024-01-20 11:20:00",
    },
    {
      id: 2,
      name: "Block Suspicious IPs",
      type: "ip_blacklist",
      target: "203.0.113.0/24",
      action: "block",
      priority: 2,
      status: "active",
      createdAt: "2024-01-18",
      lastTriggered: "2024-01-20 13:15:00",
    },
    {
      id: 3,
      name: "Rate Limit API",
      type: "rate_limit",
      target: "/api/*",
      action: "limit",
      priority: 3,
      status: "active",
      createdAt: "2024-01-10",
      lastTriggered: "2024-01-20 14:00:00",
    },
  ]

  const userSessions = [
    {
      id: 1,
      user: "admin@dcalms.com",
      role: "admin",
      ipAddress: "192.168.1.50",
      location: "San Francisco, US",
      device: "Chrome on Windows",
      loginTime: "2024-01-20 09:00:00",
      lastActivity: "2024-01-20 14:30:00",
      status: "active",
    },
    {
      id: 2,
      user: "john.doe@example.com",
      role: "student",
      ipAddress: "198.51.100.25",
      location: "London, UK",
      device: "Safari on macOS",
      loginTime: "2024-01-20 10:15:00",
      lastActivity: "2024-01-20 14:25:00",
      status: "active",
    },
    {
      id: 3,
      user: "instructor@dcalms.com",
      role: "instructor",
      ipAddress: "203.0.113.100",
      location: "Toronto, CA",
      device: "Firefox on Linux",
      loginTime: "2024-01-20 08:30:00",
      lastActivity: "2024-01-20 12:00:00",
      status: "expired",
    },
  ]

  const securitySettings = {
    twoFactorAuth: true,
    passwordPolicy: true,
    sessionTimeout: 30,
    ipWhitelisting: false,
    bruteForceProtection: true,
    apiRateLimit: true,
    auditLogging: true,
    encryptionAtRest: true,
  }

  const filteredLogs = securityLogs.filter((log) => {
    const matchesSearch =
      log.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType =
      selectedType === "all" || log.event.toLowerCase().includes(selectedType.toLowerCase())
    const matchesSeverity = selectedSeverity === "all" || log.severity === selectedSeverity
    return matchesSearch && matchesType && matchesSeverity
  })

  const stats = {
    totalEvents: securityLogs.length,
    highSeverity: securityLogs.filter((l) => l.severity === "high").length,
    blockedAttempts: securityLogs.filter((l) => l.status === "blocked").length,
    activeSessions: userSessions.filter((s) => s.status === "active").length,
    securityScore: 85,
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive">{severity}</Badge>
      case "medium":
        return <Badge variant="secondary">{severity}</Badge>
      case "low":
        return <Badge variant="outline">{severity}</Badge>
      default:
        return <Badge variant="outline">{severity}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "blocked":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "allowed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "investigating":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Management</h1>
          <p className="text-muted-foreground">
            Monitor security events, manage access rules, and configure security settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Security Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Security Rule</DialogTitle>
                <DialogDescription>
                  Add a new security rule to protect your platform.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input id="rule-name" placeholder="Security rule name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-type">Rule Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rule type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ip_whitelist">IP Whitelist</SelectItem>
                        <SelectItem value="ip_blacklist">IP Blacklist</SelectItem>
                        <SelectItem value="rate_limit">Rate Limit</SelectItem>
                        <SelectItem value="geo_block">Geographic Block</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">Target</Label>
                    <Input id="target" placeholder="IP address, range, or path" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="action">Action</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allow">Allow</SelectItem>
                        <SelectItem value="block">Block</SelectItem>
                        <SelectItem value="limit">Rate Limit</SelectItem>
                        <SelectItem value="monitor">Monitor Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input id="priority" type="number" placeholder="1" min="1" max="100" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>Create Rule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highSeverity}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Attempts</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.blockedAttempts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.securityScore}%</div>
            <Progress value={stats.securityScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Security Logs</TabsTrigger>
          <TabsTrigger value="rules">Access Rules</TabsTrigger>
          <TabsTrigger value="sessions">User Sessions</TabsTrigger>
          <TabsTrigger value="settings">Security Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Event Logs</CardTitle>
              <CardDescription>
                Monitor and investigate security events across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search security logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="login">Login Events</SelectItem>
                    <SelectItem value="api">API Events</SelectItem>
                    <SelectItem value="admin">Admin Events</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-medium">{log.event}</div>
                            <div className="text-sm text-muted-foreground">{log.details}</div>
                          </div>
                        </TableCell>
                        <TableCell>{log.user}</TableCell>
                        <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                        <TableCell>{log.location}</TableCell>
                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className="capitalize">{log.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>{log.timestamp}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Lock className="mr-2 h-4 w-4" />
                                Block IP
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                View User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Control Rules</CardTitle>
              <CardDescription>
                Manage IP whitelists, blacklists, and access restrictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Triggered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.type.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{rule.target}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              rule.action === "allow"
                                ? "default"
                                : rule.action === "block"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {rule.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>
                          <Badge variant={rule.status === "active" ? "default" : "secondary"}>
                            {rule.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{rule.lastTriggered}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Rule
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                {rule.status === "active" ? (
                                  <>
                                    <EyeOff className="mr-2 h-4 w-4" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Enable
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Rule
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active User Sessions</CardTitle>
              <CardDescription>Monitor and manage active user sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Login Time</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">{session.user}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{session.role}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{session.ipAddress}</TableCell>
                        <TableCell>{session.location}</TableCell>
                        <TableCell>{session.device}</TableCell>
                        <TableCell>{session.loginTime}</TableCell>
                        <TableCell>{session.lastActivity}</TableCell>
                        <TableCell>
                          <Badge variant={session.status === "active" ? "default" : "secondary"}>
                            {session.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                View User Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <XCircle className="mr-2 h-4 w-4" />
                                Terminate Session
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Settings</CardTitle>
                <CardDescription>Configure authentication and access controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <div className="text-sm text-muted-foreground">
                      Require 2FA for admin accounts
                    </div>
                  </div>
                  <Switch checked={securitySettings.twoFactorAuth} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Strong Password Policy</Label>
                    <div className="text-sm text-muted-foreground">
                      Enforce complex password requirements
                    </div>
                  </div>
                  <Switch checked={securitySettings.passwordPolicy} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP Whitelisting</Label>
                    <div className="text-sm text-muted-foreground">
                      Restrict admin access to specific IPs
                    </div>
                  </div>
                  <Switch checked={securitySettings.ipWhitelisting} />
                </div>
                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Input type="number" value={securitySettings.sessionTimeout} min="5" max="480" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Features</CardTitle>
                <CardDescription>Enable additional security protections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Brute Force Protection</Label>
                    <div className="text-sm text-muted-foreground">
                      Block repeated failed login attempts
                    </div>
                  </div>
                  <Switch checked={securitySettings.bruteForceProtection} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>API Rate Limiting</Label>
                    <div className="text-sm text-muted-foreground">Limit API requests per user</div>
                  </div>
                  <Switch checked={securitySettings.apiRateLimit} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Audit Logging</Label>
                    <div className="text-sm text-muted-foreground">Log all admin actions</div>
                  </div>
                  <Switch checked={securitySettings.auditLogging} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Encryption at Rest</Label>
                    <div className="text-sm text-muted-foreground">
                      Encrypt sensitive data in database
                    </div>
                  </div>
                  <Switch checked={securitySettings.encryptionAtRest} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
