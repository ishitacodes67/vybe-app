/* =========================================================
   VYBE — DISCOVER
   Features:
     • Multi-select category chips (toggle on/off)
     • Sort dropdown (soonest / newest / popular / A-Z)
     • Load more pagination
     • Smart search with explore-more fallback
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
    const sortSelect = document.getElementById("sortSelect");
    const clearBtn = document.getElementById("clearFiltersBtn");
    const loadMoreBtn = document.getElementById("loadMoreBtn");

    // ---- State ----
    let allEvents = [];
    let activeFilters = [];
    let sortMode = "soonest";
    let visibleCount = 12;
    const PAGE_SIZE = 12;

    // ---- URL category preload ----
    const params = new URLSearchParams(window.location.search);
    const categoryFromURL = params.get("category");
    if (categoryFromURL) {
        activeFilters = [categoryFromURL];
    }

    /* =====================================================
       CATEGORY KEYWORDS
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
            allEvents = window.VYBE_STATE?.displayEvents(events) || (Array.isArray(events) ? events : VYBE_EVENTS);
        } catch (err) {
            console.error("[discover] failed to load events:", err);
            allEvents = VYBE_EVENTS;
        }
        renderSpotlight();
        window.dispatchEvent(new Event("vybe:events-updated"));
        syncChipUI();
        render();
    }

    /* =====================================================
       FILTER CHIPS — multi-select
    ===================================================== */

    function syncChipUI() {
        document.querySelectorAll(".filter").forEach(btn => {
            const cat = btn.dataset.filter;
            if (cat === "All") {
                btn.classList.toggle("active", activeFilters.length === 0);
            } else {
                btn.classList.toggle("active", activeFilters.includes(cat));
            }
        });
    }

    document.querySelectorAll(".filter").forEach(button => {
        button.addEventListener("click", () => {
            const cat = button.dataset.filter;

            if (cat === "All") {
                activeFilters = [];
            } else {
                const idx = activeFilters.indexOf(cat);
                if (idx >= 0) {
                    activeFilters.splice(idx, 1);
                } else {
                    activeFilters.push(cat);
                }
            }

            visibleCount = PAGE_SIZE;
            syncChipUI();
            render();
        });
    });

    /* =====================================================
       SEARCH — debounced
    ===================================================== */

    let searchTimer = null;
    search?.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            visibleCount = PAGE_SIZE;
            render();
        }, 120);
    });

    /* =====================================================
       SORT
    ===================================================== */

    sortSelect?.addEventListener("change", () => {
        sortMode = sortSelect.value;
        render();
    });

    function sortEvents(events) {
        const sorted = [...events];
        switch (sortMode) {
            case "newest":
                return sorted.sort((a, b) =>
                    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
                );
            case "popular":
                return sorted.sort((a, b) =>
                    (Number(b.registeredCount) || 0) - (Number(a.registeredCount) || 0)
                );
            case "alpha":
                return sorted.sort((a, b) =>
                    String(a.title || "").localeCompare(String(b.title || ""))
                );
            case "soonest":
            default:
                return sorted.sort((a, b) =>
                    String(a.date || "").localeCompare(String(b.date || ""))
                );
        }
    }

    /* =====================================================
       CLEAR FILTERS
    ===================================================== */

    clearBtn?.addEventListener("click", () => {
        activeFilters = [];
        if (search) search.value = "";
        if (sortSelect) sortSelect.value = "soonest";
        sortMode = "soonest";
        visibleCount = PAGE_SIZE;
        syncChipUI();
        render();
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
                <img src="${window.VYBE_EVENT_VISUALS.src(event)}" alt="${escapeHTML(event.title)}" loading="lazy">
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

        let matched = allEvents.filter(event => {
            const matchesFilter =
                activeFilters.length === 0 || activeFilters.includes(event.category);
            if (!matchesFilter) return false;
            if (!query) return true;

            const tags = Array.isArray(event.tags) ? event.tags.join(" ") : "";
            const organizerName =
                (typeof event.organizer === "object" && event.organizer?.name) || "";
            const searchable = `${event.title} ${event.category} ${tags} ${event.venue || ""} ${organizerName} ${event.description || ""}`.toLowerCase();
            return searchable.includes(query);
        });

        matched = sortEvents(matched);

        const hasFilters = activeFilters.length > 0 || query;
        if (resultCount) {
            if (matched.length === 0) {
                resultCount.textContent = "0 events";
            } else if (matched.length <= visibleCount) {
                resultCount.textContent = `${matched.length} ${matched.length === 1 ? "event" : "events"}`;
            } else {
                resultCount.textContent = `Showing ${visibleCount} of ${matched.length}`;
            }
        }

        if (clearBtn) clearBtn.hidden = !hasFilters;

        if (matched.length === 0) {
            grid.innerHTML = "";
            if (loadMoreBtn) loadMoreBtn.hidden = true;
            renderEmptyState(query);
            return;
        }

        if (emptyState) emptyState.hidden = true;

        const visible = matched.slice(0, visibleCount);
        grid.innerHTML = visible.map(renderCard).join("");
        bindCards();

        if (loadMoreBtn) {
            if (matched.length > visibleCount) {
                const remaining = matched.length - visibleCount;
                loadMoreBtn.hidden = false;
                loadMoreBtn.innerHTML = `Load ${Math.min(remaining, PAGE_SIZE)} more <span>↓</span>`;
            } else {
                loadMoreBtn.hidden = true;
            }
        }
    }

    /* =====================================================
       LOAD MORE
    ===================================================== */

    loadMoreBtn?.addEventListener("click", () => {
        visibleCount += PAGE_SIZE;
        render();
    });

    /* =====================================================
       EMPTY STATE + explore button
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

        const exploreBtn = emptyState.querySelector("#exploreTabBtn");
        exploreBtn?.addEventListener("click", () => {
            if (search) search.value = "";

            if (guessedCategory) {
                activeFilters = [guessedCategory];
            } else {
                activeFilters = [];
            }

            visibleCount = PAGE_SIZE;
            syncChipUI();
            render();
        });

        const container = emptyState.querySelector("#exploreEvents");

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

        const cover = window.VYBE_EVENT_VISUALS?.src(event) || "";
        const coverFocus = window.VYBE_EVENT_VISUALS?.focus(event) || "center";
        return `
            <article class="discover-card" data-event-id="${id}" tabindex="0">
                <div class="discover-card-image">
                    <img src="${escapeHTML(cover)}" alt="${escapeHTML(event.category || "Event")} event atmosphere" loading="lazy" style="--cover-focus:${coverFocus}">
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

    initCategoryFolders();
    initEventCalendar();
    loadEvents();

    function initCategoryFolders() {
        const root = document.getElementById("categoryFolderGrid");
        if (!root) return;
        const categories = [
            ["Tech", "⌁", "Build, experiment, ship"], ["Design", "◈", "Make ideas visible"],
            ["Music", "♫", "Find your sound"], ["Sports", "↗", "Move with your people"],
            ["Business", "◎", "Meet the next big thing"], ["Culture", "✳", "Stories, craft & expression"],
            ["Social", "♡", "Come solo, leave connected"], ["Wellness", "☼", "Reset at your pace"]
        ];
        root.innerHTML = categories.map(([name, icon, note], index) => `
            <button class="vybe-folder" type="button" data-folder-category="${name}" style="--folder-index:${index}">
                <span class="vybe-folder-tab">${String(index + 1).padStart(2, "0")} / VYBE FILE</span>
                <span class="vybe-folder-icon">${icon}</span><strong>${name}</strong><small>${note}</small><i>OPEN FOLDER ↗</i>
            </button>`).join("");
        root.querySelectorAll("[data-folder-category]").forEach(button => button.addEventListener("click", () => {
            activeFilters = [button.dataset.folderCategory]; visibleCount = PAGE_SIZE; syncChipUI(); render();
            document.querySelector(".discover-heading")?.scrollIntoView({behavior:"smooth",block:"start"});
        }));
    }

    function initEventCalendar() {
        const grid = document.getElementById("vybeCalendarGrid");
        const label = document.getElementById("vybeCalendarMonth");
        const eventList = document.getElementById("vybeCalendarEvents");
        if (!grid || !label || !eventList) return;
        let cursor = new Date(); cursor.setDate(1);
        const monthNames = new Intl.DateTimeFormat("en-IN", {month:"long",year:"numeric"});
        const renderCalendar = () => {
            label.textContent = monthNames.format(cursor);
            const year = cursor.getFullYear(), month = cursor.getMonth();
            const first = new Date(year, month, 1).getDay();
            const total = new Date(year, month + 1, 0).getDate();
            const names = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
            let html = names.map(day => `<span class="vybe-cal-weekday">${day}</span>`).join("");
            for(let i=0;i<first;i++) html += `<span class="vybe-cal-empty"></span>`;
            for(let day=1;day<=total;day++) {
                const key = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const matches = allEvents.filter(ev => String(ev.date || "").slice(0,10) === key);
                html += `<button class="vybe-cal-day ${matches.length ? "has-events" : ""}" type="button" data-cal-date="${key}"><span>${day}</span>${matches.length ? `<i>${matches.length}</i>` : ""}</button>`;
            }
            grid.innerHTML = html;
            grid.querySelectorAll("[data-cal-date]").forEach(btn => btn.addEventListener("click", () => {
                const matches = allEvents.filter(ev => String(ev.date || "").slice(0,10) === btn.dataset.calDate);
                grid.querySelectorAll(".is-selected").forEach(el => el.classList.remove("is-selected")); btn.classList.add("is-selected");
                eventList.innerHTML = matches.length ? matches.map(ev => `<button type="button" class="vybe-cal-event" data-cal-event="${escapeHTML(ev._id || ev.id)}"><span>${escapeHTML(ev.time || "Time TBA")}</span><strong>${escapeHTML(ev.title)}</strong><small>${escapeHTML(ev.category || "Event")} · ${escapeHTML(ev.venue || "Venue TBA")}</small><b>VIEW ↗</b></button>`).join("") : `<p class="vybe-cal-empty-note">Nothing scheduled for this day yet. Keep the date open.</p>`;
                eventList.querySelectorAll("[data-cal-event]").forEach(item => item.addEventListener("click", () => window.location.href = `event-details.html?id=${encodeURIComponent(item.dataset.calEvent)}`));
            }));
        };
        document.getElementById("vybeCalPrev")?.addEventListener("click",()=>{cursor.setMonth(cursor.getMonth()-1);renderCalendar();});
        document.getElementById("vybeCalNext")?.addEventListener("click",()=>{cursor.setMonth(cursor.getMonth()+1);renderCalendar();});
        renderCalendar();
        const firstEvent = allEvents[0];
        eventList.innerHTML = firstEvent ? `<p class="vybe-cal-empty-note">Choose a marked date to see what is happening.</p>` : `<p class="vybe-cal-empty-note">Your calendar is waiting for its first plan.</p>`;
        window.addEventListener("vybe:events-updated", renderCalendar);
    }
});
