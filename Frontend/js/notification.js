/* =========================================================
   VYBE NOTIFICATION ENGINE
   Phase 4
   ========================================================= */

(function () {

    "use strict";


    const STORAGE_KEY =
        "vybeNotifications";


    /* =====================================================
       DATA
       ===================================================== */

    function getNotifications() {

        try {

            const stored =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (stored) {

                const parsed =
                    JSON.parse(stored);

                if (
                    Array.isArray(parsed)
                ) {

                    return parsed;

                }

            }

        } catch (error) {

            console.error(
                "VYBE notification error:",
                error
            );

        }


        return createStarterNotifications();

    }


    function saveNotifications(
        notifications
    ) {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
                notifications
            )
        );

    }


    function createStarterNotifications() {

        const notifications = [

            {

                id: "authority-demo-1",

                type: "approval",

                title:
                    "New event waiting for review",

                message:
                    "A campus organizer submitted a new event for approval.",

                read: false,

                audience: "authority",

                createdAt:
                    new Date().toISOString()

            },

            {

                id: "authority-demo-2",

                type: "activity",

                title:
                    "Campus activity is growing",

                message:
                    "Students are registering for upcoming campus experiences.",

                read: false,

                audience: "authority",

                createdAt:
                    new Date(
                        Date.now() - 3600000
                    ).toISOString()

            },

            {

                id: "authority-demo-3",

                type: "report",

                title:
                    "No active reports",

                message:
                    "There are currently no unresolved event reports.",

                read: true,

                audience: "authority",

                createdAt:
                    new Date(
                        Date.now() - 86400000
                    ).toISOString()

            }

        ];


        saveNotifications(
            notifications
        );


        return notifications;

    }


    /* =====================================================
       FORMAT TIME
       ===================================================== */

    function formatTime(
        dateString
    ) {

        if (!dateString) {
            return "";
        }


        const date =
            new Date(dateString);


        if (isNaN(date)) {
            return "";
        }


        const now =
            new Date();


        const difference =
            now - date;


        const minutes =
            Math.floor(
                difference / 60000
            );


        if (minutes < 1) {
            return "just now";
        }


        if (minutes < 60) {
            return `${minutes}m ago`;
        }


        const hours =
            Math.floor(
                minutes / 60
            );


        if (hours < 24) {
            return `${hours}h ago`;
        }


        const days =
            Math.floor(
                hours / 24
            );


        if (days < 7) {
            return `${days}d ago`;
        }


        return date.toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short"
            }
        );

    }


    /* =====================================================
       ESCAPE
       ===================================================== */

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =====================================================
       ICON
       ===================================================== */

    function getIcon(type) {

        switch (type) {

            case "report":
                return "⚑";

            case "activity":
                return "◎";

            case "approval":
            default:
                return "✓";

        }

    }


    /* =====================================================
       RENDER
       ===================================================== */

    let currentFilter =
        "all";


    function renderNotifications() {

        const container =
            document.getElementById(
                "notificationList"
            );


        const empty =
            document.getElementById(
                "notificationEmpty"
            );


        if (!container) {
            return;
        }


        let notifications =
            getNotifications();


        notifications =
            notifications.filter(
                notification =>
                    notification.audience ===
                    "authority"
            );


        if (
            currentFilter !==
            "all"
        ) {

            notifications =
                notifications.filter(
                    notification =>
                        notification.type ===
                        currentFilter
                );

        }


        if (!notifications.length) {

            container.innerHTML = "";

            if (empty) {
                empty.hidden = false;
            }

            return;

        }


        if (empty) {
            empty.hidden = true;
        }


        container.innerHTML =
            notifications
                .map(
                    notification =>
                        createNotification(
                            notification
                        )
                )
                .join("");

    }


    function createNotification(
        notification
    ) {

        const type =
            notification.type ||
            "activity";


        const action =
            notification.eventId
                ? `
                    <a
                        href="event-review.html"
                        class="notification-action"
                        data-event-id="${escapeHTML(notification.eventId)}"
                    >
                        Open →
                    </a>
                `
                : "";


        return `

            <article
                class="
                    notification-item
                    ${notification.read ? "" : "unread"}
                "
                data-id="${escapeHTML(notification.id)}"
            >

                <div
                    class="
                        notification-icon
                        ${escapeHTML(type)}
                    "
                >
                    ${getIcon(type)}
                </div>


                <div class="notification-content">

                    <strong>
                        ${escapeHTML(
                            notification.title ||
                            "VYBE update"
                        )}
                    </strong>

                    <p>
                        ${escapeHTML(
                            notification.message ||
                            ""
                        )}
                    </p>

                    ${action}

                </div>


                <time class="notification-time">

                    ${formatTime(
                        notification.createdAt
                    )}

                </time>

            </article>

        `;

    }


    /* =====================================================
       READ STATE
       ===================================================== */

    function markAsRead(
        notificationId
    ) {

        const notifications =
            getNotifications();


        const notification =
            notifications.find(
                item =>
                    String(item.id) ===
                    String(notificationId)
            );


        if (!notification) {
            return;
        }


        notification.read =
            true;


        saveNotifications(
            notifications
        );


        renderNotifications();

    }


    function markAllRead() {

        const notifications =
            getNotifications();


        notifications.forEach(
            notification => {

                if (
                    notification.audience ===
                    "authority"
                ) {

                    notification.read =
                        true;

                }

            }
        );


        saveNotifications(
            notifications
        );


        renderNotifications();

    }


    /* =====================================================
       FILTERS
       ===================================================== */

    function setupFilters() {

        const buttons =
            document.querySelectorAll(
                ".filter-btn"
            );


        buttons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        buttons.forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                        button.classList.add(
                            "active"
                        );


                        currentFilter =
                            button.dataset.filter ||
                            "all";


                        renderNotifications();

                    }
                );

            }
        );

    }


    /* =====================================================
       CLICK HANDLING
       ===================================================== */

    function setupClickHandling() {

        const list =
            document.getElementById(
                "notificationList"
            );


        if (!list) return;


        list.addEventListener(
            "click",
            event => {

                const item =
                    event.target.closest(
                        ".notification-item"
                    );


                if (!item) return;


                const notificationId =
                    item.dataset.id;


                if (
                    event.target.closest(
                        ".notification-action"
                    )
                ) {

                    const link =
                        event.target.closest(
                            ".notification-action"
                        );


                    const eventId =
                        link.dataset.eventId;


                    if (eventId) {

                        localStorage.setItem(
                            "vybeReviewEventId",
                            eventId
                        );

                    }


                    markAsRead(
                        notificationId
                    );


                    return;

                }


                markAsRead(
                    notificationId
                );

            }
        );

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function init() {

        renderNotifications();

        setupFilters();

        setupClickHandling();


        const markAll =
            document.getElementById(
                "markAllRead"
            );


        if (markAll) {

            markAll.addEventListener(
                "click",
                markAllRead
            );

        }

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }


    window.VYBENotifications = {

        getNotifications,

        saveNotifications,

        renderNotifications,

        markAllRead,

        markAsRead

    };

})();