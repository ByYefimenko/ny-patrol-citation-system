// Page guards. Redirect to login when the session is missing or the role
// doesn't match, otherwise return the cached user so the page can render
// without an extra fetch.

import { clearSession, getRole, getUser, isAuthenticated } from "./session.js";


export function requireAuth(loginPage = "login-driver.html") {
  if (!isAuthenticated()) {
    redirectWithReturn(loginPage);
    throw new Error("not_authenticated");
  }
  return getUser();
}


export function requireRole(roles, loginPage = "login-driver.html") {
  const user = requireAuth(loginPage);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(getRole())) {
    redirectWithReturn(loginPage);
    throw new Error("role_mismatch");
  }
  return user;
}


export function signOut(target = "index.html") {
  clearSession();
  window.location.assign(target);
}


function redirectWithReturn(loginPage) {
  const here = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`${loginPage}?next=${here}`);
}
