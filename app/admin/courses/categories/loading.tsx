import { LoadingSkeleton } from "@/components/admin/loading-skeleton"

export default function CategoriesLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <div className="h-8 w-[300px] bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-[400px] bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Statistics Cards */}
      <LoadingSkeleton type="stats" columns={4} />

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="h-10 w-[300px] bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-[200px] bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center space-x-2">
          {/* Placeholder for additional filter elements */}
        </div>
      </div>

      {/* Categories Table */}
      <LoadingSkeleton type="table" rows={5} columns={5} />
    </div>
  )
}
