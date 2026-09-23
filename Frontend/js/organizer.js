/* =========================================================
   VYBE — ORGANIZER DASHBOARD
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const storage = window.VYBEStorage;

    if (!storage) {
        console.error("VYBEStorage is missing.");
        return;
    }

    const organizer = storage.getOrganizer();
    const organizerId = storage.getOrganizerId();

    const name =
        organizer.name ||
        "VYBE Host";

    const firstName =
        name.trim().split(/\s+/)[0] ||
        "Host";


    /* =====================================================
       BASIC USER INFO
       ===================================================== */

    const organizerName =
        document.getElementById("organizerName");

    const sidebarName =
        document.getElementById("sidebarName");

    const sidebarAvatar =
        document.getElementById("sidebarAvatar");

    if (organizerName) {
        organizerName.textContent = firstName;
    }

    if (sidebarName) {
        sidebarName.textContent = name;
    }

    if (sidebarAvatar) {
        sidebarAvatar.textContent =
            name.charAt(0).toUpperCase();
    }


    /* =====================================================
       EVENTS
       ===================================================== */

    let currentFilter = "all";

    function getEvents() {
        return storage.getOrganizerEvents();
    }


    function getEventStatus(event) {

        if (
            event.status === "pending" ||
            event.approvalStatus === "pending"
        ) {
            return "pending";
        }

        if (
            event.status === "rejected" ||
            event.approvalStatus === "rejected"
        ) {
            return "rejected";
        }

        if (
            event.status === "approved" ||
            event.approvalStatus === "approved"
        ) {
            const now = new Date();
            const eventDate = new Date(
                `${event.date}T${event.time || "00:00"}`
            );

            const endDate = new Date(eventDate);
            endDate.setHours(
                endDate.getHours() + 3
            );

            if (now >= eventDate && now <= endDate) {
                return "live";
            }

            if (now > endDate) {
                return "completed";
            }

            return "upcoming";
        }

        return "pending";
    }


    function renderStats(events) {

        const totalEvents =
            document.getElementById("totalEvents");

        const upcomingEvents =
            document.getElementById("upcomingEvents");

        const pendingEvents =
            document.getElementById("pendingEvents");

        const totalAttendees =
            document.getElementById("totalAttendees");


        const upcoming = events.filter(function (event) {
            return getEventStatus(event) === "upcoming";
        });

        const pending = events.filter(function (event) {
            return getEventStatus(event) === "pending";
        });

        const attendees = events.reduce(
            function (total, event) {
                return total + Number(
                    event.attendees || 0
                );
            },
            0
        );


        if (totalEvents) {
            totalEvents.textContent =
                events.length;
        }

        if (upcomingEvents) {
            upcomingEvents.textContent =
                upcoming.length;
        }

        if (pendingEvents) {
            pendingEvents.textContent =
                pending.length;
        }

        if (totalAttendees) {
            totalAttendees.textContent =
                attendees.toLocaleString("en-IN");
        }
    }


    function renderEvents() {

        const container =
            document.getElementById("organizerEvents");

        const emptyState =
            document.getElementById("emptyState");

        if (!container) {
            return;
        }

        const events = getEvents();

        renderStats(events);


        let filtered = events;

        if (currentFilter !== "all") {
            filtered = events.filter(function (event) {
                return getEventStatus(event) === currentFilter;
            });
        }


        filtered.sort(function (a, b) {
            return (
                new Date(a.date || "9999-12-31") -
                new Date(b.date || "9999-12-31")
            );
        });


        container.innerHTML = "";


        if (filtered.length === 0) {

            container.classList.add("hidden");

            if (emptyState) {
                emptyState.classList.remove("hidden");
            }

            return;
        }


        container.classList.remove("hidden");

        if (emptyState) {
            emptyState.classList.add("hidden");
        }


        filtered.forEach(function (event) {

            const status =
                getEventStatus(event);

            const card =
                document.createElement("article");

            card.className =
                "organizer-event-card";


            const imageStyle =
                event.image
                    ? `background-image:url("${event.image}")`
                    : "";


            card.innerHTML = `
                <div
                    class="event-card-image"
                    style="${imageStyle}"
                >
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
                        <span>
                            ${storage.formatDate(event.date)}
                        </span>

                        <span>
                            ${storage.formatTime(event.time)}
                        </span>

                        <span>
                            ${escapeHTML(event.venue || "Venue TBA")}
                        </span>
                    </div>

                    <div class="event-card-footer">

                        <span class="event-capacity">
                            ${Number(event.attendees || 0)}
                            /
                            ${Number(event.capacity || 0)}
                            attendees
                        </span>

                        <a
                            class="manage-link"
                            href="event.html?id=${encodeURIComponent(event.id)}"
                        >
                            Manage →
                        </a>

                    </div>

                </div>
            `;


            container.appendChild(card);
        });
    }


    /* =====================================================
       FILTERS
       ===================================================== */

    const tabs =
        document.querySelectorAll(".event-tab");

    tabs.forEach(function (tab) {

        tab.addEventListener("click", function () {

            tabs.forEach(function (item) {
                item.classList.remove("active");
            });

            tab.classList.add("active");

            currentFilter =
                tab.dataset.filter || "all";

            renderEvents();
        });
    });


    /* =====================================================
       REFRESH
       ===================================================== */

    const refreshButton =
        document.getElementById("refreshDashboard");

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            function () {

                refreshButton.style.transform =
                    "rotate(360deg)";

                setTimeout(function () {
                    refreshButton.style.transform = "";
                }, 350);

                renderEvents();
            }
        );
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    const logoutButton =
        document.getElementById("logoutButton");

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            function () {

                const shouldLogout =
                    confirm(
                        "Log out of your VYBE Host account?"
                    );

                if (!shouldLogout) {
                    return;
                }

                localStorage.removeItem("vybeRole");
                localStorage.removeItem("vybeAuth");
                localStorage.removeItem("vybeOrganizer");

                window.location.href =
                    "role-select.html";
            }
        );
    }


    /* =====================================================
       INITIAL RENDER
       ===================================================== */

    renderEvents();


    /* =====================================================
       SAFE HTML
       ===================================================== */

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

});