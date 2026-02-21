import React, { useState, useCallback, useEffect } from "react";
import {
  TripInputs,
  RouteResult,
  DailyLog,
  CarrierInfo,
  HosProfileConfig,
  DutyEvent,
} from "./types.ts";
import { calculateFullTrip } from "./services/aiServiceNew.ts";
import RouteMap from "./components/RouteMap.tsx";
import EldLogGrid from "./components/EldLogGrid.tsx";
import { HOS_PROFILE_CONFIG_PROPERTY_CARRYING_US_FMCSA } from "./hos_profile_config.ts";
import {
  Activity,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Save,
  X,
  Check,
  Clock,
  Plus,
  History,
  MapPin,
  Calendar,
  Trash2,
  Eye,
  Edit,
  Search,
  Filter,
  Grid3X3,
  LayoutGrid,
  SortAsc,
  MoreVertical,
} from "lucide-react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Container,
  Grid,
  Paper,
  Card,
  CardContent,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Fade,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  InputAdornment,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import {
  LocalShipping as TruckIcon,
  Settings as SettingsIcon,
  Print as PrintIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  Route as RouteIcon,
  List as ListIcon,
} from "@mui/icons-material";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2563eb",
    },
    secondary: {
      main: "#64748b",
    },
    background: {
      default: "#f8fafc",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Trip management types
interface SavedTrip {
  id: string;
  timestamp: string;
  inputs: TripInputs;
  carrier: CarrierInfo;
  route?: RouteResult;
  logs: DailyLog[];
  events: DutyEvent[];
  hosConfig: HosProfileConfig;
  intel?: string;
}

type AppViewMode = "TRIP_LIST" | "NEW_TRIP" | "VIEW_TRIP";
type TripViewMode = "LOGS" | "INSTRUCTIONS";

const App: React.FC = () => {
  // Trip Management State
  const [appViewMode, setAppViewMode] = useState<AppViewMode>("TRIP_LIST");
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);

  // Current Trip State
  const [inputs, setInputs] = useState<TripInputs>({
    origin: "Los Angeles, CA",
    pickup: "Denver, CO",
    dropoff: "Chicago, IL",
    cycleHoursUsed: 0,
    startTime: new Date().toISOString().slice(0, 16),
  });

  const [hosConfig, setHosConfig] = useState<HosProfileConfig>(
    HOS_PROFILE_CONFIG_PROPERTY_CARRYING_US_FMCSA,
  );
  const [carrier, setCarrier] = useState<CarrierInfo>({
    driverName: "John Doe",
    carrierName: "RouteLog Pro Logistics Inc.",
    mainOfficeAddress: "123 Logistics Way, Chicago, IL 60601",
    homeTerminalAddress: "456 Terminal Dr, Los Angeles, CA 90001",
    truckNumber: "TRK-900 / TRL-442",
    shippingDocs: "MANIFEST #88219-X",
    coDriverName: "",
  });

  const [showSettings, setShowSettings] = useState<"HOS" | "CARRIER" | null>(
    null,
  );
  const [tripViewMode, setTripViewMode] = useState<TripViewMode>("LOGS");

  const [isLoading, setIsLoading] = useState(false);
  const [route, setRoute] = useState<RouteResult | undefined>();
  const [allEvents, setAllEvents] = useState<DutyEvent[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [intel, setIntel] = useState<string | null>(null);
  const [activeLogIdx, setActiveLogIdx] = useState(0);

  // Save/Discard state management
  const [isTripCalculated, setIsTripCalculated] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [lastSavedData, setLastSavedData] = useState<any>(null);

  // Trip list state management
  const [listViewMode, setListViewMode] = useState<"table" | "cards">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<
    "timestamp" | "route" | "miles" | "hours" | "days"
  >("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Track unsaved changes
  useEffect(() => {
    if (isTripCalculated && lastSavedData) {
      const currentData = { route, logs, allEvents, carrier, inputs };
      const hasChanges =
        JSON.stringify(currentData) !== JSON.stringify(lastSavedData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [
    route,
    logs,
    allEvents,
    carrier,
    inputs,
    lastSavedData,
    isTripCalculated,
  ]);

  // Load saved trips on mount
  useEffect(() => {
    const loadSavedTrips = () => {
      try {
        const saved = localStorage.getItem("savedTrips");
        if (saved) {
          const trips = JSON.parse(saved);
          setSavedTrips(Array.isArray(trips) ? trips : []);
        }
      } catch (error) {
        console.error("Failed to load saved trips:", error);
        setSavedTrips([]);
      }
    };
    loadSavedTrips();
  }, []);

  // Trip Management Functions
  const startNewTrip = () => {
    // Reset to default state
    setRoute(undefined);
    setAllEvents([]);
    setLogs([]);
    setIntel(null);
    setActiveLogIdx(0);
    setIsTripCalculated(false);
    setHasUnsavedChanges(false);
    setLastSavedData(null);
    setCurrentTripId(null);
    setAppViewMode("NEW_TRIP");

    // Reset inputs to defaults
    setInputs({
      origin: "Los Angeles, CA",
      pickup: "Denver, CO",
      dropoff: "Chicago, IL",
      cycleHoursUsed: 0,
      startTime: new Date().toISOString().slice(0, 16),
    });
  };

  const viewSavedTrip = (trip: SavedTrip) => {
    setCurrentTripId(trip.id);
    setInputs(trip.inputs);
    setCarrier(trip.carrier);
    setHosConfig(trip.hosConfig);
    setRoute(trip.route);
    setLogs(trip.logs);
    setAllEvents(trip.events);
    setIntel(trip.intel || null);
    setActiveLogIdx(0);
    setIsTripCalculated(true);
    setHasUnsavedChanges(false);
    setLastSavedData({
      route: trip.route,
      logs: trip.logs,
      allEvents: trip.events,
      carrier: trip.carrier,
      inputs: trip.inputs,
    });
    setAppViewMode("VIEW_TRIP");
  };

  const deleteSavedTrip = (tripId: string) => {
    setTripToDelete(tripId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTrip = () => {
    if (!tripToDelete) return;

    const updatedTrips = savedTrips.filter((trip) => trip.id !== tripToDelete);
    setSavedTrips(updatedTrips);
    localStorage.setItem("savedTrips", JSON.stringify(updatedTrips));

    // If viewing the deleted trip, go back to list
    if (currentTripId === tripToDelete) {
      setAppViewMode("TRIP_LIST");
      setCurrentTripId(null);
    }

    // Reset delete dialog state
    setShowDeleteDialog(false);
    setTripToDelete(null);
  };

  const backToTripList = () => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      setAppViewMode("TRIP_LIST");
      setCurrentTripId(null);
    }
  };

  // Trip list helper functions
  const getFilteredAndSortedTrips = () => {
    let filtered = savedTrips.filter((trip) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        trip.inputs.origin.toLowerCase().includes(query) ||
        trip.inputs.pickup.toLowerCase().includes(query) ||
        trip.inputs.dropoff.toLowerCase().includes(query) ||
        trip.carrier.driverName.toLowerCase().includes(query) ||
        new Date(trip.timestamp).toLocaleDateString().includes(query)
      );
    });

    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "timestamp":
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case "route":
          aValue = `${a.inputs.origin} → ${a.inputs.dropoff}`.toLowerCase();
          bValue = `${b.inputs.origin} → ${b.inputs.dropoff}`.toLowerCase();
          break;
        case "miles":
          aValue = a.route?.distanceMiles || 0;
          bValue = b.route?.distanceMiles || 0;
          break;
        case "hours":
          aValue = a.route?.durationHours || 0;
          bValue = b.route?.durationHours || 0;
          break;
        case "days":
          aValue = a.logs.length;
          bValue = b.logs.length;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatRouteDisplay = (trip: SavedTrip) => {
    return `${trip.inputs.origin} → ${trip.inputs.pickup} → ${trip.inputs.dropoff}`;
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Use Django backend to calculate complete trip
      const tripData = await calculateFullTrip(inputs, carrier, hosConfig);

      setRoute(tripData.route);
      setAllEvents(tripData.events);
      setLogs(tripData.logs);
      setActiveLogIdx(0);
      setIntel(tripData.intel);
      setIsTripCalculated(true);
      setHasUnsavedChanges(true); // New calculation means unsaved changes
    } catch (error) {
      console.error("Calculation failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    setIsSaving(true);
    try {
      const tripData: SavedTrip = {
        id: currentTripId || Date.now().toString(),
        timestamp: new Date().toISOString(),
        route,
        logs,
        events: allEvents,
        carrier,
        inputs,
        hosConfig,
        intel,
      };

      let updatedTrips: SavedTrip[];
      if (currentTripId) {
        // Update existing trip
        updatedTrips = savedTrips.map((trip) =>
          trip.id === currentTripId ? tripData : trip,
        );
      } else {
        // Add new trip
        updatedTrips = [...savedTrips, tripData];
      }

      // Update state and localStorage
      setSavedTrips(updatedTrips);
      localStorage.setItem("savedTrips", JSON.stringify(updatedTrips));

      // Update state
      setCurrentTripId(tripData.id);
      setLastSavedData({ route, logs, allEvents, carrier, inputs });
      setHasUnsavedChanges(false);
      setShowSaveSuccess(true);

      console.log("Trip saved successfully:", tripData.id);
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save trip. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardTrip = () => {
    setRoute(undefined);
    setAllEvents([]);
    setLogs([]);
    setIntel(null);
    setActiveLogIdx(0);
    setIsTripCalculated(false);
    setHasUnsavedChanges(false);
    setLastSavedData(null);
    setShowDiscardDialog(false);
    setCurrentTripId(null);

    // If we're in new trip mode, go back to trip list
    if (appViewMode === "NEW_TRIP") {
      setAppViewMode("TRIP_LIST");
    }

    // Reset inputs to defaults
    setInputs({
      origin: "Los Angeles, CA",
      pickup: "Denver, CO",
      dropoff: "Chicago, IL",
      cycleHoursUsed: 0,
      startTime: new Date().toISOString().slice(0, 16),
    });
  };

  const confirmDiscard = () => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true);
    } else {
      handleDiscardTrip();
    }
  };

  const updateShiftRule = useCallback(
    (key: keyof typeof hosConfig.shiftRules, value: string) => {
      setHosConfig((prev) => ({
        ...prev,
        shiftRules: { ...prev.shiftRules, [key]: parseFloat(value) || 0 },
      }));
    },
    [],
  );

  const updateCarrier = useCallback((key: keyof CarrierInfo, value: string) => {
    setCarrier((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Optimized input update handlers to prevent expensive re-renders
  const updateOrigin = useCallback((value: string) => {
    setInputs((prev) => ({ ...prev, origin: value }));
  }, []);

  const updatePickup = useCallback((value: string) => {
    setInputs((prev) => ({ ...prev, pickup: value }));
  }, []);

  const updateDropoff = useCallback((value: string) => {
    setInputs((prev) => ({ ...prev, dropoff: value }));
  }, []);

  const updateStartTime = useCallback((value: string) => {
    setInputs((prev) => ({ ...prev, startTime: value }));
  }, []);

  const handlePrint = () => {
    // Mark print content for visibility
    const printSections = document.querySelectorAll('[data-print="true"]');
    printSections.forEach((section) => {
      section.setAttribute("data-print", "true");
    });

    // Trigger print
    window.print();
  };

  const renderTripList = () => (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <AppBar
        position="sticky"
        elevation={1}
        sx={{ backgroundColor: "white", color: "inherit" }}
      >
        <Toolbar>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ flexGrow: 1 }}
          >
            <Box
              sx={{
                backgroundColor: "primary.main",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 48,
              }}
            >
              <TruckIcon sx={{ color: "white", fontSize: 28 }} />
            </Box>
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: "bold", color: "text.primary" }}
            >
              RouteLog{" "}
              <Box
                component="span"
                sx={{ color: "primary.main", fontWeight: 900 }}
              >
                PRO
              </Box>
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button
              startIcon={<Plus size={20} />}
              onClick={startNewTrip}
              variant="contained"
              color="primary"
              size="large"
              sx={{
                py: 1.5,
                px: 3,
                fontWeight: "bold",
                boxShadow: "0 4px 14px 0 rgba(37, 99, 235, 0.3)",
              }}
            >
              New Trip
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        <Stack spacing={4}>
          {/* Page Header with Controls */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "start", sm: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: "bold",
                  color: "text.primary",
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <History size={32} />
                Trip History
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {savedTrips.length} trip{savedTrips.length !== 1 ? "s" : ""}{" "}
                saved • Manage your routes and create new trip plans
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              {/* View Toggle */}
              <ToggleButtonGroup
                value={listViewMode}
                exclusive
                onChange={(e, newMode) => newMode && setListViewMode(newMode)}
                size="small"
                sx={{ display: { xs: "none", sm: "flex" } }}
              >
                <ToggleButton value="table">
                  <Grid3X3 size={18} style={{ marginRight: 8 }} />
                  Table
                </ToggleButton>
                <ToggleButton value="cards">
                  <LayoutGrid size={18} style={{ marginRight: 8 }} />
                  Cards
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>

          {savedTrips.length === 0 ? (
            /* Empty State */
            <Paper
              elevation={1}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 400,
                textAlign: "center",
                p: 4,
              }}
            >
              <MapPin size={64} color="#9ca3af" style={{ marginBottom: 24 }} />
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", mb: 2, color: "text.secondary" }}
              >
                No Trips Yet
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 4, maxWidth: 400 }}
              >
                Start planning your first trip with our advanced route
                calculation and HOS compliance system. Create professional ELD
                logs in minutes.
              </Typography>
              <Button
                startIcon={<Plus size={20} />}
                onClick={startNewTrip}
                variant="contained"
                color="primary"
                size="large"
                sx={{
                  py: 1.5,
                  px: 4,
                  fontWeight: "bold",
                  boxShadow: "0 4px 14px 0 rgba(37, 99, 235, 0.3)",
                }}
              >
                Create Your First Trip
              </Button>
            </Paper>
          ) : (
            <>
              {/* Search and Filter Bar */}
              <Paper elevation={1} sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems="center"
                >
                  <TextField
                    placeholder="Search trips by route, driver, or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    sx={{ flex: 1, minWidth: { xs: "100%", sm: 300 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={20} />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ display: { xs: "none", sm: "block" } }}
                    >
                      {getFilteredAndSortedTrips().length} of{" "}
                      {savedTrips.length} trips
                    </Typography>

                    {/* Mobile View Toggle */}
                    <ToggleButtonGroup
                      value={listViewMode}
                      exclusive
                      onChange={(e, newMode) =>
                        newMode && setListViewMode(newMode)
                      }
                      size="small"
                      sx={{ display: { xs: "flex", sm: "none" } }}
                    >
                      <ToggleButton value="table">
                        <Grid3X3 size={16} />
                      </ToggleButton>
                      <ToggleButton value="cards">
                        <LayoutGrid size={16} />
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                </Stack>
              </Paper>

              {/* Trip List Content */}
              {listViewMode === "table" ? (
                /* Table View */
                <TableContainer component={Paper} elevation={1}>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "grey.50" }}>
                        <TableCell>
                          <TableSortLabel
                            active={sortField === "timestamp"}
                            direction={
                              sortField === "timestamp" ? sortDirection : "asc"
                            }
                            onClick={() => handleSort("timestamp")}
                            sx={{ fontWeight: "bold" }}
                          >
                            Date
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortField === "route"}
                            direction={
                              sortField === "route" ? sortDirection : "asc"
                            }
                            onClick={() => handleSort("route")}
                            sx={{ fontWeight: "bold" }}
                          >
                            Route
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right">
                          <TableSortLabel
                            active={sortField === "miles"}
                            direction={
                              sortField === "miles" ? sortDirection : "asc"
                            }
                            onClick={() => handleSort("miles")}
                            sx={{ fontWeight: "bold" }}
                          >
                            Miles
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right">
                          <TableSortLabel
                            active={sortField === "hours"}
                            direction={
                              sortField === "hours" ? sortDirection : "asc"
                            }
                            onClick={() => handleSort("hours")}
                            sx={{ fontWeight: "bold" }}
                          >
                            Hours
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right">
                          <TableSortLabel
                            active={sortField === "days"}
                            direction={
                              sortField === "days" ? sortDirection : "asc"
                            }
                            onClick={() => handleSort("days")}
                            sx={{ fontWeight: "bold" }}
                          >
                            Days
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: "bold" }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getFilteredAndSortedTrips().map((trip) => (
                        <TableRow
                          key={trip.id}
                          hover
                          sx={{
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                          }}
                          onClick={() => viewSavedTrip(trip)}
                        >
                          <TableCell>
                            <Stack>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: "medium" }}
                              >
                                {new Date(trip.timestamp).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  },
                                )}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {new Date(trip.timestamp).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: "medium",
                                  color: "success.main",
                                }}
                              >
                                ↗ {trip.inputs.origin}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ color: "warning.main" }}
                              >
                                📦 {trip.inputs.pickup}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ color: "error.main" }}
                              >
                                ↘ {trip.inputs.dropoff}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold" }}
                            >
                              {trip.route?.distanceMiles || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold" }}
                            >
                              {trip.route?.durationHours
                                ? trip.route.durationHours.toFixed(1)
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold" }}
                            >
                              {trip.logs.length}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="center"
                            >
                              <Tooltip title="View Trip">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewSavedTrip(trip);
                                  }}
                                  sx={{ color: "primary.main" }}
                                >
                                  <Eye size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Trip">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewSavedTrip(trip);
                                  }}
                                  sx={{ color: "secondary.main" }}
                                >
                                  <Edit size={16} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Trip">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSavedTrip(trip.id);
                                  }}
                                  sx={{
                                    color: "error.main",
                                    "&:hover": {
                                      backgroundColor: "error.main",
                                      color: "white",
                                    },
                                  }}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                /* Card View */
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, 1fr)",
                      lg: "repeat(3, 1fr)",
                    },
                    gap: 3,
                  }}
                >
                  {getFilteredAndSortedTrips().map((trip) => (
                    <Card
                      key={trip.id}
                      elevation={2}
                      sx={{
                        transition:
                          "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: "0 8px 25px 0 rgba(0, 0, 0, 0.1)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Stack spacing={2}>
                          {/* Trip Header */}
                          <Box>
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              sx={{ mb: 1 }}
                            >
                              <Chip
                                label={`Trip ${trip.id.slice(-6)}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: "bold" }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <Calendar size={12} />
                                {new Date(trip.timestamp).toLocaleDateString()}
                              </Typography>
                            </Stack>
                          </Box>

                          {/* Route Summary */}
                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1, fontWeight: "medium" }}
                            >
                              Route
                            </Typography>
                            <Stack spacing={0.5}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: "bold",
                                  color: "success.main",
                                  fontSize: "0.875rem",
                                }}
                              >
                                ↗ {trip.inputs.origin}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: "bold",
                                  color: "warning.main",
                                  fontSize: "0.875rem",
                                }}
                              >
                                📦 {trip.inputs.pickup}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: "bold",
                                  color: "error.main",
                                  fontSize: "0.875rem",
                                }}
                              >
                                ↘ {trip.inputs.dropoff}
                              </Typography>
                            </Stack>
                          </Box>

                          {/* Trip Stats */}
                          {trip.route && (
                            <Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 1, fontWeight: "medium" }}
                              >
                                Trip Stats
                              </Typography>
                              <Stack direction="row" spacing={2}>
                                <Box>
                                  <Typography
                                    variant="h6"
                                    sx={{
                                      fontWeight: "bold",
                                      color: "primary.main",
                                    }}
                                  >
                                    {trip.route.distanceMiles}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Miles
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {trip.route.durationHours.toFixed(1)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Hours
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {trip.logs.length}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Days
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>
                          )}

                          {/* Action Buttons */}
                          <Stack direction="row" spacing={1} sx={{ pt: 2 }}>
                            <Button
                              startIcon={<Eye size={16} />}
                              onClick={() => viewSavedTrip(trip)}
                              variant="contained"
                              color="primary"
                              size="small"
                              sx={{ flex: 1, fontWeight: "bold" }}
                            >
                              View
                            </Button>
                            <Button
                              startIcon={<Edit size={16} />}
                              onClick={() => viewSavedTrip(trip)}
                              variant="outlined"
                              color="primary"
                              size="small"
                              sx={{ flex: 1, fontWeight: "bold" }}
                            >
                              Edit
                            </Button>
                            <IconButton
                              onClick={() => deleteSavedTrip(trip.id)}
                              size="small"
                              sx={{
                                color: "error.main",
                                "&:hover": {
                                  backgroundColor: "error.main",
                                  color: "white",
                                },
                              }}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );

  const renderTripView = () => (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        {/* Header */}
        <AppBar
          position="sticky"
          elevation={1}
          sx={{ backgroundColor: "white", color: "inherit" }}
        >
          <Toolbar>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ flexGrow: 1 }}
            >
              {/* Back Button for non-list views */}
              {appViewMode !== "TRIP_LIST" && (
                <IconButton
                  onClick={backToTripList}
                  sx={{
                    mr: 1,
                    backgroundColor: "rgba(37, 99, 235, 0.1)",
                    "&:hover": {
                      backgroundColor: "rgba(37, 99, 235, 0.2)",
                    },
                  }}
                >
                  <ChevronLeft size={24} color="#2563eb" />
                </IconButton>
              )}

              <Box
                sx={{
                  backgroundColor: "primary.main",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 48,
                }}
              >
                <TruckIcon sx={{ color: "white", fontSize: 28 }} />
              </Box>
              <Typography
                variant="h5"
                component="h1"
                sx={{ fontWeight: "bold", color: "text.primary" }}
              >
                RouteLog{" "}
                <Box
                  component="span"
                  sx={{ color: "primary.main", fontWeight: 900 }}
                >
                  PRO
                </Box>
              </Typography>

              {/* View Title */}
              {appViewMode === "NEW_TRIP" && (
                <Chip
                  label="New Trip"
                  color="primary"
                  variant="outlined"
                  sx={{ ml: 2, fontWeight: "bold" }}
                />
              )}

              {appViewMode === "VIEW_TRIP" && currentTripId && (
                <Chip
                  label={`Trip ${currentTripId.slice(-6)}`}
                  color="secondary"
                  variant="outlined"
                  sx={{ ml: 2, fontWeight: "bold" }}
                />
              )}

              {/* Status Indicator */}
              {isTripCalculated && (
                <Chip
                  size="small"
                  label={hasUnsavedChanges ? "Unsaved Changes" : "Saved"}
                  icon={
                    hasUnsavedChanges ? (
                      <Clock size={14} />
                    ) : (
                      <Check size={14} />
                    )
                  }
                  sx={{
                    backgroundColor: hasUnsavedChanges ? "#fef3c7" : "#dcfce7",
                    color: hasUnsavedChanges ? "#92400e" : "#166534",
                    border: `1px solid ${hasUnsavedChanges ? "#f59e0b" : "#16a34a"}`,
                    fontWeight: "bold",
                    fontSize: "0.75rem",
                  }}
                />
              )}
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<SettingsIcon />}
                onClick={() =>
                  setShowSettings(showSettings === "HOS" ? null : "HOS")
                }
                variant={showSettings === "HOS" ? "contained" : "outlined"}
                color="primary"
                size="small"
              >
                <Box sx={{ display: { xs: "none", sm: "inline" } }}>
                  HOS Rules
                </Box>
              </Button>
              <Button
                startIcon={<BusinessIcon />}
                onClick={() =>
                  setShowSettings(showSettings === "CARRIER" ? null : "CARRIER")
                }
                variant={showSettings === "CARRIER" ? "contained" : "outlined"}
                color="primary"
                size="small"
              >
                <Box sx={{ display: { xs: "none", sm: "inline" } }}>
                  Carrier Info
                </Box>
              </Button>
              <Button
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                variant="contained"
                color="secondary"
                size="small"
              >
                Print All Logs
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container
          maxWidth={false}
          sx={{ flex: 1, py: 3, "@media print": { display: "none" } }}
        >
          <Box sx={{ display: "flex", gap: 3, height: "calc(100vh - 140px)" }}>
            {/* Sidebar */}
            <Box
              sx={{
                width: { xs: "100%", lg: "25%" },
                height: "100%",
                overflowY: "auto",
                flexShrink: 0,
              }}
            >
              <Stack spacing={3}>
                {showSettings === "HOS" && (
                  <Card elevation={1}>
                    <CardContent>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <SettingsIcon sx={{ color: "primary.main" }} />
                          HOS Rules
                        </Typography>
                        <Button
                          onClick={() => setShowSettings(null)}
                          size="small"
                          color="primary"
                        >
                          Done
                        </Button>
                      </Stack>

                      <Stack spacing={2}>
                        <TextField
                          label="Max Driving (h)"
                          type="number"
                          variant="outlined"
                          size="small"
                          fullWidth
                          inputProps={{ step: "0.5" }}
                          value={hosConfig.shiftRules.maxDrivingHours}
                          onChange={(e) =>
                            updateShiftRule("maxDrivingHours", e.target.value)
                          }
                        />

                        <TextField
                          label="Max Duty Window (h)"
                          type="number"
                          variant="outlined"
                          size="small"
                          fullWidth
                          inputProps={{ step: "0.5" }}
                          value={hosConfig.shiftRules.maxDutyWindowHours}
                          onChange={(e) =>
                            updateShiftRule(
                              "maxDutyWindowHours",
                              e.target.value,
                            )
                          }
                        />

                        <Alert severity="info" sx={{ mt: 2 }}>
                          <Typography
                            variant="caption"
                            sx={{ fontStyle: "italic" }}
                          >
                            Compliance for: {hosConfig.label}
                          </Typography>
                        </Alert>
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {showSettings === "CARRIER" && (
                  <Card elevation={1}>
                    <CardContent>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                      >
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <BusinessIcon sx={{ color: "primary.main" }} />
                          Carrier Setup
                        </Typography>
                        <Button
                          onClick={() => setShowSettings(null)}
                          size="small"
                          color="primary"
                        >
                          Done
                        </Button>
                      </Stack>

                      <Stack spacing={2}>
                        {Object.keys(carrier).map((key) => (
                          <TextField
                            key={key}
                            label={key.replace(/([A-Z])/g, " $1")}
                            variant="outlined"
                            size="small"
                            fullWidth
                            value={(carrier as any)[key]}
                            onChange={(e) =>
                              updateCarrier(key as any, e.target.value)
                            }
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {!showSettings && (
                  <Card elevation={1}>
                    <CardContent>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: "bold",
                          mb: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <RouteIcon sx={{ color: "primary.main" }} />
                        Trip Details
                      </Typography>

                      <Box component="form" onSubmit={handleCalculate}>
                        <Stack spacing={2}>
                          <TextField
                            label="Start/Yard"
                            fullWidth
                            variant="outlined"
                            value={inputs.origin}
                            onChange={(e) => updateOrigin(e.target.value)}
                            placeholder="Origin"
                          />

                          <TextField
                            label="Pickup Location (1h Load)"
                            fullWidth
                            variant="outlined"
                            value={inputs.pickup}
                            onChange={(e) => updatePickup(e.target.value)}
                            placeholder="Pickup"
                          />

                          <TextField
                            label="Dropoff Location (1h Unload)"
                            fullWidth
                            variant="outlined"
                            value={inputs.dropoff}
                            onChange={(e) => updateDropoff(e.target.value)}
                            placeholder="Dropoff"
                          />

                          <TextField
                            label="Departure Date/Time"
                            fullWidth
                            variant="outlined"
                            type="datetime-local"
                            value={inputs.startTime}
                            onChange={(e) => updateStartTime(e.target.value)}
                            InputLabelProps={{
                              shrink: true,
                            }}
                          />

                          <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            disabled={isLoading}
                            endIcon={
                              isLoading ? (
                                <CircularProgress size={18} color="inherit" />
                              ) : (
                                <ChevronRight size={18} />
                              )
                            }
                            sx={{
                              py: 1.5,
                              fontWeight: "bold",
                              fontSize: "1rem",
                              boxShadow: "0 4px 14px 0 rgba(37, 99, 235, 0.3)",
                            }}
                          >
                            {isLoading
                              ? "Calculating..."
                              : "Generate Trip Plan"}
                          </Button>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {intel && (
                  <Alert
                    severity="info"
                    icon={<AlertCircle size={16} />}
                    sx={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                  >
                    <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                      "{intel}"
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </Box>

            {/* Main Content Area */}
            <Box
              sx={{
                flex: 1,
                height: "100%",
                overflowY: "auto",
              }}
            >
              <Stack spacing={3} sx={{ pb: 3 }}>
                {/* Map Section */}
                <Paper
                  elevation={1}
                  sx={{
                    height: 300,
                    position: "relative",
                    "@media print": { display: "none" },
                  }}
                >
                  <RouteMap route={route} events={allEvents} />
                  {route && (
                    <Paper
                      elevation={3}
                      sx={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        p: 2,
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        pointerEvents: "none",
                        zIndex: 10,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: "bold",
                          color: "text.secondary",
                          display: "block",
                          mb: 1,
                        }}
                      >
                        TRIP STATS
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={2}
                        divider={<Box sx={{ width: 1, bgcolor: "divider" }} />}
                      >
                        <Box textAlign="center">
                          <Typography
                            variant="h5"
                            sx={{ fontWeight: "black", color: "primary.main" }}
                          >
                            {route.distanceMiles}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: "bold", color: "text.secondary" }}
                          >
                            MILES
                          </Typography>
                        </Box>
                        <Box textAlign="center">
                          <Typography variant="h5" sx={{ fontWeight: "black" }}>
                            {route.durationHours.toFixed(1)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: "bold", color: "text.secondary" }}
                          >
                            EST. HOURS
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  )}
                </Paper>

                {logs.length > 0 ? (
                  <Stack spacing={3}>
                    {/* Save/Discard Action Bar */}
                    <Fade in={isTripCalculated}>
                      <Paper
                        elevation={2}
                        sx={{
                          p: 2,
                          background: hasUnsavedChanges
                            ? "linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)"
                            : "linear-gradient(135deg, #dcfce7 0%, #16a34a 100%)",
                          border: `2px solid ${hasUnsavedChanges ? "#f59e0b" : "#16a34a"}`,
                          "@media print": { display: "none" },
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            {hasUnsavedChanges ? (
                              <>
                                <Clock size={18} color="#d97706" />
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "bold", color: "#92400e" }}
                                >
                                  Unsaved Changes - Trip plan ready to save
                                </Typography>
                              </>
                            ) : (
                              <>
                                <Check size={18} color="#166534" />
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "bold", color: "#166534" }}
                                >
                                  Trip Saved - All changes saved successfully
                                </Typography>
                              </>
                            )}
                          </Stack>

                          <Stack direction="row" spacing={2}>
                            <Button
                              variant="outlined"
                              size="large"
                              onClick={confirmDiscard}
                              startIcon={<X size={18} />}
                              sx={{
                                borderColor: "#e11d48",
                                color: "#e11d48",
                                fontWeight: "bold",
                                px: 3,
                                "&:hover": {
                                  borderColor: "#be185d",
                                  backgroundColor: "#fce7e7",
                                },
                              }}
                            >
                              Discard
                            </Button>

                            <Button
                              variant="contained"
                              size="large"
                              onClick={handleSaveTrip}
                              disabled={isSaving}
                              startIcon={
                                isSaving ? (
                                  <CircularProgress size={18} color="inherit" />
                                ) : (
                                  <Save size={18} />
                                )
                              }
                              sx={{
                                backgroundColor: "#16a34a",
                                color: "white",
                                fontWeight: "bold",
                                px: 4,
                                boxShadow:
                                  "0 4px 14px 0 rgba(22, 163, 74, 0.3)",
                                "&:hover": {
                                  backgroundColor: "#15803d",
                                },
                                "&:disabled": {
                                  backgroundColor: "#9ca3af",
                                },
                              }}
                            >
                              {isSaving ? "Saving..." : "Save Trip"}
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    </Fade>

                    {/* View Mode Selector and Navigation */}
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ sm: "center" }}
                      justifyContent="space-between"
                      spacing={2}
                      sx={{ "@media print": { display: "none" } }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <ToggleButtonGroup
                          value={tripViewMode}
                          exclusive
                          onChange={(e, newMode) =>
                            newMode && setTripViewMode(newMode)
                          }
                          size="small"
                        >
                          <ToggleButton value="LOGS">
                            <ListIcon sx={{ mr: 1 }} />
                            Logs
                          </ToggleButton>
                          <ToggleButton value="INSTRUCTIONS">
                            <RouteIcon sx={{ mr: 1 }} />
                            Instructions
                          </ToggleButton>
                        </ToggleButtonGroup>

                        {tripViewMode === "LOGS" && (
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <IconButton
                              onClick={() =>
                                setActiveLogIdx((prev) => Math.max(0, prev - 1))
                              }
                              disabled={activeLogIdx === 0}
                              size="small"
                            >
                              <ChevronLeft />
                            </IconButton>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold", px: 2 }}
                            >
                              Day {activeLogIdx + 1} of {logs.length}
                            </Typography>
                            <IconButton
                              onClick={() =>
                                setActiveLogIdx((prev) =>
                                  Math.min(logs.length - 1, prev + 1),
                                )
                              }
                              disabled={activeLogIdx === logs.length - 1}
                              size="small"
                            >
                              <ChevronRight />
                            </IconButton>
                          </Stack>
                        )}
                      </Stack>

                      {tripViewMode === "LOGS" && (
                        <Chip
                          label={new Date(
                            logs[activeLogIdx].date,
                          ).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          variant="outlined"
                          sx={{ fontWeight: "bold" }}
                        />
                      )}
                    </Stack>

                    {/* Content based on view mode */}
                    {tripViewMode === "LOGS" ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          minHeight: "500px",
                          width: "100%",
                        }}
                      >
                        <EldLogGrid
                          log={logs[activeLogIdx]}
                          carrier={carrier}
                          origin={inputs.origin}
                          destination={inputs.dropoff}
                        />
                      </Box>
                    ) : (
                      <Paper elevation={1} sx={{ p: 4 }}>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: "bold",
                            mb: 3,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <RouteIcon sx={{ color: "primary.main" }} />
                          Driving Instructions & HOS Guidance
                        </Typography>

                        <Stack spacing={2}>
                          {route?.instructions.map((step, i) => (
                            <Paper
                              key={i}
                              variant="outlined"
                              sx={{ p: 2, backgroundColor: "grey.50" }}
                            >
                              <Stack
                                direction="row"
                                spacing={2}
                                alignItems="flex-start"
                              >
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    backgroundColor: "primary.light",
                                    color: "primary.main",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "bold",
                                    fontSize: "0.875rem",
                                    flexShrink: 0,
                                  }}
                                >
                                  {i + 1}
                                </Box>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "medium", pt: 0.5 }}
                                >
                                  {step}
                                </Typography>
                              </Stack>
                            </Paper>
                          ))}

                          <Alert severity="warning" sx={{ mt: 3 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: "bold", mb: 1 }}
                            >
                              <Activity
                                size={18}
                                style={{ display: "inline", marginRight: 8 }}
                              />
                              Driver Compliance Warning (FMCSA 70h/8d Cycle)
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              This route spans {route?.durationHours.toFixed(1)}{" "}
                              estimated driving hours. Based on the{" "}
                              <strong>
                                Property-carrying {hosConfig.label}
                              </strong>{" "}
                              profile, the system has automatically calculated:
                            </Typography>
                            <Box
                              component="ul"
                              sx={{ pl: 2, mt: 1, "& li": { mb: 0.5 } }}
                            >
                              <li>
                                <Typography variant="body2">
                                  <strong>1 Hour</strong> for Pickup/Loading
                                  operations.
                                </Typography>
                              </li>
                              <li>
                                <Typography variant="body2">
                                  <strong>1 Hour</strong> for Dropoff/Unloading
                                  operations.
                                </Typography>
                              </li>
                              <li>
                                <Typography variant="body2">
                                  <strong>30-minute</strong> mandatory breaks
                                  after 8 hours of driving.
                                </Typography>
                              </li>
                              <li>
                                <Typography variant="body2">
                                  <strong>10-hour</strong> daily rest periods.
                                </Typography>
                              </li>
                              <li>
                                <Typography variant="body2">
                                  <strong>Fueling stops</strong> at least once
                                  every 1,000 miles.
                                </Typography>
                              </li>
                            </Box>
                          </Alert>
                        </Stack>
                      </Paper>
                    )}

                    {/* Print-only section */}
                    <Box
                      data-print="true"
                      sx={{
                        display: "none",
                        "@media print": {
                          display: "block",
                          "& *": {
                            visibility: "visible !important",
                          },
                        },
                        mt: 6,
                      }}
                    >
                      {logs.map((log) => (
                        <Box
                          key={log.date}
                          sx={{
                            pageBreakAfter: "always",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "100vh",
                            "@media print": {
                              minHeight: "100vh",
                              pageBreakAfter: "always",
                            },
                          }}
                        >
                          <EldLogGrid
                            log={log}
                            carrier={carrier}
                            origin={inputs.origin}
                            destination={inputs.dropoff}
                          />
                        </Box>
                      ))}
                    </Box>
                  </Stack>
                ) : (
                  <Paper
                    elevation={1}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 500,
                      textAlign: "center",
                      p: 4,
                    }}
                  >
                    <Activity
                      size={48}
                      color="disabled"
                      style={{ marginBottom: 16 }}
                    />
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Awaiting Trip Inputs
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ maxWidth: 300 }}
                    >
                      The system will generate a realistic highway route and
                      HOS-compliant daily log sheets based on a 70hr/8day
                      property-carrying cycle.
                    </Typography>
                  </Paper>
                )}
              </Stack>
            </Box>
          </Box>
        </Container>

        {/* Footer */}
        <Paper
          elevation={0}
          sx={{
            backgroundColor: "grey.800",
            color: "grey.300",
            py: 1,
            px: 3,
            "@media print": { display: "none" },
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="caption">
                HOS Profile: {hosConfig.label} (70/8)
              </Typography>
              <Box sx={{ color: "grey.500" }}>|</Box>
              <Typography variant="caption">
                Property-Carrying Interstate Mode
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "success.main",
                  }}
                />
                <Typography variant="caption">Online</Typography>
              </Stack>
              <Typography variant="caption">Compliance Rule v24.1</Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* Discard Confirmation Dialog */}
        <Dialog
          open={showDiscardDialog}
          onClose={() => setShowDiscardDialog(false)}
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AlertCircle size={24} color="#dc2626" />
              <Typography variant="h6" fontWeight="bold">
                Discard Trip Plan?
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: "1rem", mb: 2 }}>
              You have unsaved changes to your trip plan. If you discard now,
              all calculated route information and ELD logs will be permanently
              lost.
            </DialogContentText>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="medium">
                This action cannot be undone. Make sure you don't need this trip
                data before proceeding.
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button
              onClick={() => setShowDiscardDialog(false)}
              variant="outlined"
              size="large"
              sx={{
                px: 3,
                fontWeight: "bold",
                borderColor: "#6b7280",
                color: "#6b7280",
              }}
            >
              Keep Working
            </Button>
            <Button
              onClick={handleDiscardTrip}
              variant="contained"
              size="large"
              sx={{
                px: 3,
                fontWeight: "bold",
                backgroundColor: "#dc2626",
                "&:hover": {
                  backgroundColor: "#b91c1c",
                },
              }}
              startIcon={<X size={18} />}
            >
              Discard Trip
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Trash2 size={24} color="#dc2626" />
              <Typography variant="h6" fontWeight="bold">
                Delete Trip?
              </Typography>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: "1rem", mb: 2 }}>
              Are you sure you want to permanently delete this trip? This will
              remove all route information, ELD logs, and trip data.
            </DialogContentText>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="medium">
                This action cannot be undone. The trip will be permanently
                removed from your history.
              </Typography>
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outlined"
              size="large"
              sx={{
                px: 3,
                fontWeight: "bold",
                borderColor: "#6b7280",
                color: "#6b7280",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteTrip}
              variant="contained"
              size="large"
              sx={{
                px: 3,
                fontWeight: "bold",
                backgroundColor: "#dc2626",
                "&:hover": {
                  backgroundColor: "#b91c1c",
                },
              }}
              startIcon={<Trash2 size={18} />}
            >
              Delete Trip
            </Button>
          </DialogActions>
        </Dialog>

        {/* Save Success Notification */}
        <Snackbar
          open={showSaveSuccess}
          autoHideDuration={4000}
          onClose={() => setShowSaveSuccess(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={() => setShowSaveSuccess(false)}
            severity="success"
            sx={{
              width: "100%",
              fontWeight: "bold",
              fontSize: "1rem",
            }}
            iconMapping={{
              success: <Check size={20} />,
            }}
          >
            Trip saved successfully! Ready for DOT compliance.
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );

  // Main render function with view routing
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {appViewMode === "TRIP_LIST" ? renderTripList() : renderTripView()}
    </ThemeProvider>
  );
};

export default App;
