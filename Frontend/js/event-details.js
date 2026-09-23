/* =========================================================
   VYBE — EVENT DETAILS
   Loads a single event from the backend, shows registration state,
   wires the register/cancel button to window.api.
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    // ---- Guard ----
    if (!window.api) {
        console.error("[event-details] window.api not found");
        window.location.href = "member-login.html";
        return;
    }

    const user = window.api.getUser();
    if (!user || !window.api.getToken()) {
        window.location.href = "member-login.html";
        return;
    }

    const container = document.querySelector("#eventDetails");
    if (!container) return;

    // ---- Get event ID from URL ----
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("id");

    if (!eventId) {
        renderNotFound();
        return;
    }

    // ---- Show loading state ----
    container.innerHTML = `
        <section class="event-hero" style="padding: 4rem 2rem; text-align: center;">
            <p class="eyebrow">LOADING EVENT…</p>
        </section>
    `;

    // ---- Fetch data in parallel ----
    let event = null;
    let myRegistration = null;

    try {
        const [eventData, regs] = await Promise.all([
            window.api.getEvent(eventId),
            window.api.myRegistrations().catch(() => [])
        ]);
        event = eventData;
        myRegistration = regs.find(r => {
            const rid = typeof r.event === "object" ? r.event._id : r.event;
            return String(rid) === String(eventId) && r.status !== "cancelled";
        }) || null;
    } catch (err) {
        console.error("[event-details] failed to load:", err);
        renderNotFound();
        return;
    }

    if (!event) {
        renderNotFound();
        return;
    }

    renderEvent(event, myRegistration);

    /* =====================================================
       RENDER NOT FOUND
    ===================================================== */

    function renderNotFound() {
        container.innerHTML = `
            <section class="not-found" style="padding: 4rem 2rem;">
                <p class="eyebrow">EVENT NOT FOUND</p>
                <h1>that VYBE <em>moved.</em></h1>
                <a class="primary-button" href="discover.html">Back to Discover →</a>
            </section>
        `;
    }

    /* =====================================================
       RENDER EVENT
    ===================================================== */

    function renderEvent(event, myReg) {
        const id = event._id || event.id;
        const capacity = Number(event.capacity) || 0;
        const registered = Number(event.registeredCount ?? event.registered) || 0;
        const seats = Math.max(capacity - registered, 0);
        const isPast = isEventPast(event.date);
        const isFull = seats === 0;

        const organizer = event.organizer || {};
        const organizerName = typeof organizer === "object" ? (organizer.name || "VYBE Host") : "VYBE Host";
        const organizerOrg = typeof organizer === "object" ? (organizer.organizerProfile?.orgName || "") : "";
        const institutionName = typeof event.institution === "object" ? (event.institution?.name || "") : "";

        const tags = Array.isArray(event.tags) ? event.tags : [];

        // Decide what the action button should be
        let actionHTML = "";

        if (myReg) {
            if (myReg.status === "confirmed") {
                actionHTML = `
                    <div class="registered-banner">
                        <span>✓ You're registered</span>
                        <button type="button" class="cancel-btn" id="cancelRegBtn">
                            Cancel registration
                        </button>
                    </div>
                `;
            } else if (myReg.status === "pending") {
                actionHTML = `
                    <div class="registered-banner pending">
                        <span>⏳ Registration pending approval</span>
                        <button type="button" class="cancel-btn" id="cancelRegBtn">
                            Withdraw request
                        </button>
                    </div>
                `;
            } else if (myReg.status === "rejected") {
                actionHTML = `
                    <div class="registered-banner rejected">
                        <span>Your request was declined by the organizer.</span>
                    </div>
                `;
            }
        } else if (isPast) {
            actionHTML = `<p class="event-closed">This event has already happened.</p>`;
        } else if (isFull) {
            actionHTML = `<p class="event-closed">This event is full.</p>`;
        } else {
            const approvalMode = event.registrationMode === "approval";
            actionHTML = `
                <button type="button" class="register-btn" id="registerBtn">
                    ${approvalMode ? "REQUEST TO JOIN →" : "REGISTER →"}
                </button>
            `;
        }

        container.innerHTML = `
            <section class="event-hero">

                <a class="back-link" href="discover.html">← back to discover</a>

                <div class="event-hero-grid">

                    <div class="event-hero-image">
                        <img src="${imageFor(event.category)}" alt="${escapeHTML(event.title)}">
                    </div>

                    <div class="event-hero-content">

                        <span class="event-category-tag">${escapeHTML(event.category || "")}</span>

                        <h1>${escapeHTML(event.title)}</h1>

                        <p class="event-description">${escapeHTML(event.description || "")}</p>

                        ${tags.length ? `
                            <div class="event-tags">
                                ${tags.map(t => `<span>${escapeHTML(t)}</span>`).join("")}
                            </div>
                        ` : ""}

                        <div class="event-meta-grid">
                            <div class="meta-item">
                                <label>Date</label>
                                <span>${formatEventDate(event.date)}</span>
                            </div>
                            <div class="meta-item">
                                <label>Time</label>
                                <span>${escapeHTML(event.time || "TBA")}</span>
                            </div>
                            <div class="meta-item">
                                <label>Venue</label>
                                <span>${escapeHTML(event.venue || "TBA")}</span>
                            </div>
                            <div class="meta-item">
                                <label>Mode</label>
                                <span>${escapeHTML(event.mode || "offline")}</span>
                            </div>
                            <div class="meta-item">
                                <label>Seats</label>
                                <span>${registered} going · ${seats} left</span>
                            </div>
                            <div class="meta-item">
                                <label>Price</label>
                                <span>${formatPrice(event.price)}</span>
                            </div>
                        </div>

                        <div class="event-host">
                            <label>Hosted by</label>
                            <strong>${escapeHTML(organizerName)}</strong>
                            ${organizerOrg && organizerOrg !== organizerName
                                ? `<small>${escapeHTML(organizerOrg)}</small>`
                                : ""}
                            ${institutionName ? `<small>· ${escapeHTML(institutionName)}</small>` : ""}
                        </div>

                        <div class="event-action" id="eventAction">
                            ${actionHTML}
                        </div>

                    </div>

                </div>

            </section>
        `;

        // Wire buttons
        const registerBtn = document.getElementById("registerBtn");
        if (registerBtn) {
            registerBtn.addEventListener("click", () => handleRegister(event));
        }

        const cancelBtn = document.getElementById("cancelRegBtn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => handleCancel(event));
        }
    }

    /* =====================================================
       REGISTER
    ===================================================== */

    async function handleRegister(event) {
        const btn = document.getElementById("registerBtn");
        if (!btn) return;

        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "registering…";

        try {
            const reg = await window.api.registerForEvent(event._id || event.id);
            const isPending = reg.status === "pending";

            btn.textContent = isPending ? "pending approval ✓" : "registered ✓";
            btn.classList.add("success");

            // Reload the page after a moment to reflect new state
            setTimeout(() => window.location.reload(), 800);
        } catch (err) {
            btn.disabled = false;
            btn.textContent = originalText;

            const message = err.message || "Registration failed.";

            // Show error inline
            const action = document.getElementById("eventAction");
            if (action) {
                const errEl = document.createElement("p");
                errEl.className = "event-error";
                errEl.style.color = "#c00";
                errEl.style.marginTop = "0.75rem";
                errEl.textContent = message;
                action.appendChild(errEl);

                setTimeout(() => errEl.remove(), 4000);
            }
        }
    }

    /* =====================================================
       CANCEL
    ===================================================== */

    async function handleCancel(event) {
        const btn = document.getElementById("cancelRegBtn");
        if (!btn) return;

        if (!confirm("Cancel your registration for this event?")) return;

        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "cancelling…";

        try {
            await window.api.cancelRegistration(event._id || event.id);
            setTimeout(() => window.location.reload(), 500);
        } catch (err) {
            btn.disabled = false;
            btn.textContent = originalText;
            alert(err.message || "Could not cancel.");
        }
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function isEventPast(dateStr) {
        if (!dateStr) return false;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const d = new Date(dateStr + "T00:00:00");
            return d < today;
        } catch {
            return false;
        }
    }

    function imageFor(category) {
        const images = {
            Tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=85",
            Design: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=85",
            Music: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85",
            Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=85",
            Business: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85",
            Culture: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85",
            Social: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=85",
            Wellness: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=85",
            Admin: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=85",
            Other: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85"
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
            return d.toLocaleDateString("en-IN", {
                weekday: "short", day: "numeric", month: "long", year: "numeric"
            });
        } catch {
            return dateStr;
        }
    }
});