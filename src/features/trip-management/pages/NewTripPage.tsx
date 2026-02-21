import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { api, handleApiError } from "../../../shared/services";
import {
  saveTripsToStorage,
  deserializeTripDates,
} from "../../../shared/utils";

// US State to IANA Timezone mapping for ELD compliance
const STATE_TIMEZONE_MAP: Record<string, string> = {
  // Eastern Time
  CT: "America/New_York", DE: "America/New_York", DC: "America/New_York",
  FL: "America/New_York", GA: "America/New_York", IN: "America/Indiana/Indianapolis",
  KY: "America/Kentucky/Louisville", ME: "America/New_York", MD: "America/New_York",
  MA: "America/New_York", MI: "America/Detroit", NH: "America/New_York",
  NJ: "America/New_York", NY: "America/New_York", NC: "America/New_York",
  OH: "America/New_York", PA: "America/New_York", RI: "America/New_York",
  SC: "America/New_York", VT: "America/New_York", VA: "America/New_York",
  WV: "America/New_York",
  // Central Time
  AL: "America/Chicago", AR: "America/Chicago", IL: "America/Chicago",
  IA: "America/Chicago", KS: "America/Chicago", LA: "America/Chicago",
  MN: "America/Chicago", MS: "America/Chicago", MO: "America/Chicago",
  NE: "America/Chicago", ND: "America/Chicago", OK: "America/Chicago",
  SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago",
  WI: "America/Chicago",
  // Mountain Time
  AZ: "America/Phoenix", CO: "America/Denver", ID: "America/Boise",
  MT: "America/Denver", NM: "America/Denver", UT: "America/Denver",
  WY: "America/Denver",
  // Pacific Time
  CA: "America/Los_Angeles", NV: "America/Los_Angeles", OR: "America/Los_Angeles",
  WA: "America/Los_Angeles",
  // Alaska & Hawaii
  AK: "America/Anchorage", HI: "Pacific/Honolulu",
};

