export type DutyStatus =
  | "off_duty"
  | "sleeper_berth"
  | "driving"
  | "on_duty_not_driving";

export type CycleId = "60_in_7" | "70_in_8";

export interface ApproachingLimitAlert {
  type: "driving" | "duty_window" | "break" | "cycle";
  thresholdMinutes: number; 
}

export interface SplitSleeperOption {
  sleeperMinHours: number;
  otherMinHours: number;
  otherAllowedStatuses: DutyStatus[];
}

export interface HosProfileConfig {
  profileId: string;
  label: string;
  dutyStatuses: Record<
    DutyStatus,
    {
      countsTowardDriving: boolean;
      countsTowardOnDuty: boolean;
      countsTowardDutyWindow: boolean;
      qualifiesAsRest: boolean;
    }
  >;
  shiftRules: {
    minOffDutyBeforeShiftHours: number;
    maxDrivingHours: number;
    maxDutyWindowHours: number;
    allowDrivingAfterDutyWindow: boolean;
  };
  breakRules: {
    requiredAfterDrivingHours: number;
    breakDurationMinutes: number;
    qualifyingStatuses: DutyStatus[];
    mustBeContinuous: boolean;
  };
  cycleRules: {
    supportedCycles: Array<{
      id: CycleId;
      label: string;
      maxOnDutyHours: number;
      periodDays: number;
    }>;
    defaultCycleId: CycleId;
    restart: {
      enabled: boolean;
      durationHours: number;
      mustBeContinuous: boolean;
    };
  };
  sleeperBerthRules: {
    enabled: boolean;
    splitOptions: SplitSleeperOption[];
    sleeperStatus: "sleeper_berth";
    allowSplitToPauseDutyWindow: boolean;
    allowSplitToSatisfyShiftOffDuty: boolean;
  };
  exceptions: {
    adverseDrivingConditions: {
      enabled: boolean;
      extraDrivingHours: number;
      extraDutyWindowHours: number;
    };
    shortHaul: {
      enabled: boolean;
      maxRadiusAirMiles: number;
      maxDutyHours: number;
      maxDrivingHours: number;
      logbookNotRequired: boolean;
    };
  };
  timeRules: {
    timezoneStrategy: "home_terminal" | "driver_device" | "utc";
    precision: "minute";
    rollingWindows: boolean;
    requireAuditTrailForEdits: boolean;
  };
  alerts: {
    approaching: ApproachingLimitAlert[];
  };
}

export interface Location {
  address: string;
  lat: number;
  lng: number;
}

export interface CarrierInfo {
  driverName: string;
  carrierName: string;
  mainOfficeAddress: string;
  homeTerminalAddress: string;
  truckNumber: string;
  shippingDocs: string;
  coDriverName?: string;
}

export interface TripInputs {
  origin: string;
  pickup: string;
  dropoff: string;
  cycleHoursUsed: number;
  startTime: string;
}

export interface DutyEvent {
  status: DutyStatus;
  start: Date | string;
  end: Date | string;
  startHour: number;    // Hour of day as decimal (0-24), e.g., 8.5 = 8:30 AM
  endHour: number;      // Hour of day as decimal (0-24)
  startTime: string;    // Display string "HH:MM"
  endTime: string;      // Display string "HH:MM"
  location: string;
  remarks: string;
  lat?: number;
  lng?: number;
  miles?: number;
}

export interface DailyLog {
  date: string;
  events: DutyEvent[];
  totals: Record<DutyStatus, number>;
  totalMiles: number;
}

export interface RouteResult {
  distanceMiles: number;
  durationHours: number;
  polyline: [number, number][];
  instructions: string[];
  points: {
    origin: Location;
    pickup: Location;
    dropoff: Location;
  };
}

// Trip management specific types
export interface SavedTrip {
  id: string;
  timestamp: string;
  inputs: TripInputs;
  carrier: CarrierInfo;
  route?: RouteResult;
  logs: DailyLog[];
  events: DutyEvent[];
  hosConfig: HosProfileConfig;
  intel?: string;
  timezone?: string;  // Home terminal timezone (IANA format, e.g., 'America/New_York')
}

export type AppViewMode = "TRIP_LIST" | "NEW_TRIP" | "VIEW_TRIP";
export type TripViewMode = "map" | "logs" | "instructions" | "hos" | "carrier";