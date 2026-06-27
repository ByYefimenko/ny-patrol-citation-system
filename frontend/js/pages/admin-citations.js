// Admin: list/create/edit/delete citations. The modal form is built
// dynamically because the field list is long and changes when editing.

import { ApiError } from "../api/client.js";
import {
  fetchDetachments,
  fetchDistricts,
  fetchDrivers,
  fetchLocations,
  fetchOfficers,
  fetchVehicles,
  fetchViolationTypes
} from "../api/lookups.js";
import {
  createNotice,
  deleteNotice,
  fetchAllNotices,
  updateNotice
} from "../api/notices.js";
import { requireRole, signOut } from "../auth/guards.js";
import { confirmModal, openModal } from "../components/modal.js";
import { mountNavbar } from "../components/navbar.js";
import { error, success } from "../components/toast.js";
import { el, readForm, replaceChildren, setButtonLoading } from "../utils/dom.js";
import { formatDateTime, statusLabel, toInputDateTime } from "../utils/format.js";


requireRole("admin", "login-admin.html");
mountNavbar();

document.getElementById("logout-btn")?.addEventListener("click", () => signOut());
document.getElementById("create-btn")?.addEventListener("click", () => openEditor(null));

const tbody = document.getElementById("citations-tbody");
const filterInput = document.getElementById("citations-filter");
filterInput.addEventListener("input", renderRows);

const state = {
  notices: [],
  lookups: null
};

bootstrap();


async function bootstrap() {
  try {
    state.lookups = await loadLookups();
  } catch (e) {
    error(
      e instanceof ApiError ? e.message : "Could not load reference data.",
      "Lookup error"
    );
  }
  await loadNotices();
}


async function loadLookups() {
  const [drivers, vehicles, officers, districts, detachments, locations, violations] =
    await Promise.all([
      fetchDrivers(),
      fetchVehicles(),
      fetchOfficers(),
      fetchDistricts(),
      fetchDetachments(),
      fetchLocations(),
      fetchViolationTypes()
    ]);
  return { drivers, vehicles, officers, districts, detachments, locations, violations };
}


async function loadNotices() {
  tbody.innerHTML = "";
  tbody.appendChild(
    el("tr", {}, el("td", { colspan: 8, class: "empty-state" }, "Loading citations…"))
  );
  try {
    state.notices = await fetchAllNotices();
    renderRows();
  } catch (e) {
    state.notices = [];
    tbody.innerHTML = "";
    tbody.appendChild(
      el(
        "tr",
        {},
        el(
          "td",
          { colspan: 8, class: "empty-state" },
          e instanceof ApiError ? e.message : "Could not load citations."
        )
      )
    );
  }
}


