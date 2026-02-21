import axios from "axios";
import { TripInputs, RouteResult } from "../types";

// Use Django backend API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function postWithRetries(path: string, body: any, maxAttempts = 3) {
  let attempt = 0;
  const baseDelay = 1000; // ms

  while (attempt < maxAttempts) {
    try {
      const resp = await http.post(path, body);
      return resp;
    } catch (err: any) {
      attempt++;
      const status = err?.response?.status;
      
      // Only retry on 5xx server errors or timeout
      const shouldRetry = (status >= 500 && status < 600) || err.code === 'ECONNABORTED';
      if (!shouldRetry || attempt >= maxAttempts) throw err;

      let delay = baseDelay * Math.pow(2, attempt - 1);
      // add jitter
      delay = Math.round(delay + Math.random() * 300);
      await sleep(delay);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
    }
  }
}

export const getTripIntelligence = async (inputs: TripInputs): Promise<string> => {
  try {
    const response = await postWithRetries('/calculate-trip/', {
      inputs: inputs
    });
    return response.data.intel || "Intelligence summary unavailable.";
  } catch (error) {
    console.error("Trip Intelligence Error:", error);
    return "Intelligence summary unavailable.";
  }
};

export const geocodeAndRoute = async (inputs: TripInputs): Promise<RouteResult> => {
  try {
    const response = await postWithRetries('/geocode-route/', {
      origin: inputs.origin,
      pickup: inputs.pickup,
      dropoff: inputs.dropoff
    });

    const data = response.data;
    
    // Transform Django response format to match frontend expectations
    return {
      distanceMiles: data.distanceMiles || 0,
      durationHours: data.durationHours || 0,
      polyline: data.polyline || [],
      instructions: data.instructions || [],
      points: {
        origin: data.points?.origin || { lat: 34.0522, lng: -118.2437, address: inputs.origin },
        pickup: data.points?.pickup || { lat: 39.7392, lng: -104.9903, address: inputs.pickup },
        dropoff: data.points?.dropoff || { lat: 41.8781, lng: -87.6298, address: inputs.dropoff }
      }
    };
  } catch (error) {
    console.error("Geocoding Error:", error);
    throw new Error('Failed to calculate route. Please check your locations and try again.');
  }
};

// Helper function to convert and validate event dates
const convertEventDates = (event: any) => {
  // Ensure we have valid Date objects
  const startDate = event.start instanceof Date ? event.start : new Date(event.start);
  const endDate = event.end instanceof Date ? event.end : new Date(event.end);
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.warn('Invalid date in event:', event);
    // Use current time as fallback
    const now = new Date();
    return {
      ...event,
      start: isNaN(startDate.getTime()) ? now : startDate,
      end: isNaN(endDate.getTime()) ? new Date(now.getTime() + 3600000) : endDate // +1 hour
    };
  }
  
  return {
    ...event,
    start: startDate,
    end: endDate
  };
};

export const calculateFullTrip = async (inputs: TripInputs, carrier: any, hosConfig: any) => {
  try {
    const response = await postWithRetries('/calculate-trip/', {
      inputs: inputs,
      carrier: carrier,
      hosConfig: hosConfig
    });

    return {
      route: response.data.route,
      events: response.data.events.map(convertEventDates),
      logs: response.data.logs.map((log: any) => ({
        ...log,
        events: log.events.map(convertEventDates)
      })),
      intel: response.data.intel
    };
  } catch (error) {
    console.error("Trip Calculation Error:", error);
    throw new Error('Failed to calculate trip plan. Please try again.');
  }
};