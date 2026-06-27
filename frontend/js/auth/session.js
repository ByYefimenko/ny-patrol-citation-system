// Token + user cache in sessionStorage with a soft expiry stamp so a
// tab left open eventually forces a re-login.

import { config } from "../../config.js";


function readJson(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}


function writeJson(key, value) {
  if (value == null) {
    sessionStorage.removeItem(key);
  } else {
    sessionStorage.setItem(key, JSON.stringify(value));
  }
}


export function getToken() {
  const token = sessionStorage.getItem(config.sessionTokenKey);
  if (!token) return null;

  const expiresAt = Number(sessionStorage.getItem(config.sessionExpiryKey) || 0);
  if (expiresAt && Date.now() > expiresAt) {
    clearSession();
    return null;
  }
  return token;
}


export function setToken(token) {
  if (!token) {
    clearSession();
    return;
  }
  const expiresAt = Date.now() + config.tokenMaxAgeMinutes * 60 * 1000;
  sessionStorage.setItem(config.sessionTokenKey, token);
  sessionStorage.setItem(config.sessionExpiryKey, String(expiresAt));
}


export function getUser() {
  return readJson(config.sessionUserKey);
}


export function setUser(user) {
  writeJson(config.sessionUserKey, user);
}


export function clearSession() {
  sessionStorage.removeItem(config.sessionTokenKey);
  sessionStorage.removeItem(config.sessionExpiryKey);
  sessionStorage.removeItem(config.sessionUserKey);
}


export function isAuthenticated() {
  return !!getToken();
}


export function getRole() {
  return getUser()?.role || null;
}
