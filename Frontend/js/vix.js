/* =========================================================
   VYBE — VIX (backend-wired)
   Calls /api/chat on the backend, which proxies to the AI service.
   Renders the reply + real event cards returned from MongoDB.
   ========================================================= */

(function () {
    "use strict";

    /* =====================================================
       SUGGESTION → PROMPT MAPPING
    ===================================================== */

    const PROMPTS = {
        recommend: "What should I attend this week?",
        upcoming: "What's happening soon on campus?",
        interests: "Show me events matching my interests."
    };

    /* =====================================================
       PANEL
    ===================================================== */

    function createPanel() {
        if (document.getElementById("vixPanel")) return;

        const panel = document.createElement("aside");
        panel.id = "vixPanel";
        panel.className = "vix-panel";

        panel.innerHTML = `
            <div class="vix-panel-backdrop"></div>

            <div class="vix-panel-content" role="dialog" aria-modal="true" aria-label="Vix AI">

                <button class="vix-close" id="vixClose" type="button" aria-label="Close Vix">×</button>

                <div class="vix-panel-icon">✦</div>

                <span class="vix-panel-eyebrow">VIX AI</span>

                <h2>your slightly chaotic<br>campus AI friend.</h2>

                <p class="vix-panel-intro">
                    Ask me what to attend, what's happening soon,
                    or what matches your interests.
                </p>

                <div class="vix-response" id="vixResponse"></div>

                <div class="vix-suggestions">
                    <button type="button" data-vix-question="recommend">✦ What should I attend?</button>
                    <button type="button" data-vix-question="upcoming">⚡ What's happening soon?</button>
                    <button type="button" data-vix-question="interests">♡ Show my matches</button>
                </div>

                <a href="discover.html" class="vix-discover-link">Explore all events →</a>
            </div>
        `;

        document.body.appendChild(panel);

        document.getElementById("vixClose").addEventListener("click", closePanel);
        panel.querySelector(".vix-panel-backdrop").addEventListener("click", closePanel);

        panel.querySelectorAll("[data-vix-question]").forEach(button => {
            button.addEventListener("click", () => {
                handleSuggestion(button.dataset.vixQuestion);
            });
        });
    }

    /* =====================================================
       SUGGESTION HANDLER — calls the backend
    ===================================================== */

    async function handleSuggestion(type) {
        const response = document.getElementById("vixResponse");
        if (!response) return;

        const prompt = PROMPTS[type] || "What should I attend?";

        // ---- Loading state ----
        response.innerHTML = `
            <strong>${escapeHTML(prompt)}</strong>
            <p style="opacity:.7;margin-top:8px;">Vix is thinking… <span style="opacity:.5;">(first reply can take up to 60s if the AI is waking up)</span></p>
        `;

        // ---- Guard ----
        if (!window.api || !window.api.chat) {
            response.innerHTML = `
                <strong>Vix is unavailable.</strong>
                <p>Please sign in again and refresh.</p>
            `;
            return;
        }

        if (!window.api.getToken()) {
            response.innerHTML = `
                <strong>Please sign in.</strong>
                <p>Vix needs to know who you are before recommending events.</p>
                <a href="member-login.html">Sign in →</a>
            `;
            return;
        }

        try {
            const { reply, recommendedEvents } = await window.api.chat(prompt, []);

            const events = Array.isArray(recommendedEvents) ? recommendedEvents : [];

            response.innerHTML = `
                <strong>${escapeHTML(reply || "Here's what I found.")}</strong>

                ${
                    events.length
                        ? `
                            <div class="vix-event-list">
                                ${events.map(renderEventCard).join("")}
                            </div>
                        `
                        : `
                            <p style="opacity:.7;margin-top:8px;">
                                Nothing matched right now. Try <a href="discover.html">Discover</a> to browse everything.
                            </p>
                        `
                }
            `;

            // Wire click → event details page
            response.querySelectorAll("[data-event-id]").forEach(button => {
                button.addEventListener("click", () => {
                    const id = button.dataset.eventId;
                    window.location.href = `event-details.html?id=${encodeURIComponent(id)}`;
                });
            });

        } catch (err) {
            console.error("[vix] chat failed:", err);
            const msg = err?.message || "Something went wrong.";
            response.innerHTML = `
                <strong>Vix hit a snag.</strong>
                <p>${escapeHTML(msg)}</p>
                <p style="opacity:.7;margin-top:6px;">Try again in a few seconds.</p>
            `;
        }
    }

    /* =====================================================
       EVENT CARD (matches vix-event-option CSS)
    ===================================================== */

    function renderEventCard(event) {
        const id = event._id || event.id;
        const date = formatDate(event.date);
        const venue = event.venue ? ` · ${escapeHTML(event.venue)}` : "";

        return `
            <button type="button" class="vix-event-option" data-event-id="${id}">
                <span>${escapeHTML(event.title || "")}</span>
                <small>${date}${venue}</small>
            </button>
        `;
    }

    /* =====================================================
       OPEN / CLOSE
    ===================================================== */

    function openPanel() {
        createPanel();
        const panel = document.getElementById("vixPanel");
        panel.classList.add("open");
        document.body.classList.add("vix-open");

        // Auto-fire the "recommend" suggestion when opening
        handleSuggestion("recommend");
    }

    function closePanel() {
        const panel = document.getElementById("vixPanel");
        if (!panel) return;
        panel.classList.remove("open");
        document.body.classList.remove("vix-open");
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function formatDate(date) {
        if (!date) return "";
        try {
            const d = new Date(`${date}T12:00:00`);
            if (isNaN(d.getTime())) return date;
            return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        } catch {
            return date;
        }
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    /* =====================================================
       INIT + GLOBAL EXPORT
    ===================================================== */

    function init() {
        createPanel();

        document.querySelectorAll("[data-vix-open]").forEach(button => {
            button.addEventListener("click", openPanel);
        });
    }

    window.VYBE_VIX = {
        open: openPanel,
        close: closePanel
    };

    document.addEventListener("DOMContentLoaded", init);
})();