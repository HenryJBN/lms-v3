"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, X, Loader2 } from "lucide-react"
import Image from "next/image"

interface ImageUploadProps {
  value: string | null
  onChange: (url: string) => void
  onUpload: (file: File) => Promise<any>
  label?: string
  className?: string
}

export function ImageUpload({ value, onChange, onUpload, label = "Upload Image", className }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("Image must be smaller than 5MB")
        return
    }

    setError(null)
    setIsUploading(true)

    try {
      const result = await onUpload(file)
      // Assuming result returns { url: "..." }
      if (result && result.url) {
          onChange(result.url)
      }
    } catch (err) {
      setError("Failed to upload image")
      console.error(err)
    } finally {
      setIsUploading(false)
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) {
          fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = () => {
    onChange("")
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {label && <p className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</p>}
      
      <div className="flex items-center gap-4">
        {value ? (
          <div className="relative aspect-video w-40 overflow-hidden rounded-md border bg-muted">
             <Image
              src={value}
              alt="Upload"
              fill
              className="object-cover"
            />
            <Button
              type="button"
              onClick={handleRemove}
              variant="destructive"
              size="icon"
              className="absolute right-1 top-1 h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-video w-40 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed bg-muted hover:opacity-75"
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
             <span className="mt-2 text-xs text-muted-foreground">Select Image</span>
          </div>
        )}
        
        <div className="flex flex-col gap-2">
            <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
             <Button 
                type="button" 
                variant="secondary" 
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
            >
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {value ? "Change Image" : "Upload Image"}
            </Button>
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  )
}
