import { SavedTrip } from "../types";
import { deserializeTripDates } from "./dates";

/**
 * Load all saved trips from localStorage with proper date deserialization.
 */
export const loadTripsFromStorage = (): SavedTrip[] => {
  try {
    const raw = localStorage.getItem("savedTrips");
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Deep-deserialize all date fields in every trip
    return parsed.map(deserializeTripDates);
  } catch (error) {
    console.error("Failed to load trips from storage:", error);
    return [];
  }
};

/**
 * Save trips to localStorage.
 */
export const saveTripsToStorage = (trips: SavedTrip[]): void => {
  try {
    localStorage.setItem("savedTrips", JSON.stringify(trips));
  } catch (error) {
    console.error("Failed to save trips to storage:", error);
  }
};
