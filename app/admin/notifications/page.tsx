"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  Send,
  Calendar,
  Users,
  BarChart4,
  Trash2,
  Edit,
  Copy,
  Clock,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
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

// Mock data for notifications
const notifications = [
  {
    id: "1",
    title: "New Course Available",
    content: "Check out our new Blockchain Fundamentals course!",
    type: "marketing",
    status: "sent",
    recipients: "all",
    sentAt: "2023-06-04T10:30:00",
    openRate: "42%",
    clickRate: "18%",
  },
  {
    id: "2",
    title: "System Maintenance",
    content: "The platform will be down for maintenance on June 10th from 2-4 AM UTC.",
    type: "system",
    status: "scheduled",
    recipients: "all",
    sentAt: "2023-06-10T02:00:00",
    openRate: "-",
    clickRate: "-",
  },
  {
    id: "3",
    title: "Complete Your Profile",
    content: "Please complete your profile to unlock all platform features.",
    type: "user",
    status: "draft",
    recipients: "new_users",
    sentAt: "-",
    openRate: "-",
    clickRate: "-",
  },
  {
    id: "4",
    title: "Certificate Awarded",
    content: "Congratulations! You've earned a certificate for completing the AI Fundamentals course.",
    type: "achievement",
    status: "sent",
    recipients: "course_completers",
    sentAt: "2023-06-01T15:45:00",
    openRate: "89%",
    clickRate: "76%",
  },
  {
    id: "5",
    title: "Token Rewards Update",
    content: "We've updated our token rewards system. Learn how to earn more tokens!",
    type: "system",
    status: "sent",
    recipients: "active_users",
    sentAt: "2023-05-28T09:15:00",
    openRate: "61%",
    clickRate: "37%",
  },
  {
    id: "6",
    title: "New Feature: AI Chat Assistant",
    content: "We've launched a new AI Chat Assistant to help with your learning journey!",
    type: "feature",
    status: "sent",
    recipients: "premium_users",
    sentAt: "2023-05-25T11:00:00",
    openRate: "72%",
    clickRate: "45%",
  },
  {
    id: "7",
    title: "Your Course Progress",
    content: "You're 75% through the Smart Contract Development course. Keep going!",
    type: "user",
    status: "template",
    recipients: "course_enrollees",
    sentAt: "-",
    openRate: "-",
    clickRate: "-",
  },
  {
    id: "8",
    title: "Limited Time Offer",
    content: "Get 50% off all premium courses this weekend only!",
    type: "marketing",
    status: "scheduled",
    recipients: "all",
    sentAt: "2023-06-09T08:00:00",
    openRate: "-",
    clickRate: "-",
  },
]

// Template categories
const templates = [
  { id: "1", name: "Welcome Email", category: "onboarding" },
  { id: "2", name: "Course Completion", category: "achievement" },
  { id: "3", name: "Certificate Award", category: "achievement" },
  { id: "4", name: "Password Reset", category: "account" },
  { id: "5", name: "Course Reminder", category: "engagement" },
  { id: "6", name: "New Feature Announcement", category: "system" },
  { id: "7", name: "Weekly Digest", category: "marketing" },
  { id: "8", name: "Token Reward", category: "reward" },
]

