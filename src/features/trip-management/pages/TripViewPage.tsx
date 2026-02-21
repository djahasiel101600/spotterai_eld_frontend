import React, { useState } from "react";
import { SavedTrip, AppViewMode, TripViewMode } from "../../../shared/types";
import {
  Box,
  Stack,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  useTheme,
  alpha,
  Fade,
  Slide,
  Grow,
  Zoom,
  Avatar,
  Tooltip,
  Badge,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  Map,
  FileText,
  Settings,
  Building2,
  Clock,
  Calendar,
  MapPin,
  Truck,
  Navigation,
  Timer,
  Download,
  Share2,
  Edit3,
  Printer,
  Info,
  CheckCircle2,
  Circle,
} from "lucide-react";
import TripLayout from "../../../shared/components/layouts/TripLayout";
import RouteMap from "../../route-planning/components/RouteMap";
import EldLogGrid from "../../eld-logs/components/EldLogGrid";

interface TripViewPageProps {
  trip: SavedTrip;
  tripViewMode: TripViewMode;
  setTripViewMode: (mode: TripViewMode) => void;
  setAppViewMode: (mode: AppViewMode) => void;
}

const TripViewPage: React.FC<TripViewPageProps> = ({
  trip,
  tripViewMode,
  setTripViewMode,
  setAppViewMode,
}) => {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);

  const returnToTripList = () => {
    setAppViewMode("TRIP_LIST");
  };

  const formatDate = (timestamp: string | number) => {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTripStatus = () => {
    // This is a placeholder - you can implement actual status logic
    return "Completed";
  };

  const statusColor =
    {
      Completed: "success",
      "In Progress": "warning",
      Planned: "info",
      Cancelled: "error",
    }[getTripStatus()] || "default";

  const headerActions = (
    <Stack direction="row" spacing={1}>
      <Tooltip title="Download trip data" arrow>
        <IconButton
          sx={{
            color: theme.palette.text.secondary,
            "&:hover": { color: theme.palette.primary.main },
          }}
        >
          <Download size={20} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Share trip" arrow>
        <IconButton
          sx={{
            color: theme.palette.text.secondary,
            "&:hover": { color: theme.palette.primary.main },
          }}
        >
          <Share2 size={20} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Print trip details" arrow>
        <IconButton
          sx={{
            color: theme.palette.text.secondary,
            "&:hover": { color: theme.palette.primary.main },
          }}
          onClick={() => alert("Coming soon")}
        >
          <Printer size={20} />
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
    </Stack>
  );

  return (
    <TripLayout
      title="Trip Details"
      subtitle={`ID: ${trip.id.slice(0, 8)}... • Created ${formatDate(trip.timestamp)}`}
      showBackButton
      onBackClick={returnToTripList}
      actions={headerActions}
    >
      <Fade in={true} timeout={500}>
        <Stack spacing={4}>
          {/* Enhanced Trip Overview with Stats Cards */}
          <Slide direction="down" in={true} timeout={500}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                bgcolor: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: "blur(8px)",
              }}
            >
              <Stack spacing={3}>
                {/* Header with Status */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    Trip Overview
                  </Typography>
                  <Chip
                    icon={
                      getTripStatus() === "Completed" ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <Circle size={16} />
                      )
                    }
                    label={getTripStatus()}
                    color={statusColor as any}
                    size="medium"
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      px: 1,
                    }}
                  />
                </Stack>

                <Grid container spacing={3}>
                  {/* Route Information */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card
                      elevation={0}
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.03),
                        borderRadius: 3,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                      }}
                    >
                      <CardContent>
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          sx={{ mb: 2 }}
                        >
                          <MapPin
                            size={20}
                            color={theme.palette.primary.main}
                          />
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600 }}
                          >
                            Route Details
                          </Typography>
                        </Stack>
                        <Stack spacing={2.5}>
                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Origin
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 600 }}
                            >
                              {trip.inputs.origin}
                            </Typography>
                          </Box>

                          <Box sx={{ position: "relative", pl: 2 }}>
                            <Box
                              sx={{
                                position: "absolute",
                                left: 0,
                                top: 8,
                                bottom: 8,
                                width: 2,
                                bgcolor: alpha(theme.palette.primary.main, 0.3),
                                borderRadius: 1,
                              }}
                            />
                            <Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                gutterBottom
                              >
                                Pickup
                              </Typography>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 600 }}
                              >
                                {trip.inputs.pickup}
                              </Typography>
                            </Box>
                          </Box>

                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Dropoff
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 600 }}
                            >
                              {trip.inputs.dropoff}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Statistics Cards */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Card
                          elevation={0}
                          sx={{
                            bgcolor: alpha(theme.palette.info.main, 0.05),
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                            height: "100%",
                          }}
                        >
                          <CardContent>
                            <Stack spacing={1}>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 2,
                                  bgcolor: alpha(theme.palette.info.main, 0.1),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Navigation
                                  size={20}
                                  color={theme.palette.info.main}
                                />
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Distance
                              </Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                {trip.route?.distanceMiles.toLocaleString() ||
                                  "N/A"}
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ ml: 0.5 }}
                                >
                                  miles
                                </Typography>
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 6 }}>
                        <Card
                          elevation={0}
                          sx={{
                            bgcolor: alpha(theme.palette.warning.main, 0.05),
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                            height: "100%",
                          }}
                        >
                          <CardContent>
                            <Stack spacing={1}>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 2,
                                  bgcolor: alpha(
                                    theme.palette.warning.main,
                                    0.1,
                                  ),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Timer
                                  size={20}
                                  color={theme.palette.warning.main}
                                />
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Duration
                              </Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                {trip.route?.durationHours.toFixed(1) || "N/A"}
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ ml: 0.5 }}
                                >
                                  hours
                                </Typography>
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 6 }}>
                        <Card
                          elevation={0}
                          sx={{
                            bgcolor: alpha(theme.palette.success.main, 0.05),
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                          }}
                        >
                          <CardContent>
                            <Stack spacing={1}>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 2,
                                  bgcolor: alpha(
                                    theme.palette.success.main,
                                    0.1,
                                  ),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Calendar
                                  size={20}
                                  color={theme.palette.success.main}
                                />
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                ELD Log Days
                              </Typography>
                              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                {trip.logs.length}
                                <Typography
                                  component="span"
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ ml: 0.5 }}
                                >
                                  days
                                </Typography>
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid size={{ xs: 6 }}>
                        <Card
                          elevation={0}
                          sx={{
                            bgcolor: alpha(theme.palette.secondary.main, 0.05),
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                          }}
                        >
                          <CardContent>
                            <Stack spacing={1}>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 2,
                                  bgcolor: alpha(
                                    theme.palette.secondary.main,
                                    0.1,
                                  ),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Clock
                                  size={20}
                                  color={theme.palette.secondary.main}
                                />
                              </Box>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Created
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                              >
                                {new Date(trip.timestamp).toLocaleDateString()}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Stack>
            </Paper>
          </Slide>

          {/* Enhanced View Mode Toggle with Icons and Labels */}
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Paper
              elevation={0}
              sx={{
                p: 0.5,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 3,
                display: "inline-flex",
              }}
            >
              <ToggleButtonGroup
                value={tripViewMode}
                exclusive
                onChange={(e, newMode) => newMode && setTripViewMode(newMode)}
                sx={{
                  "& .MuiToggleButton-root": {
                    border: "none",
                    borderRadius: 2.5,
                    px: 3,
                    py: 1.5,
                    color: theme.palette.text.secondary,
                    "&.Mui-selected": {
                      bgcolor: theme.palette.background.paper,
                      color: theme.palette.primary.main,
                      boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`,
                      "&:hover": {
                        bgcolor: theme.palette.background.paper,
                      },
                    },
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                  },
                }}
              >
                <ToggleButton value="map">
                  <Tooltip title="View route map" arrow>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Map size={18} />
                      <Typography sx={{ display: { xs: "none", md: "block" } }}>
                        Route Map
                      </Typography>
                    </Stack>
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="logs">
                  <Tooltip title="View ELD logs" arrow>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <FileText size={18} />
                      <Typography sx={{ display: { xs: "none", md: "block" } }}>
                        ELD Logs
                      </Typography>
                    </Stack>
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="hos">
                  <Tooltip title="View HOS configuration" arrow>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Settings size={18} />
                      <Typography sx={{ display: { xs: "none", md: "block" } }}>
                        HOS Config
                      </Typography>
                    </Stack>
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="carrier">
                  <Tooltip title="View carrier information" arrow>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Building2 size={18} />
                      <Typography sx={{ display: { xs: "none", md: "block" } }}>
                        Carrier Info
                      </Typography>
                    </Stack>
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Paper>
          </Box>

          {/* Enhanced Content Area with Animations */}
          <Grow in={true} timeout={500}>
            <Paper
              elevation={0}
              sx={{
                minHeight: 600,
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                overflow: "hidden",
                bgcolor: theme.palette.background.paper,
              }}
            >
              <Fade key={tripViewMode} in={true} timeout={300}>
                <Box sx={{ height: "100%" }}>
                  {tripViewMode === "map" && trip.route && (
                    <Box sx={{ height: 600 }}>
                      <RouteMap route={trip.route} events={trip.events} />
                    </Box>
                  )}

                  {tripViewMode === "logs" && (
                    <Box sx={{ p: 4 }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 4 }}
                      >
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          Electronic Logging Device (ELD) Logs
                        </Typography>
                        <Chip
                          label={`${trip.logs.length} days`}
                          color="primary"
                          variant="outlined"
                          sx={{ borderRadius: 2 }}
                        />
                      </Stack>
                      <Stack spacing={4}>
                        {trip.logs.map((log, index) => (
                          <Zoom
                            in={true}
                            style={{ transitionDelay: `${index * 100}ms` }}
                            key={log.date}
                          >
                            <Box>
                              <EldLogGrid
                                log={log}
                                carrier={trip.carrier}
                                origin={
                                  index === 0 ? trip.inputs.origin : undefined
                                }
                                destination={
                                  index === trip.logs.length - 1
                                    ? trip.inputs.dropoff
                                    : undefined
                                }
                                timezone={trip.timezone}
                              />
                            </Box>
                          </Zoom>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {tripViewMode === "hos" && (
                    <Box sx={{ p: 4 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, mb: 4 }}>
                        Hours of Service Configuration
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Card
                            elevation={0}
                            sx={{
                              borderRadius: 3,
                              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                              height: "100%",
                            }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{ mb: 3 }}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: alpha(
                                      theme.palette.primary.main,
                                      0.1,
                                    ),
                                    color: theme.palette.primary.main,
                                  }}
                                >
                                  <Settings size={20} />
                                </Avatar>
                                <Typography
                                  variant="h6"
                                  sx={{ fontWeight: 600 }}
                                >
                                  HOS Profile
                                </Typography>
                              </Stack>
                              <Stack spacing={2.5}>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Profile ID
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontWeight: 600,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {trip.hosConfig?.profileId ?? "N/A"}
                                  </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Profile Label
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {trip.hosConfig?.label ?? "N/A"}
                                  </Typography>
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                          <Card
                            elevation={0}
                            sx={{
                              borderRadius: 3,
                              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                              height: "100%",
                            }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{ mb: 3 }}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: alpha(
                                      theme.palette.warning.main,
                                      0.1,
                                    ),
                                    color: theme.palette.warning.main,
                                  }}
                                >
                                  <Timer size={20} />
                                </Avatar>
                                <Typography
                                  variant="h6"
                                  sx={{ fontWeight: 600 }}
                                >
                                  Shift Rules
                                </Typography>
                              </Stack>
                              <Stack spacing={2.5}>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Max Driving Hours
                                  </Typography>
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    {trip.hosConfig?.shiftRules
                                      ?.maxDrivingHours ?? "N/A"}
                                    <Typography
                                      component="span"
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ ml: 1 }}
                                    >
                                      hours
                                    </Typography>
                                  </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Max Duty Window
                                  </Typography>
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    {trip.hosConfig?.shiftRules
                                      ?.maxDutyWindowHours ?? "N/A"}
                                    <Typography
                                      component="span"
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ ml: 1 }}
                                    >
                                      hours
                                    </Typography>
                                  </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Required Break Duration
                                  </Typography>
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    {trip.hosConfig?.breakRules
                                      ?.breakDurationMinutes ?? "N/A"}
                                    <Typography
                                      component="span"
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ ml: 1 }}
                                    >
                                      minutes
                                    </Typography>
                                  </Typography>
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {tripViewMode === "carrier" && (
                    <Box sx={{ p: 4 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, mb: 4 }}>
                        Carrier Information
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Card
                            elevation={0}
                            sx={{
                              borderRadius: 3,
                              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{ mb: 3 }}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: alpha(
                                      theme.palette.info.main,
                                      0.1,
                                    ),
                                    color: theme.palette.info.main,
                                  }}
                                >
                                  <Building2 size={20} />
                                </Avatar>
                                <Typography
                                  variant="h6"
                                  sx={{ fontWeight: 600 }}
                                >
                                  Company Details
                                </Typography>
                              </Stack>
                              <Stack spacing={2.5}>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Carrier Name
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {trip.carrier.carrierName}
                                  </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Main Office Address
                                  </Typography>
                                  <Typography variant="body1">
                                    {trip.carrier.mainOfficeAddress}
                                  </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Home Terminal Address
                                  </Typography>
                                  <Typography variant="body1">
                                    {trip.carrier.homeTerminalAddress}
                                  </Typography>
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                          <Card
                            elevation={0}
                            sx={{
                              borderRadius: 3,
                              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                            }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{ mb: 3 }}
                              >
                                <Avatar
                                  sx={{
                                    bgcolor: alpha(
                                      theme.palette.success.main,
                                      0.1,
                                    ),
                                    color: theme.palette.success.main,
                                  }}
                                >
                                  <Truck size={20} />
                                </Avatar>
                                <Typography
                                  variant="h6"
                                  sx={{ fontWeight: 600 }}
                                >
                                  Driver & Vehicle
                                </Typography>
                              </Stack>
                              <Stack spacing={2.5}>
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Driver Name
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {trip.carrier.driverName}
                                  </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Truck Number
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      fontWeight: 600,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {trip.carrier.truckNumber}
                                  </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    gutterBottom
                                  >
                                    Shipping Documents
                                  </Typography>
                                  <Chip
                                    label={trip.carrier.shippingDocs}
                                    size="small"
                                    variant="outlined"
                                    sx={{ borderRadius: 1.5 }}
                                  />
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              </Fade>
            </Paper>
          </Grow>
        </Stack>
      </Fade>
    </TripLayout>
  );
};

export default TripViewPage;
