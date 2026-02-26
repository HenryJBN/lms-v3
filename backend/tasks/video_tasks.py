"""
Celery tasks for video transcoding.
Converts uploaded videos to HLS format with multiple quality levels.
Supports both local storage and cloud storage (S3/DigitalOcean Spaces).

Note: sys.path manipulation is required for Celery to find the 'database' module
when running from the backend directory.
"""
import sys
import os

# Add backend directory to sys.path for Celery compatibility
# This ensures 'database' module can be imported regardless of worker startup location
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import subprocess
import shutil
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any, List
import asyncio
import uuid
from datetime import datetime

from celery_app import celery_app
from utils.file_upload import (
    LOCAL_UPLOAD_PATH, 
    FILE_UPLOAD_PROVIDER,
    BACKEND_URL,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    S3_BUCKET_NAME,
    CLOUDFRONT_DOMAIN
)

# Import database components AFTER sys.path is set up
# This must be at module level, not inside functions
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from database.session import sync_engine

# Video quality configurations
QUALITY_CONFIGS = {
    '1080p': {
        'height': 1080,
        'video_bitrate': '5000k',
        'audio_bitrate': '192k',
    },
    '720p': {
        'height': 720,
        'video_bitrate': '2500k',
        'audio_bitrate': '128k',
    },
    '480p': {
        'height': 480,
        'video_bitrate': '1000k',
        'audio_bitrate': '96k',
    },
}

# Segment duration for HLS
HLS_SEGMENT_DURATION = 10  # seconds


def check_ffmpeg_available() -> bool:
    """Check if ffmpeg is available on the system."""
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def get_video_info(video_path: str) -> Dict[str, Any]:
    """Get video information using ffprobe."""
    try:
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            video_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            import json
            return json.loads(result.stdout)
        return {}
    except Exception as e:
        print(f"Error getting video info: {e}")
        return {}


def get_s3_client():
    """Get S3 client for AWS or DigitalOcean Spaces."""
    import boto3
    
    if FILE_UPLOAD_PROVIDER == "digitalocean":
        endpoint_url = f"https://{os.getenv('DO_REGION', 'nyc3')}.digitaloceanspaces.com"
        return boto3.client(
            's3',
            aws_access_key_id=os.getenv("DO_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("DO_SECRET_ACCESS_KEY"),
            region_name=os.getenv("DO_REGION", "nyc3"),
            endpoint_url=endpoint_url
        )
    else:  # aws_s3
        return boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )


def get_bucket_name() -> str:
    """Get the bucket name based on provider."""
    if FILE_UPLOAD_PROVIDER == "digitalocean":
        return os.getenv("DO_SPACE_NAME")
    return S3_BUCKET_NAME


def get_cdn_domain() -> Optional[str]:
    """Get the CDN domain based on provider."""
    if FILE_UPLOAD_PROVIDER == "digitalocean":
        return os.getenv("DO_CDN_DOMAIN")
    return CLOUDFRONT_DOMAIN


def download_from_cloud(video_path: str, local_path: str) -> bool:
    """
    Download a video from cloud storage to local temp directory.
    
    Args:
        video_path: The key/path in the cloud storage
        local_path: Local path to save the file
    
    Returns:
        True if successful, False otherwise
    """
    try:
        s3_client = get_s3_client()
        bucket = get_bucket_name()
        
        # Clean the path (remove leading slashes and uploads/ prefix)
        clean_key = video_path.lstrip('/')
        if clean_key.startswith('uploads/'):
            clean_key = clean_key[8:]
        
        print(f"[Video Transcode] Downloading from cloud: {clean_key}")
        
        s3_client.download_file(bucket, clean_key, local_path)
        
        print(f"[Video Transcode] Downloaded to: {local_path}")
        return True
        
    except Exception as e:
        print(f"[Video Transcode] Error downloading from cloud: {e}")
        return False


