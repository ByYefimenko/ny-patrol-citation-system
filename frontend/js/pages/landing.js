// Landing page: mount the navbar and ping the API so the hero badge
// can show whether the backend is reachable.

import { mountNavbar } from "../components/navbar.js";
import { config } from "../../config.js";


async function probeApi() {
  const status = document.getElementById("api-status");
  if (!status) return;

  try {
    const res = await fetch(new URL("/openapi.json", config.apiBaseUrl), {
      method: "GET",
      cache: "no-store"
    });
    if (res.ok) {
      status.textContent = "Online";
      status.classList.remove("is-down");
    } else {
      throw new Error(String(res.status));
    }
  } catch {
    status.textContent = "Offline";
    status.classList.add("is-down");
  }
}


mountNavbar();
probeApi();
