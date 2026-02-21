
import { DutyEvent, DutyStatus, RouteResult, DailyLog, HosProfileConfig } from "../types";

// Helper to calculate distance between two points (Haversine approximation for short distances)
const getDist = (p1: [number, number], p2: [number, number]) => {
  const R = 3958.8; // Miles
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLng = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Find the coordinate at a specific distance along a polyline
const getCoordinateAtDistance = (targetDist: number, polyline: [number, number][]): { lat: number, lng: number } => {
  if (polyline.length === 0) return { lat: 0, lng: 0 };
  if (targetDist <= 0) return { lat: polyline[0][0], lng: polyline[0][1] };

  let accumulatedDist = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];
    const segmentDist = getDist(p1, p2);

    if (accumulatedDist + segmentDist >= targetDist) {
      const remaining = targetDist - accumulatedDist;
      const ratio = remaining / segmentDist;
      return {
        lat: p1[0] + (p2[0] - p1[0]) * ratio,
        lng: p1[1] + (p2[1] - p1[1]) * ratio
      };
    }
    accumulatedDist += segmentDist;
  }
  
  const last = polyline[polyline.length - 1];
  return { lat: last[0], lng: last[1] };
};

export const generateDutyEvents = (route: RouteResult, startTime: Date, config: HosProfileConfig, averageSpeed: number): DutyEvent[] => {
  const events: DutyEvent[] = [];
  
  const startOfDayOne = new Date(startTime);
  startOfDayOne.setHours(0, 0, 0, 0);
  
  // Start current time from midnight, not from startTime
  let currentTime = new Date(startOfDayOne);
  let currentDistance = 0;

  const addEvent = (status: DutyStatus, durationHours: number, location: string, remarks: string) => {
    const end = new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000);
    const coords = getCoordinateAtDistance(currentDistance, route.polyline);
    
    events.push({ 
      status, 
      start: new Date(currentTime), 
      end, 
      location, 
      remarks,
      lat: coords.lat,
      lng: coords.lng
    });
    
    // Advance distance for any event that involves movement or progression along route
    if (status === 'driving') {
      currentDistance += durationHours * averageSpeed;
    } else if (status === 'on_duty_not_driving' && remarks.includes('Fueling Stop')) {
      // Fuel stops happen during the journey, advance a small amount to spread them out
      currentDistance += 5; // Small advancement to position fuel stops along route
    } else if (status === 'off_duty' && remarks.includes('Break')) {
      // Rest breaks happen during journey, advance slightly
      currentDistance += 3;
    } else if (status === 'sleeper_berth') {
      // Sleeper rest happens during journey, advance moderately
      currentDistance += 10;
    }
    
    currentTime = end;
  };

  // Create continuous OFF_DUTY period from midnight until actual start time
  if (startTime.getTime() > startOfDayOne.getTime()) {
    const offDutyHours = (startTime.getTime() - startOfDayOne.getTime()) / (1000 * 60 * 60);
    addEvent("off_duty", offDutyHours, "Home Terminal", "Off Duty - Continuous Rest Period");
  }

  let remainingDrivingHours = route.durationHours;
  let shiftDrivingHours = 0;
  let shiftDutyWindowHours = 0;
  let drivingSinceLastBreakHours = 0;
  let milesSinceFuel = 0;
  const fuelIntervalMiles = 1000; // Assumption: Fueling every 1,000 miles

  // Calculate segment distances to properly split driving time
  const originToPickupDist = getDist(
    [route.points.origin.lat, route.points.origin.lng],
    [route.points.pickup.lat, route.points.pickup.lng]
  );
  const pickupToDropoffDist = getDist(
    [route.points.pickup.lat, route.points.pickup.lng],
    [route.points.dropoff.lat, route.points.dropoff.lng]
  );
  const totalDistance = originToPickupDist + pickupToDropoffDist;

  // Split driving time proportionally based on actual distances
  const originToPickupHours = totalDistance > 0 ? 
    (originToPickupDist / totalDistance) * route.durationHours : 0;
  const pickupToDropoffHours = totalDistance > 0 ? 
    (pickupToDropoffDist / totalDistance) * route.durationHours : route.durationHours;

  // 1. PRE-TRIP INSPECTION
  addEvent("on_duty_not_driving", 0.25, route.points.origin.address, "Pre-trip Inspection");
  shiftDutyWindowHours += 0.25;

  // 2. DRIVING FROM ORIGIN TO PICKUP
  if (originToPickupHours > 0) {
    let originToPickupRemaining = originToPickupHours;
    
    while (originToPickupRemaining > 0) {
      // Check for 30-min break rule before continuing
      if (drivingSinceLastBreakHours >= config.breakRules.requiredAfterDrivingHours) {
        const breakDur = config.breakRules.breakDurationMinutes / 60;
        addEvent("off_duty", breakDur, "Rest Area", `${config.breakRules.breakDurationMinutes}-min Break`);
        shiftDutyWindowHours += breakDur;
        drivingSinceLastBreakHours = 0;
        continue;
      }

      const maxDrivingThisSegment = Math.min(
        originToPickupRemaining,
        config.shiftRules.maxDrivingHours - shiftDrivingHours,
        config.shiftRules.maxDutyWindowHours - shiftDutyWindowHours,
        config.breakRules.requiredAfterDrivingHours - drivingSinceLastBreakHours
      );

      if (maxDrivingThisSegment <= 0) break; // Will need rest before pickup

      addEvent("driving", maxDrivingThisSegment, "En Route to Pickup", "Driving to Pickup Location");
      
      originToPickupRemaining -= maxDrivingThisSegment;
      remainingDrivingHours -= maxDrivingThisSegment;
      shiftDrivingHours += maxDrivingThisSegment;
      shiftDutyWindowHours += maxDrivingThisSegment;
      drivingSinceLastBreakHours += maxDrivingThisSegment;
      milesSinceFuel += (maxDrivingThisSegment * averageSpeed);
    }
  }

  // 3. PICKUP OPERATION (Assumption: 1 hour)
  addEvent("on_duty_not_driving", 1.0, route.points.pickup.address, "Pickup (Loading)");
  shiftDutyWindowHours += 1.0;

  // 4. DRIVING FROM PICKUP TO DROPOFF (MAIN DRIVING LOOP)
  remainingDrivingHours = pickupToDropoffHours;
  while (remainingDrivingHours > 0) {
    // Check for fuel limit
    if (milesSinceFuel >= fuelIntervalMiles) {
      addEvent("on_duty_not_driving", 0.5, "Fuel Station", "Fueling Stop");
      shiftDutyWindowHours += 0.5;
      milesSinceFuel = 0;
    }

    const atDrivingLimit = shiftDrivingHours >= config.shiftRules.maxDrivingHours;
    const atDutyWindowLimit = shiftDutyWindowHours >= config.shiftRules.maxDutyWindowHours;

    if (atDrivingLimit || atDutyWindowLimit) {
      addEvent("sleeper_berth", config.shiftRules.minOffDutyBeforeShiftHours, "Truck Stop", `${config.shiftRules.minOffDutyBeforeShiftHours}h Daily Rest`);
      shiftDrivingHours = 0;
      shiftDutyWindowHours = 0;
      drivingSinceLastBreakHours = 0;
      continue;
    }

    // Check for 30-min break rule
    if (drivingSinceLastBreakHours >= config.breakRules.requiredAfterDrivingHours) {
      const breakDur = config.breakRules.breakDurationMinutes / 60;
      addEvent("off_duty", breakDur, "Rest Area", `${config.breakRules.breakDurationMinutes}-min Break`);
      shiftDutyWindowHours += breakDur;
      drivingSinceLastBreakHours = 0;
      continue;
    }

    const maxDrivingThisSegment = Math.min(
      remainingDrivingHours,
      config.shiftRules.maxDrivingHours - shiftDrivingHours,
      config.shiftRules.maxDutyWindowHours - shiftDutyWindowHours,
      config.breakRules.requiredAfterDrivingHours - drivingSinceLastBreakHours
    );

    if (maxDrivingThisSegment <= 0) {
      // Emergency rest if window closed unexpectedly
      addEvent("sleeper_berth", config.shiftRules.minOffDutyBeforeShiftHours, "Rest Area", "Duty Window Rest");
      shiftDrivingHours = 0;
      shiftDutyWindowHours = 0;
      drivingSinceLastBreakHours = 0;
      continue;
    }

    addEvent("driving", maxDrivingThisSegment, "En Route to Dropoff", "Driving to Delivery Location");
    
    remainingDrivingHours -= maxDrivingThisSegment;
    shiftDrivingHours += maxDrivingThisSegment;
    shiftDutyWindowHours += maxDrivingThisSegment;
    drivingSinceLastBreakHours += maxDrivingThisSegment;
    milesSinceFuel += (maxDrivingThisSegment * averageSpeed);
  }

  // 5. DROPOFF OPERATION (Assumption: 1 hour)
  addEvent("on_duty_not_driving", 1.0, route.points.dropoff.address, "Dropoff (Unloading)");
  shiftDutyWindowHours += 1.0;

  // 6. POST-TRIP INSPECTION
  addEvent("on_duty_not_driving", 0.25, route.points.dropoff.address, "Post-trip Inspection");

  // Create continuous OFF_DUTY period to end of day (ensuring 24-hour coverage)
  const endOfLastDay = new Date(currentTime);
  endOfLastDay.setHours(23, 59, 59, 999);
  if (endOfLastDay.getTime() > currentTime.getTime()) {
    const finalOffDutyHours = (endOfLastDay.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
    addEvent("off_duty", finalOffDutyHours, "Home Terminal", "Off Duty - End of Day Rest Period");
  }

  return events;
};

