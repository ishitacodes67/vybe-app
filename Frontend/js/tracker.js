/* =========================================================
   VYBE — TRACKER (backend-wired)
   Fetches /api/registrations/me and renders upcoming/past events.
   Same UI structure as before — CSS unchanged.
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // ---- Guard ----
    if (!window.api) {
        console.error("[tracker] window.api not found");
        window.location.href = "member-login.html";
        return;
    }

    const user = window.api.getUser();
    if (!user || !window.api.getToken()) {
        window.location.href = "member-login.html";
        return;
    }

    // ---- Fetch registrations ----
    let registrations = [];
    try {
        registrations = await window.api.myRegistrations();
    } catch (err) {
        console.error("[tracker] failed to load registrations:", err);
    }

    // Filter out cancelled registrations
    const active = (registrations || []).filter(r => r.status !== "cancelled");

    // Split into upcoming vs past
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = active
        .filter(r => r.event && isUpcoming(r.event.date, today))
        .sort((a, b) => String(a.event.date).localeCompare(String(b.event.date)));

    const past = active
        .filter(r => r.event && !isUpcoming(r.event.date, today))
        .sort((a, b) => String(b.event.date).localeCompare(String(a.event.date)));

    // ---- XP calculation ----
    const xp = Number(user.xp) || (active.length * 40 + past.length * 60);

    // ---- Hero XP ----
    const heroXP = document.getElementById("heroXP");
    if (heroXP) heroXP.textContent = xp;

    // ---- Month XP ----
    const monthXP = document.getElementById("monthXP");
    if (monthXP) monthXP.textContent = `+${Math.max(xp, 0)}`;

    // ---- XP progress bar ----
    const xpProgress = document.getElementById("xpProgress");
    if (xpProgress) {
        const progress = Math.min((xp % 1000) / 10, 100);
        xpProgress.style.width = `${progress || 18}%`;
    }

    // ---- Stats ----
    const stats = document.getElementById("trackerStats");
    if (stats) {
        stats.innerHTML = `
            <article class="tracker-stat">
                <strong>${active.length}</strong>
                <span>events registered</span>
            </article>

            <article class="tracker-stat">
                <strong>${upcoming.length}</strong>
                <span>up next</span>
            </article>

            <article class="tracker-stat">
                <strong>${user.interests?.length || 0}</strong>
                <span>interests</span>
            </article>

            <article class="tracker-stat">
                <strong>${xp}</strong>
                <span>total XP</span>
            </article>
        `;
    }

    // ---- Streak ----
    const streakEl = document.getElementById("streakNumber");
    if (streakEl) streakEl.textContent = calculateStreak(active);

    // ---- Upcoming count label ----
    const upcomingCount = document.getElementById("upcomingCount");
    if (upcomingCount) {
        upcomingCount.textContent = `${upcoming.length} ${upcoming.length === 1 ? "event" : "events"}`;
    }

    // ---- Render both sections ----
    renderUpcoming();
    renderActivity();

    /* =====================================================
       RENDER UPCOMING
    ===================================================== */

    function renderUpcoming() {
        const container = document.getElementById("upcomingEvents");
        if (!container) return;

        if (!upcoming.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>your calendar is suspiciously empty.</h3>
                    <p>Go find something worth leaving your room for.</p>
                    <a class="primary-button" href="discover.html">Discover events →</a>
                </div>
            `;
            return;
        }

        container.innerHTML = upcoming.map(registration => {
            const event = registration.event;
            const id = event._id || event.id;

            const statusLabel =
                registration.status === "pending"
                    ? "REQUEST PENDING"
                    : "CONFIRMED";

            return `
                <article class="tracker-card" data-event-id="${id}" tabindex="0">
                    <div class="tracker-card-image">
                        <img
                            src="${imageFor(event.category)}"
                            alt="${escapeHTML(event.title)}"
                        >
                    </div>

                    <div class="tracker-card-info">
                        <span class="tracker-status">${statusLabel}</span>
                        <h3>${escapeHTML(event.title)}</h3>
                        <p>
                            ${formatEventDate(event.date)}
                            · ${escapeHTML(event.time || "")}
                            · ${escapeHTML(event.venue || "")}
                        </p>
                    </div>

                    <a href="event-details.html?id=${encodeURIComponent(id)}">VIEW →</a>
                </article>
            `;
        }).join("");

        // Card click → event details
        container.querySelectorAll("[data-event-id]").forEach(card => {
            card.addEventListener("click", e => {
                if (e.target.closest("a")) return;
                window.location.href = `event-details.html?id=${encodeURIComponent(card.dataset.eventId)}`;
            });
        });
    }

    /* =====================================================
       RENDER ACTIVITY (past events)
    ===================================================== */

    function renderActivity() {
        const container = document.getElementById("activityList");
        if (!container) return;

        if (!past.length) {
            container.innerHTML = `
                <article class="activity-item">
                    <span class="activity-icon">✦</span>
                    <div>
                        <strong>Your VYBE story starts here.</strong>
                        <p>Attend your first event and this space comes alive.</p>
                    </div>
                    <small>+20 XP</small>
                </article>
            `;
            return;
        }

        container.innerHTML = past.map(registration => `
            <article class="activity-item">
                <span class="activity-icon">✓</span>
                <div>
                    <strong>Joined ${escapeHTML(registration.event.title)}</strong>
                    <p>${formatEventDate(registration.event.date)}</p>
                </div>
                <small>+60 XP</small>
            </article>
        `).join("");
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function isUpcoming(dateStr, today) {
        if (!dateStr) return false;
        try {
            const d = new Date(`${dateStr}T00:00:00`);
            return !isNaN(d.getTime()) && d >= today;
        } catch {
            return false;
        }
    }

    function calculateStreak(items) {
        if (!items.length) return 0;

        const weeks = new Set();
        items.forEach(item => {
            const date = new Date(item.createdAt || item.event?.date);
            if (isNaN(date.getTime())) return;

            const firstDay = new Date(date);
            firstDay.setDate(date.getDate() - date.getDay());
            weeks.add(firstDay.toISOString().slice(0, 10));
        });

        return weeks.size;
    }

    function imageFor(category) {
        const images = {
            Tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=85",
            Design: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=85",
            Music: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=85",
            Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=85",
            Business: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=85",
            Culture: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=85",
            Social: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=85",
            Wellness: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=85",
            Admin: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=85",
            Other: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=85"
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

    function formatEventDate(dateStr) {
        if (!dateStr) return "";
        try {
            const d = new Date(`${dateStr}T12:00:00`);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short"
            });
        } catch {
            return dateStr;
        }
    }
});