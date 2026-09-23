from dotenv import load_dotenv
load_dotenv()

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.recommendation_model import RecommendRequest, RecommendResponse, ChatRequest, ChatResponse
from services.recommendation_service import rank_events
from services.chat_service import generate_reply

app = FastAPI(title="VYBE AI service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # this service is only ever called by our own Node backend
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(payload: RecommendRequest):
    ranked = rank_events(payload.user, payload.events, payload.limit)
    return RecommendResponse(ranked=ranked)


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    # Ground the reply in real data: rank against whatever the frontend says
    # is currently on screen, falling back to nothing if that list is empty.
    catalog = payload.currentEvents
    ranked = rank_events(payload.user, catalog, limit=3)
    catalog_by_id = {e.id: e for e in catalog}

    reply = await generate_reply(payload.message, ranked, catalog_by_id, payload.history)

    return ChatResponse(reply=reply, recommendedEventIds=[r.id for r in ranked])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
