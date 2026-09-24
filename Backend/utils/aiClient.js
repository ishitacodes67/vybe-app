// Thin wrapper around the Python ai-service.
// Includes a 90-second timeout to survive Render free-tier cold starts.

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const AI_TIMEOUT_MS = 90000; // 90 seconds — enough for cold start + inference

// Mongoose → AI service shape
function toAiEvent(event) {
  return {
    id: String(event._id || event.id),
    title: event.title || "",
    category: event.category || "",
    tags: Array.isArray(event.tags) ? event.tags : [],
    description: event.description || "",
    date: event.date || null
  };
}

// Merge [{ id, score }] from Python back into the full event list,
// preserving all original fields and sorting by score desc.
function mergeScores(originalEvents, ranked) {
  const scoreById = new Map(ranked.map((r) => [String(r.id), Number(r.score) || 0]));
  return originalEvents
    .map((e) => ({
      ...e,
      score: scoreById.get(String(e._id || e.id)) ?? 0
    }))
    .sort((a, b) => b.score - a.score);
}

// Wrap fetch with a 90s timeout via AbortController
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`ai-service timed out after ${AI_TIMEOUT_MS / 1000}s (likely cold start)`);
    }
    throw err;
  }
}

// ---------- Recommendations ----------
async function getRecommendations({ user, events }) {
  try {
    const payload = {
      user: {
        interests: user.interests || [],
        goals: user.goals || [],
        registeredEventIds: user.registeredEventIds || []
      },
      events: events.map(toAiEvent),
      limit: events.length
    };

    const response = await fetchWithTimeout(`${AI_SERVICE_URL}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`ai-service /recommend responded ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const data = await response.json();
    return { ranked: mergeScores(events, data.ranked || []) };
  } catch (error) {
    console.error("ai-service /recommend failed, falling back to no ranking:", error.message);
    return { ranked: events.map((event) => ({ ...event, score: 0 })) };
  }
}

// ---------- Chat ----------
async function getChatReply({ message, user, currentEvents, history }) {
  const payload = {
    message,
    user: {
      interests: user.interests || [],
      goals: user.goals || [],
      registeredEventIds: user.registeredEventIds || []
    },
    currentEvents: (currentEvents || []).map(toAiEvent),
    history: history || []
  };

  const response = await fetchWithTimeout(`${AI_SERVICE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`ai-service /chat responded ${response.status}: ${errBody.slice(0, 200)}`);
  }
  return response.json();
}

module.exports = { getRecommendations, getChatReply };