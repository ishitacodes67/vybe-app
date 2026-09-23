/* =========================================================
   VYBE AUTHORITY ENGINE
   Phase 4
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STORAGE
       ===================================================== */

    const STORAGE_KEYS = {
        events: "vybeEvents",
        notifications: "vybeNotifications",
        user: "vybeUser",
        authority: "vybeAuthority"
    };


    function getEvents() {

        try {

            const stored = localStorage.getItem(STORAGE_KEYS.events);

            if (!stored) return [];

            const parsed = JSON.parse(stored);

            return Array.isArray(parsed) ? parsed : [];

        } catch (error) {

            console.error("VYBE: Could not read events", error);

            return [];
        }
    }


    function saveEvents(events) {

        localStorage.setItem(
            STORAGE_KEYS.events,
            JSON.stringify(events)
        );
    }


    function getNotifications() {

        try {

            const stored =
                localStorage.getItem(STORAGE_KEYS.notifications);

            if (!stored) return [];

            const parsed = JSON.parse(stored);

            return Array.isArray(parsed) ? parsed : [];

        } catch {

            return [];
        }
    }


    function saveNotifications(notifications) {

        localStorage.setItem(
            STORAGE_KEYS.notifications,
            JSON.stringify(notifications)
        );
    }


    /* =====================================================
       AUTHORITY PROFILE
       ===================================================== */

    function getAuthority() {

        try {

            const stored =
                localStorage.getItem(STORAGE_KEYS.authority);

            if (stored) {
                return JSON.parse(stored);
            }

        } catch {}

        try {

            const user =
                JSON.parse(
                    localStorage.getItem(STORAGE_KEYS.user)
                );

            if (user) return user;

        } catch {}

        return {
            name: "Campus Authority",
            institution: "MIT",
            role: "campus_authority"
        };
    }


    /* =====================================================
       STATUS
       ===================================================== */

    function getStatus(event) {

        return (
            event.status ||
            event.approvalStatus ||
            "pending"
        ).toLowerCase();

    }


    function pendingEvents() {

        return getEvents().filter(
            event => getStatus(event) === "pending"
        );

    }


    function approvedEvents() {

        return getEvents().filter(
            event =>
                ["approved", "published", "live"]
                    .includes(getStatus(event))
        );

    }


    /* =====================================================
       FORMAT DATE
       ===================================================== */

    function parseDate(event) {

        const value =
            event.date ||
            event.eventDate ||
            event.startDate;

        if (!value) return null;

        const date = new Date(value);

        return isNaN(date) ? null : date;

    }


    function formatShortDate(event) {

        const date = parseDate(event);

        if (!date) {

            return {
                day: "--",
                month: "---"
            };

        }

        return {
            day: date.getDate(),
            month: date
                .toLocaleString("en-IN", {
                    month: "short"
                })
                .toUpperCase()
        };

    }


    /* =====================================================
       TOAST
       ===================================================== */

    function showToast(message) {

        const toast =
            document.getElementById("authorityToast");

        if (!toast) return;

        const text =
            toast.querySelector("p");

        if (text) {
            text.textContent = message;
        }

        toast.classList.add("show");

        setTimeout(() => {

            toast.classList.remove("show");

        }, 3200);

    }


    /* =====================================================
       NOTIFICATIONS
       ===================================================== */

    function addNotification({
        type = "approval",
        title,
        message,
        eventId = null,
        audience = "authority"
    }) {

        const notifications =
            getNotifications();

        notifications.unshift({

            id:
                "notification-" +
                Date.now(),

            type,

            title,

            message,

            eventId,

            audience,

            read: false,

            createdAt:
                new Date().toISOString()

        });

        saveNotifications(notifications);

    }


    /* =====================================================
       EVENT CARD
       ===================================================== */

    function createPendingCard(event) {

        const date =
            formatShortDate(event);

        const organizer =
            event.organizer ||
            event.organizerName ||
            "Campus Organizer";

        const title =
            event.title ||
            event.name ||
            "Untitled event";

        const category =
            event.category ||
            "Campus Event";


        return `

            <article
                class="pending-event"
                data-event-id="${escapeHTML(event.id || "")}"
            >

                <div class="pending-event-date">

                    <strong>
                        ${escapeHTML(String(date.day))}
                    </strong>

                    <span>
                        ${escapeHTML(date.month)}
                    </span>

                </div>


                <div>

                    <h3>
                        ${escapeHTML(title)}
                    </h3>

                    <p>
                        ${escapeHTML(category)}
                        •
                        ${escapeHTML(organizer)}
                    </p>

                </div>


                <button
                    class="pending-event-action"
                    data-review="${escapeHTML(event.id || "")}"
                >
                    Review →
                </button>

            </article>

        `;

    }


    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =====================================================
       DASHBOARD
       ===================================================== */

    function renderDashboard() {

        const events = getEvents();

        const pending = pendingEvents();

        const approved = approvedEvents();


        const pendingCount =
            document.getElementById("pendingCount");

        const publishedCount =
            document.getElementById("publishedCount");

        const registrationCount =
            document.getElementById("registrationCount");

        const reportCount =
            document.getElementById("reportCount");


        if (pendingCount) {
            pendingCount.textContent =
                pending.length;
        }


        if (publishedCount) {
            publishedCount.textContent =
                approved.length;
        }


        if (registrationCount) {

            const total =
                approved.reduce(
                    (sum, event) =>
                        sum +
                        Number(
                            event.registered ||
                            event.attendees ||
                            event.registrationCount ||
                            0
                        ),
                    0
                );

            registrationCount.textContent =
                total;
        }


        if (reportCount) {

            const reports =
                events.filter(
                    event =>
                        event.reported === true ||
                        event.status === "reported"
                );

            reportCount.textContent =
                reports.length;

        }


        const pendingList =
            document.getElementById(
                "pendingEventsList"
            );


        if (!pendingList) return;


        if (!pending.length) {

            pendingList.innerHTML = `

                <div class="no-pending">

                    <strong>
                        You're all caught up ✦
                    </strong>

                    No event submissions need your attention.

                </div>

            `;

        } else {

            pendingList.innerHTML =
                pending
                    .slice(0, 10)
                    .map(createPendingCard)
                    .join("");

        }


        const badge =
            document.getElementById(
                "pendingBadge"
            );

        if (badge) {
            badge.textContent =
                pending.length;
        }


        const monthlyEvents =
            document.getElementById(
                "monthlyEvents"
            );

        if (monthlyEvents) {

            const now = new Date();

            const monthEvents =
                events.filter(event => {

                    const date =
                        parseDate(event);

                    return date &&
                        date.getMonth() === now.getMonth() &&
                        date.getFullYear() === now.getFullYear();

                });

            monthlyEvents.textContent =
                monthEvents.length;

        }


        const activeOrganizers =
            document.getElementById(
                "activeOrganizers"
            );

        if (activeOrganizers) {

            const organizers =
                new Set(
                    events
                        .map(
                            event =>
                                event.organizerId ||
                                event.organizerEmail ||
                                event.organizer
                        )
                        .filter(Boolean)
                );

            activeOrganizers.textContent =
                organizers.size;

        }


        const authority =
            getAuthority();


        const authorityName =
            document.getElementById(
                "authorityName"
            );

        const authorityInstitution =
            document.getElementById(
                "authorityInstitution"
            );


        if (authorityName) {

            authorityName.textContent =
                authority.name ||
                "Campus Authority";

        }


        if (authorityInstitution) {

            authorityInstitution.textContent =
                authority.institution ||
                authority.university ||
                "MIT";

        }


        updateNotificationCount();

    }


    /* =====================================================
       NOTIFICATION COUNT
       ===================================================== */

    function updateNotificationCount() {

        const countElement =
            document.getElementById(
                "notificationCount"
            );

        if (!countElement) return;


        const notifications =
            getNotifications();


        const unread =
            notifications.filter(
                notification =>
                    notification.audience === "authority" &&
                    !notification.read
            );


        countElement.textContent =
            unread.length;

        countElement.style.display =
            unread.length
                ? "grid"
                : "none";

    }


    /* =====================================================
       OPEN REVIEW
       ===================================================== */

    function openReview(eventId) {

        if (!eventId) return;

        localStorage.setItem(
            "vybeReviewEventId",
            eventId
        );

        window.location.href =
            "event-review.html";

    }


    /* =====================================================
       EVENT REVIEW PAGE
       ===================================================== */

    function loadReviewPage() {

        const eventId =
            localStorage.getItem(
                "vybeReviewEventId"
            );


        const event =
            getEvents().find(
                item =>
                    String(item.id) ===
                    String(eventId)
            );


        if (!event) {

            showToast(
                "Event could not be found."
            );

            setTimeout(() => {

                window.location.href =
                    "authority-dashboard.html";

            }, 1000);

            return;

        }


        populateReview(event);

    }


    function populateReview(event) {

        const title =
            event.title ||
            event.name ||
            "Untitled event";


        setText(
            "reviewTitle",
            title
        );


        setText(
            "reviewOrganizer",
            `Hosted by ${
                event.organizer ||
                event.organizerName ||
                "Campus Organizer"
            }`
        );


        setText(
            "reviewStatus",
            getStatus(event)
        );


        setText(
            "statusText",
            getStatus(event).toUpperCase()
        );


        setText(
            "eventName",
            title
        );


        setText(
            "eventDescription",
            event.description ||
            "No event description was provided."
        );


        setText(
            "eventDate",
            event.date ||
            event.eventDate ||
            "Not provided"
        );


        setText(
            "eventTime",
            event.time ||
            "Not provided"
        );


        setText(
            "eventLocation",
            event.location ||
            event.venue ||
            "Not provided"
        );


        setText(
            "eventMode",
            event.mode ||
            event.eventMode ||
            "In-person"
        );


        setText(
            "eventPrice",
            event.price ||
            event.isPaid
                ? `₹${event.price || 0}`
                : "Free"
        );


        setText(
            "eventCapacity",
            event.capacity ||
            "Open"
        );


        const date =
            formatShortDate(event);


        setText(
            "eventDay",
            date.day
        );


        setText(
            "eventMonth",
            date.month
        );


        setText(
            "eventCategory",
            event.category ||
            "EVENT"
        );


        const tags =
            document.getElementById(
                "eventTags"
            );


        if (tags) {

            const eventTags =
                Array.isArray(event.tags)
                    ? event.tags
                    : [];


            tags.innerHTML =
                eventTags.length
                    ? eventTags
                        .map(
                            tag =>
                                `<span class="event-tag">
                                    #${escapeHTML(tag)}
                                </span>`
                        )
                        .join("")
                    : `
                        <span class="event-tag">
                            Campus Event
                        </span>
                    `;

        }


        const cover =
            document.getElementById(
                "eventCover"
            );


        if (
            cover &&
            event.image
        ) {

            cover.style.backgroundImage =
                `url("${event.image}")`;

            cover.style.backgroundSize =
                "cover";

            cover.style.backgroundPosition =
                "center";

        }


        updateDecisionButtons(event);

    }


    function updateDecisionButtons(event) {

        const status =
            getStatus(event);


        const approve =
            document.getElementById(
                "approveEvent"
            );

        const changes =
            document.getElementById(
                "requestChanges"
            );

        const reject =
            document.getElementById(
                "rejectEvent"
            );


        if (status !== "pending") {

            [approve, changes, reject]
                .forEach(button => {

                    if (button) {
                        button.disabled = true;
                        button.style.opacity =
                            ".4";
                    }

                });

        }

    }


    function setText(id, value) {

        const element =
            document.getElementById(id);

        if (element) {

            element.textContent =
                value ?? "—";

        }

    }


    /* =====================================================
       DECISION MODAL
       ===================================================== */

    let pendingDecision = null;


    function openDecisionModal(
        decision
    ) {

        pendingDecision =
            decision;


        const modal =
            document.getElementById(
                "decisionModal"
            );


        const title =
            document.getElementById(
                "modalTitle"
            );


        const description =
            document.getElementById(
                "modalDescription"
            );


        const reason =
            document.getElementById(
                "decisionReason"
            );


        const icon =
            document.getElementById(
                "modalIcon"
            );


        if (!modal) return;


        if (decision === "reject") {

            title.textContent =
                "Reject this event";

            description.textContent =
                "Tell the organizer why this event cannot be published.";

            icon.textContent =
                "×";

        } else {

            title.textContent =
                "Request changes";

            description.textContent =
                "Tell the organizer what needs to be updated before approval.";

            icon.textContent =
                "↻";

        }


        if (reason) {
            reason.value = "";
        }


        modal.classList.add("open");

    }


    function closeDecisionModal() {

        const modal =
            document.getElementById(
                "decisionModal"
            );

        if (modal) {
            modal.classList.remove(
                "open"
            );
        }

        pendingDecision = null;

    }


    /* =====================================================
       APPROVAL
       ===================================================== */

    function approveCurrentEvent() {

        const eventId =
            localStorage.getItem(
                "vybeReviewEventId"
            );


        if (!eventId) return;


        const events =
            getEvents();


        const event =
            events.find(
                item =>
                    String(item.id) ===
                    String(eventId)
            );


        if (!event) return;


        event.status =
            "approved";

        event.approvalStatus =
            "approved";

        event.approvedAt =
            new Date().toISOString();


        event.approvedBy =
            getAuthority().email ||
            getAuthority().name ||
            "Campus Authority";


        saveEvents(events);


        addNotification({

            type: "activity",

            title: "Event published",

            message:
                `"${event.title || event.name}" has been approved and published.`,

            eventId,

            audience: "organizer"

        });


        addNotification({

            type: "approval",

            title: "Event approved",

            message:
                `You approved "${event.title || event.name}".`,

            eventId,

            audience: "authority"

        });


        showToast(
            "Event approved and published."
        );


        setTimeout(() => {

            window.location.href =
                "authority-dashboard.html";

        }, 900);

    }


    /* =====================================================
       REJECT / REQUEST CHANGES
       ===================================================== */

    function finalizeDecision() {

        if (!pendingDecision) return;


        const eventId =
            localStorage.getItem(
                "vybeReviewEventId"
            );


        const reason =
            document.getElementById(
                "decisionReason"
            )?.value.trim();


        if (!reason) {

            showToast(
                "Please add a reason first."
            );

            return;

        }


        const events =
            getEvents();


        const event =
            events.find(
                item =>
                    String(item.id) ===
                    String(eventId)
            );


        if (!event) return;


        if (
            pendingDecision ===
            "reject"
        ) {

            event.status =
                "rejected";

            event.approvalStatus =
                "rejected";

            event.rejectionReason =
                reason;


        } else {

            event.status =
                "changes_requested";

            event.approvalStatus =
                "changes_requested";

            event.changeRequest =
                reason;

        }


        event.reviewedAt =
            new Date().toISOString();


        saveEvents(events);


        const organizerTitle =
            event.title ||
            event.name ||
            "your event";


        addNotification({

            type: "activity",

            title:
                pendingDecision === "reject"
                    ? "Event rejected"
                    : "Changes requested",

            message:
                pendingDecision === "reject"
                    ? `"${organizerTitle}" was rejected.`
                    : `Changes were requested for "${organizerTitle}".`,

            eventId,

            audience: "organizer"

        });


        addNotification({

            type:
                pendingDecision === "reject"
                    ? "report"
                    : "approval",

            title:
                pendingDecision === "reject"
                    ? "Event rejected"
                    : "Changes requested",

            message:
                `You ${
                    pendingDecision === "reject"
                        ? "rejected"
                        : "requested changes to"
                } "${organizerTitle}".`,

            eventId,

            audience: "authority"

        });


        closeDecisionModal();


        showToast(
            pendingDecision === "reject"
                ? "Event rejected."
                : "Changes sent to organizer."
        );


        setTimeout(() => {

            window.location.href =
                "authority-dashboard.html";

        }, 900);

    }


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    function attachListeners() {

        document.addEventListener(
            "click",
            event => {

                const reviewButton =
                    event.target.closest(
                        "[data-review]"
                    );


                if (reviewButton) {

                    openReview(
                        reviewButton.dataset.review
                    );

                    return;

                }


                if (
                    event.target.id ===
                    "approveEvent"
                ) {

                    const checks =
                        document.querySelectorAll(
                            ".review-check"
                        );


                    const allChecked =
                        [...checks]
                            .every(
                                checkbox =>
                                    checkbox.checked
                            );


                    if (
                        checks.length &&
                        !allChecked
                    ) {

                        showToast(
                            "Complete the review checklist first."
                        );

                        return;

                    }


                    approveCurrentEvent();

                }


                if (
                    event.target.id ===
                    "requestChanges"
                ) {

                    openDecisionModal(
                        "changes"
                    );

                }


                if (
                    event.target.id ===
                    "rejectEvent"
                ) {

                    openDecisionModal(
                        "reject"
                    );

                }


                if (
                    event.target.id ===
                    "confirmDecision"
                ) {

                    finalizeDecision();

                }


                if (
                    event.target.id ===
                    "closeModal" ||
                    event.target.id ===
                    "cancelDecision"
                ) {

                    closeDecisionModal();

                }


                if (
                    event.target.id ===
                    "viewNotifications"
                ) {

                    window.location.href =
                        "notifications.html";

                }

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeDecisionModal();

                }

            }
        );

    }


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function init() {

        attachListeners();


        const path =
            window.location.pathname
                .split("/")
                .pop();


        if (
            path ===
            "authority-dashboard.html" ||
            path === ""
        ) {

            renderDashboard();

        }


        if (
            path ===
            "event-review.html"
        ) {

            loadReviewPage();

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


    window.VYBEAuthority = {

        getEvents,

        pendingEvents,

        approvedEvents,

        renderDashboard,

        loadReviewPage,

        approveCurrentEvent,

        showToast

    };

})();