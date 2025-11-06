"use client"

import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Switch } from "@/components/ui/switch"
import {
  FileText,
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Download,
  Upload,
  Eye,
  Copy,
  Globe,
  Lock,
  Settings,
  History,
  ExternalLink,
  SortAsc,
  SortDesc,
  RefreshCw,
} from "lucide-react"
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

export default function PagesManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedTemplate, setSelectedTemplate] = useState("all")
  const [selectedAuthor, setSelectedAuthor] = useState("all")
  const [sortBy, setSortBy] = useState("lastModified")
  const [sortOrder, setSortOrder] = useState("desc")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedPage, setSelectedPage] = useState<any>(null)
  const [viewMode, setViewMode] = useState("table")

  const { toast } = useToast()

  // Mock pages data
  const pages = [
    {
      id: 1,
      title: "About Us",
      slug: "about",
      status: "published",
      template: "default",
      author: "Admin User",
      authorId: 1,
      createdDate: "2024-01-15",
      lastModified: "2024-01-20",
      publishedDate: "2024-01-16",
      views: 1250,
      content: "Learn about our mission and vision to revolutionize education through blockchain technology...",
      excerpt: "Discover our mission to transform education",
      featuredImage: "/images/about-hero.jpg",
      seoTitle: "About Us - Revolutionary Learning Platform",
      seoDescription:
        "Learn about our mission to revolutionize education through blockchain technology and AI-powered learning.",
      seoKeywords: "education, blockchain, AI, learning platform",
      isHomepage: false,
      showInNav: true,
      navOrder: 1,
      parentId: null,
      visibility: "public",
      comments: true,
      versions: 3,
    },
    {
      id: 2,
      title: "Privacy Policy",
      slug: "privacy",
      status: "published",
      template: "legal",
      author: "Legal Team",
      authorId: 2,
      createdDate: "2024-01-10",
      lastModified: "2024-01-15",
      publishedDate: "2024-01-12",
      views: 890,
      content: "Our privacy policy outlines how we collect, use, and protect your personal information...",
      excerpt: "How we protect your privacy and data",
      featuredImage: null,
      seoTitle: "Privacy Policy - Your Data Protection Rights",
      seoDescription:
        "Learn how we collect, use, and protect your personal information in compliance with GDPR and other privacy laws.",
      seoKeywords: "privacy, data protection, GDPR, personal information",
      isHomepage: false,
      showInNav: true,
      navOrder: 5,
      parentId: null,
      visibility: "public",
      comments: false,
      versions: 5,
    },
    {
      id: 3,
      title: "Terms of Service",
      slug: "terms",
      status: "published",
      template: "legal",
      author: "Legal Team",
      authorId: 2,
      createdDate: "2024-01-08",
      lastModified: "2024-01-10",
      publishedDate: "2024-01-10",
      views: 650,
      content: "By using our service, you agree to these terms and conditions...",
      excerpt: "Terms and conditions for using our platform",
      featuredImage: null,
      seoTitle: "Terms of Service - Platform Usage Agreement",
      seoDescription:
        "Read our terms of service to understand your rights and responsibilities when using our learning platform.",
      seoKeywords: "terms of service, agreement, legal, platform usage",
      isHomepage: false,
      showInNav: true,
      navOrder: 6,
      parentId: null,
      visibility: "public",
      comments: false,
      versions: 2,
    },
    {
      id: 4,
      title: "Course Catalog",
      slug: "courses",
      status: "draft",
      template: "catalog",
      author: "Content Team",
      authorId: 3,
      createdDate: "2024-01-18",
      lastModified: "2024-01-20",
      publishedDate: null,
      views: 0,
      content: "Explore our comprehensive course catalog featuring blockchain, AI, and creative technologies...",
      excerpt: "Browse our complete course offerings",
      featuredImage: "/images/courses-hero.jpg",
      seoTitle: "Course Catalog - Learn Blockchain, AI & More",
      seoDescription:
        "Explore our comprehensive course catalog featuring blockchain development, AI/ML, filmmaking, and 3D animation.",
      seoKeywords: "courses, blockchain, AI, machine learning, filmmaking, 3D animation",
      isHomepage: false,
      showInNav: true,
      navOrder: 2,
      parentId: null,
      visibility: "public",
      comments: true,
      versions: 1,
    },
    {
      id: 5,
      title: "Contact Us",
      slug: "contact",
      status: "published",
      template: "contact",
      author: "Admin User",
      authorId: 1,
      createdDate: "2024-01-12",
      lastModified: "2024-01-18",
      publishedDate: "2024-01-14",
      views: 420,
      content: "Get in touch with our team for support, partnerships, or general inquiries...",
      excerpt: "Connect with our team",
      featuredImage: "/images/contact-hero.jpg",
      seoTitle: "Contact Us - Get in Touch",
      seoDescription:
        "Contact our team for support, partnerships, or general inquiries. We're here to help you succeed.",
      seoKeywords: "contact, support, help, partnerships, inquiries",
      isHomepage: false,
      showInNav: true,
      navOrder: 4,
      parentId: null,
      visibility: "public",
      comments: false,
      versions: 2,
    },
    {
      id: 6,
      title: "Help Center",
      slug: "help",
      status: "published",
      template: "help",
      author: "Support Team",
      authorId: 4,
      createdDate: "2024-01-05",
      lastModified: "2024-01-19",
      publishedDate: "2024-01-08",
      views: 2100,
      content: "Find answers to frequently asked questions and get help with our platform...",
      excerpt: "Get help and find answers to common questions",
      featuredImage: "/images/help-hero.jpg",
      seoTitle: "Help Center - Support & Documentation",
      seoDescription:
        "Find answers to frequently asked questions and get comprehensive help with our learning platform.",
      seoKeywords: "help, support, FAQ, documentation, assistance",
      isHomepage: false,
      showInNav: true,
      navOrder: 3,
      parentId: null,
      visibility: "public",
      comments: true,
      versions: 8,
    },
    {
      id: 7,
      title: "Member Dashboard",
      slug: "dashboard",
      status: "private",
      template: "dashboard",
      author: "Dev Team",
      authorId: 5,
      createdDate: "2024-01-01",
      lastModified: "2024-01-21",
      publishedDate: "2024-01-02",
      views: 15600,
      content: "Welcome to your personalized learning dashboard...",
      excerpt: "Your personalized learning hub",
      featuredImage: null,
      seoTitle: "Dashboard - Your Learning Hub",
      seoDescription:
        "Access your courses, track progress, and manage your learning journey from your personalized dashboard.",
      seoKeywords: "dashboard, learning, progress, courses, profile",
      isHomepage: false,
      showInNav: false,
      navOrder: 0,
      parentId: null,
      visibility: "private",
      comments: false,
      versions: 12,
    },
  ]

  const templates = [
    { id: "default", name: "Default", description: "Standard page layout" },
    { id: "legal", name: "Legal", description: "For terms, privacy, etc." },
    { id: "catalog", name: "Catalog", description: "Course/product listings" },
    { id: "contact", name: "Contact", description: "Contact form layout" },
    { id: "help", name: "Help", description: "Documentation layout" },
    { id: "dashboard", name: "Dashboard", description: "User dashboard layout" },
    { id: "landing", name: "Landing", description: "Marketing landing page" },
  ]

  const authors = [
    { id: 1, name: "Admin User" },
    { id: 2, name: "Legal Team" },
    { id: 3, name: "Content Team" },
    { id: 4, name: "Support Team" },
    { id: 5, name: "Dev Team" },
  ]

  const filteredPages = pages
    .filter((page) => {
      const matchesSearch =
        page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.content.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = selectedStatus === "all" || page.status === selectedStatus
      const matchesTemplate = selectedTemplate === "all" || page.template === selectedTemplate
      const matchesAuthor = selectedAuthor === "all" || page.authorId.toString() === selectedAuthor
      return matchesSearch && matchesStatus && matchesTemplate && matchesAuthor
    })
    .sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a]
      const bValue = b[sortBy as keyof typeof b]
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const stats = {
    totalPages: pages.length,
    publishedPages: pages.filter((p) => p.status === "published").length,
    draftPages: pages.filter((p) => p.status === "draft").length,
    privatePages: pages.filter((p) => p.status === "private").length,
    totalViews: pages.reduce((sum, page) => sum + page.views, 0),
    avgViews: Math.round(pages.reduce((sum, page) => sum + page.views, 0) / pages.length),
  }

  const handleCreatePage = () => {
    setIsCreateDialogOpen(false)
    toast({
      title: "Page Created",
      description: "New page created successfully!",
    })
    // Handle page creation logic here
  }

  const handleEditPage = (page: any) => {
    setSelectedPage(page)
    setIsEditDialogOpen(true)
    toast({
      title: "Page Edited",
      description: `Page "${page.title}" opened for editing.`,
    })
  }

  const handleDeletePage = (pageId: number) => {
    // Handle page deletion logic here
    console.log("Delete page:", pageId)
    toast({
      title: "Page Deleted",
      description: `Page with ID ${pageId} deleted successfully.`,
      variant: "destructive",
    })
  }

  const handleDuplicatePage = (pageId: number) => {
    // Handle page duplication logic here
    console.log("Duplicate page:", pageId)
    toast({
      title: "Page Duplicated",
      description: `Page with ID ${pageId} duplicated successfully.`,
    })
  }

  return (
    <div className="flex-1 space-y-4 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pages Management</h1>
          <p className="text-muted-foreground">Create and manage website pages, content, and navigation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Pages
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Pages
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Page
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Page</DialogTitle>
                <DialogDescription>Add a new page to your website with content and SEO settings.</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Page Title</Label>
                      <Input id="title" placeholder="Enter page title" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slug">URL Slug</Label>
                      <Input id="slug" placeholder="page-url-slug" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea id="excerpt" placeholder="Brief description of the page" className="h-20" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Page Content</Label>
                    <Textarea id="content" placeholder="Enter page content..." className="min-h-[200px]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="featured-image">Featured Image URL</Label>
                    <Input id="featured-image" placeholder="https://example.com/image.jpg" />
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template">Template</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name} - {template.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="visibility">Visibility</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="password">Password Protected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="author">Author</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select author" />
                        </SelectTrigger>
                        <SelectContent>
                          {authors.map((author) => (
                            <SelectItem key={author.id} value={author.id.toString()}>
                              {author.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-in-nav">Show in Navigation</Label>
                      <Switch id="show-in-nav" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="allow-comments">Allow Comments</Label>
                      <Switch id="allow-comments" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is-homepage">Set as Homepage</Label>
                      <Switch id="is-homepage" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nav-order">Navigation Order</Label>
                    <Input id="nav-order" type="number" placeholder="0" />
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seo-title">SEO Title</Label>
                    <Input id="seo-title" placeholder="Page title for search engines" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seo-description">Meta Description</Label>
                    <Textarea
                      id="seo-description"
                      placeholder="Description for search engines (150-160 characters)"
                      className="h-20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seo-keywords">Keywords</Label>
                    <Input id="seo-keywords" placeholder="keyword1, keyword2, keyword3" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="canonical-url">Canonical URL</Label>
                    <Input id="canonical-url" placeholder="https://example.com/canonical-page" />
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-css">Custom CSS</Label>
                    <Textarea id="custom-css" placeholder="/* Custom CSS for this page */" className="h-32 font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom-js">Custom JavaScript</Label>
                    <Textarea
                      id="custom-js"
                      placeholder="// Custom JavaScript for this page"
                      className="h-32 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redirect-url">Redirect URL</Label>
                    <Input id="redirect-url" placeholder="https://example.com/redirect-target" />
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePage}>Create Page</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.publishedPages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftPages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Private</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.privatePages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgViews}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Pages</CardTitle>
          <CardDescription>Manage your website pages and content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Author" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authors</SelectItem>
                  {authors.map((author) => (
                    <SelectItem key={author.id} value={author.id.toString()}>
                      {author.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Sort by:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="lastModified">Last Modified</SelectItem>
                  <SelectItem value="createdDate">Created Date</SelectItem>
                  <SelectItem value="views">Views</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead>Versions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium">{page.title}</div>
                          {page.isHomepage && (
                            <Badge variant="secondary" className="text-xs">
                              Homepage
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">/{page.slug}</code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          page.status === "published"
                            ? "default"
                            : page.status === "draft"
                              ? "secondary"
                              : page.status === "private"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {page.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{page.template}</Badge>
                    </TableCell>
                    <TableCell>{page.author}</TableCell>
                    <TableCell>{page.views.toLocaleString()}</TableCell>
                    <TableCell>{page.lastModified}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <History className="h-3 w-3" />
                        {page.versions}
                      </div>
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
                            Preview Page
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Live
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditPage(page)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Page
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicatePage(page.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <History className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Page Settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the page &quot;{page.title}
                                  &quot; and remove its data from our servers.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePage(page.id)}>
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

          {filteredPages.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No pages found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Page Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Page: {selectedPage?.title}</DialogTitle>
            <DialogDescription>Update page content, settings, and SEO information.</DialogDescription>
          </DialogHeader>
          {selectedPage && (
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Page Title</Label>
                    <Input id="edit-title" defaultValue={selectedPage.title} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-slug">URL Slug</Label>
                    <Input id="edit-slug" defaultValue={selectedPage.slug} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-excerpt">Excerpt</Label>
                  <Textarea id="edit-excerpt" defaultValue={selectedPage.excerpt} className="h-20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-content">Page Content</Label>
                  <Textarea id="edit-content" defaultValue={selectedPage.content} className="min-h-[200px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-featured-image">Featured Image URL</Label>
                  <Input id="edit-featured-image" defaultValue={selectedPage.featuredImage || ""} />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select defaultValue={selectedPage.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-template">Template</Label>
                    <Select defaultValue={selectedPage.template}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-show-in-nav">Show in Navigation</Label>
                    <Switch id="edit-show-in-nav" defaultChecked={selectedPage.showInNav} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-allow-comments">Allow Comments</Label>
                    <Switch id="edit-allow-comments" defaultChecked={selectedPage.comments} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-is-homepage">Set as Homepage</Label>
                    <Switch id="edit-is-homepage" defaultChecked={selectedPage.isHomepage} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-seo-title">SEO Title</Label>
                  <Input id="edit-seo-title" defaultValue={selectedPage.seoTitle} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-seo-description">Meta Description</Label>
                  <Textarea id="edit-seo-description" defaultValue={selectedPage.seoDescription} className="h-20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-seo-keywords">Keywords</Label>
                  <Input id="edit-seo-keywords" defaultValue={selectedPage.seoKeywords} />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-custom-css">Custom CSS</Label>
                  <Textarea
                    id="edit-custom-css"
                    placeholder="/* Custom CSS for this page */"
                    className="h-32 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-custom-js">Custom JavaScript</Label>
                  <Textarea
                    id="edit-custom-js"
                    placeholder="// Custom JavaScript for this page"
                    className="h-32 font-mono"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsEditDialogOpen(false)
                toast({
                  title: "Page Updated",
                  description: `Page "${selectedPage?.title}" updated successfully.`,
                })
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  )
}
