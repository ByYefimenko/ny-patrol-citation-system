// Lookup endpoints used to fill admin form selects.

import { apiRequest } from "./client.js";


export const fetchViolationTypes = () => apiRequest("/lookups/violation-types");
export const fetchOfficers = () => apiRequest("/lookups/officers");
export const fetchDistricts = () => apiRequest("/lookups/districts");
export const fetchDetachments = () => apiRequest("/lookups/detachments");
export const fetchLocations = () => apiRequest("/lookups/locations");
export const fetchDrivers = () => apiRequest("/drivers");
export const fetchVehicles = () => apiRequest("/vehicles");
