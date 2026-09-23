/* =========================================================
   VYBE — EVENT DETAILS
   Loads event from backend, uses Radhika's exact CSS structure.
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    if (!window.api) {
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

    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("id");

    if (!eventId) { renderNotFound(); return; }

    container.innerHTML = `<div class="loading-state">Loading your VYBE…</div>`;

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
        console.error("[event-details] failed:", err);
        renderNotFound();
        return;
    }

    if (!event) { renderNotFound(); return; }

    renderEvent(event, myRegistration);

    /* =====================================================
       RENDER — matches Radhika's CSS exactly
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
        const institutionName = typeof organizer === "object" ? (event.institution?.name || "") : "";

        const tags = Array.isArray(event.tags) ? event.tags : [];

        // ---- Aside (right column) ----
        let asideHTML = `
            <div class="host-card">
                <small>Hosted by</small>
                <h2>${escapeHTML(organizerOrg || organizerName)}</h2>
                ${institutionName ? `<p>${escapeHTML(institutionName)}</p>` : ""}
            </div>

            <div class="seat-card">
                <small>Seats left</small>
                <strong>${seats} / ${capacity}</strong>
                <small>${registered} going</small>
            </div>
        `;

        if (myReg && myReg.status === "confirmed") {
            asideHTML += `
                <div class="registered-box">
                    <strong>✓ You're registered</strong>
                    <span>See you there!</span>
                    <a href="#" id="cancelRegBtn">Cancel registration</a>
                </div>
            `;
        } else if (myReg && myReg.status === "pending") {
            asideHTML += `
                <div class="registered-box">
                    <strong>⏳ Pending approval</strong>
                    <span>Waiting for the organizer to approve.</span>
                    <a href="#" id="cancelRegBtn">Withdraw request</a>
                </div>
            `;
        } else if (myReg && myReg.status === "rejected") {
            asideHTML += `
                <div class="registered-box">
                    <strong>Request declined</strong>
                    <span>The organizer did not approve.</span>
                </div>
            `;
        } else if (isPast) {
            asideHTML += `<button class="full-button" disabled>EVENT ENDED</button>`;
        } else if (isFull) {
            asideHTML += `<button class="full-button" disabled>EVENT FULL</button>`;
        } else {
            const approvalMode = event.registrationMode === "approval";
            asideHTML += `
                <button class="full-button" id="registerBtn">
                    ${approvalMode ? "REQUEST TO JOIN →" : "REGISTER →"}
                </button>
            `;
        }

        // ---- Full page ----
        container.innerHTML = `
            <section class="event-hero">

                <a class="back-link" href="discover.html">← back to discover</a>

                <div class="event-kicker">
                    <span>${escapeHTML(event.category || "EVENT")}</span>
                    <span>${escapeHTML(event.mode || "offline")}</span>
                </div>

                <h1>${escapeHTML(event.title)}</h1>

                <p class="event-lead">${escapeHTML(event.description || "")}</p>

                ${tags.length ? `
                    <div class="event-tags">
                        ${tags.map(t => `<span>#${escapeHTML(t)}</span>`).join("")}
                    </div>
                ` : ""}

            </section>

            <div class="event-layout">

                <div>

                    <div class="detail-grid">

                        <div>
                            <small>DATE</small>
                            <strong>${formatEventDate(event.date)}</strong>
                        </div>

                        <div>
                            <small>TIME</small>
                            <strong>${escapeHTML(event.time || "TBA")}</strong>
                        </div>

                        <div>
                            <small>VENUE</small>
                            <strong>${escapeHTML(event.venue || "TBA")}</strong>
                        </div>

                        <div>
                            <small>PRICE</small>
                            <strong>${formatPrice(event.price)}</strong>
                        </div>

                    </div>

                    <section class="about-event">
                        <p class="eyebrow">ABOUT THIS EVENT</p>
                        <p>${escapeHTML(event.description || "More details coming soon.")}</p>
                    </section>

                </div>

                <aside class="event-aside">
                    ${asideHTML}
                </aside>

            </div>
        `;

        document.getElementById("registerBtn")?.addEventListener("click", () => handleRegister(event));
        document.getElementById("cancelRegBtn")?.addEventListener("click", (e) => {
            e.preventDefault();
            handleCancel(event);
        });
    }

    /* =====================================================
       ACTIONS
    ===================================================== */

    async function handleRegister(event) {
        const btn = document.getElementById("registerBtn");
        if (!btn) return;

        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Registering…";

        try {
            const reg = await window.api.registerForEvent(event._id || event.id);
            const isPending = reg.status === "pending";
            btn.textContent = isPending ? "Pending approval ✓" : "Registered ✓";
            setTimeout(() => window.location.reload(), 700);
        } catch (err) {
            btn.disabled = false;
            btn.textContent = originalText;
            alert(err.message || "Registration failed.");
        }
    }

    async function handleCancel(event) {
        if (!confirm("Cancel your registration for this event?")) return;
        try {
            await window.api.cancelRegistration(event._id || event.id);
            setTimeout(() => window.location.reload(), 400);
        } catch (err) {
            alert(err.message || "Could not cancel.");
        }
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    function renderNotFound() {
        container.innerHTML = `
            <section class="not-found">
                <p class="eyebrow">EVENT NOT FOUND</p>
                <h1>that VYBE <em>moved.</em></h1>
                <a href="discover.html" class="full-button" style="display:inline-block;width:auto;padding:1rem 2rem;text-decoration:none;margin-top:1rem;">Back to Discover →</a>
            </section>
        `;
    }

    function isEventPast(dateStr) {
        if (!dateStr) return false;
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return new Date(dateStr + "T00:00:00") < today;
        } catch { return false; }
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
            const d = new Date(dateStr + "T00:00:00");
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
        } catch { return dateStr; }
    }
});