def upload_directory_to_cloud(local_dir: str, cloud_prefix: str) -> Dict[str, str]:
    """
    Upload a directory of files to cloud storage.
    
    Args:
        local_dir: Local directory containing files
        cloud_prefix: Prefix/key for cloud storage
    
    Returns:
        Dict mapping local filenames to cloud URLs
    """
    try:
        s3_client = get_s3_client()
        bucket = get_bucket_name()
        cdn_domain = get_cdn_domain()
        
        uploaded_files = {}
        
        for root, dirs, files in os.walk(local_dir):
            for filename in files:
                local_file_path = os.path.join(root, filename)
                
                # Calculate relative path from local_dir
                relative_path = os.path.relpath(local_file_path, local_dir)
                
                # Create cloud key
                cloud_key = f"{cloud_prefix}/{relative_path}".replace('//', '/')
                
                # Determine content type
                content_type = 'application/octet-stream'
                if filename.endswith('.m3u8'):
                    content_type = 'application/vnd.apple.mpegurl'
                elif filename.endswith('.ts'):
                    content_type = 'video/mp2t'
                elif filename.endswith('.mp4'):
                    content_type = 'video/mp4'
                
                print(f"[Video Transcode] Uploading: {cloud_key}")
                
                # Upload file
                s3_client.upload_file(
                    local_file_path,
                    bucket,
                    cloud_key,
                    ExtraArgs={
                        'ContentType': content_type,
                        'ACL': 'public-read'
                    }
                )
                
                # Generate URL
                if cdn_domain:
                    url = f"https://{cdn_domain}/{cloud_key}"
                elif FILE_UPLOAD_PROVIDER == "digitalocean":
                    region = os.getenv("DO_REGION", "nyc3")
                    url = f"https://{bucket}.{region}.digitaloceanspaces.com/{cloud_key}"
                else:
                    url = f"https://{bucket}.s3.{AWS_REGION}.amazonaws.com/{cloud_key}"
                
                uploaded_files[relative_path] = url
        
        print(f"[Video Transcode] Uploaded {len(uploaded_files)} files to cloud")
        return uploaded_files
        
    except Exception as e:
        print(f"[Video Transcode] Error uploading to cloud: {e}")
        return {}


