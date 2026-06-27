// Auth-related API calls.

import { apiRequest } from "./client.js";


// /token uses form-encoded data (OAuth2PasswordRequestForm in FastAPI).
export async function login(username, password) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);
  return apiRequest("/token", {
    method: "POST",
    form: body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    auth: false
  });
}


export async function registerDriver(payload) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: payload,
    auth: false
  });
}


export async function fetchProfile() {
  return apiRequest("/auth/me");
}


export async function updateProfile(payload) {
  return apiRequest("/auth/me", { method: "PUT", body: payload });
}
