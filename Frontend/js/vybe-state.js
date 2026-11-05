/* A small shared layer for the catalogue experience. Server registrations remain
   authoritative; catalogue registrations live here until the 48-event seed is
   deployed, so passes, feedback and XP stay connected in the meantime. */
(function () {
  "use strict";
  const PASSES_KEY = "vybe_catalogue_passes";
  const PROGRESS_KEY = "vybe_progress";
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (_) { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const eventId = event => String(event?._id || event?.id || "");
  const isCatalogue = event => eventId(event).startsWith("catalog-");
  const localPasses = () => read(PASSES_KEY, []);
  const progress = () => ({ xp: 0, awards: {}, ...read(PROGRESS_KEY, {}) });

  function emit() { window.dispatchEvent(new CustomEvent("vybe:events-updated")); }
  function localRegistrations() {
    return localPasses().map(id => getEventById(id)).filter(Boolean).map(event => ({
      _id: `pass-${event.id}`, event, status: "confirmed", createdAt: new Date().toISOString(), local: true
    }));
  }
  function registerLocal(event) {
    const id = eventId(event);
    const passes = localPasses();
    if (!passes.includes(id)) {
      passes.push(id); write(PASSES_KEY, passes); award(`registration:${id}`, 40); emit();
    }
    return localRegistrations().find(item => eventId(item.event) === id);
  }
  function cancelLocal(event) {
    const id = eventId(event); write(PASSES_KEY, localPasses().filter(item => item !== id)); emit();
  }
  function award(key, amount) {
    const data = progress();
    if (!data.awards[key]) { data.awards[key] = amount; data.xp += amount; write(PROGRESS_KEY, data); }
    return data.xp;
  }
  function getXP(user, registrations = []) {
    const serverXP = Number(user?.xp || 0);
    const saved = progress().xp;
    const registered = registrations.length * 40;
    return Math.max(serverXP, saved, registered);
  }
 function displayEvents(remote) {
    if (Array.isArray(remote) && remote.length > 0) {
        return remote;
    }

    return VYBE_EVENTS;
}
  window.VYBE_STATE = { eventId, isCatalogue, localRegistrations, registerLocal, cancelLocal, award, getXP, displayEvents, progress };
})();
