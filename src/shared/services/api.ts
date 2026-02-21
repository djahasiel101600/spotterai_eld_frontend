import axios, { AxiosInstance, AxiosError } from "axios";
import { RouteResult, DailyLog, DutyEvent, HosProfileConfig, SavedTrip } from "../types";

// API Configuration
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for adding auth tokens, logging, etc.
apiClient.interceptors.request.use(
  (config) => {
    // Add any request modifications here (e.g., auth tokens)
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle global errors here
    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error("Network Error:", error.message);
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// API Response Types
interface CalculateTripRequest {
  inputs: {
    origin: string;
    pickup: string;
    dropoff: string;
    startTime?: string;
    cycleHoursUsed?: number;
  };
  carrier?: Record<string, any>;
  hosConfig?: Partial<HosProfileConfig>;
  homeTerminalTimezone?: string;
}

interface CalculateTripResponse {
  route: RouteResult;
  logs: DailyLog[];
  events: DutyEvent[];
  intel?: string;
  carrier?: Record<string, any>;
}

// API Methods
export const api = {
  /**
   * Calculate trip route and HOS compliance
   */
  calculateTrip: async (
    data: CalculateTripRequest
  ): Promise<CalculateTripResponse> => {
    const response = await apiClient.post<CalculateTripResponse>(
      "/api/calculate-trip/",
      data
    );
    return response.data;
  },

  /**
   * Get all saved trips from database
   */
  getTrips: async (): Promise<SavedTrip[]> => {
    const response = await apiClient.get<SavedTrip[]>("/api/trips/");
    return response.data;
  },

  /**
   * Get a specific trip by ID
   */
  getTrip: async (tripId: string): Promise<SavedTrip> => {
    const response = await apiClient.get<SavedTrip>(`/api/trips/${tripId}/`);
    return response.data;
  },

  /**
   * Save a new trip to database
   */
  saveTrip: async (tripData: SavedTrip): Promise<SavedTrip> => {
    const response = await apiClient.post<SavedTrip>(
      "/api/trips/",
      tripData
    );
    return response.data;
  },

  /**
   * Delete a trip by ID
   */
  deleteTrip: async (tripId: string): Promise<void> => {
    await apiClient.delete(`/api/trips/${tripId}/`);
  },

  /**
   * Get HOS configuration profile
   */
  getHosConfiguration: async (profileId?: string): Promise<HosProfileConfig> => {
    const params = profileId ? { profileId } : {};
    const response = await apiClient.get<HosProfileConfig>(
      "/api/hos-config/",
      { params }
    );
    return response.data;
  },

  /**
   * Get route information (legacy endpoint)
   */
  getRoute: async (routeId: string): Promise<RouteResult> => {
    const response = await apiClient.get<RouteResult>(`/api/routes/${routeId}`);
    return response.data;
  },
};

// Error handling utility
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string; detail?: string }>;
    return (
      axiosError.response?.data?.error ||
      axiosError.response?.data?.detail ||
      axiosError.message ||
      "An unexpected error occurred"
    );
  }
  return error instanceof Error ? error.message : "An unexpected error occurred";
};

// Export axios instance for custom requests if needed
export { apiClient };

export default api;
