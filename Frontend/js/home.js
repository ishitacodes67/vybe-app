/* =========================================================
   VYBE — HOME
   Loads user + events from the real backend via window.api.
   Same HTML selectors as before, so CSS is unchanged.
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // ---- Guard: api.js must be loaded ----
    if (!window.api) {
        console.error("[home] window.api not found — is js/api.js loaded?");
        window.location.href = "member-login.html";
        return;
    }

    // ---- Auth check ----
    let user = window.api.getUser();

    if (!user || !window.api.getToken()) {
        window.location.href = "member-login.html";
        return;
    }

    // ---- Greeting ----
    const firstName = (user.name || "there").trim().split(/\s+/)[0];
    const hour = new Date().getHours();
    let greeting = "good evening";
    if (hour < 12) greeting = "good morning";
    else if (hour < 17) greeting = "good afternoon";

    const greetEl = document.getElementById("greeting");
    if (greetEl) greetEl.textContent = `${greeting}, ${firstName}.`;

    // ---- Render interests immediately (from cached user) ----
    renderInterests(user);

    // ---- Fetch fresh data from backend ----
    try {
        // Refresh user from /auth/me (gets latest interests/goals)
        const freshUser = await window.api.me();
        user = freshUser;
        renderInterests(user);
    } catch (err) {
        console.warn("[home] /auth/me failed:", err.message);
    }

    try {
        const [recommended, all] = await Promise.all([
            window.api.getRecommended().catch(() => []),
            window.api.getEvents({ when: "upcoming" }).catch(() => [])
        ]);

        renderFeatured(recommended.slice(0, 2));

        // Trending = most registered
        const trending = [...all]
            .sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0))
            .slice(0, 3);
        renderTrending(trending);

        // Dropped = soonest upcoming
        const dropped = [...all]
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .slice(0, 4);
        renderDropped(dropped);
    } catch (err) {
        console.error("[home] failed to load events:", err);
        showEmptyStates();
    }

    /* =====================================================
       INTERESTS
    ===================================================== */

    function renderInterests(u) {
        const container = document.getElementById("interestTags");
        if (!container) return;

        const interests = Array.isArray(u.interests) ? u.interests : [];
        container.innerHTML = interests.length
            ? interests.slice(0, 5)
                .map(i => `<span>${escapeHTML(i)}</span>`)
                .join("")
            : `<span>your vibe is still loading…</span>`;
    }

    /* =====================================================
       FEATURED
    ===================================================== */

    function renderFeatured(events) {
        const container = document.getElementById("featuredEvents");
        if (!container) return;

        if (!events.length) {
            container.innerHTML = `
                <article class="featured-event">
                    <img src="${imageFor("Culture")}" alt="Campus">
                    <div class="featured-content">
                        <div class="featured-top">
                            <span class="featured-category">VYBE</span>
                        </div>
                        <h3>your campus is waiting.</h3>
                        <p>Explore what's happening across VYBE.</p>
                        <div class="featured-bottom">
                            <small>Explore the full calendar</small>
                            <button type="button" onclick="location.href='discover.html'">
                                EXPLORE →
                            </button>
                        </div>
                    </div>
                </article>
            `;
            return;
        }

        container.innerHTML = events.map(renderFeaturedCard).join("");
        bindEventCards(container);
    }

    function renderFeaturedCard(event) {
        const id = event._id || event.id;
        const capacity = Number(event.capacity) || 0;
        const registered = Number(event.registeredCount ?? event.registered) || 0;
        const seats = Math.max(capacity - registered, 0);

        return `
            <article
                class="featured-event"
                data-event-id="${id}"
                tabindex="0"
            >
                <img src="${imageFor(event.category)}" alt="${escapeHTML(event.title)}">
                <div class="featured-content">
                    <div class="featured-top">
                        <span class="featured-category">${escapeHTML(event.category)}</span>
                        <span class="featured-price">${formatPrice(event.price)}</span>
                    </div>
                    <h3>${escapeHTML(event.title)}</h3>
                    <p>${escapeHTML(event.description || "")}</p>
                    <div class="featured-bottom">
                        <small>👀 ${registered} going · ${seats} seats left</small>
                        <button type="button" data-open-event="${id}">
                            JOIN THE VYBE →
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    /* =====================================================
       TRENDING
    ===================================================== */

    function renderTrending(events) {
        const container = document.getElementById("trendingEvents");
        if (!container) return;

        container.innerHTML = events.map(renderMiniCard).join("");
        bindEventCards(container);
    }

    function renderMiniCard(event) {
        const id = event._id || event.id;
        const registered = Number(event.registeredCount ?? event.registered) || 0;

        return `
            <article class="mini-event" data-event-id="${id}" tabindex="0">
                <div class="mini-event-image">
                    <img src="${imageFor(event.category)}" alt="${escapeHTML(event.title)}">
                </div>
                <div class="mini-event-content">
                    <div class="mini-event-meta">
                        <span>${escapeHTML(event.category)}</span>
                        <strong>${formatPrice(event.price)}</strong>
                    </div>
                    <h3>${escapeHTML(event.title)}</h3>
                    <div class="mini-event-foot">
                        <span>${formatEventDate(event.date)}</span>
                        <span>👀 ${registered} going</span>
                    </div>
                </div>
            </article>
        `;
    }

    /* =====================================================
       DROPPED (soonest upcoming)
    ===================================================== */

    function renderDropped(events) {
        const container = document.getElementById("droppedEvents");
        if (!container) return;

        container.innerHTML = events.map(event => {
            const id = event._id || event.id;
            return `
                <article class="dropped-card" data-event-id="${id}" tabindex="0">
                    <img src="${imageFor(event.category)}" alt="${escapeHTML(event.title)}">
                    <div class="dropped-content">
                        <span class="category">${escapeHTML(event.category)}</span>
                        <h3>${escapeHTML(event.title)}</h3>
                        <small>${formatEventDate(event.date)} · ${escapeHTML(event.time || "")}</small>
                    </div>
                </article>
            `;
        }).join("");

        bindEventCards(container);
    }

    /* =====================================================
       CARD CLICK HANDLERS
    ===================================================== */

    function bindEventCards(container) {
        container.querySelectorAll("[data-event-id]").forEach(card => {
            const open = () => {
                window.location.href =
                    `event-details.html?id=${encodeURIComponent(card.dataset.eventId)}`;
            };

            card.addEventListener("click", open);
            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    open();
                }
            });

            const button = card.querySelector("[data-open-event]");
            if (button) {
                button.addEventListener("click", event => {
                    event.stopPropagation();
                    open();
                });
            }
        });
    }

    /* =====================================================
       EMPTY STATES
    ===================================================== */

    function showEmptyStates() {
        const f = document.getElementById("featuredEvents");
        const t = document.getElementById("trendingEvents");
        const d = document.getElementById("droppedEvents");

        const empty = `<p style="opacity:.6;padding:1rem;">Nothing to show right now — try refreshing in a moment.</p>`;
        if (f && !f.innerHTML.trim()) f.innerHTML = empty;
        if (t && !t.innerHTML.trim()) t.innerHTML = empty;
        if (d && !d.innerHTML.trim()) d.innerHTML = empty;
    }

    /* =====================================================
       IMAGES / FORMATTERS
    ===================================================== */

    function imageFor(category) {
        const images = {
            Tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=85",
            Design: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1000&q=85",
            Music: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=85",
            Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=85",
            Business: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=85",
            Culture: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85",
            Social: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=85",
            Wellness: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1000&q=85",
            Admin: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1000&q=85",
            Other: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85"
        };
        return images[category] || images.Culture;
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatPrice(price) {
        const n = Number(price);
        if (!n) return "FREE";
        return `₹${n}`;
    }

    function formatEventDate(dateStr) {
        if (!dateStr) return "";
        try {
            const d = new Date(dateStr + "T00:00:00");
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        } catch {
            return dateStr;
        }
    }
});