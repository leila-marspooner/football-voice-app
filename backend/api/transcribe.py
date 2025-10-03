# TODO: Later replace with on-device whisper.cpp integration for better performance and privacy

import os
import tempfile
import logging
from typing import Dict, Any
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
import whisper

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Supported audio formats
SUPPORTED_FORMATS = {
    'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/wav', 
    'audio/flac', 'audio/ogg', 'audio/webm'
}

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Global whisper model (loaded once for efficiency)
_whisper_model = None

def get_whisper_model():
    """Get or load the Whisper model (singleton pattern)"""
    global _whisper_model
    if _whisper_model is None:
        try:
            logger.info("Loading Whisper model...")
            # Use base model for good balance of speed and accuracy
            _whisper_model = whisper.load_model("base")
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initialize transcription service"
            )
    return _whisper_model

def validate_audio_file(file: UploadFile) -> None:
    """Validate uploaded audio file"""
    if not file.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content type not specified"
        )
    
    if file.content_type not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format: {file.content_type}. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
        )
    
    # Check file size
    if hasattr(file, 'size') and file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.1f}MB"
        )

def get_file_extension(content_type: str) -> str:
    """Get file extension from content type"""
    extension_map = {
        'audio/m4a': '.m4a',
        'audio/mp4': '.m4a',
        'audio/mpeg': '.mp3',
        'audio/wav': '.wav',
        'audio/flac': '.flac',
        'audio/ogg': '.ogg',
        'audio/webm': '.webm'
    }
    return extension_map.get(content_type, '.wav')

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)) -> JSONResponse:
    """
    Transcribe audio file using OpenAI Whisper
    
    Args:
        file: Audio file upload (supports m4a, wav, mp3, flac, ogg, webm)
        
    Returns:
        JSON response with transcript text
        
    Raises:
        HTTPException: For various error conditions
    """
    temp_file_path = None
    
    try:
        logger.info(f"Received audio file: {file.filename}, type: {file.content_type}")
        
        # Validate the uploaded file
        validate_audio_file(file)
        
        # Create temporary file
        file_extension = get_file_extension(file.content_type)
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            temp_file_path = temp_file.name
            
            # Read and write file content
            content = await file.read()
            
            # Check file size after reading
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024):.1f}MB"
                )
            
            temp_file.write(content)
            temp_file.flush()
        
        logger.info(f"Audio file saved to temporary location: {temp_file_path}")
        
        # Load Whisper model
        model = get_whisper_model()
        
        # Transcribe audio
        logger.info("Starting transcription...")
        result = model.transcribe(temp_file_path)
        
        transcript = result["text"].strip()
        
        if not transcript:
            logger.warning("Transcription returned empty result")
            transcript = "[No speech detected]"
        
        logger.info(f"Transcription completed: '{transcript[:100]}{'...' if len(transcript) > 100 else ''}'")
        
        # Return successful response
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "transcript": transcript,
                "confidence": getattr(result, "confidence", None),
                "duration": getattr(result, "duration", None),
                "language": getattr(result, "language", None)
            }
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.info(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up temporary file {temp_file_path}: {e}")

@router.get("/transcribe/health")
async def health_check() -> JSONResponse:
    """Health check endpoint for transcription service"""
    try:
        # Try to load the model to check if service is ready
        model = get_whisper_model()
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "healthy",
                "service": "transcription",
                "model_loaded": model is not None
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "service": "transcription",
                "error": str(e)
            }
        )

@router.get("/transcribe/formats")
async def get_supported_formats() -> JSONResponse:
    """Get list of supported audio formats"""
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "formats": list(SUPPORTED_FORMATS),
            "max_file_size_mb": MAX_FILE_SIZE / (1024 * 1024)
        }
    )
