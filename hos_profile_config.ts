
import { HosProfileConfig } from "./types";

export const HOS_PROFILE_CONFIG_PROPERTY_CARRYING_US_FMCSA: HosProfileConfig = {
  profileId: "us_fmcsa_property_carrying_interstate",
  label: "US FMCSA – Property-carrying (Interstate)",
  dutyStatuses: {
    off_duty: {
      countsTowardDriving: false,
      countsTowardOnDuty: false,
      countsTowardDutyWindow: false,
      qualifiesAsRest: true,
    },
    sleeper_berth: {
      countsTowardDriving: false,
      countsTowardOnDuty: false,
      countsTowardDutyWindow: false,
      qualifiesAsRest: true,
    },
    driving: {
      countsTowardDriving: true,
      countsTowardOnDuty: true,
      countsTowardDutyWindow: true,
      qualifiesAsRest: false,
    },
    on_duty_not_driving: {
      countsTowardDriving: false,
      countsTowardOnDuty: true,
      countsTowardDutyWindow: true,
      qualifiesAsRest: false,
    },
  },
  shiftRules: {
    minOffDutyBeforeShiftHours: 10,
    maxDrivingHours: 11,
    maxDutyWindowHours: 14,
    allowDrivingAfterDutyWindow: false,
  },
  breakRules: {
    requiredAfterDrivingHours: 8,
    breakDurationMinutes: 30,
    qualifyingStatuses: ["off_duty", "sleeper_berth", "on_duty_not_driving"],
    mustBeContinuous: true,
  },
  cycleRules: {
    supportedCycles: [
      { id: "60_in_7", label: "60 hours / 7 days", maxOnDutyHours: 60, periodDays: 7 },
      { id: "70_in_8", label: "70 hours / 8 days", maxOnDutyHours: 70, periodDays: 8 },
    ],
    defaultCycleId: "70_in_8",
    restart: {
      enabled: true,
      durationHours: 34,
      mustBeContinuous: true,
    },
  },
  sleeperBerthRules: {
    enabled: true,
    splitOptions: [
      {
        sleeperMinHours: 8,
        otherMinHours: 2,
        otherAllowedStatuses: ["off_duty", "sleeper_berth"],
      },
      {
        sleeperMinHours: 7,
        otherMinHours: 3,
        otherAllowedStatuses: ["off_duty", "sleeper_berth"],
      },
    ],
    sleeperStatus: "sleeper_berth",
    allowSplitToPauseDutyWindow: true,
    allowSplitToSatisfyShiftOffDuty: true,
  },
  exceptions: {
    adverseDrivingConditions: {
      enabled: true,
      extraDrivingHours: 2,
      extraDutyWindowHours: 2,
    },
    shortHaul: {
      enabled: false,
      maxRadiusAirMiles: 150,
      maxDutyHours: 14,
      maxDrivingHours: 11,
      logbookNotRequired: true,
    },
  },
  timeRules: {
    timezoneStrategy: "home_terminal",
    precision: "minute",
    rollingWindows: true,
    requireAuditTrailForEdits: true,
  },
  alerts: {
    approaching: [
      { type: "driving", thresholdMinutes: 60 },
      { type: "duty_window", thresholdMinutes: 60 },
      { type: "break", thresholdMinutes: 30 },
      { type: "cycle", thresholdMinutes: 120 },
    ],
  },
};

export default HOS_PROFILE_CONFIG_PROPERTY_CARRYING_US_FMCSA;
