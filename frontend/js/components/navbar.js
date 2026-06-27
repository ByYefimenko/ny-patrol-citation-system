// Navbar shown on every page. The link set is picked based on the role
// found in sessionStorage. The `data-active` attribute on the host marks
// the current page.

import { getUser, isAuthenticated } from "../auth/session.js";
import { signOut } from "../auth/guards.js";


const PUBLIC_LINKS = [
  { id: "home", label: "Home", href: "index.html" },
  { id: "register", label: "Register", href: "register.html" },
  { id: "login-driver", label: "Driver sign in", href: "login-driver.html" },
  { id: "login-admin", label: "Officer sign in", href: "login-admin.html" }
];

const DRIVER_LINKS = [
  { id: "home", label: "Home", href: "index.html" },
  { id: "dashboard", label: "Dashboard", href: "dashboard.html" }
];

const ADMIN_LINKS = [
  { id: "home", label: "Home", href: "index.html" },
  { id: "admin", label: "Dashboard", href: "admin.html" },
  { id: "admin-citations", label: "Citations", href: "admin-citations.html" }
];


export function mountNavbar(host = document.querySelector("[data-component='navbar']")) {
  if (!host) return;

  host.classList.add("navbar");
  host.innerHTML = "";

  const inner = document.createElement("div");
  inner.className = "navbar__inner container";
  host.appendChild(inner);

  inner.appendChild(buildBrand());

  const toggle = document.createElement("button");
  toggle.className = "navbar__toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Toggle navigation menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = '<span class="navbar__toggle-bar" aria-hidden="true"></span>';
  inner.appendChild(toggle);

  const list = document.createElement("ul");
  list.className = "navbar__links";
  inner.appendChild(list);

  const role = isAuthenticated() ? getUser()?.role : null;
  const links =
    role === "admin"
      ? ADMIN_LINKS
      : role === "driver"
      ? DRIVER_LINKS
      : PUBLIC_LINKS;

  const active = host.dataset.active;
  for (const link of links) {
    list.appendChild(buildLink(link, active));
  }

  if (isAuthenticated()) {
    list.appendChild(buildSignOutItem());
  }

  toggle.addEventListener("click", () => {
    const isOpen = host.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    if (!host.contains(event.target)) {
      host.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}


function buildBrand() {
  const brand = document.createElement("a");
  brand.href = "index.html";
  brand.className = "navbar__brand";
  brand.innerHTML = `
    <span class="navbar__brand-mark" aria-hidden="true">NSP</span>
    <span class="navbar__brand-text">
      NY State Patrol
      <small>Citation management</small>
    </span>
  `;
  return brand;
}


function buildLink(link, activeId) {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = link.href;
  a.textContent = link.label;
  a.className = "navbar__link";
  if (link.id === activeId) a.classList.add("is-active");
  li.appendChild(a);
  return li;
}


function buildSignOutItem() {
  const li = document.createElement("li");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "navbar__link";
  btn.style.background = "transparent";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.textContent = "Sign out";
  btn.addEventListener("click", () => signOut());
  li.appendChild(btn);
  return li;
}
