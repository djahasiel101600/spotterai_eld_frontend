import React, { useMemo, useCallback } from "react";
import { DailyLog, DutyStatus, CarrierInfo } from "../types.ts";
import { Box, Paper, Typography, Grid } from "@mui/material";

interface EldLogGridProps {
  log: DailyLog;
  carrier: CarrierInfo;
  origin?: string;
  destination?: string;
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

  // Column Widths (total 1000px layout)
  const LABEL_WIDTH = 120;
  const GRID_WIDTH = 840; // 35px * 24h
  const TOTAL_WIDTH = 40;
  const HOUR_STEP = 35;
  const ROW_HEIGHT = 40;

  // Memoize expensive date calculations
  const { logDayStart, logDayEnd } = useMemo(() => {
    const logDateStr = log.date;
    const logDayStart = new Date(`${logDateStr}T00:00:00`);
    const logDayEnd = new Date(logDayStart);
    logDayEnd.setDate(logDayEnd.getDate() + 1);
    return { logDayStart, logDayEnd };
  }, [log.date]);

  const getX = useCallback(
    (date: Date | string | number) => {
      // Ensure we have a Date object
      const dateObj = date instanceof Date ? date : new Date(date);

      // Validate the date
      if (isNaN(dateObj.getTime())) {
        console.warn("Invalid date passed to getX:", date);
        return 0;
      }

      if (dateObj <= logDayStart) return 0;
      if (dateObj >= logDayEnd) return GRID_WIDTH;

      const diffMs = dateObj.getTime() - logDayStart.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Snap to 15-minute intervals (00, 15, 30, 45) for DOT compliance
      const totalMinutes = diffHours * 60;
      const snappedMinutes = Math.round(totalMinutes / 15) * 15;
      const snappedHours = snappedMinutes / 60;

      return snappedHours * HOUR_STEP;
    },
    [logDayStart, logDayEnd, GRID_WIDTH, HOUR_STEP],
  );

  const getY = useCallback(
    (status: DutyStatus) => {
      const index = statusOrder.indexOf(status);
      // Centering the path precisely in the middle of the row's vertical space
      return index * ROW_HEIGHT + ROW_HEIGHT / 2;
    },
    [statusOrder, ROW_HEIGHT],
  );

  const grandTotal = Object.values(log.totals).reduce(
    (sum, val) => sum + val,
    0,
  );

  // Pre-calculate event positions to avoid repeated calculations during render
  const processedEvents = useMemo(() => {
    return log.events.map((event, idx) => {
      const x1 = getX(event.start);
      const x2 = getX(event.end);
      const y = getY(event.status);

      // Pre-calculate next event Y position for vertical lines
      const nextY =
        idx < log.events.length - 1 ? getY(log.events[idx + 1].status) : null;

      // Determine line style based on duty status
      const getLineStyle = (status: DutyStatus) => {
        switch (status) {
          case "off_duty":
            return { stroke: "#dc2626", strokeWidth: 5 }; // Red, thick line for off duty
          case "sleeper_berth":
            return { stroke: "#2563eb", strokeWidth: 4 }; // Blue for sleeper
          case "driving":
            return { stroke: "#16a34a", strokeWidth: 4 }; // Green for driving
          case "on_duty_not_driving":
            return { stroke: "#ea580c", strokeWidth: 4 }; // Orange for on duty
          default:
            return { stroke: "#000", strokeWidth: 4 };
        }
      };

      return {
        ...event,
        x1,
        x2,
        y,
        nextY,
        lineStyle: getLineStyle(event.status),
        idx,
        isVisible: Math.abs(x1 - x2) >= 0.1, // Skip rendering segments that are too small to see
      };
    });
  }, [log.events, getX, getY]);

  // Pre-calculate baseline drawing positions
  const baselineData = useMemo(() => {
    if (log.events.length === 0) return null;

    const firstEvent = log.events[0];
    if (!firstEvent) return null;

    const firstEventX = getX(firstEvent.start);
    const offDutyY = getY("off_duty");
    const firstEventY = getY(firstEvent.status);

    return {
      firstEventX,
      offDutyY,
      firstEventY,
      firstEventIsOffDuty: firstEvent.status === "off_duty",
      firstEventStartsAfterMidnight: firstEventX > 0,
    };
  }, [log.events, getX, getY]);

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
        {/* Route Information Row - From/To in clean 2-column layout */}
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
            {/* 1. Status Label */}
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

