"use client"

import type React from "react"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  Bell,
  Shield,
  BarChart3,
  FileText,
  HelpCircle,
  Blocks,
  Menu,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LogOut,
  User,
} from "lucide-react"

interface SidebarProps {
  className?: string
}

function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<string[]>([])

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    )
  }

  const menuItems = [
    {
      title: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: "Users",
      icon: Users,
      children: [
        { title: "All Users", href: "/admin/users" },
        { title: "Instructors", href: "/admin/users/instructors" },
      ],
    },
    {
      title: "Courses",
      icon: BookOpen,
      children: [
        { title: "All Courses", href: "/admin/courses" },
        { title: "Categories", href: "/admin/courses/categories" },
        { title: "Sections", href: "/admin/courses/sections" },
        { title: "Lessons", href: "/admin/courses/lessons" },
        { title: "Completions", href: "/admin/courses/completions" },
      ],
    },
    {
      title: "Content",
      icon: FileText,
      children: [
        { title: "Content Library", href: "/admin/content" },
        { title: "Media Files", href: "/admin/content/media" },
        { title: "Pages", href: "/admin/content/pages" },
      ],
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
    },
    {
      title: "Notifications",
      href: "/admin/notifications",
      icon: Bell,
    },
    {
      title: "Blockchain",
      href: "/admin/blockchain",
      icon: Blocks,
    },
    {
      title: "Security",
      href: "/admin/security",
      icon: Shield,
    },
    {
      title: "Support",
      href: "/admin/support",
      icon: HelpCircle,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ]

  return (
    <div className={`flex h-full w-full flex-col bg-background ${className}`}>
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-6 w-6" />
          <span>LMS Admin</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {menuItems.map((item) => {
            if (item.children) {
              const isOpen = openSections.includes(item.title)
              const hasActiveChild = item.children.some((child) => pathname === child.href)

              return (
                <Collapsible
                  key={item.title}
                  open={isOpen}
                  onOpenChange={() => toggleSection(item.title)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`w-full justify-between px-3 py-2 text-left ${
                        hasActiveChild
                          ? "bg-muted text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 ml-6 text-sm transition-all hover:text-primary ${
                          pathname === child.href
                            ? "bg-muted text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div className="h-2 w-2 rounded-full bg-current opacity-50" />
                        {child.title}
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                  pathname === item.href ? "bg-muted text-primary" : ""
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Hide sidebar on login and forgot password pages
  const hideSidebar = pathname === "/admin/login" || pathname === "/admin/forgot-password"

  if (hideSidebar) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Desktop Sidebar */}
      <div className="hidden border-r bg-muted/40 md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col">
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden bg-transparent">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>

          {/* Page Title */}
          <div className="w-full">
            <h1 className="text-lg font-semibold md:text-2xl">
              {pathname === "/admin" && "Dashboard"}
              {pathname === "/admin/users" && "User Management"}
              {pathname === "/admin/users/instructors" && "Instructor Management"}
              {pathname === "/admin/courses" && "Course Management"}
              {pathname === "/admin/courses/categories" && "Course Categories"}
              {pathname === "/admin/courses/lessons" && "Lesson Management"}
              {pathname === "/admin/courses/completions" && "Course Completions"}
              {pathname === "/admin/content" && "Content Management"}
              {pathname === "/admin/content/media" && "Media Library"}
              {pathname === "/admin/content/pages" && "Page Management"}
              {pathname === "/admin/analytics" && "Analytics"}
              {pathname === "/admin/notifications" && "Notifications"}
              {pathname === "/admin/blockchain" && "Blockchain Management"}
              {pathname === "/admin/security" && "Security Settings"}
              {pathname === "/admin/support" && "Support Center"}
              {pathname === "/admin/settings" && "System Settings"}
            </h1>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Admin" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
