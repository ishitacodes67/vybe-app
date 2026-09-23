// VYBE frontend API client.
// Replaces direct localStorage reads/writes with calls to the live backend.
// Usage from any page: const events = await window.api.getEvents();

(function () {
  // Point this at your Render backend. Switch to http://localhost:5000/api for local dev.
  const API_BASE_URL = "https://vybe-backend-0qa7.onrender.com/api";

  const TOKEN_KEY = "vybe_token";
  const USER_KEY = "vybe_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function setUser(user) {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function request(path, { method = "GET", body, auth = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = { message: text }; }
    }

    if (!res.ok) {
      const message = (data && (data.message || data.error)) || `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  const api = {
    // ------- auth -------
    async login(email, password) {
      const data = await request("/auth/login", { method: "POST", body: { email, password }, auth: false });
      setToken(data.token);
      setUser(data.user);
      return data;
    },
    async register(payload) {
      const data = await request("/auth/register", { method: "POST", body: payload, auth: false });
      setToken(data.token);
      setUser(data.user);
      return data;
    },
    async me() {
      const data = await request("/auth/me");
      setUser(data.user);
      return data.user;
    },
    logout,
    getToken,
    getUser,

    // ------- events -------
    async getEvents(params = {}) {
      const qs = new URLSearchParams(params).toString();
      const data = await request(`/events${qs ? `?${qs}` : ""}`, { auth: false });
      return data.events;
    },
    async getRecommended() {
      const data = await request("/events/recommended");
      return data.events;
    },
    async getEvent(id) {
      const data = await request(`/events/${id}`, { auth: false });
      return data.event;
    },
    async createEvent(payload) {
      const data = await request("/events", { method: "POST", body: payload });
      return data.event;
    },
    async updateEvent(id, payload) {
      const data = await request(`/events/${id}`, { method: "PATCH", body: payload });
      return data.event;
    },
    async deleteEvent(id) {
      return request(`/events/${id}`, { method: "DELETE" });
    },

    // ------- registrations -------
    async registerForEvent(eventId) {
      const data = await request(`/registrations/${eventId}`, { method: "POST" });
      return data.registration;
    },
    async cancelRegistration(eventId) {
      return request(`/registrations/${eventId}`, { method: "DELETE" });
    },
    async myRegistrations(params = {}) {
      const qs = new URLSearchParams(params).toString();
      const data = await request(`/registrations/me${qs ? `?${qs}` : ""}`);
      return data.registrations;
    },
    async getEventRegistrations(eventId, params = {}) {
      const qs = new URLSearchParams(params).toString();
      const data = await request(`/registrations/event/${eventId}${qs ? `?${qs}` : ""}`);
      return data.registrations;
    },
    async decideRegistration(regId, status) {
      const data = await request(`/registrations/${regId}/status`, { method: "PATCH", body: { status } });
      return data.registration;
    },

    // ------- organizer -------
    async organizerStats() { return request("/organizer/stats"); },
    async myEvents(params = {}) {
      const qs = new URLSearchParams(params).toString();
      const data = await request(`/organizer/events${qs ? `?${qs}` : ""}`);
      return data.events;
    },
    async organizerUpcoming(limit = 5) {
      const data = await request(`/organizer/upcoming?limit=${limit}`);
      return data.events;
    },
    async cancelOwnEvent(eventId, reason) {
      const data = await request(`/organizer/events/${eventId}/cancel`, { method: "PATCH", body: { reason } });
      return data.event;
    },

    // ------- authority -------
    async authorityStats() { return request("/authority/stats"); },
    async pendingEvents() {
      const data = await request("/authority/pending");
      return data.events;
    },
    async authorityEvents(params = {}) {
      const qs = new URLSearchParams(params).toString();
      const data = await request(`/authority/events${qs ? `?${qs}` : ""}`);
      return data.events;
    },
    async approveEvent(eventId, notes) {
      return request(`/authority/events/${eventId}/approve`, { method: "PATCH", body: { notes } });
    },
    async rejectEvent(eventId, reason, notes) {
      return request(`/authority/events/${eventId}/reject`, { method: "PATCH", body: { reason, notes } });
    },
    async authorityReviews(params = {}) {
      const qs = new URLSearchParams(params).toString();
      const data = await request(`/authority/reviews${qs ? `?${qs}` : ""}`);
      return data.reviews;
    },
    async authorityUsers(params = {}) {
      const qs = new URLSearchParams(params).toString();
      const data = await request(`/authority/users${qs ? `?${qs}` : ""}`);
      return data.users;
    },
    async changeUserRole(userId, role) {
      return request(`/authority/users/${userId}/role`, { method: "PATCH", body: { role } });
    },

    // ------- feedback -------
    async submitFeedback(eventId, rating, comment) {
      const data = await request(`/feedback/${eventId}`, { method: "POST", body: { rating, comment } });
      return data.feedback;
    },
    async eventFeedback(eventId) { return request(`/feedback/event/${eventId}`, { auth: false }); },
    async myFeedback() {
      const data = await request("/feedback/me");
      return data.feedback;
    },
    async organizerFeedbackSummary() { return request("/feedback/organizer/summary"); },

    // ------- notifications -------
    async notifications(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return request(`/notifications${qs ? `?${qs}` : ""}`);
    },
    async unreadCount() {
      const data = await request("/notifications/unread-count");
      return data.count;
    },
    async markNotificationRead(id) {
      return request(`/notifications/${id}/read`, { method: "PATCH" });
    },
    async markAllNotificationsRead() {
      return request("/notifications/read-all", { method: "PATCH" });
    },
    async deleteNotification(id) {
      return request(`/notifications/${id}`, { method: "DELETE" });
    },
    async clearReadNotifications() {
      return request("/notifications/read", { method: "DELETE" });
    },

    // ------- users -------
    async updateProfile(payload) {
      const data = await request("/users/me", { method: "PATCH", body: payload });
      setUser(data.user);
      return data.user;
    },
    async updateInterests(interests, goals) {
      const data = await request("/users/me/interests", { method: "PATCH", body: { interests, goals } });
      setUser(data.user);
      return data.user;
    },
    async completeOnboarding() {
      const data = await request("/users/me/onboarding", { method: "PATCH" });
      setUser(data.user);
      return data.user;
    },
    async changePassword(currentPassword, newPassword) {
      return request("/users/me/password", { method: "PATCH", body: { currentPassword, newPassword } });
    },
    async getUserById(id) {
      const data = await request(`/users/${id}`, { auth: false });
      return data.user;
    },

    // ------- vix chat -------
    async chat(message, history = []) {
      return request("/chat", { method: "POST", body: { message, history } });
    }
  };

  window.api = api;
})();