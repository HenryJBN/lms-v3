import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CheckCircle2, Circle } from "lucide-react"

interface ActivityItem {
  status: string
  updated_at: string
  lesson_title: string
  course_title: string
}

export default function RecentActivity({ activities }: { activities?: ActivityItem[] }) {
  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity yet. Start a lesson to see your progress here!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start gap-3">
            {activity.status === 'completed' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-blue-500 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">
                {activity.status === 'completed' ? 'Completed' : 'Started'} {activity.lesson_title}
              </p>
              <p className="text-xs text-muted-foreground">
                In {activity.course_title} • {new Date(activity.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
