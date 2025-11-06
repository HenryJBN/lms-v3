import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Gem, Trophy } from "lucide-react"
import Link from "next/link"

interface CourseCardProps {
  id?: string
  title: string
  description: string
  progress: number
  tokens: number
  image: string
  completed?: boolean
}

export default function CourseCard({
  id,
  title,
  description,
  progress,
  tokens,
  image,
  completed = false,
}: CourseCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <img src={image || "/placeholder.svg"} alt={title} className="h-40 w-full object-cover" />
      <CardHeader className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {completed && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
              <Trophy className="h-3 w-3 text-green-600" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex justify-between items-center mb-2 text-sm">
          <span>Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardContent>
      <CardFooter className="flex justify-between items-center p-4 pt-0">
        <div className="flex items-center gap-1">
          <Gem className="h-4 w-4 text-red" />
          <span className="text-sm font-medium">{tokens} Tokens</span>
        </div>
        <Link href={`/learn/${id || "web-development"}`}>
          <Button size="sm" variant={completed ? "outline" : "default"}>
            {completed ? "Review" : "Continue"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
