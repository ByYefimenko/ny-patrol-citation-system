// Driver sign-in page.

import { fetchProfile, login } from "../api/auth.js";
import { ApiError } from "../api/client.js";
import { setToken, setUser } from "../auth/session.js";
import { mountNavbar } from "../components/navbar.js";
import { error, info, success } from "../components/toast.js";
import { readForm, setButtonLoading } from "../utils/dom.js";
import { bindLiveValidation, compose, required } from "../utils/validators.js";


mountNavbar();
showFlashMessages();

const form = document.getElementById("login-form");
const submit = document.getElementById("login-submit");

const validate = bindLiveValidation(form, {
  username: required,
  password: compose(required)
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validate()) return;
  const values = readForm(form);

  setButtonLoading(submit, true, "Sign in");
  try {
    const token = await login(values.username.trim(), values.password);
    setToken(token.access_token);

    const profile = await fetchProfile();
    if (profile.role !== "driver") {
      error("This account is not a driver account. Use the officer portal.", "Wrong portal");
      setToken(null);
      return;
    }
    setUser(profile);
    success(`Welcome back, ${profile.full_name || profile.username}.`, "Signed in");
    const next = new URL(window.location.href).searchParams.get("next") || "dashboard.html";
    setTimeout(() => window.location.assign(next), 400);
  } catch (e) {
    const message =
      e instanceof ApiError ? e.message : "Could not sign in. Please try again.";
    error(message, "Sign-in failed");
  } finally {
    setButtonLoading(submit, false, "Sign in");
  }
});


function showFlashMessages() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("registered") === "1") {
    info("Your account is ready. Please sign in below.", "Account created");
  }
  if (params.get("reason") === "session-expired") {
    info("Your session has expired. Please sign in again.", "Session expired");
  }
}
