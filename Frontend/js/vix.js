/* =========================================================
   VYBE — VIX (backend-wired + explore-more tab)
   ========================================================= */

(function () {
    "use strict";

    const PROMPTS = {
        recommend: "What should I attend this week?",
        upcoming: "What's happening soon on campus?",
        interests: "Show me events matching my interests."
    };

    const CATEGORY_KEYWORDS = {
        tech: "Tech", technology: "Tech", coding: "Tech", programming: "Tech",
        hackathon: "Tech", ai: "Tech", ml: "Tech", robot: "Tech", software: "Tech",
        music: "Music", singing: "Music", band: "Music", guitar: "Music",
        acoustic: "Music", concert: "Music",
        design: "Design", art: "Design", ui: "Design", ux: "Design",
        figma: "Design", portfolio: "Design",
        sport: "Sports", sports: "Sports", football: "Sports", cricket: "Sports",
        basketball: "Sports", yoga: "Sports", gym: "Sports", fitness: "Sports",
        business: "Business", startup: "Business", entrepreneur: "Business",
        finance: "Business", pitch: "Business", analytics: "Business",
        culture: "Culture", poetry: "Culture", film: "Culture", cinema: "Culture",
        theatre: "Culture", dance: "Culture", cultural: "Culture",
        wellness: "Wellness", meditation: "Wellness", mental: "Wellness",
        health: "Wellness", nutrition: "Wellness",
        social: "Social", networking: "Social", games: "Social", mixer: "Social"
    };

    function guessCategory(text) {
        const lower = String(text || "").toLowerCase();
        for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
            if (lower.includes(keyword)) return category;
        }
        return null;
    }

    // Retry helper: retries once on transient failures (5xx / network).
    // Does NOT retry on auth or validation errors (4xx).
    async function chatWithRetry(prompt, history) {
        try {
            return await window.api.chat(prompt, history);
        } catch (err) {
            const status = err && err.status;
            const isTransient = !status || (status >= 500 && status < 600);
            if (!isTransient) throw err;

            console.warn("[vix] transient failure, retrying once in 2s:", err.message);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return window.api.chat(prompt, history);
        }
    }

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
            button.addEventListener("click", () => handleSuggestion(button.dataset.vixQuestion));
        });
    }

    async function handleSuggestion(type) {
        const response = document.getElementById("vixResponse");
        if (!response) return;

        const prompt = PROMPTS[type] || "What should I attend?";

        response.innerHTML = `
            <strong>${escapeHTML(prompt)}</strong>
            <p style="opacity:.7;margin-top:8px;">Vix is thinking…</p>
        `;

        if (!window.api || !window.api.chat) {
            response.innerHTML = `<strong>Vix is unavailable.</strong><p>Please sign in again and refresh.</p>`;
            return;
        }
        if (!window.api.getToken()) {
            response.innerHTML = `<strong>Please sign in.</strong><p>Vix needs to know who you are before recommending events.</p><a href="member-login.html">Sign in →</a>`;
            return;
        }

        try {
            const { reply, recommendedEvents } = await chatWithRetry(prompt, []);
            const events = Array.isArray(recommendedEvents) ? recommendedEvents : [];

            if (events.length > 0) {
                response.innerHTML = `
                    <strong>${escapeHTML(reply || "Here's what I found.")}</strong>
                    <div class="vix-event-list">
                        ${events.map(renderEventCard).join("")}
                    </div>
                `;
                response.querySelectorAll("[data-event-id]").forEach(button => {
                    button.addEventListener("click", () => {
                        window.location.href = `event-details.html?id=${encodeURIComponent(button.dataset.eventId)}`;
                    });
                });
            } else {
                await renderExploreState(response, reply, prompt);
            }
        } catch (err) {
            console.error("[vix] chat failed:", err);
            const msg = err?.message || "Something went wrong.";
            response.innerHTML = `
                <strong>Vix is taking a quick break.</strong>
                <p>${escapeHTML(msg)}</p>
                <p style="opacity:.7;margin-top:6px;">Try again in a few seconds, or browse events below.</p>
                <a href="discover.html" class="vix-discover-link">Explore all events →</a>
            `;
        }
    }

    async function renderExploreState(response, reply, prompt) {
        const guessedCategory = guessCategory(prompt);

        response.innerHTML = `
            <strong>${escapeHTML(reply || "Nothing matched your interests right now.")}</strong>
            <div class="vix-explore-tab">
                <span class="vix-explore-tab-label">
                    ${guessedCategory ? `Explore ${escapeHTML(guessedCategory)} events` : "Explore more events"}
                </span>
                <span class="vix-explore-tab-arrow">→</span>
            </div>
            <div class="vix-event-list" id="vixExploreList">
                <p style="opacity:.7;font-size:12px;padding:12px 0;">Loading suggestions…</p>
            </div>
        `;

        const listContainer = response.querySelector("#vixExploreList");

        try {
            let events = [];
            if (guessedCategory) {
                events = await window.api.getEvents({ category: guessedCategory, when: "upcoming", limit: 6 });
            }
            if (!events || events.length === 0) {
                const all = await window.api.getEvents({ when: "upcoming", limit: 20 });
                events = (all || [])
                    .sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0))
                    .slice(0, 6);
            }
            if (!events || events.length === 0) {
                listContainer.innerHTML = `<p style="opacity:.7;font-size:12px;padding:12px 0;">No events to show. Try <a href="discover.html">Discover</a>.</p>`;
                return;
            }
            listContainer.innerHTML = events.map(renderEventCard).join("");
            listContainer.querySelectorAll("[data-event-id]").forEach(button => {
                button.addEventListener("click", () => {
                    window.location.href = `event-details.html?id=${encodeURIComponent(button.dataset.eventId)}`;
                });
            });
        } catch (err) {
            console.error("[vix] explore fetch failed:", err);
            listContainer.innerHTML = `<p style="opacity:.7;font-size:12px;padding:12px 0;">Couldn't load suggestions. Try <a href="discover.html">Discover</a>.</p>`;
        }
    }

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

    function openPanel() {
        createPanel();
        const panel = document.getElementById("vixPanel");
        panel.classList.add("open");
        document.body.classList.add("vix-open");
        handleSuggestion("recommend");
    }

    function closePanel() {
        const panel = document.getElementById("vixPanel");
        if (!panel) return;
        panel.classList.remove("open");
        document.body.classList.remove("vix-open");
    }

    function formatDate(date) {
        if (!date) return "";
        try {
            const d = new Date(`${date}T12:00:00`);
            if (isNaN(d.getTime())) return date;
            return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        } catch { return date; }
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function init() {
        createPanel();
        document.querySelectorAll("[data-vix-open]").forEach(button => {
            button.addEventListener("click", openPanel);
        });
    }

    window.VYBE_VIX = { open: openPanel, close: closePanel };
    document.addEventListener("DOMContentLoaded", init);
})();