import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Clock, LockKeyhole } from "lucide-react"

export default function LearningPathProgress() {
  // In a real application, this would come from your backend
  const pathSteps = [
    {
      id: 1,
      title: "Web Fundamentals",
      description: "HTML, CSS, and JavaScript basics",
      status: "completed",
    },
    {
      id: 2,
      title: "Blockchain Fundamentals",
      description: "Understanding blockchain concepts",
      status: "in-progress",
    },
    {
      id: 3,
      title: "Smart Contract Development",
      description: "Building with Solidity",
      status: "locked",
    },
    {
      id: 4,
      title: "dApp Development",
      description: "Full-stack Web3 applications",
      status: "locked",
    },
  ]

  return (
    <div className="relative pl-6 before:absolute before:left-3 before:top-0 before:h-full before:w-0.5 before:bg-muted">
      {pathSteps.map((step, index) => (
        <div key={step.id} className="mb-6 relative">
          <div
            className={`absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full ${
              step.status === "completed" ? "bg-green-100" : step.status === "in-progress" ? "bg-blue-100" : "bg-muted"
            }`}
          >
            {step.status === "completed" ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : step.status === "in-progress" ? (
              <Clock className="h-4 w-4 text-blue-600" />
            ) : (
              <LockKeyhole className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <Card className={`${step.status === "locked" ? "opacity-60" : ""} transition-opacity`}>
            <CardContent className="p-4">
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
              <div className="mt-2 flex justify-between items-center">
                <span
                  className={`text-xs ${
                    step.status === "completed"
                      ? "text-green-600"
                      : step.status === "in-progress"
                        ? "text-blue-600"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.status === "completed" ? "Completed" : step.status === "in-progress" ? "In Progress" : "Locked"}
                </span>

                {step.status === "completed" && (
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">25 tokens earned</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
