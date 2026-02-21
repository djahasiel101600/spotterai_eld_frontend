/**
 * Centralized date utility for consistent date handling across the app.
 * Ensures all date fields are proper Date objects regardless of source
 * (API response, localStorage, or state).
 */

import { SavedTrip } from "../types";

/**
 * Safely converts any value to a Date object.
 * Handles: Date objects, ISO strings, timestamps, null/undefined.
 */
export const toSafeDate = (value: any): Date => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Fallback to current time — something is wrong, but we don't crash
  console.warn("toSafeDate: could not parse date, falling back to now:", value);
  return new Date();
};

/**
 * Converts all date fields in a single DutyEvent to actual Date objects.
 */
export const deserializeEventDates = (event: any): any => {
  if (!event) return event;

  return {
    ...event,
    start: toSafeDate(event.start),
    end: toSafeDate(event.end),
  };
};

/**
 * Converts all date fields in an array of DutyEvents.
 */
export const deserializeEventsDates = (events: any[]): any[] => {
  if (!Array.isArray(events)) return [];
  return events.map(deserializeEventDates);
};

/**
 * Converts all date fields in a DailyLog (including nested events).
 */
export const deserializeLogDates = (log: any): any => {
  if (!log) return log;

  return {
    ...log,
    events: deserializeEventsDates(log.events || []),
  };
};

/**
 * Converts all date fields in a SavedTrip (events + logs + nested events).
 */
export const deserializeTripDates = (trip: any): SavedTrip => {
  if (!trip) return trip;

  return {
    ...trip,
    events: deserializeEventsDates(trip.events || []),
    logs: Array.isArray(trip.logs) ? trip.logs.map(deserializeLogDates) : [],
  };
};

/**
 * Formats a date safely for display — handles strings and Date objects.
 */
export const formatTime = (
  value: any,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const date = toSafeDate(value);
  if (isNaN(date.getTime())) return "--:--";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  return date.toLocaleTimeString([], options || defaultOptions);
};

/**
 * Calculates duration in minutes between two date values safely.
 */
export const getDurationMinutes = (start: any, end: any): number => {
  const startDate = toSafeDate(start);
  const endDate = toSafeDate(end);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;

  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
};
