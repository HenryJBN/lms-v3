"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Upload,
  UserCheck,
  UserX,
  Mail,
  Star,
  BookOpen,
  DollarSign,
  Clock,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  GraduationCap,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function InstructorsManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedSpecialty, setSelectedSpecialty] = useState("all")
  const [activeTab, setActiveTab] = useState("active")
  const { toast } = useToast()

  // Mock instructor data
  const instructors = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      email: "sarah.chen@example.com",
      status: "active",
      specialty: "Blockchain",
      joinDate: "2023-08-15",
      lastLogin: "2024-01-20",
      coursesCreated: 5,
      totalStudents: 1250,
      rating: 4.8,
      totalEarnings: 15420,
      monthlyEarnings: 2340,
      completionRate: 92,
      responseTime: "2 hours",
      avatar: "/placeholder.svg?height=40&width=40",
      bio: "Blockchain expert with 10+ years in cryptocurrency and DeFi development.",
      qualifications: ["PhD Computer Science", "Certified Blockchain Developer", "Former CTO at CryptoTech"],
      socialProof: {
        linkedin: "https://linkedin.com/in/sarahchen",
        twitter: "https://twitter.com/sarahchen",
        website: "https://sarahchen.dev",
      },
    },
    {
      id: 2,
      name: "Prof. Michael Rodriguez",
      email: "michael.rodriguez@example.com",
      status: "active",
      specialty: "AI & Machine Learning",
      joinDate: "2023-06-20",
      lastLogin: "2024-01-19",
      coursesCreated: 8,
      totalStudents: 2100,
      rating: 4.9,
      totalEarnings: 28750,
      monthlyEarnings: 4200,
      completionRate: 95,
      responseTime: "1 hour",
      avatar: "/placeholder.svg?height=40&width=40",
      bio: "AI researcher and professor specializing in deep learning and neural networks.",
      qualifications: ["PhD Machine Learning", "Google AI Researcher", "Published 50+ Papers"],
      socialProof: {
        linkedin: "https://linkedin.com/in/michaelrodriguez",
        twitter: "https://twitter.com/profmike",
        website: "https://michaelrodriguez.ai",
      },
    },
    {
      id: 3,
      name: "Emma Thompson",
      email: "emma.thompson@example.com",
      status: "pending",
      specialty: "Filmmaking",
      joinDate: "2024-01-10",
      lastLogin: "2024-01-18",
      coursesCreated: 0,
      totalStudents: 0,
      rating: 0,
      totalEarnings: 0,
      monthlyEarnings: 0,
      completionRate: 0,
      responseTime: "N/A",
      avatar: "/placeholder.svg?height=40&width=40",
      bio: "Award-winning filmmaker with experience in documentary and narrative films.",
      qualifications: ["MFA Film Production", "Sundance Film Festival Winner", "10+ Years Experience"],
      socialProof: {
        linkedin: "https://linkedin.com/in/emmathompson",
        twitter: "https://twitter.com/emmathompsonfilm",
        website: "https://emmathompsonfilms.com",
      },
    },
    {
      id: 4,
      name: "James Wilson",
      email: "james.wilson@example.com",
      status: "inactive",
      specialty: "Web Development",
      joinDate: "2023-03-12",
      lastLogin: "2023-12-15",
      coursesCreated: 3,
      totalStudents: 450,
      rating: 4.2,
      totalEarnings: 8900,
      monthlyEarnings: 0,
      completionRate: 78,
      responseTime: "24 hours",
      avatar: "/placeholder.svg?height=40&width=40",
      bio: "Full-stack developer with expertise in React, Node.js, and modern web technologies.",
      qualifications: ["BS Computer Science", "Senior Developer at TechCorp", "5+ Years Experience"],
      socialProof: {
        linkedin: "https://linkedin.com/in/jameswilson",
        twitter: "https://twitter.com/jameswilsondev",
        website: "https://jameswilson.dev",
      },
    },
    {
      id: 5,
      name: "Lisa Park",
      email: "lisa.park@example.com",
      status: "active",
      specialty: "3D Animation",
      joinDate: "2023-09-05",
      lastLogin: "2024-01-20",
      coursesCreated: 4,
      totalStudents: 890,
      rating: 4.7,
      totalEarnings: 12600,
      monthlyEarnings: 1800,
      completionRate: 88,
      responseTime: "3 hours",
      avatar: "/placeholder.svg?height=40&width=40",
      bio: "Professional 3D animator with experience in film, gaming, and advertising.",
      qualifications: ["BFA Animation", "Pixar Animation Studios", "Award-winning Animator"],
      socialProof: {
        linkedin: "https://linkedin.com/in/lisapark",
        twitter: "https://twitter.com/lisapark3d",
        website: "https://lisapark3d.com",
      },
    },
  ]

  const pendingApplications = [
    {
      id: 6,
      name: "David Kumar",
      email: "david.kumar@example.com",
      specialty: "Data Science",
      appliedDate: "2024-01-15",
      status: "under_review",
      experience: "8 years",
      previousRole: "Senior Data Scientist at DataCorp",
      portfolio: "https://davidkumar.portfolio.com",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      id: 7,
      name: "Rachel Green",
      email: "rachel.green@example.com",
      specialty: "UX Design",
      appliedDate: "2024-01-12",
      status: "pending_interview",
      experience: "6 years",
      previousRole: "Lead UX Designer at DesignStudio",
      portfolio: "https://rachelgreen.design",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ]

  const filteredInstructors = instructors.filter((instructor) => {
    const matchesSearch =
      instructor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instructor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "all" || instructor.status === selectedStatus
    const matchesSpecialty = selectedSpecialty === "all" || instructor.specialty === selectedSpecialty
    return matchesSearch && matchesStatus && matchesSpecialty
  })

  const stats = {
    totalInstructors: instructors.length,
    activeInstructors: instructors.filter((i) => i.status === "active").length,
    pendingApplications: pendingApplications.length,
    totalRevenue: instructors.reduce((sum, i) => sum + i.totalEarnings, 0),
    avgRating:
      instructors.filter((i) => i.rating > 0).reduce((sum, i) => sum + i.rating, 0) /
      instructors.filter((i) => i.rating > 0).length,
    totalStudents: instructors.reduce((sum, i) => sum + i.totalStudents, 0),
  }

  const handleAddInstructor = (formData: FormData) => {
    const newInstructor = {
      id: instructors.length + pendingApplications.length + 1,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      specialty: formData.get("specialty") as string,
      status: "pending",
      joinDate: new Date().toISOString().split("T")[0],
      lastLogin: "-",
      coursesCreated: 0,
      totalStudents: 0,
      rating: 0,
      totalEarnings: 0,
      monthlyEarnings: 0,
      completionRate: 0,
      responseTime: "N/A",
      avatar: "/placeholder.svg?height=40&width=40",
      bio: formData.get("bio") as string,
      qualifications: (formData.get("qualifications") as string).split(",").map((s) => s.trim()),
      socialProof: { linkedin: "#", twitter: "#", website: "#" },
    }
    console.log("Adding instructor:", newInstructor)
    toast({
      title: "Instructor Added",
      description: `Instructor "${newInstructor.name}" added successfully.`,
    })
  }

  const handleEditInstructor = (instructor: any) => {
    console.log("Editing instructor:", instructor.id, instructor.name)
    toast({
      title: "Instructor Details Edited",
      description: `Details for "${instructor.name}" updated successfully.`,
    })
  }

  const handleApproveApplication = (application: any) => {
    console.log("Approving application:", application.id, application.name)
    toast({
      title: "Application Approved",
      description: `Instructor "${application.name}" has been approved.`,
    })
  }

  const handleRejectApplication = (application: any) => {
    console.log("Rejecting application:", application.id, application.name)
    toast({
      title: "Application Rejected",
      description: `Application from "${application.name}" has been rejected.`,
      variant: "destructive",
    })
  }

  const handleDeactivateInstructor = (instructor: any) => {
    console.log("Deactivating instructor:", instructor.id, instructor.name)
    toast({
      title: "Instructor Deactivated",
      description: `Instructor "${instructor.name}" has been deactivated.`,
      variant: "destructive",
    })
  }

  const handleActivateInstructor = (instructor: any) => {
    console.log("Activating instructor:", instructor.id, instructor.name)
    toast({
      title: "Instructor Activated",
      description: `Instructor "${instructor.name}" has been activated.`,
    })
  }

  const handleRemoveInstructor = (instructor: any) => {
    console.log("Removing instructor:", instructor.id, instructor.name)
    toast({
      title: "Instructor Removed",
      description: `Instructor "${instructor.name}" has been permanently removed.`,
      variant: "destructive",
    })
  }

  const handleSendInvitation = (formData: FormData) => {
    const email = formData.get("email") as string
    console.log("Sending invitation to:", email)
    toast({
      title: "Invitation Sent",
      description: `Invitation sent to ${email}.`,
    })
  }

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instructor Management</h1>
          <p className="text-muted-foreground">Manage instructors, applications, and performance</p>
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
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Instructor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Instructor</DialogTitle>
                <DialogDescription>Create a new instructor account or send an invitation.</DialogDescription>
              </DialogHeader>
              <form id="add-instructor-form">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" name="name" placeholder="Dr. John Smith" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" placeholder="john@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Specialty</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blockchain">Blockchain</SelectItem>
                          <SelectItem value="ai">AI & Machine Learning</SelectItem>
                          <SelectItem value="web-dev">Web Development</SelectItem>
                          <SelectItem value="filmmaking">Filmmaking</SelectItem>
                          <SelectItem value="3d-animation">3D Animation</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input id="experience" type="number" placeholder="5" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" name="bio" placeholder="Brief description of expertise and background..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualifications">Qualifications</Label>
                    <Textarea
                      id="qualifications"
                      name="qualifications"
                      placeholder="List key qualifications, certifications, and achievements..."
                    />
                  </div>
                </div>
              </form>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    handleSendInvitation(
                      new FormData(document.getElementById("add-instructor-form") as HTMLFormElement),
                    )
                  }
                >
                  Send Invitation
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    handleAddInstructor(new FormData(document.getElementById("add-instructor-form") as HTMLFormElement))
                  }
                >
                  Create Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Instructors</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInstructors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeInstructors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApplications}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Instructors</TabsTrigger>
          <TabsTrigger value="applications">Applications ({pendingApplications.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Instructors</CardTitle>
              <CardDescription>Manage all active instructors and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search instructors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    <SelectItem value="Blockchain">Blockchain</SelectItem>
                    <SelectItem value="AI & Machine Learning">AI & ML</SelectItem>
                    <SelectItem value="Web Development">Web Dev</SelectItem>
                    <SelectItem value="Filmmaking">Filmmaking</SelectItem>
                    <SelectItem value="3D Animation">3D Animation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Specialty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInstructors.map((instructor) => (
                      <TableRow key={instructor.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <img
                              src={instructor.avatar || "/placeholder.svg"}
                              alt={instructor.name}
                              className="h-10 w-10 rounded-full"
                            />
                            <div>
                              <div className="font-medium">{instructor.name}</div>
                              <div className="text-sm text-muted-foreground">{instructor.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{instructor.specialty}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              instructor.status === "active"
                                ? "default"
                                : instructor.status === "pending"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {instructor.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{instructor.coursesCreated}</TableCell>
                        <TableCell>{instructor.totalStudents.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{instructor.rating > 0 ? instructor.rating.toFixed(1) : "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">${instructor.totalEarnings.toLocaleString()}</div>
                            <div className="text-muted-foreground">${instructor.monthlyEarnings}/month</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Progress value={instructor.completionRate} className="h-2 w-16" />
                              <span className="text-sm">{instructor.completionRate}%</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Response: {instructor.responseTime}</div>
                          </div>
                        </TableCell>
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
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditInstructor(instructor)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <BookOpen className="mr-2 h-4 w-4" />
                                View Courses
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Earnings Report
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {instructor.status === "active" ? (
                                <DropdownMenuItem onClick={() => handleDeactivateInstructor(instructor)}>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleActivateInstructor(instructor)}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently remove instructor &quot;
                                      {instructor.name}&quot; and all their associated data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemoveInstructor(instructor)}>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Instructor Applications</CardTitle>
              <CardDescription>Review and approve new instructor applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApplications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <img
                          src={application.avatar || "/placeholder.svg"}
                          alt={application.name}
                          className="h-12 w-12 rounded-full"
                        />
                        <div className="space-y-1">
                          <h3 className="font-medium">{application.name}</h3>
                          <p className="text-sm text-muted-foreground">{application.email}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <Badge variant="outline">{application.specialty}</Badge>
                            <span>{application.experience} experience</span>
                            <span>Applied {application.appliedDate}</span>
                          </div>
                          <p className="text-sm">{application.previousRole}</p>
                          <Link href={application.portfolio} className="text-sm text-blue-600 hover:underline">
                            View Portfolio →
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            application.status === "under_review"
                              ? "secondary"
                              : application.status === "pending_interview"
                                ? "outline"
                                : "default"
                          }
                        >
                          {application.status.replace("_", " ")}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleApproveApplication(application)}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Schedule Interview
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Request More Info
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleRejectApplication(application)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>Instructors with highest ratings and engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {instructors
                    .filter((i) => i.rating > 0)
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 5)
                    .map((instructor, index) => (
                      <div key={instructor.id} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                          {index + 1}
                        </div>
                        <img
                          src={instructor.avatar || "/placeholder.svg"}
                          alt={instructor.name}
                          className="h-8 w-8 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{instructor.name}</div>
                          <div className="text-sm text-muted-foreground">{instructor.specialty}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{instructor.rating}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Leaders</CardTitle>
                <CardDescription>Instructors generating the most revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {instructors
                    .sort((a, b) => b.totalEarnings - a.totalEarnings)
                    .slice(0, 5)
                    .map((instructor, index) => (
                      <div key={instructor.id} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-800 text-sm font-medium">
                          {index + 1}
                        </div>
                        <img
                          src={instructor.avatar || "/placeholder.svg"}
                          alt={instructor.name}
                          className="h-8 w-8 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{instructor.name}</div>
                          <div className="text-sm text-muted-foreground">{instructor.specialty}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${instructor.totalEarnings.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">${instructor.monthlyEarnings}/mo</div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <Toaster />
    </div>
  )
}
