import React, { useState, useMemo } from "react";
import { SavedTrip, AppViewMode } from "../../../shared/types";
import { saveTripsToStorage } from "../../../shared/utils";
import { api, handleApiError } from "../../../shared/services";
import {
  Box,
  Stack,
  Typography,
  Button,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  Chip,
  Badge,
  alpha,
  useTheme,
  Fade,
  Zoom,
  Slide,
  Grow,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Plus,
  History,
  MapPin,
  Search,
  Grid3X3,
  LayoutGrid,
  Filter,
  X,
  Calendar,
  Truck,
  Clock,
  ArrowDownUp,
  SortAsc,
  SortDesc,
} from "lucide-react";
import TripLayout from "../../../shared/components/layouts/TripLayout";
import { TripTable, TripCards } from "../components";
import ConfirmationDialog from "../../../shared/components/ui/ConfirmationDialog";

interface TripListPageProps {
  savedTrips: SavedTrip[];
  setSavedTrips: (trips: SavedTrip[]) => void;
  setAppViewMode: (mode: AppViewMode) => void;
  setCurrentTripId: (id: string | null) => void;
}

type SortOption = "date-desc" | "date-asc" | "origin" | "driver";

const TripListPage: React.FC<TripListPageProps> = ({
  savedTrips,
  setSavedTrips,
  setAppViewMode,
  setCurrentTripId,
}) => {
  const theme = useTheme();
  const [listViewMode, setListViewMode] = useState<"table" | "cards">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [showFilters, setShowFilters] = useState(false);

  const startNewTrip = () => {
    setCurrentTripId(null);
    setAppViewMode("NEW_TRIP");
  };

  const viewSavedTrip = (trip: SavedTrip) => {
    setCurrentTripId(trip.id);
    setAppViewMode("VIEW_TRIP");
  };

  const deleteSavedTrip = (tripId: string) => {
    setTripToDelete(tripId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;

    try {
      // Delete from database
      await api.deleteTrip(tripToDelete);

      // Update local state
      const updatedTrips = savedTrips.filter(
        (trip) => trip.id !== tripToDelete,
      );
      setSavedTrips(updatedTrips);

      // Update localStorage as backup
      saveTripsToStorage(updatedTrips);
    } catch (error) {
      console.error("Failed to delete trip:", error);
      // Show error to user if needed
    } finally {
      setShowDeleteDialog(false);
      setTripToDelete(null);
    }
  };

  const getFilteredAndSortedTrips = useMemo(() => {
    let trips = [...savedTrips];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      trips = trips.filter(
        (trip) =>
          trip.inputs.origin.toLowerCase().includes(query) ||
          trip.inputs.pickup.toLowerCase().includes(query) ||
          trip.inputs.dropoff.toLowerCase().includes(query) ||
          trip.carrier.driverName.toLowerCase().includes(query) ||
          new Date(trip.timestamp).toLocaleDateString().includes(query),
      );
    }

    // Apply sorting
    trips.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        case "date-asc":
          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        case "origin":
          return a.inputs.origin.localeCompare(b.inputs.origin);
        case "driver":
          return a.carrier.driverName.localeCompare(b.carrier.driverName);
        default:
          return 0;
      }
    });

    return trips;
  }, [savedTrips, searchQuery, sortBy]);

  const clearSearch = () => setSearchQuery("");

  const getSortIcon = () => {
    switch (sortBy) {
      case "date-desc":
        return <SortDesc size={16} />;
      case "date-asc":
        return <SortAsc size={16} />;
      default:
        return <ArrowDownUp size={16} />;
    }
  };

  const headerActions = (
    <Tooltip title="Create new trip" arrow>
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
          borderRadius: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
          "&:hover": {
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            transform: "translateY(-2px)",
            boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
          },
          transition: "all 0.2s ease-in-out",
        }}
      >
        New Trip
      </Button>
    </Tooltip>
  );

  const titleContent = (
    <>
      RouteLog
      <Box
        component="span"
        sx={{
          color: theme.palette.primary.main,
          ml: 0.5,
          fontWeight: 900,
        }}
      >
        PRO
      </Box>
    </>
  );

  return (
    <TripLayout
      title={titleContent as any}
      subtitle="Intelligent Route Planning & ELD Compliance"
      actions={headerActions}
    >
      <Fade in={true} timeout={500}>
        <Stack spacing={3}>
          {/* Page Header with Controls */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "start", md: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "2rem", md: "2.5rem" },
                  background: `linear-gradient(135deg, ${theme.palette.text.primary} 30%, ${theme.palette.primary.main} 100%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  mb: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <History size={40} />
                Trip History
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 600 }}
              >
                Manage your routes, track deliveries, and analyze performance
                metrics
              </Typography>
            </Box>

            <Badge
              badgeContent={savedTrips.length}
              color="primary"
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                },
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  px: 3,
                  py: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Truck size={20} color={theme.palette.primary.main} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {savedTrips.length} Total Trips
                  </Typography>
                </Stack>
              </Paper>
            </Badge>
          </Stack>

          {savedTrips.length === 0 ? (
            /* Enhanced Empty State with animation */
            <Grow in={true} timeout={600}>
              <Paper
                elevation={0}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 500,
                  textAlign: "center",
                  p: 6,
                  borderRadius: 4,
                  background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                <Zoom in={true} timeout={800}>
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 4,
                    }}
                  >
                    <MapPin size={64} color={theme.palette.primary.main} />
                  </Box>
                </Zoom>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                  Ready for Your First Journey?
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 4, maxWidth: 500, fontSize: "1.1rem" }}
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
                    py: 2,
                    px: 6,
                    fontWeight: "bold",
                    borderRadius: 3,
                    fontSize: "1.1rem",
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 8px 20px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
                    "&:hover": {
                      transform: "scale(1.05)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  Create Your First Trip
                </Button>
              </Paper>
            </Grow>
          ) : (
            <>
              {/* Enhanced Search and Filter Bar */}
              <Slide direction="down" in={true} timeout={500}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    bgcolor: alpha(theme.palette.background.paper, 0.8),
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      alignItems="center"
                    >
                      <TextField
                        placeholder="Search by route, driver, or date..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="medium"
                        fullWidth
                        sx={{
                          flex: 1,
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 3,
                            bgcolor: theme.palette.background.paper,
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search
                                size={20}
                                color={theme.palette.text.secondary}
                              />
                            </InputAdornment>
                          ),
                          endAdornment: searchQuery && (
                            <InputAdornment position="end">
                              <IconButton size="small" onClick={clearSearch}>
                                <X size={16} />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="Toggle filters" arrow>
                          <IconButton
                            onClick={() => setShowFilters(!showFilters)}
                            sx={{
                              bgcolor: showFilters
                                ? alpha(theme.palette.primary.main, 0.1)
                                : "transparent",
                              color: showFilters
                                ? theme.palette.primary.main
                                : theme.palette.text.secondary,
                              borderRadius: 2,
                            }}
                          >
                            <Filter size={20} />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Sort options" arrow>
                          <Button
                            startIcon={getSortIcon()}
                            onClick={() => {
                              const options: SortOption[] = [
                                "date-desc",
                                "date-asc",
                                "origin",
                                "driver",
                              ];
                              const currentIndex = options.indexOf(sortBy);
                              const nextIndex =
                                (currentIndex + 1) % options.length;
                              setSortBy(options[nextIndex]);
                            }}
                            variant="outlined"
                            sx={{
                              borderRadius: 2,
                              borderColor: alpha(theme.palette.divider, 0.2),
                              color: theme.palette.text.secondary,
                              "&:hover": {
                                borderColor: theme.palette.primary.main,
                                bgcolor: alpha(
                                  theme.palette.primary.main,
                                  0.02,
                                ),
                              },
                            }}
                          >
                            {sortBy === "date-desc" && "Newest First"}
                            {sortBy === "date-asc" && "Oldest First"}
                            {sortBy === "origin" && "By Origin"}
                            {sortBy === "driver" && "By Driver"}
                          </Button>
                        </Tooltip>

                        {/* View Toggle */}
                        <ToggleButtonGroup
                          value={listViewMode}
                          exclusive
                          onChange={(e, newMode) =>
                            newMode && setListViewMode(newMode)
                          }
                          size="small"
                          sx={{
                            bgcolor: theme.palette.background.paper,
                            borderRadius: 2,
                            "& .MuiToggleButton-root": {
                              border: "none",
                              px: 2,
                              py: 1,
                              "&.Mui-selected": {
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                              },
                            },
                          }}
                        >
                          <ToggleButton value="table">
                            <Tooltip title="Table view" arrow>
                              <Grid3X3 size={18} />
                            </Tooltip>
                          </ToggleButton>
                          <ToggleButton value="cards">
                            <Tooltip title="Cards view" arrow>
                              <LayoutGrid size={18} />
                            </Tooltip>
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Stack>
                    </Stack>

                    {/* Expandable Filters */}
                    {showFilters && (
                      <Fade in={showFilters}>
                        <Box
                          sx={{
                            pt: 2,
                            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Chip
                              icon={<Calendar size={14} />}
                              label="Last 7 days"
                              variant="outlined"
                              onClick={() => {}}
                              sx={{ borderRadius: 2 }}
                            />
                            <Chip
                              icon={<Clock size={14} />}
                              label="Completed"
                              variant="outlined"
                              onClick={() => {}}
                              sx={{ borderRadius: 2 }}
                            />
                            <Chip
                              icon={<Truck size={14} />}
                              label="In Progress"
                              variant="outlined"
                              onClick={() => {}}
                              sx={{ borderRadius: 2 }}
                            />
                          </Stack>
                        </Box>
                      </Fade>
                    )}

                    {/* Search Results Summary */}
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2" color="text.secondary">
                        Showing {getFilteredAndSortedTrips.length} of{" "}
                        {savedTrips.length} trips
                      </Typography>
                      {searchQuery && (
                        <Chip
                          label={`Search: "${searchQuery}"`}
                          onDelete={clearSearch}
                          size="small"
                          sx={{ borderRadius: 2 }}
                        />
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              </Slide>

              {/* Trip List Content with transitions */}
              <Fade key={listViewMode} in={true} timeout={300}>
                <Box>
                  {listViewMode === "table" ? (
                    <TripTable
                      trips={getFilteredAndSortedTrips}
                      onViewTrip={viewSavedTrip}
                      onDeleteTrip={deleteSavedTrip}
                    />
                  ) : (
                    <TripCards
                      trips={getFilteredAndSortedTrips}
                      onViewTrip={viewSavedTrip}
                      onDeleteTrip={deleteSavedTrip}
                    />
                  )}
                </Box>
              </Fade>
            </>
          )}
        </Stack>
      </Fade>

      {/* Enhanced Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteTrip}
        title="Delete Trip?"
        message="Are you sure you want to permanently delete this trip? This will remove all route information, ELD logs, and trip data. This action cannot be undone."
        confirmText="Delete Trip"
        cancelText="Cancel"
        confirmColor="error"
      />
    </TripLayout>
  );
};

export default TripListPage;
