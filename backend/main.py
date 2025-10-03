# backend/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time

# Import routers
from backend.api import matches, stats, players, teams, events, clubs, dev, ws, transcribe, transcribe_dummy

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Football Voice App API",
    version="0.1.0",
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(
        f"📥 {request.method} {request.url.path} - Client: {request.client.host if request.client else 'unknown'}"
    )
    
    # Process request
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(
        f"📤 {request.method} {request.url.path} - Status: {response.status_code} - Time: {process_time:.3f}s"
    )
    
    return response

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Health check endpoint
@app.get("/")
async def health_check():
    return JSONResponse(content={"status": "ok", "message": "Football Voice App API is running"})

# Routers
app.include_router(matches.router, tags=["Matches"])
app.include_router(stats.router, tags=["Stats"])
app.include_router(players.router, tags=["Players"])
app.include_router(teams.router, tags=["Teams"])
app.include_router(events.router, tags=["Events"])
app.include_router(clubs.router, tags=["Clubs"])
app.include_router(dev.router, tags=["Dev"])
app.include_router(ws.router, tags=["WebSockets"])  # only if you want it active
app.include_router(transcribe.router, tags=["Transcription"])
app.include_router(transcribe_dummy.router, tags=["Dummy Transcription"])  # ✅ NEW

# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