            {/* 2. Grid Background Column with Ticks (hanging from top) */}
            <Box
              sx={{
                width: GRID_WIDTH,
                position: "relative",
                backgroundColor: "white",
                flexShrink: 0,
              }}
            >
              {/* Vertical lines and ticks for each hour */}
              {Array.from({ length: 24 }).map((_, h) => (
                <React.Fragment key={h}>
                  {/* Hour Marker (Full Height) */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      borderLeft: "1px solid black",
                      left: h * HOUR_STEP,
                    }}
                  />

                  {/* 15 min Tick (Top only, short) */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      height: "6px",
                      borderLeft: "1px solid black",
                      left: h * HOUR_STEP + HOUR_STEP * 0.25,
                    }}
                  />

                  {/* 30 min Tick (Top only, medium) */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      height: "16px",
                      borderLeft: "1px solid black",
                      left: h * HOUR_STEP + HOUR_STEP * 0.5,
                    }}
                  />

                  {/* 45 min Tick (Top only, short) */}
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
              {/* Final Boundary line */}
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

            {/* 3. Total for this status */}
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

        {/* 4. OVERLAY SVG FOR THE DRIVER LOG PATH */}
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
              // Skip rendering segments that are too small to see
              if (!processedEvent.isVisible) return null;

              return (
                <React.Fragment key={processedEvent.idx}>
                  {/* The actual horizontal activity segment - Center aligned vertically */}
                  <line
                    x1={processedEvent.x1}
                    y1={processedEvent.y}
                    x2={processedEvent.x2}
                    y2={processedEvent.y}
                    stroke={processedEvent.lineStyle.stroke}
                    strokeWidth={processedEvent.lineStyle.strokeWidth}
                    strokeLinecap="round"
                  />
                  {/* The vertical status change line */}
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

            {/* Draw continuous OFF_DUTY baseline if no events start from midnight */}
            {baselineData && !baselineData.firstEventIsOffDuty && (
              <>
                {/* Horizontal OFF_DUTY baseline from midnight to first event */}
                <line
                  x1={0}
                  y1={baselineData.offDutyY}
                  x2={baselineData.firstEventX}
                  y2={baselineData.offDutyY}
                  stroke="#dc2626"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                {/* Vertical connection line when duty starts */}
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

            {/* Handle case where first event IS off_duty but starts after midnight */}
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

        {/* 5. GRAND TOTAL FOOTER ROW */}
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
          {/* Documentation area */}
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

          {/* Chronological location/remark log */}
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
              {log.events
                .filter(
                  (e) =>
                    !(
                      e.status === "off_duty" &&
                      (e.remarks === "Initial Off Duty" ||
                        e.remarks.includes("Final Off Duty"))
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
                      {(() => {
                        const startDate =
                          e.start instanceof Date ? e.start : new Date(e.start);
                        const endDate =
                          e.end instanceof Date ? e.end : new Date(e.end);
                        const formatTimeStr = (date: Date) =>
                          isNaN(date.getTime())
                            ? "--:--"
                            : date.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: false,
                              });
                        return `${formatTimeStr(startDate)} - ${formatTimeStr(endDate)}`;
                      })()}
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

      {/* Bottom Static Information Section */}
      <Box sx={{ mt: 2, borderTop: "2px solid black", pt: 1 }}>
        <Box sx={{ display: "flex", gap: 2 }}>
          {/* Left Section - Recap */}
          <Box sx={{ flex: "0 0 340px", border: "1px solid black" }}>
            <Box
              sx={{
                backgroundColor: "#e2e8f0",
                borderBottom: "1px solid black",
                px: 1,
                py: 0.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Recap - previous 8 days
              </Typography>
            </Box>
            <Box sx={{ display: "flex" }}>
              <Box sx={{ flex: 1, borderRight: "1px solid black" }}>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 1,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "9px",
                  }}
                >
                  Date
                </Box>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((day) => (
                  <Box
                    key={day}
                    sx={{
                      borderBottom: "1px solid black",
                      px: 1,
                      py: 0.5,
                      textAlign: "center",
                      fontSize: "8px",
                      minHeight: "20px",
                    }}
                  >
                    &nbsp;
                  </Box>
                ))}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 1,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "9px",
                  }}
                >
                  Total hours
                </Box>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((day) => (
                  <Box
                    key={day}
                    sx={{
                      borderBottom: "1px solid black",
                      px: 1,
                      py: 0.5,
                      textAlign: "center",
                      fontSize: "8px",
                      minHeight: "20px",
                    }}
                  >
                    &nbsp;
                  </Box>
                ))}
              </Box>
            </Box>
            <Box
              sx={{
                display: "flex",
                borderTop: "1px solid black",
                backgroundColor: "#f1f5f9",
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  px: 1,
                  py: 0.5,
                  fontSize: "9px",
                  fontWeight: "bold",
                }}
              >
                Total of day
              </Box>
              <Box
                sx={{
                  flex: 1,
                  px: 1,
                  py: 0.5,
                  textAlign: "center",
                  fontSize: "9px",
                  fontWeight: "bold",
                }}
              >
                &nbsp;
              </Box>
            </Box>
          </Box>