// Extract timezone from address (looks for US state abbreviation)
const getTimezoneFromAddress = (address: string): string => {
  // Look for 2-letter state code followed by zip code pattern
  const stateZipMatch = address.match(/\b([A-Z]{2})\s+\d{5}/);
  if (stateZipMatch) {
    const state = stateZipMatch[1];
    return STATE_TIMEZONE_MAP[state] || "America/New_York";
  }
  // Fallback: look for common state abbreviations
  for (const [state, tz] of Object.entries(STATE_TIMEZONE_MAP)) {
    if (address.includes(` ${state} `) || address.endsWith(` ${state}`)) {
      return tz;
    }
  }
  return "America/New_York"; // Default to Eastern Time
};
import {
  SavedTrip,
  AppViewMode,
  TripInputs,
  HosProfileConfig,
  CarrierInfo,
  TripViewMode,
} from "../../../shared/types";
import {
  Box,
  Stack,
  Typography,
  Button,
  Paper,
  TextField,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Tooltip,
  useTheme,
  alpha,
  Fade,
  Slide,
  Zoom,
  Avatar,
  Chip,
  FormHelperText,
  InputLabel,
  FormControl,
  OutlinedInput,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import {
  MapPin,
  Calculator,
  Truck,
  Clock,
  Calendar,
  Info,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Building2,
  User,
  Hash,
  FileText,
  Save,
  HelpCircle,
  Route,
} from "lucide-react";
import TripLayout from "../../../shared/components/layouts/TripLayout";

type TripFormInputs = TripInputs & CarrierInfo;

interface NewTripPageProps {
  setSavedTrips: (trips: SavedTrip[]) => void;
  savedTrips: SavedTrip[];
  setAppViewMode: (mode: AppViewMode) => void;
  setCurrentTripId: (id: string | null) => void;
  setTripViewMode: (mode: TripViewMode) => void;
}

// Form sections for stepper
const formSections = [
  {
    label: "Route Information",
    description: "Enter the trip route details",
    icon: MapPin,
  },
  {
    label: "Carrier Details",
    description: "Company and driver information",
    icon: Building2,
  },
  {
    label: "HOS Configuration",
    description: "Hours of service settings",
    icon: Clock,
  },
];

const NewTripPage: React.FC<NewTripPageProps> = ({
  setSavedTrips,
  savedTrips,
  setAppViewMode,
  setCurrentTripId,
  setTripViewMode,
}) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [formValid, setFormValid] = useState({
    route: false,
    carrier: false,
    hos: false,
  });

  const {
    control,
    handleSubmit,
    formState: { errors: formErrors, isValid },
    watch,
    trigger,
    getValues,
  } = useForm<TripFormInputs>({
    mode: "onChange",
    defaultValues: {
      origin: "251 Little Falls Dr. Wilmington DE 19808",
      pickup: "",
      dropoff: "",
      cycleHoursUsed: 0,
      startTime: new Date().toISOString().slice(0, 16),
      carrierName: "Spotter.AI Logistics Inc.",
      driverName: "",
      mainOfficeAddress: "251 Little Falls Dr. Wilmington DE 19808",
      homeTerminalAddress: "251 Little Falls Dr. Wilmington DE 19808",
      truckNumber: "TRK-900 / TRL-442",
      shippingDocs: "MANIFEST #88219-X",
      coDriverName: "",
    },
  });

  // Watch form values for validation
  const watchOrigin = watch("origin");
  const watchPickup = watch("pickup");
  const watchDropoff = watch("dropoff");
  const watchCarrierName = watch("carrierName");
  const watchDriverName = watch("driverName");

  // Validate sections on field changes
  useEffect(() => {
    setFormValid({
      route: !!(watchOrigin && watchPickup && watchDropoff),
      carrier: !!(watchCarrierName && watchDriverName),
      hos: true, // HOS section always valid with defaults
    });
  }, [
    watchOrigin,
    watchPickup,
    watchDropoff,
    watchCarrierName,
    watchDriverName,
  ]);

  // Using a simplified HosProfileConfig placeholder
  const [hosConfig] = useState<Partial<HosProfileConfig>>({
    profileId: "property-carrying-us-fmcsa",
    label: "Property Carrying - US FMCSA",
  });

  const returnToTripList = () => {
    setAppViewMode("TRIP_LIST");
  };

  const handleNext = async () => {
    // Validate current step fields
    let fieldsToValidate: (keyof TripFormInputs)[] = [];

    if (activeStep === 0) {
      fieldsToValidate = ["origin", "pickup", "dropoff"];
    } else if (activeStep === 1) {
      fieldsToValidate = ["carrierName", "driverName"];
    }

    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const onSubmit = async (formData: TripFormInputs): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Detect timezone from home terminal address for ELD compliance
      const homeTerminalTimezone = getTimezoneFromAddress(formData.homeTerminalAddress);
      
      const data = await api.calculateTrip({
        inputs: {
          origin: formData.origin,
          pickup: formData.pickup,
          dropoff: formData.dropoff,
          startTime: formData.startTime,
          cycleHoursUsed: formData.cycleHoursUsed,
        },
        carrier: {
          carrierName: formData.carrierName,
          driverName: formData.driverName,
          mainOfficeAddress: formData.mainOfficeAddress,
          homeTerminalAddress: formData.homeTerminalAddress,
          truckNumber: formData.truckNumber,
          shippingDocs: formData.shippingDocs,
          coDriverName: formData.coDriverName ?? "",
        },
        hosConfig: hosConfig,
        homeTerminalTimezone: homeTerminalTimezone,
      });

      // Create new trip object
      const newTrip: SavedTrip = {
        id: Date.now().toString(), // temporary ID, will be replaced by DB ID
        timestamp: new Date().toISOString(),
        inputs: {
          origin: formData.origin,
          pickup: formData.pickup,
          dropoff: formData.dropoff,
          cycleHoursUsed: formData.cycleHoursUsed,
          startTime: formData.startTime,
        },
        route: data.route,
        logs: data.logs,
        events: data.events || [],
        hosConfig: hosConfig as HosProfileConfig,
        carrier: {
          carrierName: formData.carrierName,
          driverName: formData.driverName,
          mainOfficeAddress: formData.mainOfficeAddress,
          homeTerminalAddress: formData.homeTerminalAddress,
          truckNumber: formData.truckNumber,
          shippingDocs: formData.shippingDocs,
          coDriverName: formData.coDriverName ?? "",
        },
        intel: data.intel,
        timezone: homeTerminalTimezone,  // Include timezone for proper display
      };

      // Save to database
      const savedTrip = await api.saveTrip(newTrip);

      // Deserialize dates from saved trip
      const deserializedTrip = deserializeTripDates(savedTrip);

      // Update local state
      const updatedTrips = [...savedTrips, deserializedTrip];
      setSavedTrips(updatedTrips);

      // Also save to localStorage as backup
      saveTripsToStorage(updatedTrips);

      // Navigate to view the new trip
      setCurrentTripId(deserializedTrip.id);
      setTripViewMode("logs");
      setAppViewMode("VIEW_TRIP");
    } catch (error) {
      console.error("Route calculation error:", error);
      setError(handleApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const headerActions = (
    <Button
      startIcon={
        isLoading ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          <Save size={20} />
        )
      }
      onClick={handleSubmit(onSubmit)}
      variant="contained"
      color="primary"
      disabled={isLoading || !isValid}
      sx={{
        py: 1.5,
        px: 3,
        fontWeight: "bold",
        borderRadius: 2,
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.4)}`,
        "&:hover:not(:disabled)": {
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          transform: "translateY(-2px)",
          boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
        },
        transition: "all 0.2s ease-in-out",
        "&.Mui-disabled": {
          background: alpha(theme.palette.action.disabled, 0.1),
        },
      }}
    >
      {isLoading ? "Calculating..." : "Calculate Route"}
    </Button>
  );

  return (
    <TripLayout
      title="Create New Trip"
      subtitle="Fill in the details to plan your route"
      showBackButton
      onBackClick={returnToTripList}
      actions={headerActions}
      maxWidth="lg"
    >
      <Fade in={true} timeout={500}>
        <Stack spacing={4}>
          {/* Error Alert with animation */}
          {error && (
            <Slide direction="down" in={!!error}>
              <Alert
                severity="error"
                onClose={() => setError(null)}
                icon={<AlertCircle size={20} />}
                sx={{
                  borderRadius: 2,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.error.main, 0.2)}`,
                }}
              >
                {error}
              </Alert>
            </Slide>
          )}

          {/* Progress Stepper */}
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
            <Stepper activeStep={activeStep} orientation="vertical">
              {formSections.map((section, index) => (
                <Step key={section.label}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor:
                            activeStep >= index
                              ? theme.palette.primary.main
                              : alpha(theme.palette.primary.main, 0.1),
                          color:
                            activeStep >= index
                              ? "white"
                              : theme.palette.primary.main,
                        }}
                      >
                        <section.icon size={16} />
                      </Avatar>
                    )}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {section.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {section.description}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    {/* Route Information Section */}
                    {index === 0 && (
                      <Fade in={activeStep === 0} timeout={300}>
                        <Box sx={{ mt: 2 }}>
                          <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                              <Controller
                                name="origin"
                                control={control}
                                rules={{
                                  required: "Origin address is required",
                                }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Origin Address"
                                    placeholder="Enter starting location..."
                                    variant="outlined"
                                    required
                                    error={!!formErrors.origin}
                                    helperText={formErrors.origin?.message}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <MapPin
                                            size={20}
                                            color={theme.palette.primary.main}
                                          />
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <Controller
                                name="pickup"
                                control={control}
                                rules={{
                                  required: "Pickup location is required",
                                }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Pickup Location"
                                    placeholder="Enter pickup location..."
                                    variant="outlined"
                                    required
                                    error={!!formErrors.pickup}
                                    helperText={formErrors.pickup?.message}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <Navigation
                                            size={20}
                                            color={theme.palette.warning.main}
                                          />
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                              <Controller
                                name="dropoff"
                                control={control}
                                rules={{
                                  required: "Delivery address is required",
                                }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Delivery Address"
                                    placeholder="Enter delivery location..."
                                    variant="outlined"
                                    required
                                    error={!!formErrors.dropoff}
                                    helperText={formErrors.dropoff?.message}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <MapPin
                                            size={20}
                                            color={theme.palette.success.main}
                                          />
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </Fade>
                    )}

                    {/* Carrier Information Section */}
                    {index === 1 && (
                      <Fade in={activeStep === 1} timeout={300}>
                        <Box sx={{ mt: 2 }}>
                          <Grid container spacing={3}>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Controller
                                name="carrierName"
                                control={control}
                                rules={{
                                  required: "Carrier name is required",
                                }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Carrier Name"
                                    variant="outlined"
                                    required
                                    error={!!formErrors.carrierName}
                                    helperText={formErrors.carrierName?.message}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <Building2
                                            size={20}
                                            color={theme.palette.info.main}
                                          />
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Controller
                                name="driverName"
                                control={control}
                                rules={{
                                  required: "Driver name is required",
                                }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Driver Name"
                                    variant="outlined"
                                    required
                                    error={!!formErrors.driverName}
                                    helperText={formErrors.driverName?.message}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <User
                                            size={20}
                                            color={theme.palette.secondary.main}
                                          />
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Controller
                                name="mainOfficeAddress"
                                control={control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Main Office Address"
                                    variant="outlined"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Controller
                                name="homeTerminalAddress"
                                control={control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Home Terminal Address"
                                    variant="outlined"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Controller
                                name="truckNumber"
                                control={control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Truck Number"
                                    variant="outlined"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <Hash
                                            size={20}
                                            color={theme.palette.warning.main}
                                          />
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Controller
                                name="coDriverName"
                                control={control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Name of Co-driver (optional)"
                                    variant="outlined"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Controller
                                name="shippingDocs"
                                control={control}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Shipping Documents"
                                    variant="outlined"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <FileText
                                            size={20}
                                            color={theme.palette.success.main}
                                          />
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </Fade>
                    )}

                    {/* HOS Configuration Section */}
                    {index === 2 && (
                      <Fade in={activeStep === 2} timeout={300}>
                        <Box sx={{ mt: 2 }}>
                          <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}>
                              <Card
                                variant="outlined"
                                sx={{
                                  borderRadius: 2,
                                  bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.02,
                                  ),
                                }}
                              >
                                <CardContent>
                                  <Stack
                                    direction="row"
                                    spacing={2}
                                    alignItems="center"
                                  >
                                    <Avatar
                                      sx={{
                                        bgcolor: alpha(
                                          theme.palette.primary.main,
                                          0.1,
                                        ),
                                      }}
                                    >
                                      <Truck
                                        size={20}
                                        color={theme.palette.primary.main}
                                      />
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography
                                        variant="subtitle1"
                                        sx={{ fontWeight: 600 }}
                                      >
                                        {hosConfig.label}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        Standard DOT HOS rules: 11hr driving,
                                        14hr window, 10hr rest
                                      </Typography>
                                    </Box>
                                    <Chip
                                      label="Active"
                                      color="success"
                                      size="small"
                                      icon={<CheckCircle2 size={14} />}
                                    />
                                  </Stack>
                                </CardContent>
                              </Card>
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Controller
                                name="cycleHoursUsed"
                                control={control}
                                rules={{
                                  min: {
                                    value: 0,
                                    message: "Cannot be negative",
                                  },
                                  max: {
                                    value: 70,
                                    message: "Cannot exceed 70 hours",
                                  },
                                }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Cycle Hours Already Used"
                                    type="number"
                                    variant="outlined"
                                    error={!!formErrors.cycleHoursUsed}
                                    helperText={
                                      formErrors.cycleHoursUsed?.message ||
                                      "Hours used in current 70-hour/8-day cycle"
                                    }
                                    onChange={(e) => {
                                      field.onChange(Number(e.target.value));
                                      if (error) setError(null);
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <Clock
                                            size={20}
                                            color={theme.palette.warning.main}
                                          />
                                        </InputAdornment>
                                      ),
                                      endAdornment: (
                                        <InputAdornment position="end">
                                          <Tooltip
                                            title="Hours already driven in the current cycle"
                                            arrow
                                          >
                                            <HelpCircle
                                              size={18}
                                              color={
                                                theme.palette.text.secondary
                                              }
                                            />
                                          </Tooltip>
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                              <Controller
                                name="startTime"
                                control={control}
                                rules={{ required: "Start time is required" }}
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    fullWidth
                                    label="Trip Start Time"
                                    type="datetime-local"
                                    variant="outlined"
                                    error={!!formErrors.startTime}
                                    helperText={formErrors.startTime?.message}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      if (error) setError(null);
                                    }}
                                    InputProps={{
                                      startAdornment: (
                                        <InputAdornment position="start">
                                          <Calendar
                                            size={20}
                                            color={theme.palette.info.main}
                                          />
                                        </InputAdornment>
                                      ),
                                    }}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: 2,
                                      },
                                    }}
                                  />
                                )}
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      </Fade>
                    )}

                    {/* Step Navigation Buttons */}
                    <Box sx={{ mt: 3 }}>
                      <Stack direction="row" spacing={2}>
                        <Button
                          variant="outlined"
                          onClick={handleBack}
                          disabled={activeStep === 0}
                          sx={{ borderRadius: 2 }}
                        >
                          Back
                        </Button>
                        {activeStep < formSections.length - 1 ? (
                          <Button
                            variant="contained"
                            onClick={handleNext}
                            disabled={
                              !formValid[activeStep === 0 ? "route" : "carrier"]
                            }
                            sx={{
                              borderRadius: 2,
                              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            }}
                          >
                            Continue
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isLoading}
                            sx={{
                              borderRadius: 2,
                              background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                              "&:hover": {
                                background: `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.main} 100%)`,
                              },
                            }}
                          >
                            {isLoading ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              "Calculate Route"
                            )}
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>

          {/* Summary Card */}
          {activeStep === formSections.length && (
            <Slide direction="up" in={activeStep === formSections.length}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  bgcolor: alpha(theme.palette.success.main, 0.02),
                  textAlign: "center",
                }}
              >
                <Zoom in={true}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                      margin: "0 auto 16px",
                    }}
                  >
                    <CheckCircle2 size={40} />
                  </Avatar>
                </Zoom>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                  All Set!
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Your trip details are complete. Click "Calculate Route" to
                  generate your route and ELD logs.
                </Typography>
                <Button
                  startIcon={
                    isLoading ? (
                      <CircularProgress size={20} />
                    ) : (
                      <Route size={20} />
                    )
                  }
                  onClick={handleSubmit(onSubmit)}
                  variant="contained"
                  color="success"
                  size="large"
                  disabled={isLoading}
                  sx={{
                    py: 1.5,
                    px: 4,
                    borderRadius: 3,
                    fontSize: "1.1rem",
                  }}
                >
                  {isLoading ? "Calculating..." : "Generate Route & Logs"}
                </Button>
              </Paper>
            </Slide>
          )}
        </Stack>
      </Fade>
    </TripLayout>
  );
};

export default NewTripPage;
