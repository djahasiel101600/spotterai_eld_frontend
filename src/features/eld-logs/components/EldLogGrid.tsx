import React, { useMemo, useCallback } from "react";
import { DailyLog, DutyStatus, CarrierInfo, DutyEvent } from "../../../shared/types";
import { Box, Paper, Typography, Grid } from "@mui/material";

interface EldLogGridProps {
  log: DailyLog;
  carrier: CarrierInfo;
  origin?: string;
  destination?: string;
  timezone?: string;
}

const EldLogGrid: React.FC<EldLogGridProps> = ({
  log,
  carrier,
  origin,
  destination,
}) => {
  const [year, month, day] = log.date.split("-");
  const statusOrder: DutyStatus[] = [
    "off_duty",
    "sleeper_berth",
    "driving",
    "on_duty_not_driving",
  ];
  const labels = [
    "1. Off Duty",
    "2. Sleeper Berth",
    "3. Driving",
    "4. On Duty (not driving)",
  ];

  const LABEL_WIDTH = 120;
  const GRID_WIDTH = 840;
  const TOTAL_WIDTH = 40;
  const HOUR_STEP = 35;
  const ROW_HEIGHT = 40;

  const getX = useCallback(
    (hour: number) => {
      const clampedHour = Math.max(0, Math.min(24, hour));
      return clampedHour * HOUR_STEP;
    },
    [HOUR_STEP],
  );

  const getY = useCallback(
    (status: DutyStatus) => {
      const index = statusOrder.indexOf(status);
      return index * ROW_HEIGHT + ROW_HEIGHT / 2;
    },
    [ROW_HEIGHT],
  );

  const grandTotal = Object.values(log.totals).reduce(
    (sum, val) => sum + val,
    0,
  );

  // Sort events by startHour for consistent display in both graph and remarks
  const sortedEvents = useMemo(() => {
    return [...log.events].sort((a, b) => {
      const aHour = a.startHour ?? 0;
      const bHour = b.startHour ?? 0;
      return aHour - bHour;
    });
  }, [log.events]);

  // Helper to format hour as HH:MM string, with day indicator if past midnight
  const formatHour = (hour: number): string => {
    const dayOffset = Math.floor(hour / 24);
    const h = Math.floor(hour) % 24;
    const m = Math.round((hour % 1) * 60);
    let timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    if (dayOffset > 0) {
      timeStr += ` (+${dayOffset})`;
    }
    return timeStr;
  };

  const processedEvents = useMemo(() => {
    const getLineStyle = (status: DutyStatus) => {
      switch (status) {
        case "off_duty":
          return { stroke: "#dc2626", strokeWidth: 5 };
        case "sleeper_berth":
          return { stroke: "#2563eb", strokeWidth: 4 };
        case "driving":
          return { stroke: "#16a34a", strokeWidth: 4 };
        case "on_duty_not_driving":
          return { stroke: "#ea580c", strokeWidth: 4 };
        default:
          return { stroke: "#000", strokeWidth: 4 };
      }
    };

    return sortedEvents.map((event, idx) => {
      const startHour = event.startHour ?? 0;
      const endHour = event.endHour ?? 24;
      
      const x1 = getX(startHour);
      const x2 = getX(endHour);
      const y = getY(event.status);
      const nextY = idx < sortedEvents.length - 1 ? getY(sortedEvents[idx + 1].status) : null;

      return {
        ...event,
        x1,
        x2,
        y,
        nextY,
        lineStyle: getLineStyle(event.status),
        idx,
        isVisible: Math.abs(x1 - x2) >= 0.1,
        // Ensure time strings are derived from hour values for consistency
        displayStartTime: event.startTime || formatHour(startHour),
        displayEndTime: event.endTime || formatHour(endHour),
      };
    });
  }, [sortedEvents, getX, getY]);

  const baselineData = useMemo(() => {
    if (sortedEvents.length === 0) return null;

    const firstEvent = sortedEvents[0];
    if (!firstEvent) return null;

    const firstStartHour = firstEvent.startHour ?? 0;
    const firstEventX = getX(firstStartHour);
    const offDutyY = getY("off_duty");
    const firstEventY = getY(firstEvent.status);

    return {
      firstEventX,
      offDutyY,
      firstEventY,
      firstEventIsOffDuty: firstEvent.status === "off_duty",
      // False when first event starts at 00:00 (e.g. continued sleeper berth) — do not draw off_duty baseline
      firstEventStartsAfterMidnight: firstEventX > 0,
    };
  }, [sortedEvents, getX, getY]);

  return (
    <Paper
      elevation={1}
      sx={{
        backgroundColor: "white",
        p: 3,
        border: "2px solid black",
        color: "black",
        fontFamily: "monospace",
        lineHeight: 1.2,
        width: "1048px",
        mx: "auto",
        mb: 4,
        userSelect: "none",
        "@media print": {
          boxShadow: "none !important",
          margin: "0 auto",
          pageBreakInside: "avoid",
          border: "2px solid black",
        },
      }}
    >
      {/* Header Info Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2,
          borderBottom: "2px solid black",
          pb: 1,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "-0.05em",
              fontStyle: "italic",
            }}
          >
            Drivers Daily Log
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontWeight: "bold", fontSize: "10px" }}
          >
            (24 hours)
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
          <Box
            sx={{
              textAlign: "center",
              borderBottom: "1px solid black",
              width: "48px",
            }}
          >
            <Typography
              sx={{
                fontSize: "10px",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              {month}
            </Typography>
            <Typography sx={{ fontSize: "8px", fontStyle: "italic" }}>
              (month)
            </Typography>
          </Box>
          <Box
            sx={{
              textAlign: "center",
              borderBottom: "1px solid black",
              width: "48px",
            }}
          >
            <Typography
              sx={{
                fontSize: "10px",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              {day}
            </Typography>
            <Typography sx={{ fontSize: "8px", fontStyle: "italic" }}>
              (day)
            </Typography>
          </Box>
          <Box
            sx={{
              textAlign: "center",
              borderBottom: "1px solid black",
              width: "64px",
            }}
          >
            <Typography
              sx={{
                fontSize: "10px",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              {year}
            </Typography>
            <Typography sx={{ fontSize: "8px", fontStyle: "italic" }}>
              (year)
            </Typography>
          </Box>
          <Typography
            sx={{ ml: 2, fontSize: "10px", maxWidth: "200px", lineHeight: 1.1 }}
          >
            Original - File at home terminal.
            <br />
            Duplicate - Driver retains in his/her possession for 8 days.
          </Typography>
        </Box>
      </Box>

      {/* Trip & Carrier Info */}
      <Box sx={{ mb: 2 }}>
        {/* Route Information Row */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6 }}>
            <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
              <Typography
                sx={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  minWidth: "50px",
                }}
              >
                From:
              </Typography>
              <Box
                sx={{
                  flexGrow: 1,
                  borderBottom: "2px solid black",
                  fontSize: "14px",
                  fontWeight: 600,
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  textTransform: "uppercase",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  px: 1,
                }}
              >
                {origin || "---"}
              </Box>
            </Box>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
              <Typography
                sx={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  minWidth: "30px",
                }}
              >
                To:
              </Typography>
              <Box
                sx={{
                  flexGrow: 1,
                  borderBottom: "2px solid black",
                  fontSize: "14px",
                  fontWeight: 600,
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  textTransform: "uppercase",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  px: 1,
                }}
              >
                {destination || "---"}
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Detailed Information Section */}
        <Grid container spacing={4}>
          <Grid size={{ xs: 6 }}>
            <Box>
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  mb: 1,
                  color: "text.secondary",
                }}
              >
                MILEAGE INFORMATION
              </Typography>
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Paper
                  sx={{
                    border: "1px solid black",
                    p: 0.5,
                    width: "128px",
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      fontSize: "10px",
                      fontWeight: "bold",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    {Math.round(log.totalMiles)}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "8px",
                      borderTop: "1px solid black",
                      pt: 0.5,
                      textTransform: "uppercase",
                      fontWeight: "bold",
                    }}
                  >
                    Total Miles Driving Today
                  </Typography>
                </Paper>
                <Paper
                  sx={{
                    border: "1px solid black",
                    p: 0.5,
                    width: "128px",
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      fontSize: "10px",
                      fontWeight: "bold",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    {Math.round(log.totalMiles)}
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "8px",
                      borderTop: "1px solid black",
                      pt: 0.5,
                      textTransform: "uppercase",
                      fontWeight: "bold",
                    }}
                  >
                    Total Mileage Today
                  </Typography>
                </Paper>
              </Box>

              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  mb: 1,
                  color: "text.secondary",
                }}
              >
                VEHICLE INFORMATION
              </Typography>
              <Paper
                sx={{
                  border: "1px solid black",
                  p: 1,
                  height: "64px",
                  position: "relative",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                >
                  {carrier.truckNumber}
                </Typography>
                <Typography
                  sx={{
                    position: "absolute",
                    bottom: 4,
                    left: 8,
                    right: 8,
                    fontSize: "8px",
                    textAlign: "center",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    lineHeight: 1,
                  }}
                >
                  Truck/Tractor and Trailer Numbers
                </Typography>
              </Paper>
            </Box>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Box>
              <Typography
                sx={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  mb: 1,
                  color: "text.secondary",
                }}
              >
                CARRIER INFORMATION
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    borderBottom: "1px solid black",
                    position: "relative",
                    pt: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "7px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      textAlign: "right",
                      position: "absolute",
                      top: -4,
                      right: 0,
                      opacity: 0.7,
                    }}
                  >
                    Name of Carrier
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: 600,
                      pb: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {carrier.carrierName}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    borderBottom: "1px solid black",
                    position: "relative",
                    pt: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "7px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      textAlign: "right",
                      position: "absolute",
                      top: -4,
                      right: 0,
                      opacity: 0.7,
                    }}
                  >
                    Main Office Address
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: 600,
                      pb: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {carrier.mainOfficeAddress}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    borderBottom: "1px solid black",
                    position: "relative",
                    pt: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "7px",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      textAlign: "right",
                      position: "absolute",
                      top: -4,
                      right: 0,
                      opacity: 0.7,
                    }}
                  >
                    Home Terminal Address
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      fontWeight: 600,
                      pb: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {carrier.homeTerminalAddress}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* HEADER ROW */}
      <Box
        sx={{
          display: "flex",
          borderTop: "2px solid black",
          backgroundColor: "black",
          color: "white",
          height: "32px",
          alignItems: "center",
          fontSize: "8px",
          fontWeight: "bold",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: LABEL_WIDTH,
            textAlign: "center",
            textTransform: "uppercase",
            borderRight: "1px solid rgba(255,255,255,0.2)",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          Duty Status
        </Box>
        <Box
          sx={{
            width: GRID_WIDTH,
            position: "relative",
            height: "100%",
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              position: "absolute",
              left: 0,
              height: "100%",
              display: "flex",
              alignItems: "center",
              fontSize: "7px",
            }}
          >
            M-NITE
          </Typography>
          {[
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            "NOON",
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
          ].map((h, i) => (
            <Typography
              key={i}
              sx={{
                position: "absolute",
                height: "100%",
                display: "flex",
                alignItems: "center",
                transform: "translateX(-50%)",
                fontSize: "8px",
                left: (i + 1) * HOUR_STEP,
              }}
            >
              {h}
            </Typography>
          ))}
          <Typography
            sx={{
              position: "absolute",
              right: 0,
              height: "100%",
              display: "flex",
              alignItems: "center",
              fontSize: "7px",
            }}
          >
            M-NITE
          </Typography>
        </Box>
        <Box
          sx={{
            width: TOTAL_WIDTH,
            textAlign: "center",
            borderLeft: "1px solid rgba(255,255,255,0.2)",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            px: 0.5,
            flexShrink: 0,
          }}
        >
          TOTAL
        </Box>
      </Box>

      {/* UNIFIED GRID ROWS */}
      <Box
        sx={{ position: "relative", border: "1px solid black", borderTop: 0 }}
      >
        {statusOrder.map((status, rowIndex) => (
          <Box
            key={status}
            sx={{
              display: "flex",
              height: "40px",
              borderBottom: "1px solid black",
              "&:last-child": { borderBottom: 0 },
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Status Label */}
            <Box
              sx={{
                width: LABEL_WIDTH,
                display: "flex",
                alignItems: "center",
                px: 1,
                borderRight: "1px solid black",
                fontWeight: "bold",
                fontSize: "9px",
                textTransform: "uppercase",
                backgroundColor: "#f8fafc",
                flexShrink: 0,
              }}
            >
              {labels[rowIndex]}
            </Box>

            {/* Grid Background Column */}
            <Box
              sx={{
                width: GRID_WIDTH,
                position: "relative",
                backgroundColor: "white",
                flexShrink: 0,
              }}
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <React.Fragment key={h}>
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      borderLeft: "1px solid black",
                      left: h * HOUR_STEP,
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      height: "6px",
                      borderLeft: "1px solid black",
                      left: h * HOUR_STEP + HOUR_STEP * 0.25,
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      height: "16px",
                      borderLeft: "1px solid black",
                      left: h * HOUR_STEP + HOUR_STEP * 0.5,
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      height: "6px",
                      borderLeft: "1px solid black",
                      left: h * HOUR_STEP + HOUR_STEP * 0.75,
                    }}
                  />
                </React.Fragment>
              ))}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  right: 0,
                  borderLeft: "1px solid black",
                }}
              />
            </Box>

            {/* Total */}
            <Box
              sx={{
                width: TOTAL_WIDTH,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderLeft: "1px solid black",
                fontFamily: "monospace",
                fontSize: "12px",
                fontWeight: "bold",
                backgroundColor: "#f8fafc",
                flexShrink: 0,
              }}
            >
              {log.totals[status] > 0 ? log.totals[status].toFixed(1) : ""}
            </Box>
          </Box>
        ))}

        {/* OVERLAY SVG */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            pointerEvents: "none",
            left: LABEL_WIDTH,
            width: GRID_WIDTH,
          }}
        >
          <svg
            width={GRID_WIDTH}
            height={ROW_HEIGHT * 4}
            className="overflow-visible"
          >
            {processedEvents.map((processedEvent) => {
              if (!processedEvent.isVisible) return null;

              return (
                <React.Fragment key={processedEvent.idx}>
                  <line
                    x1={processedEvent.x1}
                    y1={processedEvent.y}
                    x2={processedEvent.x2}
                    y2={processedEvent.y}
                    stroke={processedEvent.lineStyle.stroke}
                    strokeWidth={processedEvent.lineStyle.strokeWidth}
                    strokeLinecap="round"
                  />
                  {processedEvent.nextY !== null && (
                    <line
                      x1={processedEvent.x2}
                      y1={processedEvent.y}
                      x2={processedEvent.x2}
                      y2={processedEvent.nextY}
                      stroke="#000"
                      strokeWidth="2"
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Baseline: show off_duty from 00:00 only when the first event starts AFTER midnight.
                When the first event starts AT 00:00 (e.g. sleeper berth continued from previous day),
                firstEventStartsAfterMidnight is false — we do NOT draw off_duty, so the continued status is shown correctly. */}
            {baselineData && !baselineData.firstEventIsOffDuty && baselineData.firstEventStartsAfterMidnight && (
              <>
                <line
                  x1={0}
                  y1={baselineData.offDutyY}
                  x2={baselineData.firstEventX}
                  y2={baselineData.offDutyY}
                  stroke="#dc2626"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <line
                  x1={baselineData.firstEventX}
                  y1={baselineData.offDutyY}
                  x2={baselineData.firstEventX}
                  y2={baselineData.firstEventY}
                  stroke="#000"
                  strokeWidth="2"
                />
              </>
            )}

            {baselineData &&
              baselineData.firstEventIsOffDuty &&
              baselineData.firstEventStartsAfterMidnight && (
                <line
                  x1={0}
                  y1={baselineData.offDutyY}
                  x2={baselineData.firstEventX}
                  y2={baselineData.offDutyY}
                  stroke="#dc2626"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              )}
          </svg>
        </Box>

        {/* GRAND TOTAL FOOTER */}
        <Box
          sx={{
            display: "flex",
            height: "40px",
            borderTop: "2px solid black",
            backgroundColor: "white",
          }}
        >
          <Box
            sx={{
              width: LABEL_WIDTH + GRID_WIDTH,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              px: 2,
              fontWeight: 900,
              fontSize: "11px",
              textTransform: "uppercase",
              backgroundColor: "#f1f5f9",
              flexShrink: 0,
            }}
          >
            Grand Total
          </Box>
          <Box
            sx={{
              width: TOTAL_WIDTH,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderLeft: "1px solid black",
              fontFamily: "monospace",
              fontSize: "12px",
              fontWeight: 900,
              backgroundColor: "white",
              flexShrink: 0,
            }}
          >
            {grandTotal.toFixed(1)}
          </Box>
        </Box>
      </Box>

      {/* Remarks Section */}
      <Box sx={{ mt: 2, borderTop: "2px solid black", pt: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontSize: "14px",
            fontWeight: 900,
            textTransform: "uppercase",
            fontStyle: "italic",
            mb: 1,
            letterSpacing: "-0.05em",
          }}
        >
          Remarks
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 3 }}>
            <Box
              sx={{
                borderRight: "2px solid black",
                pr: 2,
                height: "192px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: "10px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    lineHeight: 1,
                    mb: 0.5,
                  }}
                >
                  Shipping Documents:
                </Typography>
                <Typography
                  sx={{
                    fontSize: "10px",
                    borderBottom: "1px solid black",
                    mb: 0.5,
                    pb: 0.5,
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  {carrier.shippingDocs || "N/A"}
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: "8px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    lineHeight: 1,
                    fontStyle: "italic",
                  }}
                >
                  DVL or Manifest No. or
                </Typography>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    height: "16px",
                    mt: 0.5,
                  }}
                ></Box>
                <Typography
                  sx={{
                    fontSize: "8px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    lineHeight: 1,
                    mt: 0.5,
                    fontStyle: "italic",
                  }}
                >
                  Shipper & Commodity
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 9 }}>
            <Typography
              sx={{
                fontSize: "9px",
                fontWeight: "bold",
                fontStyle: "italic",
                lineHeight: 1.2,
              }}
            >
              Enter name of place you reported and where released from work and
              when and where each change of duty occurred.
            </Typography>
            <Box
              sx={{
                mt: 1,
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
                overflow: "hidden",
              }}
            >
              {processedEvents
                .filter(
                  (e) =>
                    !(
                      e.status === "off_duty" &&
                      (e.remarks === "Initial Off Duty" ||
                        e.remarks.includes("Final Off Duty") ||
                        e.remarks.includes("Continuous Rest") ||
                        e.remarks.includes("End of Day"))
                    ),
                )
                .slice(0, 10)
                .map((e, i) => (
                  <Box
                    key={i}
                    sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}
                  >
                    <Typography
                      sx={{
                        width: "110px",
                        flexShrink: 0,
                        fontFamily: "monospace",
                        fontSize: "10px",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      {e.displayStartTime} - {e.displayEndTime}
                    </Typography>
                    <Typography
                      sx={{
                        flexGrow: 1,
                        borderBottom: "1px solid #e2e8f0",
                        textTransform: "uppercase",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "8px",
                        letterSpacing: "-0.025em",
                        py: 0.25,
                      }}
                    >
                      {e.location} - {e.remarks}
                    </Typography>
                  </Box>
                ))}
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Typography
        textAlign={"center"}
        fontSize={12}
        fontStyle={"italic"}
        mt={1}
        fontWeight={600}
      >
        Enter name of place you reported and where released from work and when
        and where each change of duty occurred. <br></br>Use time standard of
        home terminal.
      </Typography>
      {/* Bottom Static Information Section */}
      <Grid
        container
        spacing={2}
        sx={{ mt: 2, borderTop: "2px solid black", pt: 1 }}
        fontFamily={"Calibri"}
        fontSize={"12px"}
        fontWeight={600}
        height={120}
      >
        <Grid size={1}>Recap Complete at end of day</Grid>
        <Grid size={1}>
          <Box borderBottom={1} height={"42px"} alignContent={"end"}></Box>
          <Box>On Duty hours today, Total lines 3 & 4</Box>
        </Grid>
        <Grid size={0.75}>70 Hour / 8 Day Drivers</Grid>
        <Grid size={1}>
          <Box borderBottom={1} height={"42px"} alignContent={"end"}>
            A.
          </Box>
          A. Total hours on duty last 7 days including today.
        </Grid>
        <Grid size={1}>
          <Box borderBottom={1} height={"42px"} alignContent={"end"}>
            B.
          </Box>
          B. Total hours available tommorrow, 70 hr. minus “A”
        </Grid>
        <Grid size={1}>
          <Box borderBottom={1} height={"42px"} alignContent={"end"}>
            C.
          </Box>
          C. Total hours on duty last 5 days including today.
        </Grid>
        <Grid size={1}>60 Hour/7 Day Drivers</Grid>
        <Grid size={1}>
          <Box borderBottom={1} height={"42px"} alignContent={"end"}>
            A.
          </Box>
          A. Total hours on duty last 5 days including today.
        </Grid>
        <Grid size={1}>
          <Box borderBottom={1} height={"42px"} alignContent={"end"}>
            B.
          </Box>
          B. Total Hours available tomorrow, 60 hr. minus “A”
        </Grid>
        <Grid size={1}>
          <Box borderBottom={1} height={"42px"} alignContent={"end"}>
            C.
          </Box>
          C. Total hours on duty last 7 days including today.
        </Grid>
        <Grid size={1}>
          *If your task 34 consicutive hours off duty you have 60/70 hours
          available
        </Grid>
      </Grid>
    </Paper>
  );
};

export default EldLogGrid;
