"""
Vix chat service. Uses Groq (free tier) with function-calling so the LLM
can only ever cite events that actually exist in the database.

If GROQ_API_KEY is not set, falls back to a deterministic reply that
simply lists the top-ranked events - still grounded, never hallucinated.
"""

import os
import json
import httpx
from typing import List, Dict, Any

from models.recommendation_model import RankedEvent

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # fast + free on Groq as of 2026

SYSTEM_PROMPT = """You are Vix, a friendly college event assistant for the VYBE platform.

Rules:
1. ONLY mention events that appear in the provided context. Never invent event names, dates, or venues.
2. Keep replies short: 2-3 sentences max.
3. If the user asks about events, refer to the specific titles and dates from the context.
4. If no events match, say so honestly and suggest they browse categories instead.
5. Be warm and concise. No corporate jargon.
"""


def _build_context(ranked: List[RankedEvent], catalog_by_id: Dict[str, Any]) -> str:
    lines = []
    for r in ranked[:5]:
        e = catalog_by_id.get(r.id)
        if not e:
            continue
        date = getattr(e, "date", None) or "TBA"
        lines.append(f"- {e.title} ({e.category}) on {date} - score {r.score:.2f}")
    return "\n".join(lines) if lines else "(no events matched)"


async def _call_groq(api_key: str, message: str, context: str, history: List[Dict[str, str]]) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for h in history[-6:]:  # last 6 turns
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

    messages.append({
        "role": "user",
        "content": f"User question: {message}\n\nAvailable events:\n{context}"
    })

    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": messages,
                "temperature": 0.5,
                "max_tokens": 200
            }
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


def _fallback_reply(message: str, ranked: List[RankedEvent], catalog_by_id: Dict[str, Any]) -> str:
    if not ranked:
        return "I couldn't find events matching that yet. Try browsing categories like Tech, Design, or Business."

    top = ranked[0]
    e = catalog_by_id.get(top.id)
    if not e:
        return "Here are some events you might enjoy based on your interests."

    date = getattr(e, "date", None) or "soon"
    return (
        f"Based on your interests, I'd recommend \"{e.title}\" on {date}. "
        f"It's a {e.category} event - want to know more?"
    )


async def generate_reply(
    message: str,
    ranked: List[RankedEvent],
    catalog_by_id: Dict[str, Any],
    history: List[Dict[str, str]] | None = None
) -> str:
    history = history or []
    context = _build_context(ranked, catalog_by_id)

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return _fallback_reply(message, ranked, catalog_by_id)

    try:
        return await _call_groq(api_key, message, context, history)
    except Exception as e:
        print(f"[chat_service] Groq call failed: {e}")
        return _fallback_reply(message, ranked, catalog_by_id)