import os
import uuid
import aiofiles
from typing import Optional, Dict, Any
from fastapi import UploadFile, HTTPException
import boto3
from botocore.exceptions import ClientError
import magic
from PIL import Image
import subprocess
from datetime import datetime

# Configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
CLOUDFRONT_DOMAIN = os.getenv("CLOUDFRONT_DOMAIN")
LOCAL_UPLOAD_PATH = os.getenv("LOCAL_UPLOAD_PATH", "./uploads")
USE_S3 = os.getenv("USE_S3", "false").lower() == "true"

# File type configurations
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp"
}

ALLOWED_VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-msvideo": ".avi"
}

ALLOWED_DOCUMENT_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt"
}

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024   # 10MB
MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500MB

class FileUploadService:
    def __init__(self):
        self.s3_client = None
        if USE_S3 and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION
            )
        
        # Ensure local upload directory exists
        if not USE_S3:
            os.makedirs(LOCAL_UPLOAD_PATH, exist_ok=True)
    
    def validate_file(self, file: UploadFile, allowed_types: Dict[str, str], max_size: int) -> None:
        """Validate file type and size"""
        # Check file size
        if hasattr(file.file, 'seek') and hasattr(file.file, 'tell'):
            file.file.seek(0, 2)  # Seek to end
            size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            if size > max_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
                )
        
        # Check content type
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {list(allowed_types.keys())}"
            )
    
    def generate_filename(self, original_filename: str, prefix: str = "") -> str:
        """Generate unique filename"""
        file_extension = os.path.splitext(original_filename)[1].lower()
        unique_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y%m%d")
        
        if prefix:
            return f"{prefix}/{timestamp}/{unique_id}{file_extension}"
        return f"{timestamp}/{unique_id}{file_extension}"
    
    async def upload_to_s3(self, file: UploadFile, key: str) -> str:
        """Upload file to S3"""
        try:
            file_content = await file.read()
            
            self.s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=key,
                Body=file_content,
                ContentType=file.content_type,
                ACL='public-read'
            )
            
            if CLOUDFRONT_DOMAIN:
                return f"https://{CLOUDFRONT_DOMAIN}/{key}"
            else:
                return f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"
                
        except ClientError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to S3: {str(e)}"
            )
    
    async def upload_to_local(self, file: UploadFile, filename: str) -> str:
        """Upload file to local storage"""
        try:
            file_path = os.path.join(LOCAL_UPLOAD_PATH, filename)
            directory = os.path.dirname(file_path)
            os.makedirs(directory, exist_ok=True)
            
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Return URL path
            return f"/uploads/{filename}"
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to save file locally: {str(e)}"
            )
    
    async def upload_file(
        self, 
        file: UploadFile, 
        prefix: str = "",
        allowed_types: Optional[Dict[str, str]] = None,
        max_size: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generic file upload"""
        if allowed_types is None:
            allowed_types = {**ALLOWED_IMAGE_TYPES, **ALLOWED_DOCUMENT_TYPES}
        
        if max_size is None:
            max_size = MAX_FILE_SIZE
        
        # Validate file
        self.validate_file(file, allowed_types, max_size)
        
        # Generate filename
        filename = self.generate_filename(file.filename, prefix)
        
        # Upload file
        if USE_S3 and self.s3_client:
            url = await self.upload_to_s3(file, filename)
        else:
            url = await self.upload_to_local(file, filename)
        
        # Reset file position for potential reuse
        await file.seek(0)
        
        return {
            "filename": filename,
            "original_filename": file.filename,
            "url": url,
            "content_type": file.content_type,
            "size": len(await file.read()),
            "uploaded_at": datetime.utcnow()
        }
    
    async def upload_image(self, file: UploadFile, prefix: str = "images") -> Dict[str, Any]:
        """Upload and process image file"""
        self.validate_file(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE)
        
        # Upload original image
        result = await self.upload_file(file, prefix, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE)
        
        # Generate thumbnail if needed
        try:
            await file.seek(0)
            thumbnail_url = await self.generate_thumbnail(file, prefix)
            result["thumbnail_url"] = thumbnail_url
        except Exception as e:
            print(f"Failed to generate thumbnail: {e}")
        
        return result
    
    async def upload_video(self, file: UploadFile, prefix: str = "videos") -> Dict[str, Any]:
        """Upload and process video file"""
        self.validate_file(file, ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE)
        
        # Upload original video
        result = await self.upload_file(file, prefix, ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE)
        
        # Extract video metadata
        try:
            await file.seek(0)
            metadata = await self.extract_video_metadata(file)
            result.update(metadata)
        except Exception as e:
            print(f"Failed to extract video metadata: {e}")
        
        return result
    
    async def generate_thumbnail(self, file: UploadFile, prefix: str) -> str:
        """Generate thumbnail for image"""
        try:
            # Save temporary file
            temp_path = f"/tmp/{uuid.uuid4()}.jpg"
            async with aiofiles.open(temp_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Generate thumbnail
            with Image.open(temp_path) as img:
                img.thumbnail((300, 300), Image.Resampling.LANCZOS)
                thumbnail_path = f"/tmp/{uuid.uuid4()}_thumb.jpg"
                img.save(thumbnail_path, "JPEG", quality=85)
            
            # Upload thumbnail
            with open(thumbnail_path, 'rb') as thumb_file:
                thumbnail_filename = self.generate_filename("thumbnail.jpg", f"{prefix}/thumbnails")
                
                if USE_S3 and self.s3_client:
                    self.s3_client.put_object(
                        Bucket=S3_BUCKET_NAME,
                        Key=thumbnail_filename,
                        Body=thumb_file.read(),
                        ContentType="image/jpeg",
                        ACL='public-read'
                    )
                    
                    if CLOUDFRONT_DOMAIN:
                        thumbnail_url = f"https://{CLOUDFRONT_DOMAIN}/{thumbnail_filename}"
                    else:
                        thumbnail_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{thumbnail_filename}"
                else:
                    # Copy to local uploads
                    local_thumb_path = os.path.join(LOCAL_UPLOAD_PATH, thumbnail_filename)
                    os.makedirs(os.path.dirname(local_thumb_path), exist_ok=True)
                    
                    with open(local_thumb_path, 'wb') as local_file:
                        thumb_file.seek(0)
                        local_file.write(thumb_file.read())
                    
                    thumbnail_url = f"/uploads/{thumbnail_filename}"
            
            # Clean up temp files
            os.remove(temp_path)
            os.remove(thumbnail_path)
            
            return thumbnail_url
            
        except Exception as e:
            print(f"Thumbnail generation failed: {e}")
            return ""
    
    async def extract_video_metadata(self, file: UploadFile) -> Dict[str, Any]:
        """Extract video metadata using ffprobe"""
        try:
            # Save temporary file
            temp_path = f"/tmp/{uuid.uuid4()}.mp4"
            async with aiofiles.open(temp_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Use ffprobe to get metadata
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', '-show_streams', temp_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                import json
                metadata = json.loads(result.stdout)
                
                # Extract relevant information
                duration = float(metadata.get('format', {}).get('duration', 0))
                
                # Find video stream
                video_stream = None
                for stream in metadata.get('streams', []):
                    if stream.get('codec_type') == 'video':
                        video_stream = stream
                        break
                
                video_metadata = {
                    "duration": int(duration),
                    "format": metadata.get('format', {}).get('format_name', ''),
                    "size": int(metadata.get('format', {}).get('size', 0))
                }
                
                if video_stream:
                    video_metadata.update({
                        "width": video_stream.get('width'),
                        "height": video_stream.get('height'),
                        "codec": video_stream.get('codec_name'),
                        "bitrate": int(video_stream.get('bit_rate', 0))
                    })
                
                # Clean up temp file
                os.remove(temp_path)
                
                return video_metadata
            else:
                os.remove(temp_path)
                return {"duration": 0}
                
        except Exception as e:
            print(f"Video metadata extraction failed: {e}")
            return {"duration": 0}
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from storage"""
        try:
            if USE_S3 and self.s3_client:
                # Extract key from URL
                if CLOUDFRONT_DOMAIN in file_path:
                    key = file_path.replace(f"https://{CLOUDFRONT_DOMAIN}/", "")
                else:
                    key = file_path.split(f"{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/")[1]
                
                self.s3_client.delete_object(Bucket=S3_BUCKET_NAME, Key=key)
            else:
                # Delete from local storage
                local_path = file_path.replace("/uploads/", "")
                full_path = os.path.join(LOCAL_UPLOAD_PATH, local_path)
                if os.path.exists(full_path):
                    os.remove(full_path)
            
            return True
            
        except Exception as e:
            print(f"File deletion failed: {e}")
            return False

# Initialize file upload service
file_upload_service = FileUploadService()

# Export functions for use in routers
async def upload_file(file: UploadFile, prefix: str = "") -> Dict[str, Any]:
    return await file_upload_service.upload_file(file, prefix)

async def upload_image(file: UploadFile, prefix: str = "images") -> Dict[str, Any]:
    return await file_upload_service.upload_image(file, prefix)

async def upload_video(file: UploadFile, prefix: str = "videos") -> Dict[str, Any]:
    return await file_upload_service.upload_video(file, prefix)

async def delete_file(file_path: str) -> bool:
    return await file_upload_service.delete_file(file_path)
