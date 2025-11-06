import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CoinsIcon as Coin } from "lucide-react"

export default function TokenBalance() {
  // In a real application, this would be fetched from your API/blockchain
  const tokenBalance = 120

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Coin className="h-4 w-4 text-yellow" />
            <span className="font-medium">{tokenBalance}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Your L-Token balance</p>
          <p className="text-xs text-muted-foreground">Use tokens for rewards</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
