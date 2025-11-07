"use client"

import type { ReactNode } from "react"

interface AdminLayoutProps {
  title: string
  description: string
  children: ReactNode
  headerActions?: React.ReactNode
}

export function AdminLayout({ title, description, children }: AdminLayoutProps) {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
