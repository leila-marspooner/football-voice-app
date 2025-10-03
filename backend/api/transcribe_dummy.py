from fastapi import APIRouter

router = APIRouter()

@router.post("/transcribe/dummy")
async def transcribe_dummy():
    return {"transcript": "Goal Winston"}
