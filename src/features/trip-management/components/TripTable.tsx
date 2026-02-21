import React, { useState } from "react";
import { SavedTrip } from "../../../shared/types";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  Paper,
  Typography,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Eye, Edit, Trash2 } from "lucide-react";

interface TripTableProps {
  trips: SavedTrip[];
  onViewTrip: (trip: SavedTrip) => void;
  onDeleteTrip: (tripId: string) => void;
}

type SortField = "timestamp" | "route" | "miles" | "hours" | "days";

const TripTable: React.FC<TripTableProps> = ({
  trips,
  onViewTrip,
  onDeleteTrip,
}) => {
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortedTrips = () => {
    return [...trips].sort((a, b) => {
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
  };

  const sortedTrips = getSortedTrips();

  return (
    <TableContainer component={Paper} elevation={1}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: "grey.50" }}>
            <TableCell>
              <TableSortLabel
                active={sortField === "timestamp"}
                direction={sortField === "timestamp" ? sortDirection : "asc"}
                onClick={() => handleSort("timestamp")}
                sx={{ fontWeight: "bold" }}
              >
                Date
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortField === "route"}
                direction={sortField === "route" ? sortDirection : "asc"}
                onClick={() => handleSort("route")}
                sx={{ fontWeight: "bold" }}
              >
                Route
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortField === "miles"}
                direction={sortField === "miles" ? sortDirection : "asc"}
                onClick={() => handleSort("miles")}
                sx={{ fontWeight: "bold" }}
              >
                Miles
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortField === "hours"}
                direction={sortField === "hours" ? sortDirection : "asc"}
                onClick={() => handleSort("hours")}
                sx={{ fontWeight: "bold" }}
              >
                Hours
              </TableSortLabel>
            </TableCell>
            <TableCell align="right">
              <TableSortLabel
                active={sortField === "days"}
                direction={sortField === "days" ? sortDirection : "asc"}
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
          {sortedTrips.map((trip) => (
            <TableRow
              key={trip.id}
              hover
              sx={{
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
              onClick={() => onViewTrip(trip)}
            >
              <TableCell>
                <Stack>
                  <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                    {new Date(trip.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(trip.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell>
                <Stack spacing={0.5}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "medium", color: "success.main" }}
                  >
                    ↗ {trip.inputs.origin}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "warning.main" }}>
                    📦 {trip.inputs.pickup}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "error.main" }}>
                    ↘ {trip.inputs.dropoff}
                  </Typography>
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {trip.route?.distanceMiles || "—"}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {trip.route?.durationHours
                    ? trip.route.durationHours.toFixed(1)
                    : "—"}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {trip.logs.length}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Stack direction="row" spacing={1} justifyContent="center">
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
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TripTable;
