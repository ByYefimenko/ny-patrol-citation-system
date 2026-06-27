// Notices API: driver self-view + admin CRUD.

import { apiRequest } from "./client.js";


export function fetchMyNotices() {
  return apiRequest("/notices/me");
}


export function fetchAllNotices() {
  return apiRequest("/notices");
}


export function fetchNotice(uid) {
  return apiRequest(`/notices/${encodeURIComponent(uid)}`);
}


export function createNotice(payload) {
  return apiRequest("/notices", { method: "POST", body: payload });
}


export function updateNotice(uid, payload) {
  return apiRequest(`/notices/${encodeURIComponent(uid)}`, {
    method: "PUT",
    body: payload
  });
}


export function deleteNotice(uid) {
  return apiRequest(`/notices/${encodeURIComponent(uid)}`, { method: "DELETE" });
}
