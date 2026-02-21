
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
  start: Date;
  end: Date;
  location: string;
  remarks: string;
  lat?: number;
  lng?: number;
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
