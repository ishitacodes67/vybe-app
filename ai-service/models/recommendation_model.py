from typing import List, Optional
from pydantic import BaseModel


class UserProfile(BaseModel):
    interests: List[str] = []
    goals: List[str] = []
    registeredEventIds: List[str] = []


class EventIn(BaseModel):
    id: str
    title: str
    category: str = ""
    tags: List[str] = []
    description: str = ""
    date: Optional[str] = None


class RecommendRequest(BaseModel):
    user: UserProfile
    events: List[EventIn]
    limit: int = 10


class RankedEvent(BaseModel):
    id: str
    score: float


class RecommendResponse(BaseModel):
    ranked: List[RankedEvent]


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    user: UserProfile
    currentEvents: List[EventIn] = []  # events currently on screen, for grounded context
    history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    recommendedEventIds: List[str] = []
