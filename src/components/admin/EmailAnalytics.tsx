/**
 * Email Analytics Dashboard Component
 * Provides comprehensive email performance monitoring and analytics
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SelectChangeEvent } from '@mui/material';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  IconMail,
  IconCircleCheck,
  IconCircleX,
  IconAlertTriangle,
  IconTrendingUp,
  IconTrendingDown,
  IconRefresh,
  IconDownload,
  IconFilter,
  IconEye,
  IconChartBar,
} from '@tabler/icons-react';
import {
  EmailAnalyticsDashboard,
  EmailAnalyticsQuery,
  EmailType,
  EmailDeliveryStatus,
} from '@/types/email';
import { getPSTDateString } from '@/lib/timezone';

interface EmailAnalyticsProps {
  authToken: string;
}

const EmailAnalytics: React.FC<EmailAnalyticsProps> = ({ authToken }) => {
  const [dashboard, setDashboard] = useState<EmailAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [filters, setFilters] = useState<EmailAnalyticsQuery>({});

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filters.emailType) queryParams.append('emailType', filters.emailType);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.orderId) queryParams.append('orderId', filters.orderId);
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.toEmail) queryParams.append('toEmail', filters.toEmail);

      const response = await fetch(`/api/admin/email-analytics/dashboard?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }

      setDashboard(result.data);
    } catch (err) {
      console.error('Error fetching email analytics dashboard:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Export analytics data
  const exportData = async (format: 'json' | 'csv') => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.emailType) queryParams.append('emailType', filters.emailType);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.orderId) queryParams.append('orderId', filters.orderId);
      if (filters.userId) queryParams.append('userId', filters.userId);
      if (filters.toEmail) queryParams.append('toEmail', filters.toEmail);
      queryParams.append('format', format);
      queryParams.append('limit', '10000'); // Export limit

      const response = await fetch(`/api/admin/email-analytics/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `email-analytics-${getPSTDateString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  
  // Format time duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  
  // Get trend icon
  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving': return <IconTrendingUp width={24} height={24} style={{ color: '#4caf50' }} />;
      case 'declining': return <IconTrendingDown width={24} height={24} style={{ color: '#f44336' }} />;
      default: return <IconChartBar width={24} height={24} style={{ color: '#9e9e9e' }} />;
    }
  };

  // Load dashboard on mount and when filters change
  useEffect(() => {
    fetchDashboard();
  }, [filters, fetchDashboard]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchDashboard}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Box p={3}>
        <Alert severity="info">No analytics data available</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Email Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<IconRefresh /> as React.ReactNode}
            onClick={fetchDashboard}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconDownload /> as React.ReactNode}
            onClick={() => exportData('csv')}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconDownload /> as React.ReactNode}
            onClick={() => exportData('json')}
          >
            Export JSON
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <IconFilter width={20} height={20} style={{ color: '#1976d2', marginRight: 8, verticalAlign: 'middle' }} />
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Email Type</InputLabel>
                <Select
                  value={filters.emailType || ''}
                  onChange={(e: SelectChangeEvent<string>) => {
                    const value = e.target.value as string;
                    setFilters({ ...filters, emailType: value ? value as EmailType : undefined });
                  }}
                  label="Email Type"
                >
                  <MenuItem value="">
                    <em>All Types</em>
                  </MenuItem>
                  <MenuItem value="order_confirmation">Order Confirmation</MenuItem>
                  <MenuItem value="password_reset">Password Reset</MenuItem>
                  <MenuItem value="password_reset_confirmation">Password Reset Confirmation</MenuItem>
                  <MenuItem value="marketing">Marketing</MenuItem>
                  <MenuItem value="support">Support</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || ''}
                  onChange={(e: SelectChangeEvent<string>) => {
                    const value = e.target.value as string;
                    setFilters({ ...filters, status: value ? value as EmailDeliveryStatus : undefined });
                  }}
                  label="Status"
                >
                  <MenuItem value="">
                    <em>All Statuses</em>
                  </MenuItem>
                  <MenuItem value="sent">Sent</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="opened">Opened</MenuItem>
                  <MenuItem value="clicked">Clicked</MenuItem>
                  <MenuItem value="bounced">Bounced</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Start Date"
                type="date"
                value={filters.startDate || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  setFilters({ ...filters, startDate: value || undefined });
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="End Date"
                type="date"
                value={filters.endDate || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  setFilters({ ...filters, endDate: value || undefined });
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Order ID"
                value={filters.orderId || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  setFilters({ ...filters, orderId: value || undefined });
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Email Address"
                value={filters.toEmail || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  setFilters({ ...filters, toEmail: value || undefined });
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Alerts */}
      {dashboard.alerts.length > 0 && (
        <Box mb={3}>
          {dashboard.alerts.map((alert, index) => (
            <Alert
              key={index}
              severity={alert.severity === 'critical' ? 'error' as const : alert.severity === 'high' ? 'warning' as const : 'info' as const}
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2" gutterBottom>
                {alert.message}
              </Typography>
              {alert.recommendations && (
                <Box mt={1}>
                  <Typography variant="body2" fontWeight="bold">
                    Recommendations:
                  </Typography>
                  <ul>
                    {alert.recommendations.map((rec, idx) => (
                      <li key={idx}>
                        <Typography variant="body2">{rec}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Alert>
          ))}
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={(_, newValue: number) => setCurrentTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Performance" />
          <Tab label="Charts" />
          <Tab label="Issues" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Grid container spacing={3}>
          {/* Overview Cards */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Emails
                    </Typography>
                    <Typography variant="h4">
                      {dashboard.overview.totalEmails.toLocaleString()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      {getTrendIcon(dashboard.overview.recentTrend)}
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        {dashboard.overview.recentTrend}
                      </Typography>
                    </Box>
                  </Box>
                  <IconMail width={40} height={40} style={{ color: '#1976d2' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Delivery Rate
                    </Typography>
                    <Typography variant="h4">
                      {dashboard.overview.deliveryRate.toFixed(1)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={dashboard.overview.deliveryRate}
                      sx={{
                        mt: 1,
                        width: '100%',
                      }}
                    />
                  </Box>
                  <IconCircleCheck width={40} height={40} style={{ color: '#4caf50' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Open Rate
                    </Typography>
                    <Typography variant="h4">
                      {dashboard.overview.openRate.toFixed(1)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={dashboard.overview.openRate}
                      sx={{
                        mt: 1,
                        width: '100%',
                      }}
                    />
                  </Box>
                  <IconEye width={40} height={40} style={{ color: '#2196f3' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Bounce Rate
                    </Typography>
                    <Typography variant="h4">
                      {dashboard.overview.bounceRate.toFixed(1)}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={dashboard.overview.bounceRate}
                      sx={{
                        mt: 1,
                        width: '100%',
                      }}
                    />
                  </Box>
                  <IconCircleX width={40} height={40} style={{ color: '#f44336' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Issues */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <IconAlertTriangle width={20} height={20} style={{ marginRight: 8, verticalAlign: 'middle', color: '#ff9800' }} />
                  Top Issues
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Issue</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                        <TableCell>Recent</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.topIssues.map((issue, index) => (
                        <TableRow key={index}>
                          <TableCell>{issue.issue}</TableCell>
                          <TableCell align="right">{issue.count.toLocaleString()}</TableCell>
                          <TableCell align="right">{issue.percentage.toFixed(1)}%</TableCell>
                          <TableCell>
                            {issue.recent ? (
                              <Chip label="Yes" color="warning" size="small" />
                            ) : (
                              <Chip label="No" color="default" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {currentTab === 1 && (
        <Grid container spacing={3}>
          {/* Performance Metrics */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <TableContainer>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Total Emails</TableCell>
                        <TableCell align="right">{dashboard.performance.totalEmails.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Sent Emails</TableCell>
                        <TableCell align="right">{dashboard.performance.sentEmails.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Delivered Emails</TableCell>
                        <TableCell align="right">{dashboard.performance.deliveredEmails.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Opened Emails</TableCell>
                        <TableCell align="right">{dashboard.performance.openedEmails.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Clicked Emails</TableCell>
                        <TableCell align="right">{dashboard.performance.clickedEmails.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Bounced Emails</TableCell>
                        <TableCell align="right">{dashboard.performance.bouncedEmails.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Complained Emails</TableCell>
                        <TableCell align="right">{dashboard.performance.complainedEmails.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Delivery Time</TableCell>
                        <TableCell align="right">{formatDuration(dashboard.performance.averageDeliveryTime)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Rate Metrics */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Rate Metrics
                </Typography>
                <TableContainer>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Delivery Rate</TableCell>
                        <TableCell align="right">{dashboard.performance.deliveryRate.toFixed(2)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Open Rate</TableCell>
                        <TableCell align="right">{dashboard.performance.openRate.toFixed(2)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Click Rate</TableCell>
                        <TableCell align="right">{dashboard.performance.clickRate.toFixed(2)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Bounce Rate</TableCell>
                        <TableCell align="right">{dashboard.performance.bounceRate.toFixed(2)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Complaint Rate</TableCell>
                        <TableCell align="right">{dashboard.performance.complaintRate.toFixed(3)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Rejection Rate</TableCell>
                        <TableCell align="right">{dashboard.performance.rejectionRate.toFixed(2)}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Email Type Performance */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance by Email Type
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Email Type</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="right">Delivered</TableCell>
                        <TableCell align="right">Delivery Rate</TableCell>
                        <TableCell align="right">Open Rate</TableCell>
                        <TableCell align="right">Bounce Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.charts.emailTypeBreakdown.map((type, index) => (
                        <TableRow key={index}>
                          <TableCell>{type.emailTypeLabel}</TableCell>
                          <TableCell align="right">{type.count.toLocaleString()}</TableCell>
                          <TableCell align="right">{Math.round(type.count * type.deliveryRate / 100).toLocaleString()}</TableCell>
                          <TableCell align="right">{type.deliveryRate.toFixed(1)}%</TableCell>
                          <TableCell align="right">-</TableCell>
                          <TableCell align="right">-</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {currentTab === 2 && (
        <Grid container spacing={3}>
          {/* Daily Performance Chart */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Daily Performance
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Sent</TableCell>
                        <TableCell align="right">Delivered</TableCell>
                        <TableCell align="right">Opened</TableCell>
                        <TableCell align="right">Bounced</TableCell>
                        <TableCell align="right">Delivery Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.charts.dailyPerformance.map((day, index) => (
                        <TableRow key={index}>
                          <TableCell>{day.date}</TableCell>
                          <TableCell align="right">{day.sent.toLocaleString()}</TableCell>
                          <TableCell align="right">{day.delivered.toLocaleString()}</TableCell>
                          <TableCell align="right">{day.opened.toLocaleString()}</TableCell>
                          <TableCell align="right">{day.bounced.toLocaleString()}</TableCell>
                          <TableCell align="right">
                            {day.sent > 0 ? ((day.delivered / day.sent) * 100).toFixed(1) : '0.0'}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Hourly Distribution */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Hourly Distribution
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Hour</TableCell>
                        <TableCell align="right">Emails</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.charts.hourlyDistribution.map((hour, index) => (
                        <TableRow key={index}>
                          <TableCell>{hour.hour.toString().padStart(2, '0')}:00</TableCell>
                          <TableCell align="right">{hour.count.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Email Type Breakdown */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Email Type Breakdown
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Email Type</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Delivery Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.charts.emailTypeBreakdown.map((type, index) => (
                        <TableRow key={index}>
                          <TableCell>{type.emailTypeLabel}</TableCell>
                          <TableCell align="right">{type.count.toLocaleString()}</TableCell>
                          <TableCell align="right">{type.deliveryRate.toFixed(1)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {currentTab === 3 && (
        <Grid container spacing={3}>
          {/* Delivery Issues Table */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <IconCircleX width={20} height={20} style={{ marginRight: 8, verticalAlign: 'middle', color: '#f44336' }} />
                  Delivery Issues
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Message ID</TableCell>
                        <TableCell>Email Type</TableCell>
                        <TableCell>To Email</TableCell>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Event</TableCell>
                        <TableCell>Error</TableCell>
                        <TableCell>Last Attempt</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.topIssues.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            No delivery issues found
                          </TableCell>
                        </TableRow>
                      ) : (
                        dashboard.topIssues.map((issue, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {issue.issue.split('-')[0] || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label="Email" size="small" />
                            </TableCell>
                            <TableCell>Various</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <Chip label="Issue" color="error" size="small" />
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>{issue.issue}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              <Tooltip title="View Details">
                                <IconButton size="small">
                                  <IconEye width={20} height={20} />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default EmailAnalytics;