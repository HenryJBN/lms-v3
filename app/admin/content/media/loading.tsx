import { LoadingSkeleton } from "@/components/admin/loading-skeleton"

export default function MediaLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="space-y-2">
        <div className="h-8 w-[200px] bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-[300px] bg-gray-200 rounded animate-pulse" />
      </div>

      <LoadingSkeleton type="stats" columns={4} />

      <div className="flex justify-between">
        <div className="h-10 w-[300px] bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-[200px] bg-gray-200 rounded animate-pulse" />
      </div>

      <LoadingSkeleton type="cards" rows={8} />
    </div>
  )
}
