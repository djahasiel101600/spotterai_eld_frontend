import React, { useState, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "../shared/utils/theme";
import { loadTripsFromStorage, saveTripsToStorage } from "../shared/utils";
import { api } from "../shared/services";
import { SavedTrip, AppViewMode, TripViewMode } from "../shared/types";
import {
  TripListPage,
  TripViewPage,
  NewTripPage,
} from "../features/trip-management";
import ErrorBoundary from "../shared/components/ErrorBoundary";

const App: React.FC = () => {
  // Trip Management State
  const [appViewMode, setAppViewMode] = useState<AppViewMode>("TRIP_LIST");
  const [tripViewMode, setTripViewMode] = useState<TripViewMode>("logs");
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load trips from database on mount
  useEffect(() => {
    const loadTrips = async () => {
      try {
        setIsLoading(true);
        // Try to load from database first
        const tripsFromDB = await api.getTrips();
        setSavedTrips(tripsFromDB);
        // Save to localStorage as backup
        saveTripsToStorage(tripsFromDB);
      } catch (error) {
        console.error(
          "Failed to load trips from database, using localStorage:",
          error,
        );
        // Fallback to localStorage if database fails
        const tripsFromStorage = loadTripsFromStorage();
        setSavedTrips(tripsFromStorage);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrips();
  }, []);

  // Get current trip for viewing
  const currentTrip = currentTripId
    ? savedTrips.find((trip) => trip.id === currentTripId)
    : null;

  // Show loading state while fetching trips
  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          Loading trips...
        </div>
      </ThemeProvider>
    );
  }

  // Main render function with view routing
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        {appViewMode === "TRIP_LIST" && (
          <TripListPage
            savedTrips={savedTrips}
            setSavedTrips={setSavedTrips}
            setAppViewMode={setAppViewMode}
            setCurrentTripId={setCurrentTripId}
          />
        )}

        {appViewMode === "NEW_TRIP" && (
          <NewTripPage
            savedTrips={savedTrips}
            setSavedTrips={setSavedTrips}
            setAppViewMode={setAppViewMode}
            setCurrentTripId={setCurrentTripId}
            setTripViewMode={setTripViewMode}
          />
        )}

        {appViewMode === "VIEW_TRIP" && currentTrip && (
          <TripViewPage
            trip={currentTrip}
            tripViewMode={tripViewMode}
            setTripViewMode={setTripViewMode}
            setAppViewMode={setAppViewMode}
          />
        )}
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;
