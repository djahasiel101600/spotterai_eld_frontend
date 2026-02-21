import React from "react";
import { SavedTrip } from "../../../shared/types";
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Stack,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import {
  Eye,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Route,
  Calendar,
} from "lucide-react";

interface TripCardsProps {
  trips: SavedTrip[];
  onViewTrip: (trip: SavedTrip) => void;
  onDeleteTrip: (tripId: string) => void;
}

const TripCards: React.FC<TripCardsProps> = ({
  trips,
  onViewTrip,
  onDeleteTrip,
}) => {
  return (
    <Grid container spacing={3}>
      {trips.map((trip) => (
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={trip.id}>
          <Card
            elevation={2}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              transition: "all 0.2s ease-in-out",
              cursor: "pointer",
              "&:hover": {
                elevation: 8,
                transform: "translateY(-2px)",
                "& .card-actions": {
                  opacity: 1,
                },
              },
            }}
            onClick={() => onViewTrip(trip)}
          >
            <CardContent sx={{ flex: 1, pb: 1 }}>
              <Typography
                variant="h6"
                component="div"
                gutterBottom
                sx={{
                  fontSize: "0.95rem",
                  fontWeight: "bold",
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Calendar size={16} />
                {new Date(trip.timestamp).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Typography>

              <Stack spacing={2} sx={{ mt: 2 }}>
                {/* Route Information */}
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1, fontSize: "0.8rem" }}
                  >
                    ROUTE
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "success.main",
                        }}
                      />
                      <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                        {trip.inputs.origin}
                      </Typography>
                    </Box>
                    <Box sx={{ pl: 2 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.75rem" }}
                      >
                        Pickup: {trip.inputs.pickup}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "error.main",
                        }}
                      />
                      <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                        {trip.inputs.dropoff}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Trip Stats */}
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {trip.route?.distanceMiles && (
                    <Chip
                      icon={<Route size={14} />}
                      label={`${trip.route.distanceMiles} mi`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.75rem" }}
                    />
                  )}
                  {trip.route?.durationHours && (
                    <Chip
                      icon={<Clock size={14} />}
                      label={`${trip.route.durationHours.toFixed(1)}h`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.75rem" }}
                    />
                  )}
                  <Chip
                    icon={<Calendar size={14} />}
                    label={`${trip.logs.length} days`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.75rem" }}
                  />
                </Stack>
              </Stack>
            </CardContent>

            <CardActions
              className="card-actions"
              sx={{
                opacity: 0.7,
                transition: "opacity 0.2s ease-in-out",
                justifyContent: "flex-end",
                pt: 0,
              }}
            >
              <Tooltip title="View Trip">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewTrip(trip);
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
                    onViewTrip(trip);
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
                    onDeleteTrip(trip.id);
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
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default TripCards;
