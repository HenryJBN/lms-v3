"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Play, Pause, Volume2, VolumeX, Maximize, CheckCircle, RotateCcw, RotateCw, Settings, Monitor } from "lucide-react"
import { getVideoStreamUrl, getHlsStreamUrl } from "@/lib/api-config"
import Hls from "hls.js"

interface VideoPlayerProps {
  videoUrl: string
  hlsUrl?: string
  onComplete: () => void
  onTimeUpdate?: (currentTime: number, progress: number, timeSpent: number) => void
  isCompleted?: boolean
  initialTime?: number
  initialPlaybackRate?: number
  autoPlay?: boolean
}

const PLAYBACK_RATE_STORAGE_KEY = "lms-playback-rate"

export default function VideoPlayer({
  videoUrl,
  hlsUrl,
  onComplete,
  onTimeUpdate,
  isCompleted = false,
  initialTime = 0,
  initialPlaybackRate,
  autoPlay = false,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [hasWatched85Percent, setHasWatched85Percent] = useState(isCompleted)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentQuality, setCurrentQuality] = useState<number>(-1)
  const [availableQualities, setAvailableQualities] = useState<Array<{ height: number; level: number }>>([])
  const [useHls, setUseHls] = useState(false)
  const [hlsError, setHlsError] = useState<string | null>(null)
  
  const isDraggingRef = useRef(false)
  const hasWatched85PercentRef = useRef(isCompleted)
  const onCompleteRef = useRef(onComplete)
  const intendedTimeRef = useRef(0)
  const isSeekingRef = useRef(false)
  const sessionStartTimeRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Initialize HLS or native video
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const hlsSupported = Hls.isSupported()
    const nativeHls = video.canPlayType('application/vnd.apple.mpegurl')
    
    const hlsManifestUrl = hlsUrl || getHlsStreamUrl(videoUrl)
    const shouldUseHls = hlsManifestUrl && hlsManifestUrl.endsWith('.m3u8')
    
    if (shouldUseHls && hlsSupported) {
      console.log('[VideoPlayer] Using HLS.js for playback')
      setUseHls(true)
      
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      })
      hlsRef.current = hls
      
      hls.loadSource(hlsManifestUrl)
      hls.attachMedia(video)
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('[VideoPlayer] HLS manifest parsed, levels:', data.levels.length)
        
        const qualities = data.levels.map((level, index) => ({
          height: level.height,
          level: index,
        })).sort((a, b) => b.height - a.height)
        
        setAvailableQualities(qualities)
        setHlsError(null)
      })
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('[VideoPlayer] HLS error:', data)
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[VideoPlayer] Network error, trying to recover...')
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[VideoPlayer] Media error, trying to recover...')
              hls.recoverMediaError()
              break
            default:
              console.log('[VideoPlayer] Fatal error, falling back to MP4')
              setHlsError('HLS playback failed')
              hls.destroy()
              setUseHls(false)
              break
          }
        }
      })
      
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else if (shouldUseHls && nativeHls && hlsManifestUrl) {
      console.log('[VideoPlayer] Using native HLS (Safari)')
      setUseHls(true)
      video.src = hlsManifestUrl
    } else {
      console.log('[VideoPlayer] Using native video (MP4)')
      setUseHls(false)
      const streamUrl = getVideoStreamUrl(videoUrl)
      video.src = streamUrl || ""
    }
  }, [videoUrl, hlsUrl])

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const storedRate = localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY)
    const initialRate = initialPlaybackRate ?? (storedRate ? parseFloat(storedRate) : 1)
    setPlaybackRate(initialRate)

    const handleTimeUpdate = () => {
      if (!video.duration || !isFinite(video.duration)) return
      if (!isDraggingRef.current && !isSeekingRef.current) {
        setCurrentTime(video.currentTime)
        setProgress((video.currentTime / video.duration) * 100)
        intendedTimeRef.current = video.currentTime
      }
      if (!hasWatched85PercentRef.current && video.currentTime / video.duration >= 0.85) {
        hasWatched85PercentRef.current = true
        setHasWatched85Percent(true)
        onCompleteRef.current()
      }
    }

    const handleLoadedMetadata = () => {
      if (isSeekingRef.current) return
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration)
        video.playbackRate = initialRate
        if (initialTime > 0 && video.currentTime === 0 && !isSeekingRef.current) {
          video.currentTime = Math.min(initialTime, video.duration)
          setCurrentTime(video.currentTime)
          setProgress((video.currentTime / video.duration) * 100)
          intendedTimeRef.current = video.currentTime
        }
      }
    }

    const handleSeeking = () => {
      isSeekingRef.current = true
      isDraggingRef.current = true
    }

    const handleSeeked = () => {
      isSeekingRef.current = false
      isDraggingRef.current = false
      if (video.duration && isFinite(video.duration)) {
        setCurrentTime(video.currentTime)
        setProgress((video.currentTime / video.duration) * 100)
        intendedTimeRef.current = video.currentTime
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      if (!hasWatched85PercentRef.current) {
        hasWatched85PercentRef.current = true
        setHasWatched85Percent(true)
        onCompleteRef.current()
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("seeking", handleSeeking)
    video.addEventListener("seeked", handleSeeked)
    video.addEventListener("ended", handleEnded)

    if (video.readyState >= 1 && initialTime > 0 && !isSeekingRef.current) {
      handleLoadedMetadata()
    }

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("seeking", handleSeeking)
      video.removeEventListener("seeked", handleSeeked)
      video.removeEventListener("ended", handleEnded)
    }
  }, [initialPlaybackRate, initialTime])

  // Track time spent and update progress periodically
  useEffect(() => {
    if (isPlaying && sessionStartTimeRef.current === null) {
      sessionStartTimeRef.current = Date.now()
    }
    
    if (!isPlaying && sessionStartTimeRef.current !== null) {
      // Session paused - time spent will be reported on next update
    }
  }, [isPlaying])

  // Periodic progress tracking with time spent
  useEffect(() => {
    if (!isPlaying || !onTimeUpdate) return

    const interval = setInterval(() => {
      const video = videoRef.current
      if (video && video.duration > 0) {
        // Calculate time spent since last update (in seconds)
        const now = Date.now()
        const timeSinceLastUpdate = lastUpdateTimeRef.current > 0 
          ? Math.floor((now - lastUpdateTimeRef.current) / 1000) 
          : 5 // Default to 5 seconds for first update
        
        lastUpdateTimeRef.current = now
        
        // Only count time if video was actually playing (max 10 seconds to avoid counting pauses)
        const actualTimeSpent = Math.min(timeSinceLastUpdate, 10)
        
        onTimeUpdate(video.currentTime, (video.currentTime / video.duration) * 100, actualTimeSpent)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isPlaying, onTimeUpdate])

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null

    const handleMouseMove = () => {
      setShowControls(true)
      if (timeout) clearTimeout(timeout)
      if (isPlaying) {
        timeout = setTimeout(() => setShowControls(false), 3000)
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      if (timeout) clearTimeout(timeout)
    }
  }, [isPlaying])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch((error) => console.error("Error playing video:", error))
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
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
    isDraggingRef.current = true
    const newTime = (value[0] / 100) * video.duration
    setProgress(value[0])
    setCurrentTime(newTime)
  }

  const handleSeekCommit = (value: number[]) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      isDraggingRef.current = false
      return
    }
    const newTime = (value[0] / 100) * video.duration
    if (Number.isFinite(newTime)) {
      intendedTimeRef.current = newTime
      video.currentTime = newTime
      setCurrentTime(newTime)
      setProgress(value[0])
    }
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return
    const baseTime = isSeekingRef.current ? intendedTimeRef.current : video.currentTime
    const clampedTime = Math.max(0, Math.min(baseTime + seconds, video.duration))
    intendedTimeRef.current = clampedTime
    setCurrentTime(clampedTime)
    setProgress((clampedTime / video.duration) * 100)
    video.currentTime = clampedTime
    if (onTimeUpdate) {
      // Skip doesn't count as time spent, pass 0
      onTimeUpdate(clampedTime, (clampedTime / video.duration) * 100, 0)
    }
  }

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = speed
    setPlaybackRate(speed)
    localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(speed))
  }

  const handleQualityChange = (level: number) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = level
    setCurrentQuality(level)
  }

  // Handle autoplay
  useEffect(() => {
    if (autoPlay && !isPlaying) {
      const tryPlay = () => {
        if (videoRef.current) {
          const storedRate = localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY)
          const rate = initialPlaybackRate ?? (storedRate ? parseFloat(storedRate) : 1)
          videoRef.current.playbackRate = rate
          videoRef.current.play()
            .then(() => setIsPlaying(true))
            .catch((error) => console.error("Error auto-playing video:", error))
        }
      }
      if (videoRef.current && videoRef.current.readyState >= 2) {
        tryPlay()
      } else {
        const handleCanPlay = () => {
          tryPlay()
          videoRef.current?.removeEventListener('loadedmetadata', handleCanPlay)
        }
        videoRef.current?.addEventListener('loadedmetadata', handleCanPlay)
        return () => videoRef.current?.removeEventListener('loadedmetadata', handleCanPlay)
      }
    }
  }, [autoPlay, initialPlaybackRate])

  const toggleFullscreen = () => {
    const videoContainer = document.getElementById("video-container")
    if (!videoContainer) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.error("Error exiting fullscreen:", err))
    } else {
      videoContainer.requestFullscreen().catch((err) => console.error("Error entering fullscreen:", err))
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/embed/")) return url
    const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    const match = url.match(youtubeRegex)
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}?enablejsapi=1`
    return url
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

  const qualityLabel = currentQuality === -1 ? 'Auto' : `${availableQualities.find(q => q.level === currentQuality)?.height || 'Auto'}p`

  return (
    <div
      id="video-container"
      className="relative rounded-md overflow-hidden bg-black aspect-video"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        onClick={togglePlay}
        playsInline
        crossOrigin="anonymous"
      />

      {hasWatched85Percent && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-md flex items-center text-xs z-30">
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => skip(-10)}>
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={() => skip(10)}>
              <RotateCw className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <span className="text-white text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quality selector - only show for HLS */}
            {useHls && availableQualities.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-8 px-2 text-xs">
                    <Monitor className="h-4 w-4 mr-1" />
                    {qualityLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" portal={false}>
                  <DropdownMenuLabel>Quality</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleQualityChange(-1)}>
                    Auto {currentQuality === -1 && "✓"}
                  </DropdownMenuItem>
                  {availableQualities.map((q) => (
                    <DropdownMenuItem key={q.level} onClick={() => handleQualityChange(q.level)}>
                      {q.height}p {currentQuality === q.level && "✓"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 h-8 px-2 text-xs">
                  <Settings className="h-4 w-4 mr-1" />
                  {playbackRate}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" portal={false}>
                <DropdownMenuLabel>Speed</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {playbackSpeeds.map((speed) => (
                  <DropdownMenuItem key={speed} onClick={() => handleSpeedChange(speed)}>
                    {speed}x {playbackRate === speed && "✓"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={toggleFullscreen}>
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Play button overlay when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10" onClick={togglePlay}>
          <div className="rounded-full bg-red/80 p-4">
            <Play className="h-8 w-8 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}