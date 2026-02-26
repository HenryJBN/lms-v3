"""
Video streaming router for development environment.
Handles Range requests for proper video seeking support.
"""
from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from typing import Optional
import os
import aiofiles
import asyncio
from pathlib import Path

from utils.file_upload import LOCAL_UPLOAD_PATH

router = APIRouter()

# Chunk size for streaming (1MB for better performance)
CHUNK_SIZE = 1024 * 1024


def get_video_path(video_path: str) -> Path:
    """
    Resolve video path from URL parameter.
    Handles both full paths and relative paths.
    """
    # Remove leading slashes
    clean_path = video_path.lstrip('/')
    
    # Remove 'uploads/' prefix if present (in case it's included)
    if clean_path.startswith('uploads/'):
        clean_path = clean_path[8:]
    
    return Path(LOCAL_UPLOAD_PATH) / clean_path


def get_content_type(file_path: Path) -> str:
    """
    Get content type based on file extension.
    """
    extension = file_path.suffix.lower()
    
    content_types = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.m3u8': 'application/vnd.apple.mpegurl',
        '.ts': 'video/mp2t',
        '.vtt': 'text/vtt',
    }
    
    return content_types.get(extension, 'application/octet-stream')


class RangeFileIterator:
    """
    Synchronous iterator for reading file ranges.
    Used with StreamingResponse for better compatibility.
    """
    def __init__(self, file_path: Path, start: int, end: int, chunk_size: int = CHUNK_SIZE):
        self.file_path = file_path
        self.start = start
        self.end = end
        self.chunk_size = chunk_size
        self.current = start
        self.file = None
    
    def __iter__(self):
        return self
    
    def __next__(self):
        if self.current >= self.end:
            if self.file:
                self.file.close()
            raise StopIteration
        
        if self.file is None:
            self.file = open(self.file_path, 'rb')
            self.file.seek(self.start)
        
        remaining = self.end - self.current
        read_size = min(self.chunk_size, remaining)
        data = self.file.read(read_size)
        
        if not data:
            self.file.close()
            raise StopIteration
        
        self.current += len(data)
        return data
    
    def close(self):
        if self.file:
            self.file.close()


@router.get("/stream/{video_path:path}")
async def stream_video(request: Request, video_path: str):
    """
    Stream video file with Range request support.
    
    This endpoint is intended for development use only.
    In production, videos should be served directly from S3/CDN.
    """
    # Resolve the full file path
    file_path = get_video_path(video_path)
    
    # Log for debugging
    print(f"[Video Stream] Requested path: {video_path}")
    print(f"[Video Stream] Resolved to: {file_path}")
    print(f"[Video Stream] File exists: {file_path.exists()}")
    
    # Check if file exists
    if not file_path.exists():
        print(f"[Video Stream] File not found: {file_path}")
        raise HTTPException(status_code=404, detail=f"Video not found: {video_path}")
    
    # Check if it's a file (not a directory)
    if not file_path.is_file():
        print(f"[Video Stream] Not a file: {file_path}")
        raise HTTPException(status_code=400, detail="Not a valid file")
    
    # Get file size
    file_size = file_path.stat().st_size
    
    # Get content type based on extension
    content_type = get_content_type(file_path)
    
    # Parse Range header
    range_header = request.headers.get("range")
    
    # CORS headers for all responses
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
        "Accept-Ranges": "bytes",
    }
    
    if not range_header:
        # No Range header, return entire file using FileResponse for better performance
        print(f"[Video Stream] No Range header, returning full file (size: {file_size})")
        return FileResponse(
            path=str(file_path),
            media_type=content_type,
            headers={
                **cors_headers,
                "Content-Length": str(file_size),
            }
        )
    
    # Parse Range header (e.g., "bytes=0-1023", "bytes=1024-", "bytes=0-")
    try:
        # Remove "bytes=" prefix
        range_spec = range_header.replace("bytes=", "")
        range_parts = range_spec.split("-")
        
        if len(range_parts) != 2:
            raise ValueError("Invalid range format")
        
        start = int(range_parts[0]) if range_parts[0] else 0
        end = int(range_parts[1]) if range_parts[1] else file_size - 1
        
    except (ValueError, IndexError) as e:
        print(f"[Video Stream] Invalid Range header: {range_header}, error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid Range header: {range_header}")
    
    # Clamp values to file bounds
    start = max(0, start)
    end = min(file_size - 1, end)
    
    # Validate range
    if start > end or start >= file_size:
        print(f"[Video Stream] Range not satisfiable: start={start}, end={end}, size={file_size}")
        raise HTTPException(
            status_code=416,
            detail="Requested Range Not Satisfiable",
            headers={**cors_headers, "Content-Range": f"bytes */{file_size}"}
        )
    
    # Calculate content length
    content_length = end - start + 1
    
    print(f"[Video Stream] Range request: bytes {start}-{end}/{file_size} (length: {content_length})")
    
    # Create iterator for the range
    iterator = RangeFileIterator(file_path, start, end + 1)
    
    # Return partial content
    return StreamingResponse(
        iterator,
        status_code=206,
        media_type=content_type,
        headers={
            **cors_headers,
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Content-Length": str(content_length),
            "Content-Type": content_type,
        }
    )


@router.options("/stream/{video_path:path}")
async def stream_video_options(video_path: str):
    """Handle CORS preflight requests for video streaming."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
            "Access-Control-Max-Age": "86400",
        }
    )


@router.get("/hls/{video_path:path}")
async def serve_hls_playlist(request: Request, video_path: str):
    """
    Serve HLS playlist files (.m3u8) and segments (.ts).
    
    This endpoint is for development use only.
    In production, HLS files should be served from S3/CDN.
    """
    # Resolve the full file path
    file_path = get_video_path(video_path)
    
    # Check if file exists
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"HLS file not found: {video_path}")
    
    # Get content type based on extension
    content_type = get_content_type(file_path)
    
    # CORS headers
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
    }
    
    # For .m3u8 files, read and return
    if file_path.suffix == '.m3u8':
        async with aiofiles.open(file_path, 'r') as f:
            content = await f.read()
        
        return Response(
            content=content,
            media_type="application/vnd.apple.mpegurl",
            headers={
                **cors_headers,
                "Cache-Control": "no-cache",
            }
        )
    
    # For .ts segments, stream the file
    file_size = file_path.stat().st_size
    
    return StreamingResponse(
        RangeFileIterator(file_path, 0, file_size),
        media_type=content_type,
        headers={
            **cors_headers,
            "Cache-Control": "public, max-age=31536000",
        }
    )


@router.options("/hls/{video_path:path}")
async def hls_options(video_path: str):
    """Handle CORS preflight requests for HLS files."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
            "Access-Control-Max-Age": "86400",
        }
    )