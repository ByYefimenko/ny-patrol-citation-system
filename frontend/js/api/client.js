// Single fetch wrapper used by every API module. Adds the JWT header,
// parses JSON, and turns non-2xx responses into ApiError.

import { config } from "../../config.js";
import { clearSession, getToken } from "../auth/session.js";


export class ApiError extends Error {
  constructor(message, { status = 0, detail = null, payload = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.payload = payload;
  }
}


export async function apiRequest(path, options = {}) {
  const { method = "GET", body, form, headers = {}, auth = true, signal } = options;

  const url = new URL(path.startsWith("http") ? path : path, config.apiBaseUrl);
  const finalHeaders = new Headers(headers);

  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: payload,
      signal
    });
  } catch (networkError) {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      { status: 0, detail: networkError?.message || "network_error" }
    );
  }

  if (response.status === 204) return null;

  let parsed = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }
  } else {
    try {
      parsed = await response.text();
    } catch {
      parsed = null;
    }
  }

  if (response.ok) return parsed;

  if (response.status === 401) {
    clearSession();
    redirectToLogin();
  }

  const detail = parsed?.detail ?? parsed?.message ?? null;
  throw new ApiError(messageForStatus(response.status, detail), {
    status: response.status,
    detail,
    payload: parsed
  });
}


function messageForStatus(status, detail) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d?.msg || d?.detail || JSON.stringify(d)).join("; ");
  }
  switch (status) {
    case 400:
      return "The request could not be processed.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You don't have permission to access this resource.";
    case 404:
      return "The requested item was not found.";
    case 500:
      return "Server error. Please try again shortly.";
    default:
      return `Unexpected response (HTTP ${status}).`;
  }
}


function redirectToLogin() {
  const path = window.location.pathname;
  if (path.endsWith("/login-driver.html") || path.endsWith("/login-admin.html")) {
    return;
  }
  const isAdmin = path.includes("admin");
  const target = isAdmin ? "login-admin.html" : "login-driver.html";
  const here = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`${target}?next=${here}&reason=session-expired`);
}
