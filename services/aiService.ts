import axios from "axios";
import { TripInputs, RouteResult } from "../types";

// Use Django backend API - all AI calls go through backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
      console.warn(`Request to ${path} failed (status=${status}), retrying attempt ${attempt}/${maxAttempts} after ${delay}ms`);
      await sleep(delay);
    }
  }
}

export const getTripIntelligence = async (inputs: TripInputs) => {
  try {
    const prompt = `Analyze this trucking trip: From ${inputs.origin}, pickup at ${inputs.pickup}, and dropoff at ${inputs.dropoff}. Start time is ${inputs.startTime}. Provide a brief professional summary of terrain, potential traffic corridor challenges, and safety tips for this route.`;
    const response = await postWithRetries('/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    });
    return extractText(response.data) || "Intelligence summary unavailable.";
  } catch (error) {
    console.error("OpenAI Intel Error:", error);
    return "Intelligence summary unavailable.";
  }
};

export const geocodeAndRoute = async (inputs: TripInputs): Promise<RouteResult> => {
  const prompt = `You are a geocoding service. Provide coordinates and estimated distance/time for this trucking route: ${inputs.origin} → ${inputs.pickup} → ${inputs.dropoff}.

REQUIRED JSON FORMAT:
{
  "distanceMiles": <estimated_total_miles_as_number>,
  "durationHours": <estimated_total_hours_as_number>, 
  "origin": {"lat": <latitude>, "lng": <longitude>, "address": "${inputs.origin}"},
  "pickup": {"lat": <latitude>, "lng": <longitude>, "address": "${inputs.pickup}"},
  "dropoff": {"lat": <latitude>, "lng": <longitude>, "address": "${inputs.dropoff}"},
  "instructions": ["Brief summary of route segments"]
}

Provide realistic latitude/longitude coordinates for each location. Distance and time should be highway truck estimates.`;

  const response = await postWithRetries('/chat/completions', {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 1000,
    response_format: { type: 'json_object' }
  });

  const text = extractText(response.data).trim();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (err) {
    // Try to extract JSON from text if there is surrounding text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      data = JSON.parse(match[0]);
    } else {
      throw new Error('Failed to parse JSON from OpenAI response');
    }
  }

  // No need for polyline since Leaflet Routing Machine handles it
  console.log('AI Response data:', data);

  // Create a simple approximation polyline for duty event coordinate calculations
  // This helps position stops/rests along the route even though Leaflet Routing Machine draws the actual route
  const simplePolyline: [number, number][] = [];
  if (data.origin && data.pickup && data.dropoff) {
    // Add points along the route: origin → pickup → dropoff with some intermediate points
    simplePolyline.push([data.origin.lat, data.origin.lng]);
    
    // Add intermediate points between origin and pickup (for positioning early stops)
    const midPoint1 = [
      (data.origin.lat + data.pickup.lat) / 2,
      (data.origin.lng + data.pickup.lng) / 2
    ];
    simplePolyline.push(midPoint1 as [number, number]);
    
    simplePolyline.push([data.pickup.lat, data.pickup.lng]);
    
    // Add intermediate points between pickup and dropoff (for positioning later stops)
    const midPoint2 = [
      (data.pickup.lat + data.dropoff.lat) / 2,
      (data.pickup.lng + data.dropoff.lng) / 2
    ];
    simplePolyline.push(midPoint2 as [number, number]);
    
    simplePolyline.push([data.dropoff.lat, data.dropoff.lng]);
  }

  return {
    distanceMiles: data.distanceMiles || 0,
    durationHours: data.durationHours || 0,
    polyline: simplePolyline, // Simple polyline for coordinate positioning
    instructions: data.instructions || [],
    points: {
      origin: data.origin || { lat: 34.0522, lng: -118.2437, address: inputs.origin },
      pickup: data.pickup || { lat: 39.7392, lng: -104.9903, address: inputs.pickup },
      dropoff: data.dropoff || { lat: 41.8781, lng: -87.6298, address: inputs.dropoff }
    }
  };
};
export const extractText = (data: any): string => {
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  if (typeof data === 'string') {
    return data;
  }
  return '';
};

