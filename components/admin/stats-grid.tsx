import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatItem {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
}

interface StatsGridProps {
  stats: StatItem[]
  columns?: number
}

export function StatsGrid({ stats, columns = 4 }: StatsGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
    5: "md:grid-cols-2 lg:grid-cols-5",
    6: "md:grid-cols-2 lg:grid-cols-6",
  }

  return (
    <div className={`grid gap-4 ${gridCols[columns as keyof typeof gridCols]}`}>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.description && (
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            )}
            {stat.trend && (
              <p className={`text-xs ${stat.trend.isPositive ? "text-green-600" : "text-red-600"}`}>
                {stat.trend.isPositive ? "+" : ""}
                {stat.trend.value}% from last month
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