function renderRows() {
  const term = filterInput.value.trim().toLowerCase();
  const rows = state.notices.filter((notice) => {
    if (!term) return true;
    return [
      notice.ticket_no,
      notice.driver_name,
      notice.officer_name,
      notice.location_road,
      notice.district_name,
      notice.vin
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  if (!rows.length) {
    tbody.innerHTML = "";
    tbody.appendChild(
      el(
        "tr",
        {},
        el(
          "td",
          { colspan: 8, class: "empty-state" },
          state.notices.length ? "No citations match your search." : "No citations on file."
        )
      )
    );
    return;
  }

  replaceChildren(tbody, ...rows.map(buildRow));
}


function buildRow(notice) {
  const actions = el("div", { class: "actions" }, [
    el(
      "button",
      {
        class: "btn btn--text btn--sm",
        type: "button",
        onclick: () => viewNotice(notice)
      },
      "View"
    ),
    el(
      "button",
      {
        class: "btn btn--ghost btn--sm",
        type: "button",
        onclick: () => openEditor(notice)
      },
      "Edit"
    ),
    el(
      "button",
      {
        class: "btn btn--danger btn--sm",
        type: "button",
        onclick: () => confirmDelete(notice)
      },
      "Delete"
    )
  ]);

  return el("tr", {}, [
    el("td", {}, notice.ticket_no),
    el("td", {}, formatDateTime(notice.notice_timestamp)),
    el("td", {}, notice.driver_name || "—"),
    el(
      "td",
      {},
      [notice.vehicle_make, notice.vehicle_model, notice.vehicle_plate_no]
        .filter(Boolean)
        .join(" · ") || "—"
    ),
    el(
      "td",
      {},
      `${notice.officer_name || "—"}${
        notice.officer_badge_no ? ` (${notice.officer_badge_no})` : ""
      }`
    ),
    el("td", {}, notice.district_name || "—"),
    el(
      "td",
      {},
      el(
        "span",
        { class: `pill ${notice.is_warning ? "pill--warning" : "pill--citation"}` },
        statusLabel(notice.is_warning)
      )
    ),
    el("td", { class: "data-table__actions" }, actions)
  ]);
}


function viewNotice(notice) {
  openModal({
    title: `Citation ${notice.ticket_no}`,
    render: () => buildDetailGrid(notice),
    footer: ({ close }) => {
      const cancel = el(
        "button",
        { class: "btn btn--text", type: "button", onclick: () => close(false) },
        "Close"
      );
      const edit = el(
        "button",
        {
          class: "btn btn--primary",
          type: "button",
          onclick: () => {
            close(false);
            openEditor(notice);
          }
        },
        "Edit"
      );
      return [cancel, edit];
    }
  });
}


function buildDetailGrid(notice) {
  const grid = el("div", { class: "detail-grid" }, [
    detailCell("Status", statusLabel(notice.is_warning)),
    detailCell("Issued", formatDateTime(notice.notice_timestamp)),
    detailCell("Driver", notice.driver_name),
    detailCell("Licence", notice.licence_no),
    detailCell(
      "Officer",
      `${notice.officer_name || "—"}${notice.officer_badge_no ? ` (${notice.officer_badge_no})` : ""}`
    ),
    detailCell("District", notice.district_name),
    detailCell("Detachment", notice.detachment_name),
    detailCell(
      "Vehicle",
      `${notice.vehicle_make || ""} ${notice.vehicle_model || ""} ${
        notice.vehicle_plate_no ? `· ${notice.vehicle_plate_no}` : ""
      }`.trim() || "—"
    ),
    detailCell("VIN", notice.vin),
    detailCell(
      "Location",
      [notice.location_description, notice.location_road, notice.location_city]
        .filter(Boolean)
        .join(" · ")
    ),
    detailCell("Notes", notice.notes || "—")
  ]);

  const wrap = el("div", {}, grid);

  if (notice.violations.length) {
    wrap.appendChild(el("h3", { style: "margin-top:18px;" }, "Violations"));
    const list = el("ul", { style: "padding-left:18px;margin:0;" });
    for (const v of notice.violations) {
      list.appendChild(
        el(
          "li",
          {},
          `${v.violation_code}${v.narrative ? ` — ${v.narrative}` : ""}`
        )
      );
    }
    wrap.appendChild(list);
  }

  return wrap;
}


function detailCell(label, value) {
  return el("div", {}, [
    el("label", {}, label),
    document.createTextNode(value || "—")
  ]);
}


function openEditor(existing) {
  if (!state.lookups) {
    error("Reference data is not ready yet — try again in a moment.", "Lookups pending");
    return;
  }

  let violationsModel = (existing?.violations || []).map((v) => ({
    violation_code: v.violation_code,
    narrative: v.narrative || ""
  }));
  if (!violationsModel.length) {
    violationsModel = [{ violation_code: "", narrative: "" }];
  }

  openModal({
    title: existing ? `Edit citation ${existing.ticket_no}` : "Create new citation",
    render: ({ close: closeModal }) => buildEditorForm(existing, violationsModel, closeModal),
    size: "lg"
  });
}


function buildEditorForm(existing, violationsModel, closeModal) {
  const form = el("form", { class: "form form--grid", novalidate: true });

  const driverOptions = state.lookups.drivers.map((d) => ({
    value: d.licence_no,
    label: `${d.licence_no} — ${d.person.first_name} ${d.person.last_name}`
  }));

  const vehicleOptions = state.lookups.vehicles.map((v) => ({
    value: v.vin,
    label: `${v.vin} (${v.plate_no} ${v.plate_state})`
  }));

  const officerOptions = state.lookups.officers.map((o) => ({
    value: o.officer_id,
    label: `${o.first_name} ${o.last_name} — ${o.badge_no}`
  }));

  const districtOptions = state.lookups.districts.map((d) => ({
    value: d.district_id,
    label: d.name
  }));

  const detachmentOptions = state.lookups.detachments.map((d) => ({
    value: d.detachment_id,
    label: `${d.code} — ${d.name}`
  }));

  const locationOptions = state.lookups.locations.map((l) => ({
    value: l.location_id,
    label: `${l.description || l.road || "Location"} (${l.city || ""} ${l.state || ""})`.trim()
  }));

  form.appendChild(
    field("Ticket number", "ticket_no", "text", existing?.ticket_no || "", {
      required: true,
      maxlength: 20,
      placeholder: "e.g. TCN-2025-0001"
    })
  );
  form.appendChild(
    field(
      "Issued at",
      "notice_timestamp",
      "datetime-local",
      toInputDateTime(existing?.notice_timestamp) || toInputDateTime(new Date()),
      { required: true }
    )
  );

  form.appendChild(selectField("Driver licence", "licence_no", driverOptions, existing?.licence_no));
  form.appendChild(selectField("Vehicle (VIN)", "vin", vehicleOptions, existing?.vin));
  form.appendChild(selectField("Officer", "officer_id", officerOptions, existing?.officer_id));
  form.appendChild(selectField("District", "district_id", districtOptions, existing?.district_id));
  form.appendChild(selectField("Detachment", "detachment_id", detachmentOptions, existing?.detachment_id));
  form.appendChild(selectField("Location", "location_id", locationOptions, existing?.location_id));

  form.appendChild(
    checkboxField("Is this a warning?", "is_warning", existing?.is_warning || false)
  );

  const notesRow = el("div", { class: "form-row form-row--full" }, [
    el("label", { for: "notes" }, "Notes"),
    el(
      "textarea",
      { name: "notes", id: "notes", rows: 3, maxlength: 1000 },
      existing?.notes || ""
    ),
    el("p", { class: "form-row__hint", "data-error-for": "notes" })
  ]);
  form.appendChild(notesRow);

  const violationsHost = el("div", { class: "violation-editor" });
  function rerenderViolations() {
    violationsHost.innerHTML = "";
    violationsHost.appendChild(el("strong", {}, "Violations"));
    violationsModel.forEach((v, index) => {
      violationsHost.appendChild(buildViolationRow(v, index));
    });
    const addBtn = el(
      "button",
      {
        type: "button",
        class: "violation-editor__add",
        onclick: () => {
          violationsModel.push({ violation_code: "", narrative: "" });
          rerenderViolations();
        }
      },
      "+ Add another violation"
    );
    violationsHost.appendChild(addBtn);
  }

  function buildViolationRow(violation, index) {
    const select = el("select", { name: `violations[${index}].code` });
    select.appendChild(el("option", { value: "" }, "Select violation"));
    for (const v of state.lookups.violations) {
      const opt = el(
        "option",
        { value: v.violation_code },
        `${v.violation_code} — ${v.description}`
      );
      if (v.violation_code === violation.violation_code) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener("change", () => {
      violationsModel[index].violation_code = select.value;
    });

    const narrative = el("input", {
      type: "text",
      name: `violations[${index}].narrative`,
      placeholder: "Narrative (optional)",
      value: violation.narrative || ""
    });
    narrative.addEventListener("input", () => {
      violationsModel[index].narrative = narrative.value;
    });

    const removeBtn = el(
      "button",
      {
        type: "button",
        class: "violation-editor__remove",
        onclick: () => {
          violationsModel.splice(index, 1);
          if (!violationsModel.length) {
            violationsModel.push({ violation_code: "", narrative: "" });
          }
          rerenderViolations();
        }
      },
      "Remove"
    );

    return el("div", { class: "violation-editor__row" }, [select, narrative, removeBtn]);
  }
  rerenderViolations();

  const violationsWrap = el("div", { class: "form-row form-row--full" }, [
    violationsHost,
    el("p", { class: "form-row__hint", "data-error-for": "violations" })
  ]);
  form.appendChild(violationsWrap);

  const submit = el(
    "button",
    { type: "submit", class: "btn btn--primary" },
    [
      el("span", { class: "btn__label" }, existing ? "Save changes" : "Create citation"),
      el("span", { class: "btn__spinner", hidden: true })
    ]
  );
  const cancel = el(
    "button",
    {
      type: "button",
      class: "btn btn--text",
      onclick: () => closeModal(false)
    },
    "Cancel"
  );

  const actions = el("div", { class: "form-actions form-row--full" }, [submit, cancel]);
  form.appendChild(actions);

  // Live-clear field errors as the user types/changes a value.
  form.addEventListener("input", (e) => clearFieldError(form, e.target?.name));
  form.addEventListener("change", (e) => clearFieldError(form, e.target?.name));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = readForm(form);

    const fieldErrors = validateCitationForm(values, violationsModel);
    if (Object.keys(fieldErrors).length) {
      applyFieldErrors(form, fieldErrors);
      error("Please correct the highlighted fields.", "Form invalid");
      return;
    }

    const payload = {
      ticket_no: values.ticket_no.trim(),
      notice_timestamp: new Date(values.notice_timestamp).toISOString(),
      notes: values.notes?.trim() || null,
      is_warning: !!values.is_warning,
      officer_id: Number(values.officer_id),
      licence_no: values.licence_no,
      vin: values.vin,
      location_id: Number(values.location_id),
      district_id: Number(values.district_id),
      detachment_id: Number(values.detachment_id),
      violations: violationsModel
        .filter((v) => v.violation_code)
        .map((v) => ({
          violation_code: v.violation_code,
          narrative: v.narrative?.trim() || null
        }))
    };

    setButtonLoading(submit, true, existing ? "Save changes" : "Create citation");
    try {
      if (existing) {
        await updateNotice(existing.notice_uid, payload);
        success("Citation updated.", "Saved");
      } else {
        await createNotice(payload);
        success("Citation created.", "Saved");
      }
      closeModal(true);
      await loadNotices();
    } catch (e) {
      error(
        e instanceof ApiError ? e.message : "Could not save the citation.",
        "Save failed"
      );
    } finally {
      setButtonLoading(submit, false, existing ? "Save changes" : "Create citation");
    }
  });

  return form;
}


function validateCitationForm(values, violationsModel) {
  const errors = {};

  const ticket = (values.ticket_no || "").trim();
  if (!ticket) {
    errors.ticket_no = "Ticket number is required.";
  } else if (ticket.length > 20) {
    errors.ticket_no = "Maximum 20 characters.";
  } else if (!/^[A-Za-z0-9-]+$/.test(ticket)) {
    errors.ticket_no = "Use letters, numbers and dashes only.";
  }

  if (!values.notice_timestamp) {
    errors.notice_timestamp = "Pick the date and time the notice was issued.";
  } else {
    const issued = new Date(values.notice_timestamp);
    if (Number.isNaN(issued.getTime())) {
      errors.notice_timestamp = "Invalid date.";
    } else if (issued.getTime() - 60_000 > Date.now()) {
      // Allow a minute of clock-skew, but reject obviously future dates.
      errors.notice_timestamp = "Notice cannot be in the future.";
    }
  }

  if (!values.licence_no) errors.licence_no = "Select a driver licence.";
  if (!values.vin) errors.vin = "Select a vehicle (VIN).";
  if (!values.officer_id) errors.officer_id = "Select an officer.";
  if (!values.district_id) errors.district_id = "Select a district.";
  if (!values.detachment_id) errors.detachment_id = "Select a detachment.";
  if (!values.location_id) errors.location_id = "Select a location.";

  if (values.notes && values.notes.length > 1000) {
    errors.notes = "Notes are limited to 1000 characters.";
  }

  const filled = violationsModel.filter((v) => v.violation_code);
  if (!filled.length) {
    errors.violations = "Add at least one violation.";
  } else {
    const codes = filled.map((v) => v.violation_code);
    if (new Set(codes).size !== codes.length) {
      errors.violations = "Duplicate violation codes are not allowed.";
    }
  }

  return errors;
}


function applyFieldErrors(form, errors) {
  // Clear existing errors first.
  form.querySelectorAll(".form-row.is-invalid").forEach((row) => {
    row.classList.remove("is-invalid");
    const hint = row.querySelector(".form-row__hint");
    if (hint) hint.textContent = "";
  });

  for (const [name, message] of Object.entries(errors)) {
    const hint = form.querySelector(`[data-error-for="${name}"]`);
    if (hint) {
      hint.textContent = message;
      hint.closest(".form-row")?.classList.add("is-invalid");
    }
  }

  // Focus the first field with an error.
  const firstName = Object.keys(errors)[0];
  if (firstName) {
    form.querySelector(`[name="${firstName}"]`)?.focus();
  }
}


function clearFieldError(form, name) {
  if (!name) return;
  const hint = form.querySelector(`[data-error-for="${name}"]`);
  if (!hint) return;
  hint.textContent = "";
  hint.closest(".form-row")?.classList.remove("is-invalid");
}


async function confirmDelete(notice) {
  const ok = await confirmModal({
    title: "Delete citation",
    message: `This will permanently remove citation ${notice.ticket_no}. This action cannot be undone.`,
    confirmLabel: "Delete",
    destructive: true
  });
  if (!ok) return;

  try {
    await deleteNotice(notice.notice_uid);
    success("Citation deleted.", "Removed");
    await loadNotices();
  } catch (e) {
    error(
      e instanceof ApiError ? e.message : "Could not delete the citation.",
      "Delete failed"
    );
  }
}


function field(label, name, type, value, attrs = {}) {
  return el("div", { class: "form-row" }, [
    el("label", { for: name }, label),
    el("input", { id: name, name, type, value, ...attrs }),
    el("p", { class: "form-row__hint", "data-error-for": name })
  ]);
}


function selectField(label, name, options, selectedValue) {
  const select = el("select", { id: name, name });
  select.appendChild(el("option", { value: "" }, "Select…"));
  for (const opt of options) {
    const node = el("option", { value: String(opt.value) }, opt.label);
    if (String(selectedValue) === String(opt.value)) node.selected = true;
    select.appendChild(node);
  }
  return el("div", { class: "form-row" }, [
    el("label", { for: name }, label),
    select,
    el("p", { class: "form-row__hint", "data-error-for": name })
  ]);
}


function checkboxField(label, name, checked) {
  const id = `${name}-cb`;
  return el("div", { class: "form-row" }, [
    el(
      "label",
      { style: "display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer;" },
      [
        el("input", { type: "checkbox", id, name, checked }),
        document.createTextNode(label)
      ]
    )
  ]);
}
