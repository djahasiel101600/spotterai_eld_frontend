import React, { ReactNode } from "react";
import {
  Box,
  Container,
  Stack,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  useTheme,
  alpha,
  Zoom,
  Tooltip,
} from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { LocalShipping as TruckIcon } from "@mui/icons-material";

interface TripLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  actions?: ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
}

const TripLayout: React.FC<TripLayoutProps> = ({
  children,
  title,
  subtitle,
  showBackButton = false,
  onBackClick,
  actions,
  maxWidth = "xl",
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: alpha(theme.palette.primary.main, 0.02),
      }}
    >
      {/* Enhanced Header with glass morphism */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          color: "inherit",
        }}
      >
        <Toolbar>
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ flexGrow: 1 }}
          >
            {showBackButton && onBackClick && (
              <Tooltip title="Back to Trip List" arrow>
                <IconButton
                  onClick={onBackClick}
                  sx={{
                    color: theme.palette.text.secondary,
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    },
                    transition: "all 0.2s",
                  }}
                >
                  <ArrowLeft size={20} />
                </IconButton>
              </Tooltip>
            )}

            <Zoom in={true} style={{ transitionDelay: "100ms" }}>
              <Box
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: showBackButton ? 44 : 48,
                  height: showBackButton ? 44 : 48,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <TruckIcon
                  sx={{
                    color: "white",
                    fontSize: showBackButton ? 24 : 28,
                  }}
                />
              </Box>
            </Zoom>

            <Box>
              <Typography
                variant={showBackButton ? "h6" : "h5"}
                component="h1"
                sx={{
                  fontWeight: 700,
                  letterSpacing: showBackButton ? "normal" : "-0.5px",
                  background: `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${showBackButton ? theme.palette.primary.main : theme.palette.text.secondary} 100%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Stack>

          {/* Action Buttons */}
          {actions && <Box>{actions}</Box>}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth={maxWidth} sx={{ flex: 1, py: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

export default TripLayout;
