/* Shared authority identity and safe sign-out affordance. */
document.addEventListener("DOMContentLoaded", () => {
 const user = window.api?.getUser?.();
 if (!user || user.role !== "authority") return;
 const name = String(user.name || user.institutionName || "Authority");
 document.querySelectorAll(".authority-nav-actions").forEach(actions => {
   if (!actions.querySelector(".authority-account")) {
     const account=document.createElement("span");
     account.className="authority-account";
     account.textContent=name;
     account.style.cssText="font-size:.78rem;font-weight:700;color:#171717;padding:0 8px";
     actions.prepend(account);
   }
   if (!actions.querySelector("#logoutButton")) {
     const out=document.createElement("button");
     out.id="logoutButton";out.type="button";out.className="authority-avatar";
     out.textContent="↗";out.title="Log out";
     actions.appendChild(out);
   }
 });
 const out=document.getElementById("logoutButton");
 if(out) out.addEventListener("click",()=>{window.api.logout();location.href="role-select.html";});
});
