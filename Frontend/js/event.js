/* =========================================================
   VYBE — EVENT MANAGEMENT
   Phase 3
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const storage = window.VYBEStorage;

    if (!storage) {
        console.error("VYBEStorage is missing.");
        return;
    }


    /* =====================================================
       CREATE EVENT PAGE
       ===================================================== */

    const createForm =
        document.getElementById("createEventForm");

    if (createForm) {

        setupCreateEventForm(createForm);
    }


    /* =====================================================
       EVENT MANAGEMENT PAGE
       ===================================================== */

    const manageContainer =
        document.getElementById("manageEventContainer");

    if (manageContainer) {

        setupManageEventPage();
    }


    /* =====================================================
       CREATE EVENT
       ===================================================== */

    function setupCreateEventForm(form) {

        const dateInput =
            document.getElementById("eventDate");

        const today =
            new Date();

        const localDate =
            today.toISOString().split("T")[0];

        if (dateInput) {
            dateInput.min = localDate;
        }


        /* ---------------------------------------------
           FREE / PAID
           --------------------------------------------- */

        const registrationInputs =
            document.querySelectorAll(
                'input[name="registrationMode"]'
            );

        const priceField =
            document.getElementById("priceField");

        registrationInputs.forEach(function (input) {

            input.addEventListener(
                "change",
                function () {

                    if (
                        input.value === "Paid" &&
                        input.checked
                    ) {

                        priceField.style.display =
                            "grid";

                    } else if (
                        input.value === "Free" &&
                        input.checked
                    ) {

                        priceField.style.display =
                            "none";
                    }
                }
            );
        });


        /* ---------------------------------------------
           SUBMIT
           --------------------------------------------- */

        form.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                clearErrors(form);


                const data =
                    collectFormData(form);


                const valid =
                    validateEvent(data);


                if (!valid) {
                    return;
                }


                const organizer =
                    storage.getOrganizer();


                const organizerId =
                    storage.getOrganizerId();


                const newEvent = {

                    id:
                        storage.generateId("EVT"),

                    organizerId:
                        organizerId,

                    organizerName:
                        organizer.name ||
                        "VYBE Host",

                    institution:
                        organizer.institution ||
                        organizer.college ||
                        "MIT",

                    title:
                        data.title,

                    description:
                        data.description,

                    category:
                        data.category,

                    date:
                        data.date,

                    time:
                        data.time,

                    venue:
                        data.venue,

                    capacity:
                        Number(data.capacity),

                    attendees:
                        0,

                    price:
                        data.registrationMode === "Paid"
                            ? Number(data.price || 0)
                            : 0,

                    registrationMode:
                        data.registrationMode,

                    image:
                        data.image,

                    requirements:
                        data.requirements,

                    contact:
                        data.contact,

                    instagram:
                        data.instagram,

                    tags:
                        [data.category],

                    status:
                        "pending",

                    approvalStatus:
                        "pending",

                    submittedAt:
                        new Date().toISOString(),

                    createdAt:
                        new Date().toISOString(),

                    updatedAt:
                        new Date().toISOString()
                };


                storage.saveOrganizerEvent(
                    newEvent
                );


                storage.addNotification({
                    type: "event_submission",
                    title: "Event submitted",
                    message:
                        `${newEvent.title} is waiting for approval.`,
                    eventId:
                        newEvent.id
                });


                showSuccess();


                setTimeout(function () {

                    window.location.href =
                        "event.html?id=" +
                        encodeURIComponent(
                            newEvent.id
                        );

                }, 1200);
            }
        );
    }


    /* =====================================================
       COLLECT FORM
       ===================================================== */

    function collectFormData(form) {

        const formData =
            new FormData(form);


        return {

            title:
                String(
                    formData.get("title") || ""
                ).trim(),

            description:
                String(
                    formData.get("description") || ""
                ).trim(),

            category:
                String(
                    formData.get("category") || ""
                ).trim(),

            date:
                String(
                    formData.get("date") || ""
                ).trim(),

            time:
                String(
                    formData.get("time") || ""
                ).trim(),

            venue:
                String(
                    formData.get("venue") || ""
                ).trim(),

            capacity:
                String(
                    formData.get("capacity") || ""
                ).trim(),

            registrationMode:
                String(
                    formData.get("registrationMode") ||
                    "Free"
                ).trim(),

            price:
                String(
                    formData.get("price") || "0"
                ).trim(),

            image:
                String(
                    formData.get("image") || ""
                ).trim(),

            requirements:
                String(
                    formData.get("requirements") || ""
                ).trim(),

            contact:
                String(
                    formData.get("contact") || ""
                ).trim(),

            instagram:
                String(
                    formData.get("instagram") || ""
                ).trim()
        };
    }


    /* =====================================================
       VALIDATION
       ===================================================== */

    function validateEvent(data) {

        let valid = true;


        if (!data.title) {
            showFieldError(
                "eventTitle"
            );
            valid = false;
        }


        if (!data.description) {
            showFieldError(
                "eventDescription"
            );
            valid = false;
        }


        if (!data.category) {
            showFieldError(
                "eventCategory"
            );
            valid = false;
        }


        if (!data.venue) {
            showFieldError(
                "eventVenue"
            );
            valid = false;
        }


        if (!data.date) {
            showFieldError(
                "eventDate"
            );
            valid = false;
        }


        if (!data.time) {
            showFieldError(
                "eventTime"
            );
            valid = false;
        }


        if (
            !data.capacity ||
            Number(data.capacity) < 1
        ) {

            showFieldError(
                "eventCapacity"
            );

            valid = false;
        }


        if (
            data.registrationMode === "Paid" &&
            Number(data.price) < 0
        ) {

            valid = false;
        }


        if (!valid) {

            const firstInvalid =
                document.querySelector(
                    ".form-field.invalid input, .form-field.invalid textarea, .form-field.invalid select"
                );

            if (firstInvalid) {
                firstInvalid.focus();
            }
        }


        return valid;
    }


    function showFieldError(id) {

        const input =
            document.getElementById(id);

        if (!input) {
            return;
        }

        const field =
            input.closest(".form-field");

        if (field) {
            field.classList.add("invalid");
        }
    }


    function clearErrors(form) {

        form.querySelectorAll(
            ".form-field.invalid"
        ).forEach(function (field) {

            field.classList.remove(
                "invalid"
            );
        });
    }


    function showSuccess() {

        const banner =
            document.getElementById(
                "successBanner"
            );

        if (banner) {
            banner.classList.add("show");
        }
    }


    /* =====================================================
       MANAGE EVENT PAGE
       ===================================================== */

    function setupManageEventPage() {

        const params =
            new URLSearchParams(
                window.location.search
            );

        const eventId =
            params.get("id");


        if (!eventId) {

            renderEventList();

            return;
        }


        const event =
            storage.getEventById(
                eventId
            );


        if (!event) {

            renderNotFound();

            return;
        }


        renderEventDetail(event);
    }


    /* =====================================================
       EVENT LIST
       ===================================================== */

    function renderEventList() {

        const container =
            document.getElementById(
                "manageEventContainer"
            );

        if (!container) {
            return;
        }


        const events =
            storage.getOrganizerEvents();


        container.innerHTML = `

            <div class="manage-header">

                <div>
                    <span class="eyebrow">
                        VYBE HOST / EVENTS
                    </span>

                    <h1>
                        Your events.
                    </h1>
                </div>

                <a
                    href="create-event.html"
                    class="primary-button"
                >
                    Create event ＋
                </a>

            </div>


            <div class="manage-toolbar">

                <input
                    id="eventSearch"
                    class="manage-search"
                    type="search"
                    placeholder="Search your events..."
                >

                <span>
                    ${events.length} event${events.length === 1 ? "" : "s"}
                </span>

            </div>


            <div
                id="manageEventGrid"
                class="organizer-events-grid"
            ></div>

        `;


        const grid =
            document.getElementById(
                "manageEventGrid"
            );


        function renderGrid(searchTerm) {

            const filtered =
                events.filter(function (event) {

                    const text =
                        `${event.title} ${event.category} ${event.venue}`
                            .toLowerCase();

                    return text.includes(
                        searchTerm.toLowerCase()
                    );
                });


            grid.innerHTML = "";


            if (!filtered.length) {

                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">⌕</div>
                        <h3>No events found.</h3>
                        <p>Try a different search.</p>
                    </div>
                `;

                return;
            }


            filtered.forEach(function (event) {

                grid.appendChild(
                    createManageCard(event)
                );

            });
        }


        renderGrid("");


        const search =
            document.getElementById(
                "eventSearch"
            );


        if (search) {

            search.addEventListener(
                "input",
                function () {

                    renderGrid(
                        search.value
                    );
                }
            );
        }
    }


    function createManageCard(event) {

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
                <span class="status-badge">
                    ${escapeHTML(
                        event.status || "pending"
                    )}
                </span>
            </div>

            <div class="event-card-content">

                <span class="event-category">
                    ${escapeHTML(
                        event.category || "EVENT"
                    )}
                </span>

                <h3>
                    ${escapeHTML(
                        event.title || "Untitled"
                    )}
                </h3>

                <div class="event-meta">

                    <span>
                        ${storage.formatDate(
                            event.date
                        )}
                    </span>

                    <span>
                        ${storage.formatTime(
                            event.time
                        )}
                    </span>

                </div>

                <div class="event-card-footer">

                    <span class="event-capacity">
                        ${event.attendees || 0}
                        /
                        ${event.capacity || 0}
                    </span>

                    <a
                        class="manage-link"
                        href="event.html?id=${encodeURIComponent(event.id)}"
                    >
                        Open →
                    </a>

                </div>

            </div>

        `;


        return card;
    }


    /* =====================================================
       EVENT DETAIL
       ===================================================== */

    function renderEventDetail(event) {

        const container =
            document.getElementById(
                "manageEventContainer"
            );

        if (!container) {
            return;
        }


        const image =
            event.image ||
            "";


        const background =
            image
                ? `style="background-image:url('${image}')"`
                : "";


        container.innerHTML = `

            <a
                href="event.html"
                class="page-back"
            >
                ← All events
            </a>


            <div class="organizer-event-detail">

                <div
                    class="event-detail-hero"
                    ${background}
                >

                    <div class="event-detail-overlay">

                        <div>

                            <span class="status-badge">
                                ${escapeHTML(
                                    event.status || "pending"
                                )}
                            </span>

                            <h1>
                                ${escapeHTML(
                                    event.title
                                )}
                            </h1>

                            <p>
                                ${storage.formatDate(event.date)}
                                ·
                                ${storage.formatTime(event.time)}
                            </p>

                        </div>

                    </div>

                </div>


                <div class="detail-panel-grid">

                    <section class="detail-panel">

                        <h2>
                            Event information
                        </h2>

                        <p>
                            ${escapeHTML(
                                event.description || ""
                            )}
                        </p>

                        ${
                            event.requirements
                                ? `
                                <h3>Requirements</h3>
                                <p>
                                    ${escapeHTML(
                                        event.requirements
                                    )}
                                </p>
                                `
                                : ""
                        }

                    </section>


                    <section class="detail-panel">

                        <h2>
                            Event status
                        </h2>

                        <div class="detail-info-list">

                            <div class="detail-info-item">
                                <span>Status</span>
                                <strong>
                                    ${escapeHTML(
                                        event.status || "Pending"
                                    )}
                                </strong>
                            </div>

                            <div class="detail-info-item">
                                <span>Category</span>
                                <strong>
                                    ${escapeHTML(
                                        event.category
                                    )}
                                </strong>
                            </div>

                            <div class="detail-info-item">
                                <span>Venue</span>
                                <strong>
                                    ${escapeHTML(
                                        event.venue
                                    )}
                                </strong>
                            </div>

                            <div class="detail-info-item">
                                <span>Capacity</span>
                                <strong>
                                    ${event.capacity}
                                </strong>
                            </div>

                            <div class="detail-info-item">
                                <span>Registered</span>
                                <strong>
                                    ${event.attendees || 0}
                                </strong>
                            </div>

                        </div>

                    </section>

                </div>


                <div
                    class="detail-panel"
                    style="margin-top:15px;"
                >

                    <h2>
                        Host actions
                    </h2>

                    <div class="form-actions">

                        <a
                            href="create-event.html"
                            class="secondary-button"
                        >
                            Create another
                        </a>

                        <button
                            class="danger-button"
                            id="deleteEventButton"
                            type="button"
                        >
                            Delete event
                        </button>

                    </div>

                </div>

            </div>
        `;


        const deleteButton =
            document.getElementById(
                "deleteEventButton"
            );


        if (deleteButton) {

            deleteButton.addEventListener(
                "click",
                function () {

                    const confirmed =
                        confirm(
                            "Delete this event from your VYBE Host dashboard?"
                        );

                    if (!confirmed) {
                        return;
                    }


                    storage.deleteOrganizerEvent(
                        event.id
                    );


                    window.location.href =
                        "event.html";
                }
            );
        }
    }


    function renderNotFound() {

        const container =
            document.getElementById(
                "manageEventContainer"
            );

        if (!container) {
            return;
        }

        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ?
                </div>

                <h3>
                    Event not found.
                </h3>

                <p>
                    This event may have been removed.
                </p>

                <a
                    href="event.html"
                    class="primary-button"
                >
                    Back to events
                </a>

            </div>

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

});