          {/* Middle Section - 70 Hour/8 day */}
          <Box sx={{ flex: "0 0 120px", border: "1px solid black" }}>
            <Box
              sx={{
                backgroundColor: "#e2e8f0",
                borderBottom: "1px solid black",
                px: 1,
                py: 0.5,
                textAlign: "center",
              }}
            >
              <Typography sx={{ fontSize: "10px", fontWeight: "bold" }}>
                70 Hour / 8 day
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 1,
              }}
            >
              <Typography sx={{ fontSize: "9px", mb: 0.5 }}>
                B. Total hours
              </Typography>
              <Typography sx={{ fontSize: "9px", mb: 0.5 }}>
                tomorrow
              </Typography>
              <Box
                sx={{
                  borderBottom: "1px solid black",
                  width: "80%",
                  mb: 2,
                  textAlign: "center",
                  minHeight: "20px",
                }}
              >
                &nbsp;
              </Box>
              <Typography sx={{ fontSize: "9px", mb: 0.5 }}>
                C. Total hours
              </Typography>
              <Typography sx={{ fontSize: "9px", mb: 0.5 }}>
                yesterday
              </Typography>
              <Box
                sx={{
                  borderBottom: "1px solid black",
                  width: "80%",
                  textAlign: "center",
                  minHeight: "20px",
                }}
              >
                &nbsp;
              </Box>
            </Box>
          </Box>

          {/* Right Section - If you work */}
          <Box sx={{ flex: 1, border: "1px solid black" }}>
            <Box
              sx={{
                backgroundColor: "#e2e8f0",
                borderBottom: "1px solid black",
                px: 1,
                py: 0.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                If you work 4
              </Typography>
            </Box>
            <Box sx={{ display: "flex" }}>
              <Box sx={{ flex: 1.5, borderRight: "1px solid black" }}>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    fontWeight: "bold",
                    minHeight: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    fontSize: "8px",
                    minHeight: "24px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Off duty hours
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    fontSize: "8px",
                    minHeight: "24px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Sleeper berth hours
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    fontSize: "8px",
                    minHeight: "24px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Driving hours
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    fontSize: "8px",
                    minHeight: "24px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  On duty not driving
                </Box>
                <Box
                  sx={{
                    px: 0.5,
                    py: 0.5,
                    fontSize: "8px",
                    fontWeight: "bold",
                    backgroundColor: "#f1f5f9",
                    minHeight: "24px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Total time
                </Box>
              </Box>
              <Box sx={{ flex: 1, borderRight: "1px solid black" }}>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "7px",
                    fontWeight: "bold",
                    minHeight: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}
                >
                  <div>A. Total</div>
                  <div>hours on</div>
                  <div>today</div>
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    fontWeight: "bold",
                    backgroundColor: "#f1f5f9",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
              </Box>
              <Box sx={{ flex: 1, borderRight: "1px solid black" }}>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "7px",
                    fontWeight: "bold",
                    minHeight: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}
                >
                  <div>B. Total</div>
                  <div>hours</div>
                  <div>tomorrow</div>
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    fontWeight: "bold",
                    backgroundColor: "#f1f5f9",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "7px",
                    fontWeight: "bold",
                    minHeight: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                  }}
                >
                  <div>C. Total</div>
                  <div>hours</div>
                  <div>yesterday</div>
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    borderBottom: "1px solid black",
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
                <Box
                  sx={{
                    px: 0.5,
                    py: 0.5,
                    textAlign: "center",
                    fontSize: "8px",
                    fontWeight: "bold",
                    backgroundColor: "#f1f5f9",
                    minHeight: "24px",
                  }}
                >
                  &nbsp;
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default EldLogGrid;
