/* =========================================================
   VYBE — CENTRAL STORAGE SYSTEM
   Phase 5 Integration Layer

   One consistent interface for:
   - Current user
   - Registrations
   - Feedback
   - Selected event
   - Notifications
   - Organizer events
   - Authority review state
   ========================================================= */

(function () {
    "use strict";

    const STORAGE_KEYS = {
        USER: "vybeUser",
        ROLE: "vybeRole",
        REGISTRATIONS: "vybeRegistrations",
        FEEDBACK: "vybeFeedback",
        SELECTED_EVENT: "selectedEvent",
        NOTIFICATIONS: "vybeNotifications",
        ORGANIZER_EVENTS: "vybeOrganizerEvents",
        AUTHORITY_REVIEWS: "vybeAuthorityReviews",
        PROFILE_DRAFT: "vybeProfileDraft"
    };

    function read(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);

            if (raw === null) {
                return fallback;
            }

            return JSON.parse(raw);
        } catch (error) {
            console.error(`VYBE Storage: failed reading ${key}`, error);
            return fallback;
        }
    }

    function write(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`VYBE Storage: failed writing ${key}`, error);
            return false;
        }
    }

    function remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`VYBE Storage: failed removing ${key}`, error);
            return false;
        }
    }

    function getUser() {
        const user = read(STORAGE_KEYS.USER, null);

        if (!user || typeof user !== "object") {
            return null;
        }

        return user;
    }

    function setUser(user) {
        if (!user || typeof user !== "object") {
            return false;
        }

        return write(STORAGE_KEYS.USER, user);
    }

    function updateUser(updates) {
        const currentUser = getUser() || {};

        const updatedUser = {
            ...currentUser,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        return setUser(updatedUser);
    }

    function getRole() {
        return localStorage.getItem(STORAGE_KEYS.ROLE) || null;
    }

    function setRole(role) {
        if (!role) return false;

        localStorage.setItem(STORAGE_KEYS.ROLE, role);
        return true;
    }

    function getRegistrations() {
        const registrations = read(
            STORAGE_KEYS.REGISTRATIONS,
            []
        );

        return Array.isArray(registrations)
            ? registrations
            : [];
    }

    function setRegistrations(registrations) {
        return write(
            STORAGE_KEYS.REGISTRATIONS,
            Array.isArray(registrations)
                ? registrations
                : []
        );
    }

    function isRegistered(eventId) {
        return getRegistrations().some(
            registration =>
                registration.eventId === eventId
        );
    }

    function addRegistration(eventId) {
        if (!eventId) return false;

        const registrations = getRegistrations();

        if (registrations.some(
            registration =>
                registration.eventId === eventId
        )) {
            return true;
        }

        registrations.push({
            eventId,
            registeredAt: new Date().toISOString()
        });

        return setRegistrations(registrations);
    }

    function removeRegistration(eventId) {
        const registrations = getRegistrations()
            .filter(
                registration =>
                    registration.eventId !== eventId
            );

        return setRegistrations(registrations);
    }

    function getFeedback() {
        const feedback = read(
            STORAGE_KEYS.FEEDBACK,
            []
        );

        return Array.isArray(feedback)
            ? feedback
            : [];
    }

    function addFeedback(feedback) {
        const current = getFeedback();

        current.push({
            ...feedback,
            id:
                feedback.id ||
                `feedback-${Date.now()}`,
            createdAt:
                feedback.createdAt ||
                new Date().toISOString()
        });

        return write(
            STORAGE_KEYS.FEEDBACK,
            current
        );
    }

    function getSelectedEvent() {
        return read(
            STORAGE_KEYS.SELECTED_EVENT,
            null
        );
    }

    function setSelectedEvent(event) {
        return write(
            STORAGE_KEYS.SELECTED_EVENT,
            event
        );
    }

    function clearSelectedEvent() {
        return remove(
            STORAGE_KEYS.SELECTED_EVENT
        );
    }

    function getNotifications() {
        const notifications = read(
            STORAGE_KEYS.NOTIFICATIONS,
            []
        );

        return Array.isArray(notifications)
            ? notifications
            : [];
    }

    function addNotification(notification) {
        const notifications =
            getNotifications();

        notifications.unshift({
            id:
                notification.id ||
                `notification-${Date.now()}`,
            title:
                notification.title ||
                "VYBE Update",
            message:
                notification.message ||
                "",
            type:
                notification.type ||
                "info",
            read: false,
            createdAt:
                notification.createdAt ||
                new Date().toISOString()
        });

        return write(
            STORAGE_KEYS.NOTIFICATIONS,
            notifications
        );
    }

    function markNotificationRead(id) {
        const notifications =
            getNotifications();

        const updated =
            notifications.map(notification => ({
                ...notification,
                read:
                    notification.id === id
                        ? true
                        : notification.read
            }));

        return write(
            STORAGE_KEYS.NOTIFICATIONS,
            updated
        );
    }

    function markAllNotificationsRead() {
        const updated =
            getNotifications().map(
                notification => ({
                    ...notification,
                    read: true
                })
            );

        return write(
            STORAGE_KEYS.NOTIFICATIONS,
            updated
        );
    }

    function getUnreadNotificationCount() {
        return getNotifications()
            .filter(
                notification =>
                    !notification.read
            ).length;
    }

    function getOrganizerEvents() {
        const events = read(
            STORAGE_KEYS.ORGANIZER_EVENTS,
            []
        );

        return Array.isArray(events)
            ? events
            : [];
    }

    function setOrganizerEvents(events) {
        return write(
            STORAGE_KEYS.ORGANIZER_EVENTS,
            Array.isArray(events)
                ? events
                : []
        );
    }

    function getAuthorityReviews() {
        const reviews = read(
            STORAGE_KEYS.AUTHORITY_REVIEWS,
            []
        );

        return Array.isArray(reviews)
            ? reviews
            : [];
    }

    function setAuthorityReviews(reviews) {
        return write(
            STORAGE_KEYS.AUTHORITY_REVIEWS,
            Array.isArray(reviews)
                ? reviews
                : []
        );
    }

    function clearSession() {
        remove(STORAGE_KEYS.USER);
        remove(STORAGE_KEYS.ROLE);
        remove(STORAGE_KEYS.SELECTED_EVENT);
    }

    window.VYBE_STORAGE = {
        keys: STORAGE_KEYS,

        read,
        write,
        remove,

        getUser,
        setUser,
        updateUser,

        getRole,
        setRole,

        getRegistrations,
        setRegistrations,
        isRegistered,
        addRegistration,
        removeRegistration,

        getFeedback,
        addFeedback,

        getSelectedEvent,
        setSelectedEvent,
        clearSelectedEvent,

        getNotifications,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        getUnreadNotificationCount,

        getOrganizerEvents,
        setOrganizerEvents,

        getAuthorityReviews,
        setAuthorityReviews,

        clearSession
    };

    console.log("VYBE Storage System initialized.");
})();