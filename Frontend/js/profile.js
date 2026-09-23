document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const user =
        JSON.parse(
            localStorage.getItem("vybeUser") || "null"
        );

    if (!user?.onboardingCompleted) {
        window.location.href = "member-login.html";
        return;
    }


    const registrations =
        JSON.parse(
            localStorage.getItem(
                "vybeRegistrations"
            ) || "[]"
        );


    const completedEvents =
        registrations
            .map(
                registration =>
                    getEventById(
                        registration.eventId
                    )
            )
            .filter(
                event =>
                    event &&
                    eventDate(event) < new Date()
            );


    const xp =
        Number(
            user.xp ||
            registrations.length * 40 +
            completedEvents.length * 60
        );


    const level =
        Math.max(
            1,
            Math.floor(xp / 250) + 1
        );


    const currentLevelXP =
        xp % 250;

    const progress =
        Math.min(
            (currentLevelXP / 250) * 100,
            100
        );


    const levelNames = [
        "Campus Newbie",
        "Curious Explorer",
        "Campus Explorer",
        "VYBE Regular",
        "Connector",
        "Community Builder",
        "Campus Insider",
        "VYBE Icon"
    ];


    const levelTitle =
        levelNames[
            Math.min(
                level - 1,
                levelNames.length - 1
            )
        ];


    /* HERO */

    const avatar =
        document.getElementById(
            "avatar"
        );

    avatar.textContent =
        (user.name || "V")
            .trim()
            .charAt(0)
            .toUpperCase();


    document.getElementById(
        "profileName"
    ).textContent =
        user.name ||
        "VYBE Explorer";


    document.getElementById(
        "profileMeta"
    ).textContent =
        `${prettyField(
            user.field || "Student"
        )} · ${
            user.year ||
            "Campus member"
        } · ${
            normalizeInstitution(
                user.institution ||
                "Your institution"
            )
        }`;


    document.getElementById(
        "profileLevel"
    ).textContent =
        String(level).padStart(2, "0");


    document.getElementById(
        "profileXP"
    ).textContent =
        xp;


    document.getElementById(
        "levelTitle"
    ).textContent =
        levelTitle;


    document.getElementById(
        "nextLevel"
    ).textContent =
        `${currentLevelXP} / 250 XP`;


    setTimeout(() => {

        document.getElementById(
            "levelProgress"
        ).style.width =
            `${Math.max(progress, 8)}%`;

    }, 100);


    /* TAGS */

    const interests =
        Array.isArray(user.interests)
            ? user.interests
            : [];


    document.getElementById(
        "profileInterestsPreview"
    ).innerHTML =
        interests
            .slice(0, 4)
            .map(
                interest =>
                    `<span>${escapeHTML(
                        interest
                    )}</span>`
            )
            .join("");


    /* STATS */

    document.getElementById(
        "profileStats"
    ).innerHTML = `

        <article class="profile-stat">

            <strong>
                ${registrations.length}
            </strong>

            <span>
                events explored
            </span>

        </article>


        <article class="profile-stat">

            <strong>
                ${calculateConnections()}
            </strong>

            <span>
                connections
            </span>

        </article>


        <article class="profile-stat">

            <strong>
                ${xp}
            </strong>

            <span>
                XP earned
            </span>

        </article>


        <article class="profile-stat">

            <strong>
                ${calculateStreak()}
            </strong>

            <span>
                week streak
            </span>

        </article>

    `;


    /* BADGES */

    const badges =
        buildBadges();


    document.getElementById(
        "badgeCount"
    ).textContent =
        `${badges.length} earned`;


    document.getElementById(
        "badgeGrid"
    ).innerHTML =
        badges
            .map(
                badge => `

                    <article class="badge-card">

                        <div class="badge-icon">
                            ${badge.icon}
                        </div>

                        <strong>
                            ${badge.name}
                        </strong>

                        <small>
                            ${badge.description}
                        </small>

                    </article>

                `
            )
            .join("");


    /* INTEREST CLOUD */

    document.getElementById(
        "interestList"
    ).innerHTML =
        interests.length
            ? interests
                .map(
                    interest =>
                        `<span>${escapeHTML(
                            interest
                        )}</span>`
                )
                .join("")
            : `<span>Your VYBE is still loading...</span>`;


    /* JOURNEY */

    document.getElementById(
        "journey"
    ).innerHTML = `

        <article>

            <span class="journey-number">
                01
            </span>

            <div>

                <strong>
                    Joined VYBE
                </strong>

                <p>
                    ${formatUserDate(
                        user.createdAt
                    )}
                </p>

            </div>

            <span class="journey-xp">
                +20 XP
            </span>

        </article>


        <article>

            <span class="journey-number">
                02
            </span>

            <div>

                <strong>
                    Found your VYBE
                </strong>

                <p>
                    ${
                        interests
                            .slice(0, 4)
                            .join(" · ") ||
                        "Your interests are coming together."
                    }
                </p>

            </div>

            <span class="journey-xp">
                +40 XP
            </span>

        </article>


        <article>

            <span class="journey-number">
                03
            </span>

            <div>

                <strong>
                    Started showing up
                </strong>

                <p>
                    ${
                        registrations.length
                            ? `${registrations.length} event${
                                registrations.length === 1
                                    ? ""
                                    : "s"
                              } on your VYBE`
                            : "Your first event is waiting."
                    }
                </p>

            </div>

            <span class="journey-xp">
                +${registrations.length * 40} XP
            </span>

        </article>

    `;


    /* HIGHLIGHTS */

    const highlights =
        registrations
            .map(
                registration =>
                    getEventById(
                        registration.eventId
                    )
            )
            .filter(Boolean)
            .slice(0, 3);


    const highlightContainer =
        document.getElementById(
            "profileHighlights"
        );


    if (!highlights.length) {

        highlightContainer.innerHTML = `

            <article
                class="highlight-card"
            >

                <img
                    src="${imageFor("Culture")}"
                    alt="Campus"
                >

                <div class="highlight-content">

                    <span>
                        YOUR FIRST CHAPTER
                    </span>

                    <h3>
                        Your highlights
                        will live here.
                    </h3>

                </div>

            </article>


            <article
                class="highlight-card"
            >

                <img
                    src="${imageFor("Social")}"
                    alt="Students"
                >

                <div class="highlight-content">

                    <span>
                        SHOW UP
                    </span>

                    <h3>
                        Attend something
                        worth remembering.
                    </h3>

                </div>

            </article>

        `;

    } else {

        highlightContainer.innerHTML =
            highlights
                .map(
                    event => `

                        <article
                            class="highlight-card"
                            data-event-id="${event.id}"
                            tabindex="0"
                        >

                            <img
                                src="${imageFor(
                                    event.category
                                )}"
                                alt="${escapeHTML(
                                    event.title
                                )}"
                            >

                            <div class="highlight-content">

                                <span>
                                    ${escapeHTML(
                                        event.category
                                    )}
                                </span>

                                <h3>
                                    ${escapeHTML(
                                        event.title
                                    )}
                                </h3>

                            </div>

                        </article>

                    `
                )
                .join("");


        highlightContainer
            .querySelectorAll(
                "[data-event-id]"
            )
            .forEach(card => {

                const open = () => {

                    window.location.href =
                        `event-details.html?id=${encodeURIComponent(
                            card.dataset.eventId
                        )}`;
                };

                card.addEventListener(
                    "click",
                    open
                );

                card.addEventListener(
                    "keydown",
                    event => {

                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {
                            event.preventDefault();
                            open();
                        }

                    }
                );

            });
    }


    /* SHARE */

    document
        .getElementById(
            "shareProfile"
        )
        .addEventListener(
            "click",
            async () => {

                const shareText =
                    `${user.name || "VYBE Explorer"} — ${levelTitle} · ${xp} XP on VYBE`;

                if (
                    navigator.share
                ) {

                    try {

                        await navigator.share({
                            title: "My VYBE Profile",
                            text: shareText,
                            url: window.location.href
                        });

                    } catch {
                        // user cancelled share
                    }

                    return;
                }


                try {

                    await navigator.clipboard.writeText(
                        `${shareText}\n${window.location.href}`
                    );

                    alert(
                        "Your VYBE profile link was copied."
                    );

                } catch {

                    alert(
                        "Copy this page URL to share your VYBE profile."
                    );

                }

            }
        );


    function buildBadges() {

        const badges = [];


        if (registrations.length >= 1) {

            badges.push({
                icon: "✦",
                name: "FIRST VYBE",
                description:
                    "You stopped scrolling and actually showed up."
            });

        }


        if (interests.length >= 3) {

            badges.push({
                icon: "◈",
                name: "CURIOUS MIND",
                description:
                    "You picked 3+ interests to explore."
            });

        }


        if (completedEvents.length >= 1) {

            badges.push({
                icon: "✓",
                name: "SHOWED UP",
                description:
                    "You turned a registration into an experience."
            });

        }


        if (
            interests.some(
                interest =>
                    /tech|ai|design|coding/i
                        .test(interest)
            )
        ) {

            badges.push({
                icon: "⌁",
                name: "TECH EXPLORER",
                description:
                    "Your VYBE has serious builder energy."
            });

        }


        if (
            Array.isArray(user.goals) &&
            user.goals.some(
                goal =>
                    /network/i.test(goal)
            )
        ) {

            badges.push({
                icon: "∞",
                name: "NETWORKER",
                description:
                    "You're here for people as much as experiences."
            });

        }


        if (registrations.length >= 3) {

            badges.push({
                icon: "⚡",
                name: "EARLY BIRD",
                description:
                    "Three events and counting."
            });

        }


        return badges.slice(0, 6);
    }


    function calculateConnections() {

        return Math.min(
            Math.max(
                registrations.length * 2,
                0
            ),
            99
        );
    }


    function calculateStreak() {

        const weeks = new Set();

        registrations.forEach(
            registration => {

                const date =
                    new Date(
                        registration.registeredAt ||
                        Date.now()
                    );

                if (
                    Number.isNaN(
                        date.getTime()
                    )
                ) {
                    return;
                }

                const firstDay =
                    new Date(date);

                firstDay.setDate(
                    date.getDate() -
                    date.getDay()
                );

                weeks.add(
                    firstDay
                        .toISOString()
                        .slice(0, 10)
                );

            }
        );

        return weeks.size;
    }


    function formatUserDate(date) {

        const parsed =
            new Date(
                date || Date.now()
            );

        return parsed.toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
    }


    function prettyField(value) {

        return String(value)
            .replaceAll(
                "computer science and design",
                "Computer Science & Design"
            )
            .replaceAll(
                "computer science",
                "Computer Science"
            );
    }


    function normalizeInstitution(value) {

        const clean =
            String(value)
                .trim();

        const known = {
            "mit": "MIT",
            "MIT": "MIT",
            "princeton": "Princeton",
            "MGM": "MGM University"
        };

        return (
            known[clean] ||
            clean
                .replace(/\b\w/g, char =>
                    char.toUpperCase()
                )
        );
    }


    function imageFor(category) {

        const images = {

            Tech:
                "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=85",

            Design:
                "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1000&q=85",

            Music:
                "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=85",

            Sports:
                "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=85",

            Business:
                "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=85",

            Culture:
                "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85",

            Social:
                "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1000&q=85",

            Wellness:
                "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1000&q=85"

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

});