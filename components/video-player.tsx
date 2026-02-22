"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Play, Pause, Volume2, VolumeX, Maximize, CheckCircle, RotateCcw, RotateCw, Settings } from "lucide-react"

interface VideoPlayerProps {
  videoUrl: string
  onComplete: () => void
  onTimeUpdate?: (currentTime: number, progress: number) => void
  isCompleted?: boolean
  initialTime?: number
  initialPlaybackRate?: number
  autoPlay?: boolean
}

const PLAYBACK_RATE_STORAGE_KEY = "lms-playback-rate"

export default function VideoPlayer({
  videoUrl,
  onComplete,
  onTimeUpdate,
  isCompleted = false,
  initialTime = 0,
  initialPlaybackRate,
  autoPlay = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [hasWatched85Percent, setHasWatched85Percent] = useState(isCompleted)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isDragging, setIsDragging] = useState(false)

  // Consolidate initialization and event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Get initial playback rate once
    const storedRate = localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY)
    const initialRate = initialPlaybackRate ?? (storedRate ? parseFloat(storedRate) : 1)
    setPlaybackRate(initialRate)

    const handleTimeUpdate = () => {
      if (!video.duration || !isFinite(video.duration)) return
      if (!isDragging) {
        setCurrentTime(video.currentTime)
        setProgress((video.currentTime / video.duration) * 100)
      }
      if (!hasWatched85Percent && video.currentTime / video.duration >= 0.85) {
        setHasWatched85Percent(true)
        onComplete()
      }
    }

    const handleLoadedMetadata = () => {
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration)
        video.playbackRate = initialRate
        if (initialTime > 0 && video.currentTime === 0) {
          video.currentTime = Math.min(initialTime, video.duration)
          setCurrentTime(video.currentTime)
          setProgress((video.currentTime / video.duration) * 100)
        }
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      if (!hasWatched85Percent) {
        setHasWatched85Percent(true)
        onComplete()
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("ended", handleEnded)

    // Handle initial state if video is already ready
    if (video.readyState >= 1) handleLoadedMetadata()

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("ended", handleEnded)
    }
  }, [initialPlaybackRate, initialTime, onComplete, isDragging, hasWatched85Percent])

  // Periodic progress tracking
  useEffect(() => {
    if (!isPlaying || !onTimeUpdate) return

    const interval = setInterval(() => {
      const video = videoRef.current
      if (video && video.duration > 0) {
        onTimeUpdate(video.currentTime, (video.currentTime / video.duration) * 100)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isPlaying, onTimeUpdate])

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null

    const handleMouseMove = () => {
      setShowControls(true)

      if (timeout) {
        clearTimeout(timeout)
      }

      if (isPlaying) {
        timeout = setTimeout(() => {
          setShowControls(false)
        }, 3000)
      }
    }

    document.addEventListener("mousemove", handleMouseMove)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [isPlaying])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch((error) => {
        console.error("Error playing video:", error)
      })
    }

    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(!isMuted)
  }

  const handleSeekChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    // Guard against invalid duration
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      return
    }

    setIsDragging(true)
    const newTime = (value[0] / 100) * video.duration
    setProgress(value[0])
    setCurrentTime(newTime)
  }

  const handleSeekCommit = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    // Guard against invalid duration
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      setIsDragging(false)
      return
    }

    setIsDragging(false)
    const newTime = (value[0] / 100) * video.duration
    
    // Ensure newTime is valid before setting
    if (Number.isFinite(newTime)) {
        video.currentTime = newTime
        setCurrentTime(newTime)
        setProgress(value[0])
    }
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
        return
    }

    const newTime = video.currentTime + seconds
    // Clamp time between 0 and duration
    const clampedTime = Math.max(0, Math.min(newTime, video.duration))
    
    video.currentTime = clampedTime
    setCurrentTime(clampedTime)
    setProgress((clampedTime / video.duration) * 100)

    // Notify parent immediately on skip
    if (onTimeUpdate) {
      onTimeUpdate(clampedTime, (clampedTime / video.duration) * 100)
    }
  }

  // Handle playback rate changes and persist to localStorage
  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = speed
    setPlaybackRate(speed)
    
    // Save to localStorage for persistence across lessons
    localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(speed))
  }

  // Handle autoplay when autoPlay prop is true - with proper timing
  useEffect(() => {
    if (autoPlay && !isPlaying) {
      // Wait for video to be ready by checking videoRef
      const tryPlay = () => {
        if (videoRef.current) {
          // Apply playback rate first
          const storedRate = localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY)
          const rate = initialPlaybackRate ?? (storedRate ? parseFloat(storedRate) : 1)
          videoRef.current.playbackRate = rate
          
          videoRef.current.play()
            .then(() => {
              setIsPlaying(true)
            })
            .catch((error) => {
              console.error("Error auto-playing video:", error)
            })
        }
      }
      
      // If video is already loaded, play now
      if (videoRef.current && videoRef.current.readyState >= 2) {
        tryPlay()
      } else {
        // Wait for loadedmetadata event
        const handleCanPlay = () => {
          tryPlay()
          videoRef.current?.removeEventListener('loadedmetadata', handleCanPlay)
        }
        videoRef.current?.addEventListener('loadedmetadata', handleCanPlay)
        
        return () => {
          videoRef.current?.removeEventListener('loadedmetadata', handleCanPlay)
        }
      }
    }
  }, [autoPlay, initialPlaybackRate])

  const toggleFullscreen = () => {
    const videoContainer = document.getElementById("video-container")
    if (!videoContainer) return

    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error("Error exiting fullscreen:", err)
      })
    } else {
      videoContainer.requestFullscreen().catch((err) => {
        console.error("Error entering fullscreen:", err)
      })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

  // Extract video ID from YouTube URL if it's a YouTube video
  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/embed/")) {
      return url // Already an embed URL
    }

    const youtubeRegex =
      /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    const match = url.match(youtubeRegex)

    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}?enablejsapi=1`
    }

    return url // Return original URL if not YouTube
  }

  const embedUrl = getYouTubeEmbedUrl(videoUrl)
  const isYouTube = embedUrl.includes("youtube.com/embed/")

  if (isYouTube) {
    return (
      <div className="relative aspect-video rounded-md overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allowFullScreen
          title="Video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
        {hasWatched85Percent && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md flex items-center text-xs">
            <CheckCircle className="mr-1 h-3 w-3" />
            Completed
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      id="video-container"
      className="relative rounded-md overflow-hidden bg-black aspect-video"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full"
        onClick={togglePlay}
        playsInline
        crossOrigin="anonymous"
      />

      {hasWatched85Percent && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md flex items-center text-xs">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </div>
      )}

      {/* Video controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Progress bar */}
        <div className="mb-3">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={handleSeekChange}
            onValueCommit={handleSeekCommit}
            className="cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => skip(-10)}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => skip(10)}
            >
              <RotateCw className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>

            <span className="text-white text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-8 px-2 text-xs">
                  <Settings className="h-4 w-4 mr-1" />
                  {playbackRate}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {playbackSpeeds.map((speed) => (
                  <DropdownMenuItem key={speed} onClick={() => handleSpeedChange(speed)}>
                    {speed}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Play button overlay when paused */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10"
          onClick={togglePlay}
        >
          <div className="rounded-full bg-red/80 p-4">
            <Play className="h-8 w-8 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}
