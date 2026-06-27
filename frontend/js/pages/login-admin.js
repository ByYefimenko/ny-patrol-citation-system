// Officer/admin sign-in page. Same auth flow as drivers but rejects the
// session if the profile role is not "admin".

import { fetchProfile, login } from "../api/auth.js";
import { ApiError } from "../api/client.js";
import { setToken, setUser, clearSession } from "../auth/session.js";
import { mountNavbar } from "../components/navbar.js";
import { error, info, success } from "../components/toast.js";
import { readForm, setButtonLoading } from "../utils/dom.js";
import { bindLiveValidation, required } from "../utils/validators.js";


mountNavbar();
maybeFlashSessionExpired();

const form = document.getElementById("login-form");
const submit = document.getElementById("login-submit");

const validate = bindLiveValidation(form, {
  username: required,
  password: required
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
    if (profile.role !== "admin") {
      clearSession();
      error(
        "This account does not have administrator access. Sign in via the driver portal.",
        "Access denied"
      );
      return;
    }
    setUser(profile);
    success(`Signed in as ${profile.full_name || profile.username}.`, "Welcome");
    const next = new URL(window.location.href).searchParams.get("next") || "admin.html";
    setTimeout(() => window.location.assign(next), 400);
  } catch (e) {
    const message =
      e instanceof ApiError ? e.message : "Could not sign in. Please try again.";
    error(message, "Sign-in failed");
  } finally {
    setButtonLoading(submit, false, "Sign in");
  }
});


function maybeFlashSessionExpired() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reason") === "session-expired") {
    info("Your session has expired. Please sign in again.", "Session expired");
  }
}
