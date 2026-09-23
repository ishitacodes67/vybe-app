"""
Content-based recommender using local sentence embeddings and in-memory
cosine similarity. No external API calls, no vector database - at a few
hundred events this is faster and simpler than Atlas Vector Search, and it
costs nothing to run. If the catalog ever grows past ~5k events, swap the
in-memory search below for Atlas Vector Search without touching the rest
of the service.
"""

from functools import lru_cache
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

from models.recommendation_model import EventIn, UserProfile, RankedEvent

_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    # Loaded once per process (~80MB, fine on a free 512MB instance) and
    # cached for the lifetime of the service.
    return SentenceTransformer(_MODEL_NAME)


def _event_text(event: EventIn) -> str:
    return " ".join(filter(None, [event.title, event.category, " ".join(event.tags), event.description]))


def _user_text(user: UserProfile) -> str:
    return " ".join(user.interests + user.goals) or "campus events"


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    a_norm = a / (np.linalg.norm(a, axis=-1, keepdims=True) + 1e-8)
    b_norm = b / (np.linalg.norm(b) + 1e-8)
    return a_norm @ b_norm


def rank_events(user: UserProfile, events: List[EventIn], limit: int = 10) -> List[RankedEvent]:
    if not events:
        return []

    registered = set(user.registeredEventIds)
    candidates = [e for e in events if e.id not in registered]
    if not candidates:
        return []

    model = get_model()
    event_embeddings = model.encode([_event_text(e) for e in candidates], normalize_embeddings=False)
    user_embedding = model.encode(_user_text(user), normalize_embeddings=False)

    scores = _cosine_similarity(np.array(event_embeddings), np.array(user_embedding))

    ranked = sorted(
        (RankedEvent(id=event.id, score=float(score)) for event, score in zip(candidates, scores)),
        key=lambda item: item.score,
        reverse=True
    )

    return ranked[:limit]
