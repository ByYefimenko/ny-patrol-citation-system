// Tiny validation helpers. Each validator returns `null` for valid or
// an error message string. The bind helpers wire them up to inputs and
// toggle .is-invalid / .is-valid on the parent .form-row.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s0-9]{7,30}$/;
const LICENCE_RE = /^[A-Z0-9-]{4,20}$/i;


export function required(value) {
  return value && String(value).trim().length > 0 ? null : "This field is required.";
}


export function minLength(min) {
  return (value) =>
    !value || String(value).length >= min ? null : `Must be at least ${min} characters.`;
}


export function maxLength(max) {
  return (value) =>
    !value || String(value).length <= max ? null : `Must be no more than ${max} characters.`;
}


export function isEmail(value) {
  return !value || EMAIL_RE.test(value) ? null : "Enter a valid email address.";
}


export function isPhone(value) {
  return !value || PHONE_RE.test(value) ? null : "Enter a valid phone number.";
}


export function isLicence(value) {
  return !value || LICENCE_RE.test(value)
    ? null
    : "Use letters, numbers and dashes only.";
}


export function isDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Enter a valid date." : null;
}


export function isPastDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Enter a valid date.";
  return d.getTime() <= Date.now() ? null : "Date must be in the past.";
}


export function passwordStrength(value) {
  if (!value) return "Choose a password.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(value)) return "Password needs a lowercase letter.";
  if (!/[A-Z]/.test(value)) return "Password needs an uppercase letter.";
  if (!/[0-9]/.test(value)) return "Password needs a number.";
  return null;
}


export function matches(otherFieldId, label = "Fields") {
  return (value) => {
    const other = document.getElementById(otherFieldId);
    return !other || other.value === value ? null : `${label} do not match.`;
  };
}


// Compose validators. Stops at the first error.
export function compose(...validators) {
  return (value) => {
    for (const fn of validators) {
      const result = fn(value);
      if (result) return result;
    }
    return null;
  };
}


export function validateSchema(schema, values) {
  const errors = {};
  for (const [field, validator] of Object.entries(schema)) {
    const message = validator(values[field]);
    if (message) errors[field] = message;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}


export function bindField(input, validator) {
  if (!input) return;
  const row = input.closest(".form-row");
  const hint = row?.querySelector(`[data-error-for="${input.name || input.id}"]`);

  const evaluate = () => {
    const message = validator(input.value);
    if (message) {
      row?.classList.remove("is-valid");
      row?.classList.add("is-invalid");
      if (hint) hint.textContent = message;
    } else {
      row?.classList.remove("is-invalid");
      if (input.value) row?.classList.add("is-valid");
      else row?.classList.remove("is-valid");
      if (hint) hint.textContent = "";
    }
    return !message;
  };

  input.addEventListener("blur", evaluate);
  input.addEventListener("input", () => {
    if (row?.classList.contains("is-invalid")) evaluate();
  });

  return evaluate;
}


// Bind a schema to a form. Returns a function that re-runs every
// validator (used on submit).
export function bindLiveValidation(form, schema) {
  const evaluators = {};
  for (const [field, validator] of Object.entries(schema)) {
    const input = form.elements[field] || form.querySelector(`#${field}`);
    evaluators[field] = bindField(input, validator) || (() => true);
  }

  return function evaluateAll() {
    let ok = true;
    for (const evaluate of Object.values(evaluators)) {
      if (!evaluate()) ok = false;
    }
    return ok;
  };
}


// Live update for the password checklist on the register page.
export function bindPasswordRequirements(input, listSelector = "#password-requirements") {
  const list = document.querySelector(listSelector);
  if (!input || !list) return;

  const rules = {
    length: (v) => v.length >= 8,
    upper: (v) => /[A-Z]/.test(v),
    lower: (v) => /[a-z]/.test(v),
    digit: (v) => /[0-9]/.test(v)
  };

  const update = () => {
    const value = input.value || "";
    for (const item of list.querySelectorAll("[data-rule]")) {
      const rule = item.dataset.rule;
      item.classList.toggle("is-met", rules[rule]?.(value) === true);
    }
  };

  input.addEventListener("input", update);
  update();
}
