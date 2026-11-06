/* VYBE HOST SHARED SHELL — additive; does not touch member pages. */
document.addEventListener("DOMContentLoaded", () => {
  const user = window.api?.getUser?.();
  if (!user) return;
  const name = String(user.name || user.organizationName || "VYBE Host");
  const sidebar = document.querySelector(".organizer-sidebar");
  if (!sidebar) return;

  let bottom = sidebar.querySelector(".sidebar-bottom");
  if (!bottom) {
    bottom = document.createElement("div");
    bottom.className = "sidebar-bottom";
    sidebar.appendChild(bottom);
  }
  if (!bottom.querySelector(".host-mini-card")) {
    bottom.insertAdjacentHTML("afterbegin", `
      <div class="host-mini-card">
        <div class="host-avatar" id="sharedHostAvatar"></div>
        <div><strong id="sharedHostName"></strong><span>Organizer</span></div>
      </div>`);
  }
  const avatar = bottom.querySelector("#sidebarAvatar, #sharedHostAvatar");
  const label = bottom.querySelector("#sidebarName, #sharedHostName");
  if (avatar) avatar.textContent = name.trim().charAt(0).toUpperCase() || "H";
  if (label) label.textContent = name;

  if (!bottom.querySelector("#logoutButton")) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = "logoutButton";
    button.className = "logout-button";
    button.textContent = "Log out ↗";
    bottom.appendChild(button);
  }
  bottom.querySelector("#logoutButton")?.addEventListener("click", () => {
    if (confirm("Log out of your VYBE Host account?")) {
      window.api.logout();
      location.href = "role-select.html";
    }
  });

  const path = location.pathname.split("/").pop();
  sidebar.querySelectorAll(".nav-item").forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === path);
  });
});
