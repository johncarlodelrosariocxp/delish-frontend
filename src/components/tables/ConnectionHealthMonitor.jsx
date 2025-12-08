// src/components/tables/ConnectionHealthMonitor.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Grid,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  SignalCellularAlt as SignalIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { CONNECTION_STATES } from "../../constants/bluetooth";

const ConnectionHealthMonitor = ({
  connectionState,
  connectionStats,
  lastKeepAlive,
  connectedDevice,
}) => {
  const [uptime, setUptime] = useState("00:00:00");

  useEffect(() => {
    let interval;
    if (
      connectionState === CONNECTION_STATES.CONNECTED &&
      connectionStats.connectedSince
    ) {
      interval = setInterval(() => {
        const now = new Date();
        const connectedSince = new Date(connectionStats.connectedSince);
        const diff = now - connectedSince;

        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        setUptime(
          `${hours.toString().padStart(2, "0")}:` +
            `${minutes.toString().padStart(2, "0")}:` +
            `${seconds.toString().padStart(2, "0")}`
        );
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [connectionState, connectionStats.connectedSince]);

  const getConnectionHealth = () => {
    if (connectionState !== CONNECTION_STATES.CONNECTED) return 0;

    // Calculate health based on various factors
    let health = 100;

    // Deduct for recent reconnects
    if (connectionStats.reconnectCount > 0) {
      health -= Math.min(connectionStats.reconnectCount * 10, 50);
    }

    // Check last keep-alive
    if (lastKeepAlive) {
      const timeSinceLastKeepAlive = new Date() - lastKeepAlive;
      if (timeSinceLastKeepAlive > 30000) {
        // 30 seconds
        health -= 30;
      }
    }

    return Math.max(0, health);
  };

  const health = getConnectionHealth();
  const getHealthColor = () => {
    if (health >= 80) return "success";
    if (health >= 50) return "warning";
    return "error";
  };

  const getHealthLabel = () => {
    if (health >= 80) return "Excellent";
    if (health >= 60) return "Good";
    if (health >= 40) return "Fair";
    return "Poor";
  };

  if (connectionState !== CONNECTION_STATES.CONNECTED) {
    return null;
  }

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: "background.default" }}>
      <Typography variant="h6" gutterBottom>
        <SignalIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        Connection Health Monitor
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <Typography variant="h4" color={getHealthColor() + ".main"}>
              {health}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getHealthLabel()} Health
            </Typography>
            <LinearProgress
              variant="determinate"
              value={health}
              color={getHealthColor()}
              sx={{ width: "100%", mt: 1, height: 8, borderRadius: 4 }}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={1}>
            <Grid item xs={6} sm={4}>
              <Tooltip title="Connection duration">
                <Paper sx={{ p: 1.5, textAlign: "center" }}>
                  <AccessTimeIcon color="primary" sx={{ mb: 0.5 }} />
                  <Typography variant="body2" fontWeight="bold">
                    {uptime}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Uptime
                  </Typography>
                </Paper>
              </Tooltip>
            </Grid>

            <Grid item xs={6} sm={4}>
              <Tooltip title="Total print jobs">
                <Paper sx={{ p: 1.5, textAlign: "center" }}>
                  <PrintIcon color="primary" sx={{ mb: 0.5 }} />
                  <Typography variant="body2" fontWeight="bold">
                    {connectionStats.totalPrintJobs}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Print Jobs
                  </Typography>
                </Paper>
              </Tooltip>
            </Grid>

            <Grid item xs={6} sm={4}>
              <Tooltip title="Reconnection attempts">
                <Paper sx={{ p: 1.5, textAlign: "center" }}>
                  <RefreshIcon
                    color={
                      connectionStats.reconnectCount > 0 ? "warning" : "primary"
                    }
                    sx={{ mb: 0.5 }}
                  />
                  <Typography variant="body2" fontWeight="bold">
                    {connectionStats.reconnectCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reconnects
                  </Typography>
                </Paper>
              </Tooltip>
            </Grid>

            <Grid item xs={12}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mt={1}
              >
                <Typography variant="body2">
                  Device: <strong>{connectedDevice?.name}</strong>
                </Typography>
                <Chip
                  label="EXCLUSIVE MODE"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {connectionStats.lastError && (
        <Box mt={2} p={1} bgcolor="error.light" borderRadius={1}>
          <Typography variant="body2" color="error.contrastText">
            <ErrorIcon
              sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }}
            />
            Last Error: {connectionStats.lastError}
          </Typography>
        </Box>
      )}

      {lastKeepAlive && (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          mt={1}
        >
          Last keep-alive: {lastKeepAlive.toLocaleTimeString()}
        </Typography>
      )}
    </Paper>
  );
};

export default ConnectionHealthMonitor;
