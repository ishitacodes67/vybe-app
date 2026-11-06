/* VYBE — immersive event details; keeps the existing API and registration contract. */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const container = document.querySelector("#eventDetails");
  if (!container || !window.api) return;

  const user = window.api.getUser();
  if (!user || !window.api.getToken()) {
    window.location.href = "member-login.html";
    return;
  }

  const eventId = new URLSearchParams(window.location.search).get("id");
  if (!eventId) return renderNotFound();

  const profiles = {
    Tech: {
      note: "A room for curious builders, brave experiments and the first version of a good idea.",
      moments: ["Arrive to warm introductions", "Make something with people", "Leave with a next step"],
      schedule: [["05:30", "Doors, demos & hello"], ["06:10", "Make / explore together"], ["07:40", "Show what moved you"]],
      colour: "tech"
    },
    Design: {
      note: "Materials, good questions and a little permission to make a mess before it gets good.",
      moments: ["Choose a tactile prompt", "Make your point of view", "Trade kind feedback"],
      schedule: [["04:30", "Materials bar opens"], ["05:00", "Make, test, play"], ["06:45", "Tiny show-and-tell"]],
      colour: "design"
    },
    Music: {
      note: "A shared room, a louder heart and the moment a stranger becomes part of the chorus.",
      moments: ["Find your corner of the crowd", "Feel it live", "Stay for one more song"],
      schedule: [["07:00", "Doors & playlist"], ["07:45", "The live moment"], ["09:00", "One more together"]],
      colour: "music"
    },
    Sports: {
      note: "No pressure to be the best — just a reason to move, play and feel part of the team.",
      moments: ["Warm up with people", "Play at your pace", "Celebrate the effort"],
      schedule: [["05:00", "Meet & warm up"], ["05:20", "Play / run / move"], ["06:30", "Cool down & hang"]],
      colour: "sports"
    },
    Business: {
      note: "Practical ideas, honest conversations and a table full of people who want to build something real.",
      moments: ["Find a useful conversation", "Hear the brave version", "Meet your next collaborator"],
      schedule: [["06:00", "Tables open"], ["06:30", "The main thing"], ["07:45", "Stay & meet"]],
      colour: "business"
    },
    Culture: {
      note: "An invitation to notice more: a story, a craft, a performance and the people who carry it forward.",
      moments: ["Settle into the story", "Make space for feeling", "Talk it out after"],
      schedule: [["05:30", "Settle in"], ["06:00", "The programme"], ["07:30", "Stay for the afterthought"]],
      colour: "culture"
    },
    Social: {
      note: "The kind of plan that starts with a name tag and ends with someone you actually want to see again.",
      moments: ["Walk in exactly as you are", "Find your people", "Leave with a story"],
      schedule: [["07:00", "Come as you are"], ["07:30", "Dinner, games or magic"], ["09:00", "One last conversation"]],
      colour: "social"
    },
    Wellness: {
      note: "A softer kind of ambitious: pause, reset and come back to yourself in good company.",
      moments: ["Arrive slowly", "Practice something gentle", "Carry it into your week"],
      schedule: [["09:30", "Arrive slowly"], ["10:00", "Practice together"], ["11:15", "Tea & a gentle landing"]],
      colour: "wellness"
    }
  };

  let event = null;
  let registration = null;

  container.innerHTML = `<div class="event-loading"><span>✦</span><p>Setting the scene…</p></div>`;

  try {
    const catalogueEvent = getEventById(eventId);
    const [eventData, registrations] = catalogueEvent ? [catalogueEvent, window.VYBE_STATE?.localRegistrations() || []] : await Promise.all([
      window.api.getEvent(eventId),
      window.api.myRegistrations().catch(() => [])
    ]);
    event = eventData;
    registration = (registrations || []).find(item => {
      const id = typeof item.event === "object" ? item.event?._id : item.event;
      return String(id) === String(eventId) && item.status !== "cancelled";
    }) || null;
  } catch (error) {
    console.error("[event-details]", error);
    return renderNotFound("We couldn't load this experience right now.");
  }

  if (!event) return renderNotFound();
  renderEvent();

  function renderEvent() {
    const category = profiles[event.category] ? event.category : "Social";
    const profile = profiles[category];
    const capacity = Number(event.capacity) || 0;
    const registered = Math.max(0, Number(event.registeredCount ?? event.registered) || 0);
    const seats = Math.max(0, capacity - registered);
    const full = capacity > 0 && seats === 0;
    const past = isPast(event.date);
    const organizer = typeof event.organizer === "object" ? event.organizer : {};
    const hostName = organizer.organizerProfile?.orgName || organizer.name || "VYBE host";
    const institution = typeof event.institution === "object" ? event.institution?.name : "";
    const cover = window.VYBE_EVENT_VISUALS?.src(event) || "assets/event-covers/social-1.webp";
    const focus = window.VYBE_EVENT_VISUALS?.focus(event) || "center";
    const tags = Array.isArray(event.tags) ? event.tags.slice(0, 4) : [];
    const attendance = capacity ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;
    const state = registration?.status;
    const eventDescription = event.description || "A new VYBE experience is taking shape. Come for the programme and leave with more people in your corner.";

    const action = state === "confirmed"
      ? `<button class="experience-registered" id="showPass" type="button">YOUR PASS IS SAVED <span>↗</span></button>`
      : state === "pending"
        ? `<div class="experience-state"><b>REQUEST SENT</b><span>The host is reviewing your place.</span><a href="#" id="cancelRegistration">WITHDRAW REQUEST</a></div>`
        : state === "rejected"
          ? `<div class="experience-state"><b>REQUEST NOT APPROVED</b><span>There are other good rooms waiting.</span></div>`
          : past
            ? `<button class="experience-register" disabled>THIS EXPERIENCE HAS ENDED</button>`
            : full
              ? `<button class="experience-register" disabled>THIS ONE IS FULL</button>`
              : `<button class="experience-register" id="registerBtn">${event.registrationMode === "approval" ? "REQUEST A PLACE" : "SAVE MY SPOT"}<span>✦</span></button>`;

    container.innerHTML = `
      <article class="experience-page experience-${profile.colour}">
        <a class="experience-back" href="discover.html">← BACK TO DISCOVER</a>

        <section class="experience-cover">
          <img src="${esc(cover)}" alt="${esc(category)} event atmosphere" style="--cover-focus:${focus}" fetchpriority="high">
          <div class="experience-cover-shade"></div>
          <div class="experience-cover-meta"><span>${esc(category).toUpperCase()}</span><span>${esc((event.mode || "offline").toUpperCase())}</span><span>${Number(event.price) > 0 ? "PAID PASS" : "FREE ENTRY"}</span></div>
          <div class="experience-cover-note">VYBE<br>EXPERIENCE<br><b>✦</b></div>
          <p class="experience-cover-caption">A GOOD STORY STARTS WITH SHOWING UP <i>↘</i></p>
        </section>

        <section class="experience-invitation">
          <div class="experience-title-copy">
            <p class="experience-kicker">AN INVITATION, NOT JUST A LISTING</p>
            <h1>${esc(event.title)}</h1>
            <p class="experience-lead">${esc(eventDescription)}</p>
            ${tags.length ? `<div class="experience-tags">${tags.map(tag => `<span>#${esc(tag)}</span>`).join("")}</div>` : ""}
          </div>
          <aside class="experience-ticket">
            <div class="ticket-topline"><span>YOUR INVITATION</span><b>VYBE ✦</b></div>
            <p class="ticket-host">HOSTED BY</p>
            <strong>${esc(hostName)} <i>✓</i></strong>
            <p class="ticket-host-note">${esc(institution || "Verified community host")} · someone is saving you a place in the room.</p>
            <div class="ticket-seat-status"><span>${full ? "FULL HOUSE" : seats <= 8 ? "THIS IS MOVING FAST" : "THE ROOM IS FILLING"}</span><b>${capacity ? `${seats} LEFT` : "OPEN"}</b></div>
            <div class="ticket-progress"><i style="width:${attendance}%"></i></div>
            <small>${registered} people already said yes</small>
            <div class="ticket-price"><span>YOUR PASS</span><b>${Number(event.price) > 0 ? `₹${Number(event.price).toLocaleString("en-IN")}` : "FREE"}</b></div>
            ${action}
          </aside>
        </section>

        <section class="experience-facts" aria-label="Event details">
          <article><span>WHEN</span><strong>${esc(formatDate(event.date))}</strong><small>${esc(event.time || "Time to be announced")}</small></article>
          <article><span>WHERE</span><strong>${esc(event.venue || "Venue to be announced")}</strong><small>${esc(institution || "Venue details from host")}</small></article>
          <article><span>THE ROOM</span><strong>${capacity ? `${seats} seats left` : "Open invite"}</strong><small>${capacity ? `${registered} people going` : "Come as you are"}</small></article>
          <article><span>ENTRY</span><strong>${Number(event.price) > 0 ? `₹${Number(event.price).toLocaleString("en-IN")}` : "Free"}</strong><small>${event.registrationMode === "approval" ? "Request + host approval" : "First come, first served"}</small></article>
        </section>

        <section class="experience-story">
          <div class="story-about"><p class="experience-kicker">THE FEELING OF IT</p><h2>Come for the plan.<br><em>Stay for the people.</em></h2><p>${esc(profile.note)}</p><p>There are no anonymous rows here. Expect a host welcome, a room with energy and enough time to let the unexpected good part happen.</p></div>
          <div class="story-schedule"><p class="experience-kicker">HOW IT UNFOLDS</p>${profile.schedule.map(([time, copy], index) => `<div><span>${time}</span><b>${copy}</b><i>${index === 0 ? "✦" : "→"}</i></div>`).join("")}</div>
        </section>

        <section class="experience-puzzle">
          <div><p class="experience-kicker">A LITTLE PIECE FOR YOU</p><h2>It might be<br><em>more than an event.</em></h2><p>The best plans leave you with something useful for the rest of your life outside this page.</p></div>
          <div class="puzzle-pieces">${profile.moments.map((moment, index) => `<article class="puzzle-piece puzzle-${index}"><span>0${index + 1}</span><b>${esc(moment)}</b><i>${["✦", "♥", "↗"][index]}</i></article>`).join("")}</div>
        </section>

        <section class="experience-moments">
          <div class="moment-photo"><img src="${esc(cover)}" alt="A preview of the event atmosphere" style="--cover-focus:${focus}"></div>
          <div class="moment-copy"><p class="experience-kicker">WHAT YOU CAN EXPECT</p><h2>More colour.<br>More people.<br><em>More you.</em></h2><div class="moment-list"><span>HOST WELCOME</span><span>REAL CONVERSATION</span><span>ONE GOOD MEMORY</span></div></div>
        </section>

        <section class="experience-first-time"><span>✦</span><div><b>First time at a VYBE event?</b><p>Perfect. Check the details, arrive when the doors open and say hello to the host team. You do not need to bring a plus one.</p></div></section>

        <div class="experience-pass-overlay" id="passOverlay" hidden>
          <section class="experience-pass-modal" role="dialog" aria-modal="true" aria-labelledby="passTitle">
            <button class="pass-close" type="button" aria-label="Close pass">×</button>
            <div class="pass-confetti" aria-hidden="true">✦ ♥ ✦ ● ✦ ♥ ✦</div>
            <p class="experience-kicker">A LITTLE YES CHANGES THE DAY</p>
            <h2 id="passTitle">You're <em>in.</em></h2>
            <p>Your place is saved. Tap the pass to flip it, then keep it close for check-in.</p>
            <button class="saved-pass" id="flipPass" type="button" aria-label="Flip your event pass"><span class="saved-pass-inner"><span class="saved-pass-front"><b>VYBE ✦</b><i>ENTRY PASS</i><strong>${esc(event.title)}</strong><small>${esc(formatDate(event.date))} · ${esc(event.time || "Time TBA")}</small><small>${esc(event.venue || "Venue TBA")}</small><em>TAP TO FLIP ↻</em></span><span class="saved-pass-back"><b>VYBE ✦</b><i>KEEP THIS CLOSE</i><strong>${esc(hostName)} ✓</strong><span class="fake-qr">▦ ▥ ▦<br>▥ ▦ ▥<br>▦ ▦ ▥</span><small>Show this screen at check-in. Bring your whole self.</small></span></span></button>
            <a href="tracker.html#passes" class="pass-tracker-link">GO TO MY PASSES ↗</a>
          </section>
        </div>
      </article>`;

    document.getElementById("registerBtn")?.addEventListener("click", register);
    document.getElementById("showPass")?.addEventListener("click", showPass);
    document.getElementById("cancelRegistration")?.addEventListener("click", cancelRegistration);
    document.querySelector(".pass-close")?.addEventListener("click", closePass);
    document.getElementById("passOverlay")?.addEventListener("click", click => { if (click.target.id === "passOverlay") closePass(); });
    document.getElementById("flipPass")?.addEventListener("click", () => document.getElementById("flipPass").classList.toggle("is-flipped"));
  }

  async function register() {
    const button = document.getElementById("registerBtn");
    if (!button) return;
    button.disabled = true;
    button.textContent = "SAVING YOUR PLACE…";
    try {
      registration = window.VYBE_STATE?.isCatalogue(event)
        ? window.VYBE_STATE.registerLocal(event)
        : await window.api.registerForEvent(event._id || event.id);
      if (registration?.status === "confirmed") event.registeredCount = (Number(event.registeredCount) || 0) + 1;
      renderEvent();
      if (registration?.status !== "pending") showPass();
    } catch (error) {
      button.disabled = false;
      button.textContent = event.registrationMode === "approval" ? "REQUEST A PLACE" : "SAVE MY SPOT";
      showToast(error.message || "Couldn't complete registration. Please try again.");
    }
  }

  async function cancelRegistration(click) {
    click.preventDefault();
    try {
      if (window.VYBE_STATE?.isCatalogue(event)) window.VYBE_STATE.cancelLocal(event);
      else await window.api.cancelRegistration(event._id || event.id);
      registration = null;
      event.registeredCount = Math.max(0, (Number(event.registeredCount) || 0) - 1);
      renderEvent();
    } catch (error) {
      showToast(error.message || "Could not cancel your registration.");
    }
  }

  function showPass() {
    const overlay = document.getElementById("passOverlay");
    if (!overlay) return;
    overlay.hidden = false;
    document.body.classList.add("pass-open");
  }

  function closePass() {
    const overlay = document.getElementById("passOverlay");
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("pass-open");
  }

  function renderNotFound(message = "This event may have moved or the link may be out of date.") {
    container.innerHTML = `<section class="event-not-found"><span>✦</span><p class="experience-kicker">EVENT NOT FOUND</p><h1>That VYBE<br><em>moved.</em></h1><p>${esc(message)}</p><a href="discover.html">BACK TO DISCOVER ↗</a></section>`;
  }

  function isPast(value) {
    if (!value) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(`${String(value).slice(0, 10)}T00:00:00`) < today;
  }

  function formatDate(value) {
    if (!value) return "Date to be announced";
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function esc(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "experience-toast";
    toast.textContent = message;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 3200);
  }
});
