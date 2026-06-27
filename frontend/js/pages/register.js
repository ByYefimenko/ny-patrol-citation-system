// Register page: validate the form fields, submit to /auth/register,
// then redirect to the driver sign-in page.

import { registerDriver } from "../api/auth.js";
import { ApiError } from "../api/client.js";
import { mountNavbar } from "../components/navbar.js";
import { error, success } from "../components/toast.js";
import { readForm, setButtonLoading } from "../utils/dom.js";
import {
  bindLiveValidation,
  bindPasswordRequirements,
  compose,
  isEmail,
  isLicence,
  isPastDate,
  isPhone,
  matches,
  maxLength,
  minLength,
  passwordStrength,
  required
} from "../utils/validators.js";


mountNavbar();

const form = document.getElementById("register-form");
const submit = document.getElementById("register-submit");

// Simple custom validators kept inline — they're only used on this page.
const isPlateState = (value) =>
  !value || /^[A-Z]{2}$/i.test(value.trim())
    ? null
    : "Use a 2-letter state code (e.g. NY).";

const isVin = (value) =>
  !value || /^[A-HJ-NPR-Z0-9]{11,17}$/i.test(value.trim())
    ? null
    : "VIN must be 11–17 letters/numbers (no I, O or Q).";

const isPlateNo = (value) =>
  !value || /^[A-Z0-9-]{2,10}$/i.test(value.trim())
    ? null
    : "Plate number can only contain letters, numbers and dashes.";

const isYear = (value) => {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n)) return "Year must be a whole number.";
  if (n < 1900 || n > 2100) return "Year must be between 1900 and 2100.";
  return null;
};

const validate = bindLiveValidation(form, {
  username: compose(required, minLength(3), maxLength(50)),
  email: compose(required, isEmail, maxLength(120)),
  password: passwordStrength,
  confirm_password: compose(required, matches("password", "Passwords")),
  first_name: compose(required, maxLength(50)),
  last_name: compose(required, maxLength(50)),
  birth_date: compose(required, isPastDate),
  licence_no: compose(required, isLicence, maxLength(20)),
  phone: compose(required, isPhone),
  address: compose(required, maxLength(200)),
  vehicle_plate_no: compose(required, isPlateNo),
  vehicle_plate_state: compose(required, isPlateState),
  vehicle_vin: compose(required, isVin),
  vehicle_year: isYear
});

bindPasswordRequirements(document.getElementById("password"));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validate()) {
    error("Please correct the highlighted fields and try again.", "Form invalid");
    return;
  }

  const values = readForm(form);
  const payload = {
    username: values.username.trim(),
    password: values.password,
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    birth_date: values.birth_date,
    licence_no: values.licence_no.trim().toUpperCase(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    address: values.address.trim(),
    vehicle_vin: values.vehicle_vin.trim().toUpperCase(),
    vehicle_plate_no: values.vehicle_plate_no.trim().toUpperCase(),
    vehicle_plate_state: values.vehicle_plate_state.trim().toUpperCase(),
    vehicle_make: values.vehicle_make?.trim() || null,
    vehicle_model: values.vehicle_model?.trim() || null,
    vehicle_year: values.vehicle_year ? Number(values.vehicle_year) : null
  };

  setButtonLoading(submit, true, "Create account");
  try {
    await registerDriver(payload);
    success("Your driver account is ready. Please sign in.", "Account created");
    setTimeout(() => {
      window.location.assign("login-driver.html?registered=1");
    }, 800);
  } catch (e) {
    const message =
      e instanceof ApiError ? e.message : "Registration failed. Please try again.";
    error(message, "Registration failed");
  } finally {
    setButtonLoading(submit, false, "Create account");
  }
});
