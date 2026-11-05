/* VYBE Tracker — one pass wallet, one registration calendar, one XP source. */
document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  if (!window.api?.getUser?.() || !window.api.getToken()) { window.location.href = "member-login.html"; return; }
  let user = window.api.getUser();
  let remote = [];
  try { remote = await window.api.myRegistrations(); user = await window.api.me().catch(() => user); } catch (error) { console.warn("[tracker] registrations", error); }
  const local = window.VYBE_STATE?.localRegistrations() || [];
  const seen = new Set();
  const active = [...remote, ...local].filter(item => item?.status !== "cancelled" && item?.event).filter(item => { const id = window.VYBE_STATE?.eventId(item.event); if (seen.has(id)) return false; seen.add(id); return true; });
  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = active.filter(item => isUpcoming(item.event.date)).sort((a,b) => String(a.event.date).localeCompare(String(b.event.date)));
  const past = active.filter(item => !isUpcoming(item.event.date)).sort((a,b) => String(b.event.date).localeCompare(String(a.event.date)));
  const xp = window.VYBE_STATE?.getXP(user, active) ?? Number(user.xp || active.length * 40);

  text("heroXP", xp); text("monthXP", `+${xp}`); text("upcomingCount", `${upcoming.length} ${upcoming.length === 1 ? "event" : "events"}`); text("streakNumber", new Set(active.map(item => String(item.createdAt || item.event.date).slice(0,7))).size);
  const progress = document.getElementById("xpProgress"); if (progress) progress.style.width = `${Math.max(8, (xp % 1000) / 10)}%`;
  const stats = document.getElementById("trackerStats"); if (stats) stats.innerHTML = [[active.length,"events registered"],[upcoming.length,"up next"],[user.interests?.length || 0,"interests"],[xp,"total XP"]].map(([value,label]) => `<article class="tracker-stat"><strong>${value}</strong><span>${label}</span></article>`).join("");

  renderUpcoming(); renderPasses(); renderActivity(); renderCalendar();

  function renderUpcoming() {
    const root = document.getElementById("upcomingEvents"); if (!root) return;
    root.innerHTML = upcoming.length ? upcoming.map(item => eventCard(item)).join("") : `<div class="empty-state"><h3>your calendar is suspiciously empty.</h3><p>Go find something worth leaving your room for.</p><a class="primary-button" href="discover.html">Discover events →</a></div>`;
  }
  function eventCard(item) { const event=item.event, id=event._id||event.id; return `<article class="tracker-card" data-id="${esc(id)}"><div class="tracker-card-image"><img src="${esc(window.VYBE_EVENT_VISUALS?.src(event) || "")}" alt="${esc(event.title)}"></div><div class="tracker-card-info"><span class="tracker-status">${item.status === "pending" ? "REQUEST PENDING" : "PASS SAVED"}</span><h3>${esc(event.title)}</h3><p>${date(event.date)} · ${esc(event.time)} · ${esc(event.venue)}</p></div><a href="event-details.html?id=${encodeURIComponent(id)}">VIEW →</a></article>`; }
  function renderPasses() {
    const root = document.getElementById("passWallet"); if (!root) return;
    root.innerHTML = active.length ? active.map(item => { const event=item.event,id=event._id||event.id; return `<button class="tracker-pass" type="button" data-pass-id="${esc(id)}"><span class="tracker-pass-top"><b>VYBE ✦</b><b>ENTRY PASS</b></span><strong class="tracker-pass-title">${esc(event.title)}</strong><span class="tracker-pass-venue">${esc(date(event.date))}<br>${esc(event.venue || "Venue TBA")}</span><span class="tracker-pass-date">${esc(event.time || "TIME TBA")}<b>${Number(event.price) ? `₹${Number(event.price)}` : "FREE"}</b></span><span class="tracker-pass-qr" aria-hidden="true"></span><i class="tracker-pass-hint">OPEN ↗</i></button>`; }).join("") : `<div class="empty-state"><h3>your pass wallet is ready.</h3><p>Save an event and its invitation will appear right here.</p><a class="primary-button" href="discover.html">Find a VYBE →</a></div>`;
    root.querySelectorAll("[data-pass-id]").forEach(button => button.addEventListener("click", () => location.href = `event-details.html?id=${encodeURIComponent(button.dataset.passId)}`));
  }
  function renderActivity() { const root=document.getElementById("activityList"); if(!root)return; root.innerHTML=past.length ? past.map(item=>`<article class="activity-item"><span class="activity-icon">✓</span><div><strong>Joined ${esc(item.event.title)}</strong><p>${date(item.event.date)}</p></div><small>+60 XP</small></article>`).join("") : `<article class="activity-item"><span class="activity-icon">✦</span><div><strong>Your VYBE story starts here.</strong><p>Each pass you save, each feedback you share, grows your XP.</p></div><small>+40 XP</small></article>`; }
  function renderCalendar() {
    const grid=document.getElementById("registeredCalGrid"), label=document.getElementById("registeredCalMonth"), list=document.getElementById("registeredCalEvents"), count=document.getElementById("registeredCalendarCount"); if(!grid||!label||!list)return;
    if(count) count.textContent=`${active.length} saved plan${active.length === 1 ? "" : "s"}`;
    let cursor = upcoming[0]?.event?.date ? new Date(`${String(upcoming[0].event.date).slice(0,10)}T12:00:00`) : new Date(); cursor.setDate(1);
    const draw=()=>{ const year=cursor.getFullYear(),month=cursor.getMonth(),first=new Date(year,month,1).getDay(), days=new Date(year,month+1,0).getDate(); label.textContent=cursor.toLocaleDateString("en-IN",{month:"long",year:"numeric"}); let html=["SUN","MON","TUE","WED","THU","FRI","SAT"].map(name=>`<span class="registered-cal-weekday">${name}</span>`).join(""); for(let index=0;index<first;index++)html+="<span></span>"; for(let day=1;day<=days;day++){const key=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`,matches=active.filter(item=>String(item.event.date).slice(0,10)===key);html+=`<button class="registered-cal-day ${matches.length?"has-pass":""}" ${matches.length?`data-date="${key}"`:""} type="button"><b>${day}</b></button>`;} grid.innerHTML=html; grid.querySelectorAll("[data-date]").forEach(button=>button.addEventListener("click",()=>{grid.querySelectorAll(".is-selected").forEach(el=>el.classList.remove("is-selected"));button.classList.add("is-selected");const matches=active.filter(item=>String(item.event.date).slice(0,10)===button.dataset.date);list.innerHTML=matches.map(item=>`<button type="button" class="registered-cal-event" data-id="${esc(item.event._id||item.event.id)}"><span>${esc(item.event.time||"Time TBA")}</span><strong>${esc(item.event.title)}</strong><small>${esc(item.event.venue||"Venue TBA")}</small></button>`).join(""); list.querySelectorAll("[data-id]").forEach(card=>card.addEventListener("click",()=>location.href=`event-details.html?id=${encodeURIComponent(card.dataset.id)}`));})); };
    document.getElementById("registeredCalPrev")?.addEventListener("click",()=>{cursor.setMonth(cursor.getMonth()-1);draw();}); document.getElementById("registeredCalNext")?.addEventListener("click",()=>{cursor.setMonth(cursor.getMonth()+1);draw();}); draw(); list.innerHTML=active.length?`<p class="registered-cal-empty">Select a lavender date to see your saved plan.</p>`:`<p class="registered-cal-empty">Only your registered events will appear here.</p>`;
  }
  function isUpcoming(value){const d=new Date(`${String(value).slice(0,10)}T00:00:00`);return !Number.isNaN(d.getTime())&&d>=today;}
  function text(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
  function date(value){const d=new Date(`${String(value).slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?String(value||""):d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});}
  function esc(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
});
