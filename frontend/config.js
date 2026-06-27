// Frontend runtime config. Override via window.__APP_CONFIG__ before this
// script loads if you need to point at a different backend.

const fallback = {
  apiBaseUrl: "http://127.0.0.1:8000",
  sessionTokenKey: "nyp.token",
  sessionUserKey: "nyp.user",
  sessionExpiryKey: "nyp.expiry",
  tokenMaxAgeMinutes: 30
};

export const config = Object.freeze({
  ...fallback,
  ...(window.__APP_CONFIG__ || {})
});
