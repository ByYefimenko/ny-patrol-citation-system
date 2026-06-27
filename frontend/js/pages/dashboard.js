// Driver dashboard: profile + my notices.
// Notices are loaded once, then filtered client-side so the search input
// feels instant on small datasets.

import { fetchProfile, updateProfile } from "../api/auth.js";
import { ApiError } from "../api/client.js";
import { fetchMyNotices } from "../api/notices.js";
import { setUser } from "../auth/session.js";
import { requireRole, signOut } from "../auth/guards.js";
import { mountNavbar } from "../components/navbar.js";
import { error, success } from "../components/toast.js";
import { el, readForm, replaceChildren, setButtonLoading } from "../utils/dom.js";
import { formatDateTime, statusLabel } from "../utils/format.js";
import {
  bindLiveValidation,
  compose,
  isEmail,
  isPhone,
  maxLength,
  required
} from "../utils/validators.js";


requireRole("driver");
mountNavbar();

const greeting = document.getElementById("dashboard-greeting");
const subtitle = document.getElementById("dashboard-subtitle");
const profileForm = document.getElementById("profile-form");
const profileSubmit = document.getElementById("profile-submit");
const noticesContainer = document.getElementById("notices-container");
const filter = document.getElementById("notice-filter");
const statusSelect = document.getElementById("notice-status");

document.getElementById("refresh-btn")?.addEventListener("click", () => loadNotices());
document.getElementById("logout-btn")?.addEventListener("click", () => signOut());

filter.addEventListener("input", renderNotices);
statusSelect.addEventListener("change", renderNotices);

const validateProfile = bindLiveValidation(profileForm, {
  email: compose(required, isEmail, maxLength(120)),
  phone: compose(required, isPhone, maxLength(30)),
  address_line: maxLength(100)
});

profileForm.addEventListener("submit", onProfileSubmit);

let allNotices = [];

loadProfile().then(loadNotices);


async function loadProfile() {
  try {
    const profile = await fetchProfile();
    setUser(profile);
    populateProfile(profile);
  } catch (e) {
    error(
      e instanceof ApiError ? e.message : "Could not load your profile.",
      "Profile error"
    );
  }
}


function populateProfile(profile) {
  greeting.textContent = `Welcome back, ${profile.full_name || profile.username}.`;
  subtitle.textContent = profile.licence_no
    ? `Driver licence ${profile.licence_no}`
    : "Your driver record is being processed.";

  profileForm.elements.full_name.value = profile.full_name || "";
  profileForm.elements.licence_no.value = profile.licence_no || "";
  profileForm.elements.email.value = profile.email || "";
  profileForm.elements.phone.value = profile.phone || "";
  profileForm.elements.address_line.value = profile.person?.address_line || "";
}


async function loadNotices() {
  noticesContainer.innerHTML = "";
  noticesContainer.appendChild(
    el("div", { class: "empty-state", dataset: { state: "loading" } }, "Loading notices…")
  );

  try {
    const notices = await fetchMyNotices();
    allNotices = Array.isArray(notices) ? notices : [];
    updateSummary();
    renderNotices();
  } catch (e) {
    allNotices = [];
    updateSummary();
    noticesContainer.innerHTML = "";
    noticesContainer.appendChild(
      el(
        "div",
        { class: "empty-state" },
        e instanceof ApiError
          ? `Could not load your notices: ${e.message}`
          : "Could not load your notices. Please try again."
      )
    );
  }
}


function updateSummary() {
  const citations = allNotices.filter((n) => !n.is_warning).length;
  const warnings = allNotices.filter((n) => n.is_warning).length;
  document.getElementById("stat-citations").textContent = String(citations);
  document.getElementById("stat-warnings").textContent = String(warnings);

  const recent = allNotices[0];
  document.getElementById("stat-recent").textContent = recent
    ? formatDateTime(recent.notice_timestamp)
    : "No activity";
}


function renderNotices() {
  const term = filter.value.trim().toLowerCase();
  const filterStatus = statusSelect.value;

  const visible = allNotices.filter((notice) => {
    if (filterStatus === "citation" && notice.is_warning) return false;
    if (filterStatus === "warning" && !notice.is_warning) return false;
    if (!term) return true;
    const haystack = [
      notice.ticket_no,
      notice.location_road,
      notice.location_description,
      notice.officer_name,
      ...notice.violations.map((v) => v.violation_code),
      ...notice.violations.map((v) => v.narrative || "")
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });

  if (!visible.length) {
    replaceChildren(
      noticesContainer,
      el(
        "div",
        { class: "empty-state" },
        allNotices.length
          ? "No notices match the current filters."
          : "Great news — you have no citations on record."
      )
    );
    return;
  }

  replaceChildren(noticesContainer, ...visible.map(buildNoticeCard));
}


function buildNoticeCard(notice) {
  const violations = notice.violations.map((v) =>
    el("span", { class: "pill" }, v.violation_code)
  );

  return el("article", { class: "notice-card" }, [
    el("div", {}, [
      el("div", { class: "notice-card__title" }, [
        notice.ticket_no,
        el("small", {}, formatDateTime(notice.notice_timestamp))
      ]),
      el("div", { class: "notice-card__grid" }, [
        cell("Officer", `${notice.officer_name || "—"} ${notice.officer_badge_no ? `(${notice.officer_badge_no})` : ""}`),
        cell("District", notice.district_name || "—"),
        cell("Detachment", notice.detachment_name || "—"),
        cell(
          "Vehicle",
          `${notice.vehicle_make || ""} ${notice.vehicle_model || ""} ${
            notice.vehicle_plate_no ? `· ${notice.vehicle_plate_no}` : ""
          }`.trim() || "—"
        ),
        cell(
          "Location",
          [notice.location_description, notice.location_road, notice.location_city]
            .filter(Boolean)
            .join(" · ") || "—"
        ),
        cell("Notes", notice.notes || "—")
      ]),
      violations.length
        ? el("div", { class: "notice-card__violations" }, violations)
        : null
    ]),
    el("div", { class: "notice-card__side" }, [
      el(
        "span",
        {
          class: `pill ${notice.is_warning ? "pill--warning" : "pill--citation"}`
        },
        statusLabel(notice.is_warning)
      )
    ])
  ]);
}


function cell(label, value) {
  return el("div", {}, [el("strong", {}, label), document.createTextNode(value || "—")]);
}


async function onProfileSubmit(event) {
  event.preventDefault();
  if (!validateProfile()) {
    error("Please correct the highlighted fields.", "Cannot save profile");
    return;
  }
  const values = readForm(profileForm);

  const payload = {
    email: values.email.trim(),
    phone: values.phone.trim(),
    address_line: values.address_line.trim()
  };

  setButtonLoading(profileSubmit, true, "Save changes");
  try {
    const profile = await updateProfile(payload);
    setUser(profile);
    populateProfile(profile);
    success("Your profile has been updated.", "Profile saved");
  } catch (e) {
    error(
      e instanceof ApiError ? e.message : "Could not save your profile.",
      "Update failed"
    );
  } finally {
    setButtonLoading(profileSubmit, false, "Save changes");
  }
}
