import { apiRequest } from "./client.js";

export const fetchStatsSummary = () => apiRequest("/stats/summary");
