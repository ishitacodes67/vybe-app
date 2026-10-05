/* =========================================================
   VYBE — DISCOVER (with smart fallback + clickable explore)
   Loads all upcoming approved events once, filters client-side,
   and shows related events when the search doesn't match.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    if (!window.api) {
        console.error("[discover] window.api not found");
        window.location.href = "member-login.html";
        return;
    }

    const user = window.api.getUser();
    if (!user || !window.api.getToken()) {
        window.location.href = "member-login.html";
        return;
    }

    // ---- DOM refs ----
    const grid = document.getElementById("discoverGrid");
    const search = document.getElementById("searchInput");
    const resultCount = document.getElementById("resultCount");
    const emptyState = document.getElementById("emptyState");
    const spotlight = document.getElementById("discoverSpotlight");

    let allEvents = [];
    let activeFilter = "All";

    const params = new URLSearchParams(window.location.search);
    const categoryFromURL = params.get("category");

    if (categoryFromURL) {
        const matchingFilter = document.querySelector(
            `.filter[data-filter="${CSS.escape(categoryFromURL)}"]`
        );
        if (matchingFilter) {
            document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
            matchingFilter.classList.add("active");
            activeFilter = categoryFromURL;
        }
    }

    /* =====================================================
       CATEGORY KEYWORDS — detect field from free text
    ===================================================== */

    const CATEGORY_KEYWORDS = {
        tech: "Tech", technology: "Tech", coding: "Tech", programming: "Tech",
        hackathon: "Tech", ai: "Tech", ml: "Tech", robot: "Tech", software: "Tech",
        code: "Tech", developer: "Tech", computer: "Tech",
        music: "Music", singing: "Music", band: "Music", guitar: "Music",
        acoustic: "Music", concert: "Music", sing: "Music", song: "Music",
        design: "Design", art: "Design", ui: "Design", ux: "Design",
        figma: "Design", portfolio: "Design", creative: "Design", drawing: "Design",
        sport: "Sports", sports: "Sports", football: "Sports", cricket: "Sports",
        basketball: "Sports", yoga: "Sports", gym: "Sports", fitness: "Sports",
        run: "Sports", marathon: "Sports",
        business: "Business", startup: "Business", entrepreneur: "Business",
        finance: "Business", pitch: "Business", analytics: "Business", marketing: "Business",
        culture: "Culture", poetry: "Culture", film: "Culture", cinema: "Culture",
        theatre: "Culture", dance: "Culture", cultural: "Culture",
        wellness: "Wellness", meditation: "Wellness", mental: "Wellness",
        health: "Wellness", nutrition: "Wellness",
        social: "Social", networking: "Social", games: "Social", mixer: "Social",
        meet: "Social", friends: "Social"
    };

    function guessCategory(text) {
        const lower = String(text || "").toLowerCase();
        for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
            if (lower.includes(keyword)) return category;
        }
        return null;
    }

    /* =====================================================
       LOAD EVENTS
    ===================================================== */

    async function loadEvents() {
        try {
            const events = await window.api.getEvents({ when: "upcoming" });
            allEvents = Array.isArray(events) ? events : [];
        } catch (err) {
            console.error("[discover] failed to load events:", err);
            allEvents = [];
        }
        renderSpotlight();
        render();
    }

    /* =====================================================
       FILTER BUTTONS
    ===================================================== */

    document.querySelectorAll(".filter").forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
            button.classList.add("active");
            activeFilter = button.dataset.filter;
            render();
        });
    });

    let searchTimer = null;
    search?.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(render, 120);
    });

    /* =====================================================
       SPOTLIGHT
    ===================================================== */

    function renderSpotlight() {
        if (!spotlight) return;

        const events = [...allEvents].sort(
            (a, b) => (b.registeredCount || 0) - (a.registeredCount || 0)
        );

        const event = events[0];
        if (!event) {
            spotlight.innerHTML = "";
            return;
        }

        const id = event._id || event.id;
        const registered = Number(event.registeredCount) || 0;

        spotlight.innerHTML = `
            <article class="spotlight-card" data-event-id="${id}" tabindex="0">
                <img src="${imageFor(event.category)}" alt="${escapeHTML(event.title)}">
                <div class="spotlight-content">
                    <span class="category">${escapeHTML(event.category)}</span>
                    <h3>${escapeHTML(event.title)}</h3>
                    <p>${escapeHTML(event.description || "")}</p>
                    <div class="spotlight-bottom">
                        <small>👀 ${registered} people already going</small>
                        <button type="button" data-spotlight-open>EXPLORE →</button>
                    </div>
                </div>
            </article>
        `;

        const card = spotlight.querySelector("[data-event-id]");
        const open = () => {
            window.location.href = `event-details.html?id=${encodeURIComponent(id)}`;
        };

        card.addEventListener("click", open);
        card.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
        });
        card.querySelector("[data-spotlight-open]").addEventListener("click", e => {
            e.stopPropagation();
            open();
        });
    }

    /* =====================================================
       MAIN RENDER
    ===================================================== */

    function render() {
        if (!grid) return;

        const query = (search?.value || "").trim().toLowerCase();

        const matched = allEvents.filter(event => {
            const matchesFilter =
                activeFilter === "All" || event.category === activeFilter;
            if (!matchesFilter) return false;
            if (!query) return true;

            const tags = Array.isArray(event.tags) ? event.tags.join(" ") : "";
            const organizerName =
                (typeof event.organizer === "object" && event.organizer?.name) || "";
            const searchable = `${event.title} ${event.category} ${tags} ${event.venue || ""} ${organizerName} ${event.description || ""}`.toLowerCase();
            return searchable.includes(query);
        }).sort((a, b) => String(a.date).localeCompare(String(b.date)));

        if (resultCount) {
            if (query) {
                resultCount.textContent = `${matched.length} of ${allEvents.length} events`;
            } else {
                resultCount.textContent = `${matched.length} ${matched.length === 1 ? "event" : "events"}`;
            }
        }

        if (matched.length === 0) {
            grid.innerHTML = "";
            renderEmptyState(query);
            return;
        }

        if (emptyState) emptyState.hidden = true;
        grid.innerHTML = matched.map(renderCard).join("");
        bindCards();
    }

    /* =====================================================
       EMPTY STATE with clickable "Explore" button
    ===================================================== */

    function renderEmptyState(query) {
        if (!emptyState) return;
        emptyState.hidden = false;

        const guessedCategory = query ? guessCategory(query) : null;

        const headerText = query
            ? `No exact match for "<em>${escapeHTML(query)}</em>".`
            : "No events match this filter.";

        const tabLabel = guessedCategory
            ? `Explore ${escapeHTML(guessedCategory)} events`
            : "Explore all events";

        emptyState.innerHTML = `
            <div class="empty-icon">◌</div>
            <h3>nothing matched.</h3>
            <p>${headerText} Try another search or switch your VYBE.</p>

            <button type="button" class="explore-tab-btn" id="exploreTabBtn">
                ${tabLabel}
                <span class="explore-tab-arrow">→</span>
            </button>

            <div class="explore-events" id="exploreEvents">
                <p style="opacity:.6;font-size:13px;padding:14px 0;">Loading suggestions…</p>
            </div>
        `;

        // ---- Wire the "Explore" button ----
        const exploreBtn = emptyState.querySelector("#exploreTabBtn");
        exploreBtn?.addEventListener("click", () => {
            if (search) search.value = "";

            if (guessedCategory) {
                activeFilter = guessedCategory;
                document.querySelectorAll(".filter").forEach(b => {
                    b.classList.toggle("active", b.dataset.filter === guessedCategory);
                });
            } else {
                activeFilter = "All";
                document.querySelectorAll(".filter").forEach(b => {
                    b.classList.toggle("active", b.dataset.filter === "All");
                });
            }

            render();
        });

        const container = emptyState.querySelector("#exploreEvents");

        // ---- Suggest related events ----
        let suggestions = [];

        if (guessedCategory) {
            suggestions = allEvents
                .filter(e => e.category === guessedCategory)
                .sort((a, b) => String(a.date).localeCompare(String(b.date)))
                .slice(0, 6);
        }

        if (suggestions.length === 0) {
            suggestions = [...allEvents]
                .sort((a, b) => (b.registeredCount || 0) - (a.registeredCount || 0))
                .slice(0, 6);
        }

        if (suggestions.length === 0) {
            container.innerHTML = `<p style="opacity:.6;font-size:13px;padding:14px 0;">No events to show. Try <a href="home.html">Home</a>.</p>`;
            return;
        }

        container.innerHTML = suggestions.map(renderCard).join("");

        container.querySelectorAll("[data-event-id]").forEach(card => {
            card.addEventListener("click", () => {
                window.location.href = `event-details.html?id=${encodeURIComponent(card.dataset.eventId)}`;
            });
        });
    }

    /* =====================================================
       EVENT CARD
    ===================================================== */

    function renderCard(event) {
        const id = event._id || event.id;
        const capacity = Number(event.capacity) || 0;
        const registered = Number(event.registeredCount) || 0;
        const seats = Math.max(capacity - registered, 0);
        const almostFull = seats > 0 && seats <= Math.ceil(capacity * 0.2);

        return `
            <article class="discover-card" data-event-id="${id}" tabindex="0">
                <div class="discover-card-image">
                    <img src="${imageFor(event.category)}" alt="${escapeHTML(event.title)}">
                    <span class="card-floating-tag">${escapeHTML(event.category || "")}</span>
                    <span class="card-price">${formatPrice(event.price)}</span>
                </div>
                <div class="discover-card-body">
                    <h3>${escapeHTML(event.title)}</h3>
                    <p>${escapeHTML(event.description || "")}</p>
                    <div class="card-social">
                        ${almostFull ? `<span>⚡ ALMOST FULL</span>` : ""}
                        <span>👀 ${registered} going</span>
                    </div>
                    <div class="card-footer">
                        <div class="card-footer-meta">
                            <span>${formatEventDate(event.date)}</span>
                            <span>${escapeHTML(event.time || "")} · ${escapeHTML(event.venue || "")}</span>
                        </div>
                        <a href="event-details.html?id=${encodeURIComponent(id)}">EXPLORE →</a>
                    </div>
                </div>
            </article>
        `;
    }

    function bindCards() {
        grid.querySelectorAll("[data-event-id]").forEach(card => {
            const open = () => {
                window.location.href = `event-details.html?id=${encodeURIComponent(card.dataset.eventId)}`;
            };
            card.addEventListener("click", e => {
                if (e.target.closest("a")) return;
                open();
            });
            card.addEventListener("keydown", e => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
            });
        });
    }

    /* =====================================================
       HELPERS
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
        return n ? `₹${n}` : "FREE";
    }

    function formatEventDate(dateStr) {
        if (!dateStr) return "";
        try {
            const d = new Date(`${dateStr}T00:00:00`);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        } catch { return dateStr; }
    }

    /* =====================================================
       INIT
    ===================================================== */

    loadEvents();
});