"use client"

import type React from "react"
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
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
  Globe,
  Users,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  User,
  Menu,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Building2,
  Rocket
} from "lucide-react"
import { useAuth } from "@/lib/contexts/auth-context"

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
      title: "Global Dashboard",
      href: "/system-admin",
      icon: LayoutDashboard,
    },
    {
      title: "Tenants (Schools)",
      href: "/system-admin/tenants",
      icon: Building2,
    },
    {
      title: "Onboarding Flow",
      href: "/system-admin/onboarding",
      icon: Rocket,
    },
    {
      title: "Global Analytics",
      href: "/system-admin/analytics",
      icon: BarChart3,
    },
    {
      title: "System Logs",
      href: "/system-admin/logs",
      icon: ShieldAlert,
    },
    {
      title: "Global Settings",
      href: "/system-admin/settings",
      icon: Settings,
    },
  ]

  return (
    <div className={`flex h-full w-full flex-col bg-background ${className}`}>
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/system-admin" className="flex items-center gap-2 font-bold text-primary">
          <Shield className="h-6 w-6" />
          <span>System Admin</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 py-4">
          {menuItems.map((item) => (
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
          ))}
        </nav>
      </div>
    </div>
  )
}

export default function SystemAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push("/login")
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

          <div className="w-full">
            <h1 className="text-lg font-semibold md:text-2xl">
              {pathname === "/system-admin" && "Platform Overview"}
              {pathname === "/system-admin/tenants" && "Tenant Management"}
              {pathname === "/system-admin/onboarding" && "Onboarding Pipeline"}
              {pathname === "/system-admin/analytics" && "Aggregation Analytics"}
              {pathname === "/system-admin/logs" && "System Audit Logs"}
              {pathname === "/system-admin/settings" && "Global Configuration"}
            </h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">SA</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>System Administrator</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/system-admin/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