export default function NotificationsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<any>(null)
  const { toast } = useToast()

  // Filter notifications based on search, type, and status
  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === "all" || notification.type === selectedType
    const matchesStatus = selectedStatus === "all" || notification.status === selectedStatus

    return matchesSearch && matchesType && matchesStatus
  })

  const handleCreateNotification = () => {
    setSelectedNotification(null)
    setIsCreateDialogOpen(true)
  }

  const handleEditNotification = (notification: any) => {
    setSelectedNotification(notification)
    setIsCreateDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false)
    setSelectedNotification(null)
  }

  const handleSaveNotification = () => {
    // Save notification logic would go here
    setIsCreateDialogOpen(false)
    setSelectedNotification(null)
    // Refresh the list or update the state
    toast({
      title: selectedNotification ? "Notification Updated" : "Notification Created",
      description: selectedNotification
        ? `Notification "${selectedNotification.title}" updated successfully.`
        : "New notification created successfully.",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Sent
          </Badge>
        )
      case "scheduled":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Scheduled
          </Badge>
        )
      case "draft":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Draft
          </Badge>
        )
      case "template":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Template
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleDeleteNotification = (notificationToDelete: any) => {
    console.log("Deleting notification:", notificationToDelete.id, notificationToDelete.title)
    // In a real app, you'd remove the notification from your state/backend
    toast({
      title: "Notification Deleted",
      description: `Notification "${notificationToDelete.title}" deleted successfully.`,
      variant: "destructive",
    })
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and analyze system notifications and user communications
          </p>
        </div>
        <Button onClick={handleCreateNotification}>
          <Plus className="mr-2 h-4 w-4" /> Create Notification
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="user">User</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <div className="my-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="achievement">Achievement</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="template">Template</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-transparent">
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" /> Advanced Filters
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" /> Import
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Sent/Scheduled</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead>Click Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="font-medium">{notification.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {notification.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(notification.status)}</TableCell>
                      <TableCell className="capitalize">{notification.recipients.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        {notification.sentAt !== "-" ? new Date(notification.sentAt).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>{notification.openRate}</TableCell>
                      <TableCell>{notification.clickRate}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditNotification(notification)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" /> Send Now
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="mr-2 h-4 w-4" /> Schedule
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the notification &quot;
                                    {notification.title}&quot; and remove its data from our servers.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteNotification(notification)}>
                                    Continue
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription className="capitalize">{template.category} Template</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>Use this template for {template.category} notifications.</p>
                </CardContent>
                <CardFooter className="bg-muted/50 flex justify-between">
                  <Button variant="ghost" size="sm">
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="mr-2 h-4 w-4" /> Use Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
            <Card className="border-dashed border-2 flex flex-col items-center justify-center h-[200px]">
              <Button variant="ghost" onClick={handleCreateNotification}>
                <Plus className="mr-2 h-5 w-5" /> Create New Template
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart4 className="mr-2 h-5 w-5" /> Notification Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Average Open Rate</span>
                <span className="font-bold">66%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "66%" }}></div>
              </div>
              <div className="flex justify-between items-center">
                <span>Average Click Rate</span>
                <span className="font-bold">44%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "44%" }}></div>
              </div>
              <div className="flex justify-between items-center">
                <span>Engagement Score</span>
                <span className="font-bold">8.4/10</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "84%" }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" /> Recipient Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                  <span>All Users</span>
                </div>
                <span>2,845</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span>Active Users</span>
                </div>
                <span>1,932</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span>Premium Users</span>
                </div>
                <span>764</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                  <span>Course Completers</span>
                </div>
                <span>1,245</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                  <span>New Users</span>
                </div>
                <span>328</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" /> Upcoming Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px]">
              <div className="space-y-4">
                {notifications
                  .filter((n) => n.status === "scheduled")
                  .map((notification) => (
                    <div key={notification.id} className="flex items-start gap-3 pb-3 border-b">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Bell className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(notification.sentAt).toLocaleDateString()} at{" "}
                          {new Date(notification.sentAt).toLocaleTimeString()}
                        </p>
                        <p className="text-xs mt-1 capitalize">To: {notification.recipients.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  ))}
                {notifications.filter((n) => n.status === "scheduled").length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No scheduled notifications</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedNotification ? "Edit Notification" : "Create New Notification"}</DialogTitle>
            <DialogDescription>
              {selectedNotification
                ? "Update the notification details below."
                : "Fill in the details to create a new notification."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Notification Title</Label>
                <Input
                  id="title"
                  placeholder="Enter notification title"
                  defaultValue={selectedNotification?.title || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Notification Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter notification content"
                  className="min-h-[120px]"
                  defaultValue={selectedNotification?.content || ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Notification Type</Label>
                <Select defaultValue={selectedNotification?.type || "system"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select notification type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipients">Recipients</Label>
                <Select defaultValue={selectedNotification?.recipients || "all"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="active_users">Active Users</SelectItem>
                    <SelectItem value="premium_users">Premium Users</SelectItem>
                    <SelectItem value="new_users">New Users</SelectItem>
                    <SelectItem value="course_completers">Course Completers</SelectItem>
                    <SelectItem value="course_enrollees">Course Enrollees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Delivery Options</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="send-email" defaultChecked />
                    <label
                      htmlFor="send-email"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Send Email
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="send-push" defaultChecked />
                    <label
                      htmlFor="send-push"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Send Push Notification
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="send-in-app" defaultChecked />
                    <label
                      htmlFor="send-in-app"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Send In-App Notification
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="send-sms" />
                    <label
                      htmlFor="send-sms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Send SMS
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Delivery Schedule</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="send-now"
                      name="delivery-schedule"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      defaultChecked={!selectedNotification || selectedNotification.status === "sent"}
                    />
                    <label htmlFor="send-now" className="text-sm font-medium leading-none">
                      Send Immediately
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="schedule"
                      name="delivery-schedule"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      defaultChecked={selectedNotification?.status === "scheduled"}
                    />
                    <label htmlFor="schedule" className="text-sm font-medium leading-none">
                      Schedule for Later
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Save Options</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox id="save-template" />
                  <label
                    htmlFor="save-template"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Save as Template
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotification}>
              {selectedNotification ? "Update Notification" : "Create Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  )
}

// Helper component for the form
function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
    </label>
  )
}
