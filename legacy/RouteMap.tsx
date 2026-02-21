import React, { useEffect, useRef } from "react";
import { RouteResult, DutyEvent } from "../types";

interface RouteMapProps {
  route?: RouteResult;
  events?: DutyEvent[];
}

const RouteMap: React.FC<RouteMapProps> = ({ route, events }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = (window as any).L.map(mapContainerRef.current).setView(
        [39.8283, -98.5795],
        4,
      );
      (window as any).L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "© OpenStreetMap contributors",
        },
      ).addTo(mapRef.current);
    }

    const L = (window as any).L;

    // Clear existing dynamic layers
    mapRef.current.eachLayer((layer: any) => {
      if (layer._url === undefined) mapRef.current.removeLayer(layer);
    });

    if (route) {
      const L = (window as any).L;

      // Create waypoints for the route: origin -> pickup -> dropoff
      const waypoints = [
        L.latLng(route.points.origin.lat, route.points.origin.lng),
        L.latLng(route.points.pickup.lat, route.points.pickup.lng),
        L.latLng(route.points.dropoff.lat, route.points.dropoff.lng),
      ];

      // Create routing control with waypoints
      const routingControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        createMarker: function () {
          return null;
        }, // We'll add custom markers
        lineOptions: {
          styles: [{ color: "#3b82f6", weight: 6, opacity: 0.8 }],
        },
        show: false, // Hide the routing instructions panel
        collapsible: false,
      }).addTo(mapRef.current);

      // Listen for when the route is found and reposition stops along actual route
      routingControl.on("routesfound", function (e) {
        const routes = e.routes;
        if (routes && routes[0] && routes[0].coordinates) {
          const routeCoordinates = routes[0].coordinates;
          console.log(
            "Actual route coordinates:",
            routeCoordinates.length,
            "points",
          );

          // Reposition events along the actual route
          repositionEventsAlongRoute(routeCoordinates);
        }
      });

      // Function to reposition events along the actual route coordinates
      const repositionEventsAlongRoute = (routeCoords: any[]) => {
        if (!events || !routeCoords.length) return;

        // Calculate distances for each event based on logical positioning
        events.forEach((event, idx) => {
          if (
            event.status === "off_duty" &&
            (event.remarks.includes("Continuous Rest Period") ||
              event.remarks.includes("End of Day Rest Period"))
          ) {
            return; // Skip repositioning home terminal events
          }

          // Determine logical position based on event type and location
          let targetLat, targetLng;

          if (event.remarks.includes("Pre-trip Inspection")) {
            // Pre-trip happens at origin
            targetLat = route.points.origin.lat;
            targetLng = route.points.origin.lng;
          } else if (
            event.remarks.includes("Pickup") ||
            event.remarks.includes("Loading")
          ) {
            // Pickup/Loading happens at pickup location
            targetLat = route.points.pickup.lat;
            targetLng = route.points.pickup.lng;
          } else if (
            event.remarks.includes("Dropoff") ||
            event.remarks.includes("Unloading") ||
            event.remarks.includes("Post-trip")
          ) {
            // Dropoff/Unloading/Post-trip happens at dropoff location
            targetLat = route.points.dropoff.lat;
            targetLng = route.points.dropoff.lng;
          } else {
            // For intermediate stops (fuel, breaks, sleeper), position along route
            const eventStartTime = event.start.getTime();
            const tripStartTime =
              events
                .find((e) => e.remarks.includes("Pre-trip"))
                ?.start.getTime() || events[0].start.getTime();
            const tripEndTime =
              events
                .find((e) => e.remarks.includes("Post-trip"))
                ?.end.getTime() || events[events.length - 1].end.getTime();

            // Calculate progress through driving portion only
            const progressRatio = Math.min(
              Math.max(
                (eventStartTime - tripStartTime) /
                  (tripEndTime - tripStartTime),
                0,
              ),
              1,
            );

            // Position along route coordinates
            const targetIndex = Math.floor(
              progressRatio * (routeCoords.length - 1),
            );
            const coord = routeCoords[targetIndex];

            if (coord) {
              targetLat = coord.lat;
              targetLng = coord.lng;
            }
          }

          if (targetLat && targetLng) {
            event.lat = targetLat;
            event.lng = targetLng;
            console.log(
              `Repositioned ${event.status} (${event.remarks}) to`,
              targetLat,
              targetLng,
            );
          }
        });

        // Clear existing stop markers and re-add them with corrected positions
        addStopMarkersToMap();
      };

      const addStopMarkersToMap = () => {
        // Clear existing stop markers (keep route and main waypoint markers)
        mapRef.current.eachLayer((layer: any) => {
          if (
            layer.options &&
            layer.options.icon &&
            layer.options.icon.options.className === "custom-stop-icon"
          ) {
            mapRef.current.removeLayer(layer);
          }
        });

        // Add stop markers with corrected positions
        events.forEach((event, idx) => {
          // Skip regular driving or events without coordinates
          if (event.status === "driving" || !event.lat || !event.lng) {
            console.log(
              "Skipping event:",
              event.status,
              event.lat,
              event.lng,
              event.remarks,
            );
            return;
          }

          // Skip initial and final off-duty periods (rest at home terminal)
          if (
            event.status === "off_duty" &&
            (event.remarks.includes("Continuous Rest Period") ||
              event.remarks.includes("End of Day Rest Period"))
          ) {
            console.log("Skipping off-duty period:", event.remarks);
            return;
          }

          // Don't duplicate markers exactly at origin/pickup/destination
          const isAtOrigin =
            Math.abs(event.lat - route.points.origin.lat) < 0.01 &&
            Math.abs(event.lng - route.points.origin.lng) < 0.01;
          const isAtPickup =
            Math.abs(event.lat - route.points.pickup.lat) < 0.01 &&
            Math.abs(event.lng - route.points.pickup.lng) < 0.01;
          const isAtDropoff =
            Math.abs(event.lat - route.points.dropoff.lat) < 0.01 &&
            Math.abs(event.lng - route.points.dropoff.lng) < 0.01;

          if (isAtOrigin || isAtPickup || isAtDropoff) {
            console.log("Skipping event at main waypoint:", event.remarks);
            return;
          }

          console.log(
            "Adding stop marker for:",
            event.status,
            event.remarks,
            "at",
            event.lat,
            event.lng,
          );

          let color = "#f59e0b"; // Amber for standard on-duty
          let label = "Stop";
          let iconChar = "•";
          let bgIcon = "⏸";

          if (event.remarks.includes("Fueling Stop")) {
            color = "#ea580c"; // Orange-Red for fuel
            label = "Fuel Station";
            iconChar = "⛽";
            bgIcon = "🚛";
          } else if (event.status === "sleeper_berth") {
            color = "#6366f1"; // Indigo for sleeper
            label = "Sleeper Rest";
            iconChar = "🛏";
            bgIcon = "💤";
          } else if (event.status === "off_duty") {
            color = "#8b5cf6"; // Violet for break
            label = "Mandatory Break";
            iconChar = "⏱";
            bgIcon = "⏸";
          } else if (event.remarks.includes("Loading")) {
            color = "#16a34a"; // Green for loading
            label = "Loading";
            iconChar = "📦";
            bgIcon = "⬆";
          } else if (event.remarks.includes("Unloading")) {
            color = "#dc2626"; // Red for unloading
            label = "Unloading";
            iconChar = "📦";
            bgIcon = "⬇";
          }

          const stopIcon = L.divIcon({
            className: "custom-stop-icon",
            html: `
              <div style="
                background-color: ${color}; 
                border: 3px solid white; 
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                font-weight: bold;
                position: relative;
              ">
                ${iconChar}
                <div style="
                  position: absolute;
                  top: -4px;
                  right: -4px;
                  width: 12px;
                  height: 12px;
                  background: white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 8px;
                ">
                  ${bgIcon}
                </div>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          const duration = Math.round(
            (event.end.getTime() - event.start.getTime()) / (1000 * 60),
          ); // minutes
          const timeStr = event.start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          const endTimeStr = event.end.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

          L.marker([event.lat, event.lng], { icon: stopIcon }).addTo(
            mapRef.current,
          ).bindPopup(`
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
        });
      };

      // Initial markers with original coordinates (will be repositioned once route is calculated)
      addStopMarkersToMap();

      // Add custom markers with better styling
      const originIcon = L.divIcon({
        className: "custom-div-icon",
        html: '<div style="background-color: #2563eb; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const pickupIcon = L.divIcon({
        className: "custom-div-icon",
        html: '<div style="background-color: #16a34a; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const dropoffIcon = L.divIcon({
        className: "custom-div-icon",
        html: '<div style="background-color: #dc2626; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      L.marker([route.points.origin.lat, route.points.origin.lng], {
        icon: originIcon,
      })
        .addTo(mapRef.current)
        .bindPopup("<b>Trip Start</b><br/>" + route.points.origin.address);
      L.marker([route.points.pickup.lat, route.points.pickup.lng], {
        icon: pickupIcon,
      })
        .addTo(mapRef.current)
        .bindPopup("<b>Pickup Location</b><br/>" + route.points.pickup.address);
      L.marker([route.points.dropoff.lat, route.points.dropoff.lng], {
        icon: dropoffIcon,
      })
        .addTo(mapRef.current)
        .bindPopup(
          "<b>Dropoff Location</b><br/>" + route.points.dropoff.address,
        );

      // Add route information overlay
      if (route) {
        const routeInfoControl = L.control({ position: "bottomleft" });
        routeInfoControl.onAdd = function () {
          const div = L.DomUtil.create("div", "route-info-control");
          div.innerHTML = `
            <div style="background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid rgba(0,0,0,0.1); min-width: 200px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-center;">
                  <span style="color: white; font-size: 12px; font-weight: bold;">📍</span>
                </div>
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
                  <span>Start: ${route.points.origin.address.length > 25 ? route.points.origin.address.substring(0, 25) + "..." : route.points.origin.address}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: #16a34a;"></div>
                  <span>Pickup: ${route.points.pickup.address.length > 25 ? route.points.pickup.address.substring(0, 25) + "..." : route.points.pickup.address}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: #dc2626;"></div>
                  <span>Dropoff: ${route.points.dropoff.address.length > 25 ? route.points.dropoff.address.substring(0, 25) + "..." : route.points.dropoff.address}</span>
                </div>
              </div>
            </div>
          `;
          return div;
        };
        routeInfoControl.addTo(mapRef.current);

        // Add legend for stop types
        const legendControl = L.control({ position: "topright" });
        legendControl.onAdd = function () {
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
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #6b7280; text-center;">
                Click markers for details
              </div>
            </div>
          `;
          return div;
        };
        legendControl.addTo(mapRef.current);
      }

      // Fit map to show all waypoints
      const group = new L.featureGroup(waypoints.map((wp) => L.marker(wp)));
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [route, events]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        height: "100%",
        width: "100%",
        borderRadius: "0.75rem",
        overflow: "hidden",
        boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)",
        border: "1px solid #e2e8f0",
      }}
    />
  );
};

export default RouteMap;
