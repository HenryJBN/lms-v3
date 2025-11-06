"use client"

import { useState } from "react"
import { Upload, Download, ImageIcon, Video, FileText, Music, Folder, Grid, List } from "lucide-react"

import { AdminLayout } from "@/components/admin/admin-layout"
import { StatsGrid } from "@/components/admin/stats-grid"
import { SearchFilters } from "@/components/admin/search-filters"
import { ActionButtons } from "@/components/admin/action-buttons"
import { BulkActions } from "@/components/admin/bulk-actions"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Mock data
const mockFiles = [
  {
    id: "1",
    name: "blockchain-intro.mp4",
    type: "video",
    size: "45.2 MB",
    url: "/videos/blockchain-intro.mp4",
    thumbnail: "/images/thumbnails/blockchain-intro.jpg",
    uploadedAt: "2024-01-15",
    usedIn: ["Blockchain Fundamentals"],
  },
  {
    id: "2",
    name: "course-banner.jpg",
    type: "image",
    size: "2.1 MB",
    url: "/images/course-banner.jpg",
    thumbnail: "/images/course-banner.jpg",
    uploadedAt: "2024-01-16",
    usedIn: ["Homepage", "Course Page"],
  },
  {
    id: "3",
    name: "lesson-notes.pdf",
    type: "document",
    size: "1.8 MB",
    url: "/documents/lesson-notes.pdf",
    thumbnail: "/images/thumbnails/pdf.png",
    uploadedAt: "2024-01-17",
    usedIn: ["Smart Contracts Course"],
  },
]

export default function MediaPage() {
  const [files] = useState(mockFiles)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  // Calculate statistics
  const stats = [
    {
      title: "Total Files",
      value: files.length,
      description: "All media files",
      icon: Folder,
    },
    {
      title: "Storage Used",
      value: "48.1 MB",
      description: "of 1 GB limit",
      icon: Upload,
    },
    {
      title: "Images",
      value: files.filter((f) => f.type === "image").length,
      description: "Image files",
      icon: ImageIcon,
    },
    {
      title: "Videos",
      value: files.filter((f) => f.type === "video").length,
      description: "Video files",
      icon: Video,
    },
  ]

  // Filter files
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "all" || file.type === typeFilter
    return matchesSearch && matchesType
  })

  // Bulk actions
  const bulkActions = [
    {
      label: "Download Selected",
      icon: Download,
      onClick: () => console.log("Download selected", selectedFiles),
      variant: "outline" as const,
    },
    {
      label: "Delete Selected",
      icon: FileText,
      onClick: () => console.log("Delete selected", selectedFiles),
      variant: "destructive" as const,
    },
  ]

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "document":
        return <FileText className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case "image":
        return "bg-green-100 text-green-800"
      case "video":
        return "bg-blue-100 text-blue-800"
      case "document":
        return "bg-red-100 text-red-800"
      case "audio":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <AdminLayout title="Media Library" description="Manage your media files and assets">
      <StatsGrid stats={stats} />

      <div className="flex items-center justify-between">
        <SearchFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search files..."
          filters={[
            {
              value: typeFilter,
              onChange: setTypeFilter,
              placeholder: "File Type",
              options: [
                { value: "all", label: "All Types" },
                { value: "image", label: "Images" },
                { value: "video", label: "Videos" },
                { value: "document", label: "Documents" },
                { value: "audio", label: "Audio" },
              ],
            },
          ]}
        />

        <div className="flex items-center space-x-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>

          <ActionButtons
            primaryAction={{
              label: "Upload Files",
              icon: Upload,
              onClick: () => console.log("Upload files"),
            }}
            exportActions={[
              { label: "Export File List", onClick: () => console.log("Export list") },
              { label: "Download All", onClick: () => console.log("Download all") },
            ]}
          />
        </div>
      </div>

      <BulkActions selectedCount={selectedFiles.length} actions={bulkActions} />

      <Card>
        <CardHeader>
          <CardTitle>Media Files</CardTitle>
          <CardDescription>
            {filteredFiles.length} of {files.length} files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredFiles.map((file) => (
                <Card key={file.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    {file.type === "image" || file.type === "video" ? (
                      <img
                        src={file.thumbnail || "/placeholder.svg"}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-4xl text-muted-foreground">{getFileIcon(file.type)}</div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={getFileTypeColor(file.type)}>{file.type}</Badge>
                        <span className="text-xs text-muted-foreground">{file.size}</span>
                      </div>
                      <h4 className="font-medium text-sm truncate">{file.name}</h4>
                      <p className="text-xs text-muted-foreground">Used in: {file.usedIn.join(", ")}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    {file.type === "image" ? (
                      <img
                        src={file.thumbnail || "/placeholder.svg"}
                        alt={file.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      getFileIcon(file.type)
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{file.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {file.size} • Uploaded {file.uploadedAt}
                    </p>
                  </div>
                  <Badge className={getFileTypeColor(file.type)}>{file.type}</Badge>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
