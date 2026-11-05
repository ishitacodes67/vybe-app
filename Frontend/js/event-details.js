/* VYBE — event details experience (backend/API contract preserved) */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const container = document.querySelector("#eventDetails");
  if (!container || !window.api) return;
  const user = window.api.getUser();
  if (!user || !window.api.getToken()) { window.location.href = "member-login.html"; return; }
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return notFound();
  container.innerHTML = `<div class="event-loading"><span>✦</span><p>Setting the scene…</p></div>`;

  let event, registration;
  try {
    const [data, regs] = await Promise.all([
      window.api.getEvent(id),
      window.api.myRegistrations().catch(() => [])
    ]);
    event = data;
    registration = (regs || []).find(r => {
      const eventId = typeof r.event === "object" ? r.event?._id : r.event;
      return String(eventId) === String(id) && r.status !== "cancelled";
    }) || null;
  } catch (error) {
    console.error("[event-details]", error);
    return notFound("We couldn't load this event right now.");
  }
  if (!event) return notFound();
  render();

  function render() {
    const eventId = event._id || event.id;
    const capacity = Math.max(0, Number(event.capacity) || 0);
    const registered = Math.max(0, Number(event.registeredCount ?? event.registered) || 0);
    const seats = Math.max(0, capacity - registered);
    const past = isPast(event.date);
    const full = capacity > 0 && seats <= 0;
    const organizer = event.organizer && typeof event.organizer === "object" ? event.organizer : {};
    const hostName = organizer.organizerProfile?.orgName || organizer.name || (typeof event.organizer === "string" ? "Event host" : "VYBE host");
    const institution = event.institution && typeof event.institution === "object" ? (event.institution.name || "") : "";
    const tags = Array.isArray(event.tags) ? event.tags.slice(0, 8) : [];
    const media = (Array.isArray(event.media) ? event.media : []).filter(m => m?.url && m.type === "image");
    const cover = window.VYBE_EVENT_VISUALS?.src(event) || "";
    const date = formatDate(event.date);
    const status = registration?.status;
    const ticketAction = status === "confirmed"
      ? `<div class="event-state event-state-success"><b>✓ You're on the list</b><span>Your place is confirmed. Your pass is ready.</span><a href="tracker.html">VIEW MY PASSES ↗</a><a href="#" id="cancelRegBtn">CANCEL REGISTRATION</a></div>`
      : status === "pending"
      ? `<div class="event-state event-state-pending"><b>◷ Request sent</b><span>Your request is waiting for host approval.</span><a href="tracker.html">TRACK REQUEST ↗</a><a href="#" id="cancelRegBtn">WITHDRAW REQUEST</a></div>`
      : status === "rejected"
      ? `<div class="event-state event-state-pending"><b>Request not approved</b><span>You can explore other experiences on VYBE.</span></div>`
      : past
      ? `<button class="event-register-btn" disabled>THIS EVENT HAS PASSED</button>`
      : full
      ? `<button class="event-register-btn" disabled>THIS EVENT IS FULL</button>`
      : `<button class="event-register-btn" id="registerBtn"><span>${event.registrationMode === "approval" ? "REQUEST A PLACE" : "SAVE MY SPOT"}</span><b>↗</b></button>`;

    container.innerHTML = `
      <div class="event-detail-shell">
        <a class="event-back-link" href="discover.html">← BACK TO DISCOVER</a>
        <section class="event-cover-stage">
          <img class="event-cover-image" src="${esc(cover)}" alt="${esc(event.category || "Event")} event photography" fetchpriority="high">
          <div class="event-cover-shade"></div>
          <div class="event-cover-top"><span>${esc(event.category || "EXPERIENCE")}</span><span>${esc((event.mode || "offline").toUpperCase())}</span><span>${Number(event.price) > 0 ? "PAID EXPERIENCE" : "FREE ENTRY"}</span></div>
          <div class="event-cover-caption"><span>THE VYBE / ${esc(event.category || "EVENT").toUpperCase()}</span><i>✳</i></div>
        </section>

        <section class="event-title-block">
          <div class="event-title-copy">
            <p class="event-overline">AN EXPERIENCE TO PUT ON YOUR CALENDAR</p>
            <h1>${esc(event.title)}</h1>
            <p class="event-lead">${esc(event.description || "A new experience is taking shape. Check the event details and save your place.")}</p>
            ${tags.length ? `<div class="event-tags">${tags.map(t => `<span>#${esc(t)}</span>`).join("")}</div>` : ""}
          </div>
          <div class="event-title-stamp"><span>MAKE</span><strong>ROOM</strong><i>FOR MORE</i></div>
        </section>

        <div class="event-detail-columns">
          <div class="event-main-column">
            <section class="event-facts">
              <article><span>WHEN</span><strong>${esc(date)}</strong><small>${esc(event.time || "Time to be announced")}</small></article>
              <article><span>WHERE</span><strong>${esc(event.venue || "Venue to be announced")}</strong><small>${esc(institution || "Venue details from host")}</small></article>
              <article><span>ENTRY</span><strong>${Number(event.price) > 0 ? `₹${Number(event.price).toLocaleString("en-IN")}` : "FREE"}</strong><small>${esc(event.registrationMode === "approval" ? "Request & host approval" : "First come, first served")}</small></article>
              <article><span>THE ROOM</span><strong>${capacity ? `${seats} / ${capacity}` : "See event updates"}</strong><small>${registered} registered</small></article>
            </section>

            <section class="event-about-block">
              <p class="event-overline">01 / THE STORY</p>
              <h2>What you're<br><em>showing up for.</em></h2>
              <p>${esc(event.description || "More information will be shared by the event host.")}</p>
              <p class="event-about-note">Come as you are. Bring your curiosity. The best part of campus happens when you step into something new.</p>
            </section>

            ${media.length ? `<section class="event-gallery-block"><div class="event-section-head"><div><p class="event-overline">02 / A CLOSER LOOK</p><h2>Inside the <em>experience.</em></h2></div><span>${media.length} PHOTO${media.length === 1 ? "" : "S"}</span></div><div class="event-gallery">${media.slice(0,5).map((m,i)=>`<figure class="event-gallery-item event-gallery-${i+1}"><img src="${esc(m.url)}" alt="${esc(event.title)} event photograph" loading="lazy"></figure>`).join("")}</div></section>` : ""}

            <section class="event-host-block">
              <div class="event-host-mark">${esc(hostName.slice(0,1).toUpperCase())}</div>
              <div><p class="event-overline">BROUGHT TO YOU BY</p><h3>${esc(hostName)}</h3><p>${institution ? esc(institution) + " · " : ""}The host team behind this experience.</p></div>
              <span class="event-host-verified">✓ HOST</span>
            </section>
          </div>

          <aside class="event-ticket-column">
            <div class="event-ticket-card">
              <div class="ticket-topline"><span>YOUR INVITATION</span><span>VYBE ✳</span></div>
              <p class="ticket-eyebrow">DON'T JUST HEAR ABOUT IT.</p>
              <h2>Be <em>there.</em></h2>
              <div class="ticket-price">${Number(event.price) > 0 ? `₹${Number(event.price).toLocaleString("en-IN")}` : "FREE"}<small> / PERSON</small></div>
              <div class="ticket-seat-row"><span>${full ? "NO SPOTS LEFT" : seats <= 8 ? "ALMOST AT CAPACITY" : "SPOTS AVAILABLE"}</span><b>${capacity ? `${seats} LEFT` : "OPEN"}</b></div>
              <div class="ticket-progress"><i style="width:${capacity ? Math.min(100, registered / capacity * 100) : 0}%"></i></div>
              ${ticketAction}
              <p class="ticket-footnote">${event.registrationMode === "approval" ? "Your request will be reviewed by the event host." : "Your registration is subject to the event's available capacity."}</p>
            </div>
            <div class="event-host-note"><span>✳</span><div><b>First time?</b><p>You're welcome here. Check the event details, arrive at the listed venue and say hello to the host team.</p></div></div>
          </aside>
        </div>
      </div>
      <div class="vybe-ticket-overlay" id="vybeTicketOverlay" hidden>
        <div class="vybe-ticket-confetti" aria-hidden="true"></div>
        <section class="vybe-ticket-modal" role="dialog" aria-modal="true" aria-labelledby="ticketTitle">
          <button class="vybe-ticket-close" type="button" aria-label="Close">×</button>
          <div class="vybe-ticket-spark">✦</div><p class="event-overline">A LITTLE YES CHANGES THE DAY</p>
          <h2 id="ticketTitle">${status === "pending" ? "Request sent." : "You're in."}</h2>
          <p class="vybe-ticket-copy">${status === "pending" ? "Your request is with the host. We'll keep your VYBE tracker updated." : "Your place is saved. This is your reminder to show up and make a memory."}</p>
          <div class="vybe-pass-card">
            <div class="vybe-pass-head"><b>VYBE ✳</b><span>${status === "pending" ? "REQUEST PASS" : "ENTRY PASS"}</span></div>
            <strong>${esc(event.title)}</strong><div>${esc(date)} · ${esc(event.time || "Time TBA")}</div><div>${esc(event.venue || "Venue TBA")}</div>
            <div class="vybe-pass-perforation"><span></span><i></i><span></span></div>
            <small>${status === "pending" ? "AWAITING HOST APPROVAL" : "KEEP THIS PASS CLOSE"}</small>
          </div>
          <a href="tracker.html" class="vybe-pass-link">GO TO MY PASSES ↗</a>
        </section>
      </div>
    `;

    document.getElementById("registerBtn")?.addEventListener("click", register);
    document.getElementById("cancelRegBtn")?.addEventListener("click", cancelRegistration);
    document.querySelector(".vybe-ticket-close")?.addEventListener("click", closeTicket);
    document.getElementById("vybeTicketOverlay")?.addEventListener("click", e => { if(e.target.id === "vybeTicketOverlay") closeTicket(); });
  }

  async function register() {
    const btn = document.getElementById("registerBtn");
    if (!btn) return;
    btn.disabled = true;
    btn.classList.add("is-loading");
    btn.querySelector("span").textContent = "SAVING YOUR PLACE…";
    try {
      registration = await window.api.registerForEvent(event._id || event.id);
      render();
      const overlay = document.getElementById("vybeTicketOverlay");
      if (overlay) {
        overlay.hidden = false;
        document.body.classList.add("ticket-open");
        if (registration?.status !== "pending") launchConfetti();
      }
    } catch (error) {
      btn.disabled = false; btn.classList.remove("is-loading");
      btn.querySelector("span").textContent = event.registrationMode === "approval" ? "REQUEST A PLACE" : "SAVE MY SPOT";
      showToast(error.message || "Couldn't complete registration. Please try again.");
    }
  }

  async function cancelRegistration(e) {
    e.preventDefault();
    if (!confirm("Cancel your registration for this event?")) return;
    try { await window.api.cancelRegistration(event._id || event.id); registration = null; render(); }
    catch (error) { showToast(error.message || "Could not cancel your registration."); }
  }

  function closeTicket() {
    const overlay = document.getElementById("vybeTicketOverlay");
    if (overlay) overlay.hidden = true;
    document.body.classList.remove("ticket-open");
  }
  function launchConfetti() {
    const root = document.querySelector(".vybe-ticket-confetti");
    if (!root) return;
    const colors = ["#7054ff","#dfff27","#ff8bb8","#ff745d","#b7e7d1"];
    root.innerHTML = Array.from({length:42},(_,i)=>`<i style="--x:${(i*37)%100}%;--delay:${(i%9)*.045}s;--turn:${(i*47)%360}deg;--color:${colors[i%colors.length]}"></i>`).join("");
  }
  function showToast(message) {
    let toast = document.getElementById("eventToast");
    if (!toast) { toast = document.createElement("div"); toast.id = "eventToast"; toast.className = "event-toast"; document.body.appendChild(toast); }
    toast.textContent = message; toast.classList.add("show");
    setTimeout(()=>toast.classList.remove("show"),3600);
  }
  function notFound(message="This event may have moved or is no longer available.") {
    container.innerHTML = `<section class="event-not-found"><span>✳</span><p class="event-overline">EVENT NOT FOUND</p><h1>That VYBE<br><em>moved.</em></h1><p>${esc(message)}</p><a href="discover.html">BACK TO DISCOVER ↗</a></section>`;
  }
  function esc(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
  function isPast(value){if(!value)return false;const today=new Date();today.setHours(0,0,0,0);const d=new Date(`${String(value).slice(0,10)}T00:00:00`);return !Number.isNaN(d.getTime())&&d<today;}
  function formatDate(value){if(!value)return "Date to be announced";const d=new Date(`${String(value).slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?esc(value):d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
});
