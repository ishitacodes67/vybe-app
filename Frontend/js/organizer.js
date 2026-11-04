document.addEventListener("DOMContentLoaded", function () {
    // Get basic user info
    const user = window.api.getUser();
    const name = user?.name || "VYBE Host";
    const firstName = name.trim().split(/\s+/)[0] || "Host";

    const organizerName = document.getElementById("organizerName");
    const sidebarName = document.getElementById("sidebarName");
    const sidebarAvatar = document.getElementById("sidebarAvatar");

    if (organizerName) organizerName.textContent = firstName;
    if (sidebarName) sidebarName.textContent = name;
    if (sidebarAvatar) sidebarAvatar.textContent = name.charAt(0).toUpperCase();

    let allEvents = [];
    let currentFilter = "all";

    function getEventStatus(event) {
        if (event.status === "pending") return "pending";
        if (event.status === "rejected") return "rejected";
        
        if (event.status === "approved") {
            const now = new Date();
            const eventDate = new Date(`${event.date}T${event.time || "00:00"}`);
            const endDate = new Date(eventDate);
            endDate.setHours(endDate.getHours() + 3);

            if (now >= eventDate && now <= endDate) return "live";
            if (now > endDate) return "completed";
            return "upcoming";
        }
        return "pending";
    }

    function renderStats() {
        const totalEvents = document.getElementById("totalEvents");
        const upcomingEvents = document.getElementById("upcomingEvents");
        const pendingEvents = document.getElementById("pendingEvents");
        const totalAttendees = document.getElementById("totalAttendees");

        const upcoming = allEvents.filter(e => getEventStatus(e) === "upcoming");
        const pending = allEvents.filter(e => getEventStatus(e) === "pending");
        const attendees = allEvents.reduce((total, e) => total + Number(e.registeredCount || 0), 0);

        if (totalEvents) totalEvents.textContent = allEvents.length;
        if (upcomingEvents) upcomingEvents.textContent = upcoming.length;
        if (pendingEvents) pendingEvents.textContent = pending.length;
        if (totalAttendees) totalAttendees.textContent = attendees.toLocaleString("en-IN");
    }

    function renderEvents() {
        const container = document.getElementById("organizerEvents");
        const emptyState = document.getElementById("emptyState");

        if (!container) return;

        renderStats();

        let filtered = allEvents;
        if (currentFilter !== "all") {
            filtered = allEvents.filter(event => getEventStatus(event) === currentFilter);
        }

        filtered.sort((a, b) => new Date(a.date || "9999-12-31") - new Date(b.date || "9999-12-31"));

        container.innerHTML = "";

        if (filtered.length === 0) {
            container.classList.add("hidden");
            if (emptyState) emptyState.classList.remove("hidden");
            return;
        }

        container.classList.remove("hidden");
        if (emptyState) emptyState.classList.add("hidden");

        filtered.forEach(event => {
            const status = getEventStatus(event);
            const card = document.createElement("article");
            card.className = "organizer-event-card";

            // Use the real MongoDB _id for the manage link!
            const eventId = event._id || event.id;
            const imageStyle = event.image ? `background-image:url("${event.image}")` : "";

            card.innerHTML = `
                <div class="event-card-image" style="${imageStyle}">
                    <span class="status-badge status-${status}">
                        ${status}
                    </span>
                </div>
                <div class="event-card-content">
                    <span class="event-category">
                        ${escapeHTML(event.category || "EVENT")}
                    </span>
                    <h3>
                        ${escapeHTML(event.title || "Untitled Event")}
                    </h3>
                    <div class="event-meta">
                        <span>${formatDate(event.date)}</span>
                        <span>${escapeHTML(event.time || "")}</span>
                        <span>${escapeHTML(event.venue || "Venue TBA")}</span>
                    </div>
                    <div class="event-card-footer">
                        <span class="event-capacity">
                            ${Number(event.registeredCount || 0)} / ${Number(event.capacity || 0)} attendees
                        </span>
                        <a class="manage-link" href="event.html?id=${encodeURIComponent(eventId)}">
                            Manage →
                        </a>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    function formatDate(dateStr) {
        if (!dateStr) return "";
        try {
            const d = new Date(`${dateStr}T12:00:00`);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        } catch { return dateStr; }
    }

    // Load data from API
    async function loadDashboard() {
        const refreshBtn = document.getElementById("refreshDashboard");
        if (refreshBtn) refreshBtn.style.transform = "rotate(360deg)";
        
        try {
            allEvents = await window.api.myEvents();
            renderEvents();
        } catch (err) {
            console.error("Failed to load events:", err);
            allEvents = [];
            renderEvents();
        } finally {
            if (refreshBtn) {
                setTimeout(() => refreshBtn.style.transform = "", 350);
            }
        }
    }

    // Filters
    const tabs = document.querySelectorAll(".event-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            tabs.forEach(item => item.classList.remove("active"));
            tab.classList.add("active");
            currentFilter = tab.dataset.filter || "all";
            renderEvents();
        });
    });

    // Refresh
    const refreshButton = document.getElementById("refreshDashboard");
    if (refreshButton) {
        refreshButton.addEventListener("click", loadDashboard);
    }

    // Logout
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            if (confirm("Log out of your VYBE Host account?")) {
                window.api.logout();
                window.location.href = "role-select.html";
            }
        });
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Initial load
    loadDashboard();
});