import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Clock, LockKeyhole } from "lucide-react"

interface PathStep {
  title: string
  progress_percentage: number
  slug: string
  thumbnail_url?: string
}

export default function LearningPathProgress({ steps }: { steps?: PathStep[] }) {
  // Fallback to dummy data if no steps provided
  const pathSteps = steps && steps.length > 0 ? steps : [
    {
      title: "Web Fundamentals",
      progress_percentage: 100,
      slug: "web-fundamentals",
    },
    {
      title: "Blockchain Fundamentals",
      progress_percentage: 45,
      slug: "blockchain-fundamentals",
    },
    {
      title: "Smart Contract Development",
      progress_percentage: 0,
      slug: "smart-contract-development",
    }
  ]

  return (
    <div className="relative pl-6 before:absolute before:left-3 before:top-0 before:h-full before:w-0.5 before:bg-muted">
      {pathSteps.map((step, index) => {
        const isCompleted = step.progress_percentage >= 100;
        const isInProgress = step.progress_percentage > 0 && step.progress_percentage < 100;
        const isLocked = step.progress_percentage === 0 && index > 0 && (pathSteps[index-1].progress_percentage < 100);

        return (
          <div key={index} className="mb-6 relative">
            <div
              className={`absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full ${
                isCompleted
                  ? "bg-green-100"
                  : isInProgress
                    ? "bg-blue-100"
                    : "bg-muted"
              }`}
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : isInProgress ? (
                <Clock className="h-4 w-4 text-blue-600" />
              ) : (
                <LockKeyhole className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <Card className={`${isLocked ? "opacity-60" : ""} transition-opacity`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {step.thumbnail_url && (
                    <img src={step.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{step.title}</h3>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div 
                        className={`h-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} 
                        style={{ width: `${step.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center text-xs">
                  <span
                    className={
                      isCompleted ? "text-green-600" : isInProgress ? "text-blue-600" : "text-muted-foreground"
                    }
                  >
                    {isCompleted ? "Completed" : isInProgress ? `${step.progress_percentage}% Complete` : "Not Started"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  )
}