export const splitEventsIntoDays = (events: DutyEvent[], averageSpeed: number): DailyLog[] => {
  const dailyLogs: Record<string, DailyLog> = {};

  events.forEach(event => {
    let current = new Date(event.start);
    const end = new Date(event.end);

    while (current < end) {
      const dateKey = current.toISOString().split('T')[0];
      const startOfDay = new Date(current);
      startOfDay.setHours(0, 0, 0, 0);
      const nextDay = new Date(startOfDay);
      nextDay.setDate(nextDay.getDate() + 1);

      const segmentEnd = end < nextDay ? end : nextDay;
      const durationHours = (segmentEnd.getTime() - current.getTime()) / (1000 * 60 * 60);

      if (!dailyLogs[dateKey]) {
        dailyLogs[dateKey] = {
          date: dateKey,
          events: [],
          totals: { off_duty: 0, sleeper_berth: 0, driving: 0, on_duty_not_driving: 0 },
          totalMiles: 0
        };
      }

      dailyLogs[dateKey].events.push({
        ...event,
        start: new Date(current),
        end: new Date(segmentEnd)
      });
      dailyLogs[dateKey].totals[event.status] += durationHours;
      
      if (event.status === "driving") {
        dailyLogs[dateKey].totalMiles += durationHours * averageSpeed;
      }

      current = segmentEnd;
    }
  });

  return Object.values(dailyLogs).sort((a, b) => a.date.localeCompare(b.date));
};
