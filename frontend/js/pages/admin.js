// Admin dashboard. The charts are plain CSS bars built from divs — no
// chart library, to keep the build dependency-free per the brief.

import { ApiError } from "../api/client.js";
import { fetchStatsSummary } from "../api/stats.js";
import { requireRole, signOut } from "../auth/guards.js";
import { mountNavbar } from "../components/navbar.js";
import { error } from "../components/toast.js";
import { el, replaceChildren } from "../utils/dom.js";
import { formatDateTime, statusLabel } from "../utils/format.js";


requireRole("admin", "login-admin.html");
mountNavbar();

document.getElementById("logout-btn")?.addEventListener("click", () => signOut());

const elements = {
  citations: document.getElementById("stat-total-citations"),
  warnings: document.getElementById("stat-total-warnings"),
  drivers: document.getElementById("stat-total-drivers"),
  vehicles: document.getElementById("stat-total-vehicles"),
  byViolation: document.getElementById("chart-by-violation"),
  byDistrict: document.getElementById("chart-by-district"),
  recent: document.getElementById("recent-activity")
};

loadStats();


async function loadStats() {
  try {
    const data = await fetchStatsSummary();
    elements.citations.textContent = String(data.total_citations);
    elements.warnings.textContent = String(data.total_warnings);
    elements.drivers.textContent = String(data.total_drivers);
    elements.vehicles.textContent = String(data.total_vehicles);

    renderChart(elements.byViolation, data.by_violation_type);
    renderChart(elements.byDistrict, data.by_district);
    renderRecent(elements.recent, data.recent_activity);
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : "Could not load dashboard data.";
    error(msg, "Dashboard unavailable");
    fillEmpty();
  }
}


function fillEmpty() {
  for (const node of Object.values(elements)) {
    if (!node) continue;
    if (node.tagName === "STRONG") {
      node.textContent = "—";
    } else {
      node.innerHTML = "";
      node.appendChild(
        el("div", { class: "empty-state" }, "Data is currently unavailable.")
      );
    }
  }
}


function renderChart(host, rows) {
  if (!host) return;
  host.innerHTML = "";

  if (!rows || rows.length === 0) {
    host.appendChild(el("div", { class: "empty-state" }, "No data yet."));
    return;
  }

  const max = Math.max(...rows.map((r) => r.count), 1);
  for (const row of rows) {
    const percent = Math.round((row.count / max) * 100);
    host.appendChild(
      el("div", { class: "chart__row" }, [
        el("div", { class: "chart__label" }, [
          row.label,
          el("div", { class: "chart__bar" }, [
            el("div", {
              class: "chart__bar-fill",
              style: `width: ${percent}%`
            })
          ])
        ]),
        el("div", { class: "chart__value" }, String(row.count))
      ])
    );
  }
}


function renderRecent(host, notices) {
  if (!host) return;
  if (!notices || notices.length === 0) {
    replaceChildren(host, el("div", { class: "empty-state" }, "No recent activity."));
    return;
  }

  replaceChildren(
    host,
    ...notices.map((notice) =>
      el("article", { class: "notice-card" }, [
        el("div", {}, [
          el("div", { class: "notice-card__title" }, [
            notice.ticket_no,
            el("small", {}, formatDateTime(notice.notice_timestamp))
          ]),
          el("div", { class: "notice-card__grid" }, [
            cell("Driver", notice.driver_name || "—"),
            cell(
              "Officer",
              `${notice.officer_name || "—"}${
                notice.officer_badge_no ? ` (${notice.officer_badge_no})` : ""
              }`
            ),
            cell("District", notice.district_name || "—"),
            cell(
              "Location",
              [notice.location_road, notice.location_city].filter(Boolean).join(" · ") || "—"
            )
          ])
        ]),
        el("div", { class: "notice-card__side" }, [
          el(
            "span",
            { class: `pill ${notice.is_warning ? "pill--warning" : "pill--citation"}` },
            statusLabel(notice.is_warning)
          )
        ])
      ])
    )
  );
}


function cell(label, value) {
  return el("div", {}, [el("strong", {}, label), document.createTextNode(value || "—")]);
}
