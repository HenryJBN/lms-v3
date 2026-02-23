"use client"

import { useQuery } from "@tanstack/react-query"
import { CoinsIcon as Coin, Loader2 } from "lucide-react"
import { usersService } from "@/lib/services/users"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function TokenBalance() {
  const { data: balanceData, isLoading } = useQuery({
    queryKey: ["userTokenBalance"],
    queryFn: () => usersService.getTokenBalance(),
  })

  const balance = balanceData?.balance ?? null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1 bg-yellow-100/50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/30 text-yellow-700 dark:text-yellow-500">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Coin className="h-4 w-4" />
            )}
            <span className="font-medium">{balance?.toLocaleString() || 0}</span>
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
