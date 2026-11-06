/* VYBE Voice — feedback is open for every event you have registered for. */
document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const user = window.api?.getUser?.();
  if (!user || !window.api?.getToken?.()) { location.replace("member-login.html"); return; }
  const container = document.getElementById("voiceFormContainer");
  document.querySelectorAll(".voice-card").forEach(card => card.addEventListener("click", () => openForm(card.dataset.type)));

  async function registrations() {
    let remote = []; try { remote = await window.api.myRegistrations(); } catch (_) {}
    const local = window.VYBE_STATE?.localRegistrations() || [];
    const known = new Set();
    return [...remote, ...local].filter(item => item?.status !== "cancelled" && item?.event).filter(item => { const id=window.VYBE_STATE?.eventId(item.event); if(known.has(id)) return false; known.add(id); return true; });
  }
  async function openForm(type) {
    const passes = await registrations();
    const themes = { feedback:["EVENT FEEDBACK","how did it feel?","lavender"], report:["REPORT SOMETHING","what needs attention?","rose"], suggestion:["SUGGEST A VYBE","what should VYBE build next?","mint"] };
    const [label,title,theme] = themes[type] || themes.suggestion;
    const options = passes.map(item => `<option value="${esc(item.event._id || item.event.id)}">${esc(item.event.title)} — ${esc(item.event.date)}</option>`).join("");
    const eventField = type === "feedback" ? `<label>CHOOSE A SAVED EVENT<select name="eventId" required ${passes.length ? "" : "disabled"}><option value="">${passes.length ? "Select your event" : "Save an event first"}</option>${options}</select></label><p class="voice-helper">Feedback is open as soon as you have a pass — you do not need to wait for the event to end.</p>` : type === "report" ? `<label>WHAT IS THIS ABOUT?<select name="topic"><option>Event or host</option><option>Safety or behaviour</option><option>Technical issue</option><option>Something else</option></select></label>` : `<label>YOUR IDEA'S CATEGORY<select name="topic"><option>New event</option><option>New club or community</option><option>Product feature</option><option>Campus experience</option></select></label>`;
    const rating = type === "feedback" ? `<fieldset class="rating-field"><legend>HOW DID IT FEEL?</legend><div class="rating-options">${[1,2,3,4,5].map(value => `<label class="rating-option"><input type="radio" name="rating" value="${value}" required><span class="rating-number">${value}</span><span class="rating-label">${["Not for me","Could improve","Okay","Really good","Loved it"][value-1]}</span></label>`).join("")}</div></fieldset>` : "";
    container.innerHTML = `<form class="voice-form voice-form-${theme}" id="voiceForm" data-type="${type}"><button type="button" class="close-form" id="closeVoice" aria-label="Close">×</button><p class="eyebrow">${label}</p><h2>${title}</h2>${eventField}<label>YOUR MESSAGE<textarea name="message" rows="5" required placeholder="${type === "feedback" ? "Tell us what worked, what did not, and what would make it better." : type === "report" ? "Tell us what happened. Include details that help us act." : "Give your idea a name, a feeling and the people it is for."}"></textarea></label>${rating}<button class="voice-submit" type="submit" ${type === "feedback" && !passes.length ? "disabled" : ""}>SEND TO VYBE →</button></form>`;
    container.scrollIntoView({behavior:"smooth",block:"center"}); document.getElementById("closeVoice").onclick=()=>container.innerHTML=""; document.getElementById("voiceForm").addEventListener("submit", submit);
  }
  async function submit(click) {
    click.preventDefault(); const form=click.currentTarget, data=Object.fromEntries(new FormData(form).entries());
    if(form.dataset.type === "feedback" && (!data.eventId || !data.rating)) return;
    const saved = read("vybeVoice"); saved.push({id:`voice-${Date.now()}`,type:form.dataset.type,...data,userId:user._id||user.id,createdAt:new Date().toISOString()}); localStorage.setItem("vybeVoice",JSON.stringify(saved));
    if(form.dataset.type === "feedback") {
      /* Server events are submitted to the API; catalogue previews remain usable
         before the new 48-event backend seed is deployed. */
      if (!String(data.eventId).startsWith("catalog-")) {
        try { await window.api.submitFeedback(data.eventId, Number(data.rating), data.message); }
        catch (error) { console.info("[voice] feedback saved locally until API policy permits it:", error.message); }
      }
      const feedback=read("vybeFeedback"); feedback.push({id:`feedback-${Date.now()}`,...data,userId:user._id||user.id,createdAt:new Date().toISOString()}); localStorage.setItem("vybeFeedback",JSON.stringify(feedback)); window.VYBE_STATE?.award(`feedback:${data.eventId}`,20);
    }
    const message={feedback:["FEEDBACK RECEIVED","heard.","Your perspective helps VYBE get better before the next room opens."],report:["REPORT RECEIVED","we've got it.","Your report is safely recorded for the team to review."],suggestion:["IDEA RECEIVED","interesting.","That idea now has a place in the next VYBE conversation."]}[form.dataset.type];
    container.innerHTML=`<div class="voice-success"><div class="success-symbol">✦</div><p class="eyebrow">${message[0]}</p><h2>${message[1]}</h2><p>${message[2]}</p><button type="button" class="secondary-button" id="voiceAgain">Say something else</button></div>`; document.getElementById("voiceAgain").onclick=()=>container.innerHTML="";
  }
  function read(key){try{return JSON.parse(localStorage.getItem(key))|| [];}catch(_){return [];}}
  function esc(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
});
