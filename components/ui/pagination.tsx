"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "./button"
import { useMemo } from "react"

export interface PaginationProps {
  page: number
  size: number
  total: number
  onChange?: (next: { page: number; size: number }) => void
  showPageInfo?: boolean
  pageParam?: string
  sizeParam?: string
  model?: string
}

export function Pagination({
  page,
  size,
  total,
  onChange,
  showPageInfo = true,
  pageParam = "page",
  sizeParam = "size",
  model = "items",
}: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / (size || 1))), [total, size])

  const updateUrl = (nextPage: number, nextSize: number) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set(pageParam, String(nextPage))
    params.set(sizeParam, String(nextSize))
    router.replace(`${pathname}?${params.toString()}`)
  }

  const goTo = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return
    onChange?.({ page: nextPage, size })
    updateUrl(nextPage, size)
  }

  return (
    <div className="flex items-center justify-between py-4">
      {showPageInfo && (
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages} • {total} {model}
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goTo(page - 1)}>
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => goTo(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
