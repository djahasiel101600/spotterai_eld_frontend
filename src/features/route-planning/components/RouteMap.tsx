import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from "react";
import { RouteResult, DutyEvent } from "../../../shared/types";
import {
  toSafeDate,
  formatTime,
  getDurationMinutes,
} from "../../../shared/utils";
import {
  Box,
  IconButton,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Divider,
  useTheme,
  alpha,
  Tooltip,
} from "@mui/material";
import { ChevronRight, ChevronLeft, Navigation } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// Fix for default marker icons in Leaflet with webpack/vite
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Fix default icon
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface RouteMapProps {
  route?: RouteResult;
  events?: DutyEvent[];
}

interface ProcessedEvent extends DutyEvent {
  start: Date;
  end: Date;
  lat?: number;
  lng?: number;
}

// Custom router that uses OSRM but with proper error handling
const createCustomRouter = () => {
  return L.Routing.osrmv1({
    serviceUrl: "https://router.project-osrm.org/route/v1",
    profile: "driving",
    timeout: 30 * 1000, // 30 second timeout
    routingOptions: {
      alternatives: false,
      steps: false,
      geometries: "polyline",
    },
  });
};

const RouteMap: React.FC<RouteMapProps> = ({ route, events }) => {
  const theme = useTheme();
  const [instructionsOpen, setInstructionsOpen] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const infoControlRef = useRef<L.Control | null>(null);
  const legendControlRef = useRef<L.Control | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const waypointMarkersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);

  // Pre-process events to ensure all dates are Date objects
  const safeEvents = useMemo<ProcessedEvent[]>(() => {
    if (!events) return [];
    return events.map((event) => ({
      ...event,
      start: toSafeDate(event.start) || new Date(0),
      end: toSafeDate(event.end) || new Date(0),
    }));
  }, [events]);

  // Clear all markers helper
  const clearAllMarkers = useCallback(() => {
    // Clear stop markers
    stopMarkersRef.current.forEach((marker) => {
      if (marker && mapRef.current) marker.remove();
    });
    stopMarkersRef.current = [];

    // Clear waypoint markers
    waypointMarkersRef.current.forEach((marker) => {
      if (marker && mapRef.current) marker.remove();
    });
    waypointMarkersRef.current = [];

    // Clear route line
    if (routeLineRef.current && mapRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current).setView(
      [39.8283, -98.5795],
      4,
    );

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapRef.current);

    // Handle window resize
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);

      // Clean up routing control with proper error handling
      if (routingControlRef.current && mapRef.current) {
        try {
          // Clear waypoints first to prevent removeLayer errors
          const plan = routingControlRef.current.getPlan();
          if (plan) {
            plan.setWaypoints([]);
          }
          // Remove the routing control from the map
          mapRef.current.removeControl(routingControlRef.current);
        } catch (error) {
          console.debug("Error removing routing control:", error);
        } finally {
          routingControlRef.current = null;
        }
      }

      // Clean up info and legend controls
      if (infoControlRef.current && mapRef.current) {
        try {
          mapRef.current.removeControl(infoControlRef.current);
        } catch (error) {
          console.debug("Error removing info control:", error);
        }
        infoControlRef.current = null;
      }

      if (legendControlRef.current && mapRef.current) {
        try {
          mapRef.current.removeControl(legendControlRef.current);
        } catch (error) {
          console.debug("Error removing legend control:", error);
        }
        legendControlRef.current = null;
      }

      // Clear all markers
      clearAllMarkers();

      // Remove map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [clearAllMarkers]);

  // Handle map resize when instructions panel is toggled
  useEffect(() => {
    if (mapRef.current) {
      // Small delay to allow the collapse animation to complete
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [instructionsOpen]);

  // Create straight line coordinates for fallback
  const createStraightLineRoute = useCallback(() => {
    if (!route) return null;

    const points: [number, number][] = [
      [route.points.origin.lat, route.points.origin.lng],
      [route.points.pickup.lat, route.points.pickup.lng],
      [route.points.dropoff.lat, route.points.dropoff.lng],
    ];

    // Create a polyline for the straight line route
    const line = L.polyline(points, {
      color: "#3b82f6",
      weight: 6,
      opacity: 0.8,
      dashArray: "5, 5", // Dashed line to indicate it's not the real route
    });

    if (mapRef.current) {
      line.addTo(mapRef.current);
      routeLineRef.current = line;
    }

    // Generate coordinates for event positioning
    const coordinates = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const steps = 100;

      for (let j = 0; j < steps; j++) {
        const t = j / steps;
        const lat = start[0] + (end[0] - start[0]) * t;
        const lng = start[1] + (end[1] - start[1]) * t;
        coordinates.push({ lat, lng });
      }
    }

    return coordinates;
  }, [route]);

  // Reposition events along route coordinates
  const repositionEventsAlongRoute = useCallback(
    (routeCoords: any[]) => {
      if (
        !safeEvents.length ||
        !routeCoords.length ||
        !route ||
        !mapRef.current
      )
        return;

      // Work on a shallow clone so we can mutate lat/lng safely
      const eventsClone = safeEvents.map((ev) => ({ ...ev }));

      eventsClone.forEach((event) => {
        // Skip home-terminal off-duty events
        if (
          event.status === "off_duty" &&
          (event.remarks.includes("Continuous Rest Period") ||
            event.remarks.includes("End of Day Rest Period"))
        ) {
          return;
        }

        let targetLat: number | undefined;
        let targetLng: number | undefined;

        if (event.remarks.includes("Pre-trip Inspection")) {
          targetLat = route.points.origin.lat;
          targetLng = route.points.origin.lng;
        } else if (
          event.remarks.includes("Pickup") ||
          event.remarks.includes("Loading")
        ) {
          targetLat = route.points.pickup.lat;
          targetLng = route.points.pickup.lng;
        } else if (
          event.remarks.includes("Dropoff") ||
          event.remarks.includes("Unloading") ||
          event.remarks.includes("Post-trip")
        ) {
          targetLat = route.points.dropoff.lat;
          targetLng = route.points.dropoff.lng;
        } else {
          // Intermediate stops: position along route by time ratio
          const tripStartEvent = eventsClone.find((e) =>
            e.remarks.includes("Pre-trip"),
          );
          const tripEndEvent = eventsClone.find((e) =>
            e.remarks.includes("Post-trip"),
          );

          const tripStartTime =
            tripStartEvent?.start.getTime() || eventsClone[0].start.getTime();
          const tripEndTime =
            tripEndEvent?.end.getTime() ||
            eventsClone[eventsClone.length - 1].end.getTime();

          const span = tripEndTime - tripStartTime;
          if (span > 0) {
            const ratio = Math.min(
              Math.max((event.start.getTime() - tripStartTime) / span, 0),
              1,
            );
            const idx = Math.floor(ratio * (routeCoords.length - 1));
            const coord = routeCoords[idx];
            if (coord) {
              targetLat = coord.lat;
              targetLng = coord.lng;
            }
          }
        }

        if (targetLat !== undefined && targetLng !== undefined) {
          event.lat = targetLat;
          event.lng = targetLng;
        }
      });

      // Re-add stop markers with corrected positions
      addStopMarkersToMap(eventsClone);
    },
    [safeEvents, route],
  );

  // Add stop markers
  const addStopMarkersToMap = useCallback(
    (evts: ProcessedEvent[]) => {
      if (!mapRef.current || !route) return;

      // Clear existing stop markers
      stopMarkersRef.current.forEach((marker) => {
        if (marker) marker.remove();
      });
      stopMarkersRef.current = [];

      evts.forEach((event) => {
        if (
          event.status === "driving" ||
          event.lat === undefined ||
          event.lng === undefined
        ) {
          return;
        }

        // Skip home terminal off-duty
        if (
          event.status === "off_duty" &&
          (event.remarks.includes("Continuous Rest Period") ||
            event.remarks.includes("End of Day Rest Period"))
        ) {
          return;
        }

        // Skip markers at main waypoints (tolerance 0.01°)
        const tolerance = 0.01;
        const isAtWaypoint =
          (Math.abs(event.lat - route.points.origin.lat) < tolerance &&
            Math.abs(event.lng - route.points.origin.lng) < tolerance) ||
          (Math.abs(event.lat - route.points.pickup.lat) < tolerance &&
            Math.abs(event.lng - route.points.pickup.lng) < tolerance) ||
          (Math.abs(event.lat - route.points.dropoff.lat) < tolerance &&
            Math.abs(event.lng - route.points.dropoff.lng) < tolerance);

        if (isAtWaypoint) return;

        // Determine marker styling
        let color = "#f59e0b";
        let label = "Stop";
        let iconChar = "⏸";

        if (event.remarks.includes("Fueling Stop")) {
          color = "#ea580c";
          label = "Fuel Station";
          iconChar = "⛽";
        } else if (event.status === "sleeper_berth") {
          color = "#6366f1";
          label = "Sleeper Rest";
          iconChar = "😴";
        } else if (event.status === "off_duty") {
          color = "#8b5cf6";
          label = "Mandatory Break";
          iconChar = "⏸";
        } else if (event.remarks.includes("Loading")) {
          color = "#16a34a";
          label = "Loading";
          iconChar = "📦";
        } else if (event.remarks.includes("Unloading")) {
          color = "#dc2626";
          label = "Unloading";
          iconChar = "📦";
        }

        // Create custom icon
        const stopIcon = L.divIcon({
          className: "custom-stop-icon",
          html: `
          <div style="
            background-color: ${color}; 
            border: 2px solid white; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: bold;
          ">
            ${iconChar}
          </div>
        `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        // Use time strings from the event (hour-based approach)
        const startHour = event.startHour ?? 0;
        const endHour = event.endHour ?? 24;
        const duration = Math.round((endHour - startHour) * 60);
        const timeStr = event.startTime ?? `${Math.floor(startHour)}:${String(Math.round((startHour % 1) * 60)).padStart(2, '0')}`;
        const endTimeStr = event.endTime ?? `${Math.floor(endHour)}:${String(Math.round((endHour % 1) * 60)).padStart(2, '0')}`;

        const marker = L.marker([event.lat, event.lng], {
          icon: stopIcon,
        }).addTo(mapRef.current!).bindPopup(`
          <div style="padding: 12px; min-width: 180px; max-width: 250px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color};"></div>
              <b style="color: #1e293b; text-transform: uppercase; font-size: 14px; letter-spacing: 0.05em;">${label}</b>
            </div>
            <div style="font-size: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #475569; font-weight: 500;">Start:</span>
                <span style="color: #1e293b; font-weight: bold;">${timeStr}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #475569; font-weight: 500;">End:</span>
                <span style="color: #1e293b; font-weight: bold;">${endTimeStr}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 4px;">
                <span style="color: #475569; font-weight: 500;">Duration:</span>
                <span style="color: #2563eb; font-weight: bold;">${Math.floor(duration / 60)}h ${duration % 60}m</span>
              </div>
            </div>
            <div style="font-size: 12px; font-style: italic; color: #64748b; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
              ${event.remarks}
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">
              Status: <span style="font-weight: 500;">${event.status.replace("_", " ").toUpperCase()}</span>
            </div>
          </div>
        `);

        stopMarkersRef.current.push(marker);
      });
    },
    [route],
  );

  // Update route and markers when data changes
  useEffect(() => {
    if (!mapRef.current || !route) return;

    // Clean up previous controls and markers
    if (routingControlRef.current && mapRef.current) {
      try {
        // Get the plan to properly clean up
        const plan = routingControlRef.current.getPlan();
        if (plan) {
          plan.setWaypoints([]);
        }
        mapRef.current.removeControl(routingControlRef.current);
      } catch (error) {
        console.debug("Error removing routing control:", error);
      } finally {
        routingControlRef.current = null;
      }
    }

    clearAllMarkers();

    // --- Create waypoints ---
    const waypoints = [
      L.latLng(route.points.origin.lat, route.points.origin.lng),
      L.latLng(route.points.pickup.lat, route.points.pickup.lng),
      L.latLng(route.points.dropoff.lat, route.points.dropoff.lng),
    ];

    // --- Add origin / pickup / dropoff markers ---
    const createWaypointMarker = (
      lat: number,
      lng: number,
      color: string,
      label: string,
      address: string,
    ) => {
      const icon = L.divIcon({
        className: "waypoint-marker",
        html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(mapRef.current!)
        .bindPopup(`<b>${label}</b><br/>${address}`);

      waypointMarkersRef.current.push(marker);
    };

    createWaypointMarker(
      route.points.origin.lat,
      route.points.origin.lng,
      "#2563eb",
      "Trip Start",
      route.points.origin.address,
    );
    createWaypointMarker(
      route.points.pickup.lat,
      route.points.pickup.lng,
      "#16a34a",
      "Pickup Location",
      route.points.pickup.address,
    );
    createWaypointMarker(
      route.points.dropoff.lat,
      route.points.dropoff.lng,
      "#dc2626",
      "Dropoff Location",
      route.points.dropoff.address,
    );

    // Try to get real route, fallback to straight line
    const fetchRoute = async () => {
      try {
        // Try to use OSRM but with timeout
        const router = createCustomRouter();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const routingOptions: any = {
          waypoints: waypoints,
          router: router,
          routeWhileDragging: false,
          addWaypoints: false,
          createMarker: function () {
            return null;
          },
          lineOptions: {
            styles: [{ color: "#3b82f6", weight: 6, opacity: 0.8 }],
            extendToWaypoints: true,
            missingRouteTolerance: 0,
          },
          show: false,
          collapsible: false,
          autoRoute: true,
          fitSelectedRoutes: false,
        };

        routingControlRef.current = L.Routing.control(routingOptions);

        // Handle successful route
        routingControlRef.current.on("routesfound", (e: any) => {
          const foundRoutes = e.routes;
          if (foundRoutes?.[0]?.coordinates) {
            // Remove straight line if it exists
            if (routeLineRef.current) {
              routeLineRef.current.remove();
              routeLineRef.current = null;
            }
            repositionEventsAlongRoute(foundRoutes[0].coordinates);
          }
        });

        // Handle routing error
        routingControlRef.current.on("routingerror", () => {
          console.warn("OSRM routing failed, using straight line fallback");
          const straightLineCoords = createStraightLineRoute();
          if (straightLineCoords) {
            repositionEventsAlongRoute(straightLineCoords);
          }
        });

        // Add to map only if map is still available
        if (mapRef.current) {
          routingControlRef.current.addTo(mapRef.current);
        }
      } catch (error) {
        console.warn(
          "Failed to create routing control, using straight line:",
          error,
        );
        const straightLineCoords = createStraightLineRoute();
        if (straightLineCoords) {
          repositionEventsAlongRoute(straightLineCoords);
        }
      }
    };

    fetchRoute();

    // Initial stop markers (before route repositioning fires)
    addStopMarkersToMap(safeEvents);

    // --- Route info control ---
    const truncate = (str: string, len: number) =>
      str.length > len ? str.substring(0, len) + "..." : str;

    const RouteInfoControl = L.Control.extend({
      onAdd: function () {
        const div = L.DomUtil.create("div", "route-info-control");
        div.innerHTML = `
          <div style="background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.1); min-width: 200px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="font-size: 16px;">📍</span>
              <span style="font-weight: bold; font-size: 14px; color: #1e293b;">Route Summary</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
              <div style="text-align: center; padding: 8px; background: #f1f5f9; border-radius: 8px;">
                <div style="font-weight: bold; color: #3b82f6; font-size: 16px;">${route.distanceMiles}</div>
                <div style="color: #64748b; font-size: 10px; font-weight: 500;">TOTAL MILES</div>
              </div>
              <div style="text-align: center; padding: 8px; background: #f1f5f9; border-radius: 8px;">
                <div style="font-weight: bold; color: #059669; font-size: 16px;">${route.durationHours.toFixed(1)}h</div>
                <div style="color: #64748b; font-size: 10px; font-weight: 500;">EST. DRIVE TIME</div>
              </div>
            </div>
            <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb;"></div>
                <span>Start: ${truncate(route.points.origin.address, 25)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #16a34a;"></div>
                <span>Pickup: ${truncate(route.points.pickup.address, 25)}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: #dc2626;"></div>
                <span>Dropoff: ${truncate(route.points.dropoff.address, 25)}</span>
              </div>
            </div>
          </div>
        `;
        return div;
      },
    });

    infoControlRef.current = new RouteInfoControl({ position: "bottomleft" });
    infoControlRef.current.addTo(mapRef.current);

    // --- Legend control ---
    const LegendControl = L.Control.extend({
      onAdd: function () {
        const div = L.DomUtil.create("div", "legend-control");
        div.innerHTML = `
          <div style="background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 12px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.1); max-width: 180px;">
            <div style="font-weight: bold; font-size: 12px; color: #1e293b; margin-bottom: 8px; text-align: center;">Stop Types</div>
            <div style="display: grid; gap: 6px; font-size: 10px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #ea580c; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                <span style="color: #374151;">Fuel Station</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #6366f1; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                <span style="color: #374151;">Sleeper Rest</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #8b5cf6; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                <span style="color: #374151;">Mandatory Break</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #16a34a; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                <span style="color: #374151;">Loading</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: #dc2626; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
                <span style="color: #374151;">Unloading</span>
              </div>
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #6b7280; text-align: center;">
              Click markers for details
            </div>
          </div>
        `;
        return div;
      },
    });

    legendControlRef.current = new LegendControl({ position: "topright" });
    legendControlRef.current.addTo(mapRef.current);

    // --- Fit map to show all waypoints ---
    try {
      const bounds = L.latLngBounds(waypoints);
      mapRef.current.fitBounds(bounds.pad(0.1));
    } catch (error) {
      console.error("Failed to fit bounds:", error);
    }
  }, [
    route,
    safeEvents,
    clearAllMarkers,
    repositionEventsAlongRoute,
    addStopMarkersToMap,
    createStraightLineRoute,
  ]);

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        width: "100%",
        display: "flex",
        overflow: "hidden",
        borderRadius: "0.75rem",
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      {/* Map Container */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          height: "100%",
        }}
      >
        <div
          ref={mapContainerRef}
          style={{
            height: "100%",
            width: "100%",
            overflow: "hidden",
            boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)",
          }}
        />
      </Box>

      {/* Instructions Panel */}
      {route?.instructions && route.instructions.length > 0 && (
        <Collapse
          in={instructionsOpen}
          orientation="horizontal"
          sx={{
            position: "relative",
            height: "100%",
          }}
        >
          <Paper
            elevation={3}
            sx={{
              width: 320,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderLeft: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              borderRadius: 0,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 2,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Navigation size={20} color={theme.palette.primary.main} />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, color: theme.palette.primary.main }}
                >
                  Turn-by-Turn Directions
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, mt: 0.5 }}
              >
                {route.instructions.length} steps •{" "}
                {route.distanceMiles.toFixed(1)} miles
              </Typography>
            </Box>

            {/* Instructions List */}
            <List
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 0,
                "& .MuiListItem-root": {
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                  },
                },
              }}
            >
              {route.instructions.map((instruction, index) => (
                <ListItem
                  key={index}
                  sx={{
                    py: 2,
                    px: 2.5,
                    alignItems: "flex-start",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 28,
                      height: 28,
                      borderRadius: "50%",
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      mt: 0.5,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <ListItemText
                    primary={instruction}
                    primaryTypographyProps={{
                      variant: "body2",
                      sx: {
                        color: theme.palette.text.primary,
                        lineHeight: 1.6,
                      },
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Collapse>
      )}

      {/* Toggle Button */}
      {route?.instructions && route.instructions.length > 0 && (
        <Tooltip
          title={instructionsOpen ? "Hide directions" : "Show directions"}
          placement="left"
        >
          <IconButton
            onClick={() => setInstructionsOpen(!instructionsOpen)}
            sx={{
              position: "absolute",
              right: instructionsOpen ? 320 : 0,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 1000,
              bgcolor: theme.palette.background.paper,
              border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              boxShadow: 3,
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderColor: theme.palette.primary.main,
              },
              transition: "all 0.3s ease",
            }}
            size="small"
          >
            {instructionsOpen ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default RouteMap;