def transcode_to_hls(
    input_path: str,
    output_dir: str,
    video_id: str
) -> Dict[str, Any]:
    """
    Transcode video to HLS format with multiple quality levels.
    
    Args:
        input_path: Path to the input video file
        output_dir: Directory to store HLS files
        video_id: Unique identifier for the video
    
    Returns:
        Dict containing paths to generated files
    """
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Get video info to determine original resolution
    video_info = get_video_info(input_path)
    original_height = 0
    
    for stream in video_info.get('streams', []):
        if stream.get('codec_type') == 'video':
            original_height = stream.get('height', 0)
            break
    
    # Filter qualities based on original resolution
    # Don't upscale videos
    available_qualities = []
    for quality_name, config in QUALITY_CONFIGS.items():
        if config['height'] <= original_height or original_height == 0:
            available_qualities.append(quality_name)
    
    # If no qualities match, use the lowest one
    if not available_qualities:
        available_qualities = ['480p']
    
    print(f"[Video Transcode] Original height: {original_height}")
    print(f"[Video Transcode] Available qualities: {available_qualities}")
    
    # Generate HLS for each quality
    master_playlist_lines = ["#EXTM3U", "#EXT-X-VERSION:3"]
    
    for quality in available_qualities:
        config = QUALITY_CONFIGS[quality]
        quality_dir = os.path.join(output_dir, quality)
        os.makedirs(quality_dir, exist_ok=True)
        
        playlist_path = os.path.join(quality_dir, 'playlist.m3u8')
        segment_pattern = os.path.join(quality_dir, 'segment_%04d.ts')
        
        # FFmpeg command for HLS transcoding
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-y',  # Overwrite output files
            
            # Video encoding
            '-c:v', 'libx264',
            '-preset', 'medium',  # Balance between speed and quality
            '-profile:v', 'high',
            '-level', '4.1',
            '-b:v', config['video_bitrate'],
            '-maxrate', config['video_bitrate'],
            '-bufsize', f"{int(config['video_bitrate'].rstrip('k')) * 2}k",
            
            # Scaling
            '-vf', f"scale=-2:{config['height']}",
            
            # Audio encoding
            '-c:a', 'aac',
            '-b:a', config['audio_bitrate'],
            '-ar', '44100',
            
            # HLS settings
            '-hls_time', str(HLS_SEGMENT_DURATION),
            '-hls_list_size', '0',  # Keep all segments in playlist
            '-hls_segment_filename', segment_pattern,
            
            # Output
            '-f', 'hls',
            playlist_path
        ]
        
        print(f"[Video Transcode] Starting {quality} transcoding...")
        print(f"[Video Transcode] Command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"[Video Transcode] Error for {quality}: {result.stderr}")
            continue
        
        # Add to master playlist
        bandwidth = int(config['video_bitrate'].rstrip('k')) * 1000
        resolution = f"{config['height'] * 16 // 9}x{config['height']}"
        
        master_playlist_lines.extend([
            f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={resolution}',
            f'{quality}/playlist.m3u8'
        ])
        
        print(f"[Video Transcode] Completed {quality} transcoding")
    
    # Write master playlist
    master_playlist_path = os.path.join(output_dir, 'master.m3u8')
    with open(master_playlist_path, 'w') as f:
        f.write('\n'.join(master_playlist_lines))
    
    print(f"[Video Transcode] Master playlist created at {master_playlist_path}")
    
    return {
        'master_playlist': master_playlist_path,
        'qualities': available_qualities,
        'status': 'completed'
    }


@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def transcode_video_task(
    self,
    video_path: str,
    video_id: str,
    lesson_id: Optional[str] = None,
    provider: Optional[str] = None
) -> Dict[str, Any]:
    """
    Celery task to transcode a video to HLS format.
    Supports both local storage and cloud storage (S3/DigitalOcean Spaces).
    
    Args:
        video_path: Path/key to the uploaded video file
        video_id: Unique identifier (usually the filename without extension)
        lesson_id: Optional lesson ID to update after transcoding
        provider: Storage provider ('local', 'aws_s3', 'digitalocean')
    
    Returns:
        Dict containing transcoding results
    """
    temp_dir = None
    
    try:
        # Use provided provider or default
        storage_provider = provider or FILE_UPLOAD_PROVIDER
        
        print(f"[Video Transcode Task] Starting transcoding for {video_id}")
        print(f"[Video Transcode Task] Input path: {video_path}")
        print(f"[Video Transcode Task] Provider: {storage_provider}")
        
        # Check if ffmpeg is available
        if not check_ffmpeg_available():
            raise Exception("ffmpeg is not installed or not available in PATH")
        
        # Create temp directory for transcoding
        temp_dir = tempfile.mkdtemp(prefix='video_transcode_')
        print(f"[Video Transcode Task] Temp directory: {temp_dir}")
        
        # Determine input path based on storage provider
        if storage_provider == "local":
            # Local storage - resolve the full path
            if not os.path.isabs(video_path):
                full_path = os.path.join(LOCAL_UPLOAD_PATH, video_path.lstrip('/'))
                if not os.path.exists(full_path):
                    clean_path = video_path.replace('uploads/', '')
                    full_path = os.path.join(LOCAL_UPLOAD_PATH, clean_path)
            else:
                full_path = video_path
            
            if not os.path.exists(full_path):
                raise Exception(f"Video file not found: {full_path}")
            
            input_path = full_path
            output_dir = os.path.join(os.path.dirname(full_path), 'hls')
            
        else:
            # Cloud storage - download to temp first
            temp_input = os.path.join(temp_dir, f"{video_id}.mp4")
            
            if not download_from_cloud(video_path, temp_input):
                raise Exception(f"Failed to download video from cloud storage: {video_path}")
            
            input_path = temp_input
            output_dir = os.path.join(temp_dir, 'hls')
        
        # Run transcoding
        result = transcode_to_hls(input_path, output_dir, video_id)
        
        # Upload to cloud if needed
        if storage_provider != "local":
            # Create cloud prefix for HLS files
            # Extract the base path from video_path (without extension)
            base_path = os.path.splitext(video_path)[0]
            cloud_prefix = f"{base_path}/hls"
            
            # Upload HLS directory to cloud
            uploaded_files = upload_directory_to_cloud(output_dir, cloud_prefix)
            
            if uploaded_files:
                # Get master playlist URL
                master_url = uploaded_files.get('master.m3u8')
                
                if master_url:
                    result['hls_url'] = master_url
                    result['cloud_files'] = uploaded_files
                    
                    # Update lesson with cloud URL
                    if lesson_id:
                        update_lesson_hls_url_cloud(lesson_id, master_url, result)
        else:
            # Local storage - update lesson with local URL
            if lesson_id:
                update_lesson_hls_url(lesson_id, output_dir, result)
        
        print(f"[Video Transcode Task] Completed: {result}")
        
        return result
        
    except Exception as e:
        print(f"[Video Transcode Task] Error: {e}")
        # Retry the task
        raise self.retry(exc=e)
        
    finally:
        # Clean up temp directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                print(f"[Video Transcode Task] Cleaned up temp directory: {temp_dir}")
            except Exception as e:
                print(f"[Video Transcode Task] Failed to clean up temp directory: {e}")


def update_lesson_hls_url(lesson_id: str, hls_dir: str, result: Dict[str, Any]):
    """
    Update the lesson record with HLS URL after transcoding (local storage).
    Uses synchronous database operations for Celery compatibility.
    """
    try:
        import json
        
        # Use existing sync engine from database session
        Session = sessionmaker(bind=sync_engine)
        session = Session()
        
        try:
            # Build HLS URL
            relative_path = os.path.relpath(
                os.path.join(hls_dir, 'master.m3u8'),
                LOCAL_UPLOAD_PATH
            )
            
            hls_url = f"{BACKEND_URL}/uploads/{relative_path}"
            
            # Get current resources
            query = text("SELECT resources FROM lesson WHERE id = :lesson_id")
            db_result = session.execute(query, {"lesson_id": lesson_id}).fetchone()
            
            if db_result:
                resources = db_result[0] or {}
                if isinstance(resources, str):
                    resources = json.loads(resources)
                
                # Update resources
                resources['hls_url'] = hls_url
                resources['hls_qualities'] = result.get('qualities', [])
                resources['video_status'] = 'ready'
                
                # Update the lesson
                update_query = text("""
                    UPDATE lesson 
                    SET resources = :resources, updated_at = NOW()
                    WHERE id = :lesson_id
                """)
                session.execute(update_query, {
                    "lesson_id": lesson_id,
                    "resources": json.dumps(resources)
                })
                session.commit()
                
                print(f"[Video Transcode] Updated lesson {lesson_id} with HLS URL: {hls_url}")
            else:
                print(f"[Video Transcode] Lesson {lesson_id} not found")
                
        finally:
            session.close()
        
    except Exception as e:
        print(f"[Video Transcode] Error updating lesson: {e}")
        import traceback
        traceback.print_exc()


def update_lesson_hls_url_cloud(lesson_id: str, hls_url: str, result: Dict[str, Any]):
    """
    Update the lesson record with HLS URL after transcoding (cloud storage).
    Uses synchronous database operations for Celery compatibility.
    """
    try:
        import json
        
        # Use existing sync engine from database session
        Session = sessionmaker(bind=sync_engine)
        session = Session()
        
        try:
            # Get current resources
            query = text("SELECT resources FROM lesson WHERE id = :lesson_id")
            db_result = session.execute(query, {"lesson_id": lesson_id}).fetchone()
            
            if db_result:
                resources = db_result[0] or {}
                if isinstance(resources, str):
                    resources = json.loads(resources)
                
                # Update resources
                resources['hls_url'] = hls_url
                resources['hls_qualities'] = result.get('qualities', [])
                resources['video_status'] = 'ready'
                
                # Update the lesson
                update_query = text("""
                    UPDATE lesson 
                    SET resources = :resources, updated_at = NOW()
                    WHERE id = :lesson_id
                """)
                session.execute(update_query, {
                    "lesson_id": lesson_id,
                    "resources": json.dumps(resources)
                })
                session.commit()
                
                print(f"[Video Transcode] Updated lesson {lesson_id} with HLS URL: {hls_url}")
            else:
                print(f"[Video Transcode] Lesson {lesson_id} not found")
                
        finally:
            session.close()
        
    except Exception as e:
        print(f"[Video Transcode] Error updating lesson: {e}")
        import traceback
        traceback.print_exc()


def trigger_video_transcoding(
    video_path: str, 
    video_id: str, 
    lesson_id: Optional[str] = None,
    provider: Optional[str] = None
) -> str:
    """
    Trigger video transcoding as a background task.
    
    Args:
        video_path: Path/key to the uploaded video
        video_id: Unique identifier for the video
        lesson_id: Optional lesson ID to update after transcoding
        provider: Storage provider ('local', 'aws_s3', 'digitalocean')
    
    Returns:
        Task ID
    """
    task = transcode_video_task.delay(video_path, video_id, lesson_id, provider)
    return task.id