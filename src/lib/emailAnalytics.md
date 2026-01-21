# Email Analytics System

This document describes the comprehensive email analytics and monitoring system implemented for tracking email delivery success rates and identifying issues.

## Overview

The email analytics system provides:

- **Real-time email tracking**: Monitor delivery status, opens, clicks, bounces, and complaints
- **Performance metrics**: Calculate delivery rates, open rates, click rates, and bounce rates
- **Dashboard interface**: Comprehensive admin dashboard for visualizing email performance
- **Alert system**: Automated alerts for delivery issues and performance problems
- **Historical analysis**: Track trends and identify patterns over time
- **Export capabilities**: Export analytics data in CSV and JSON formats

## Architecture

### Core Components

1. **Email Types (`src/types/email.ts`)**
   - Comprehensive type definitions for analytics data
   - Event tracking structures
   - Dashboard data models
   - Configuration types

2. **Analytics Service (`src/lib/emailAnalytics.ts`)**
   - Singleton service for email tracking and analytics
   - Database operations and data processing
   - Performance metric calculations
   - Dashboard data generation
   - Webhook processing
   - Data cleanup and retention management

3. **API Endpoints**
   - `/api/admin/email-analytics` - Main analytics data endpoint
   - `/api/admin/email-analytics/dashboard` - Dashboard-specific data
   - `/api/admin/email-analytics/export` - Data export functionality
   - `/api/admin/email-analytics/cleanup` - Data cleanup management
   - `/api/webhooks/resend` - Resend webhook handler

4. **Dashboard Component (`src/components/admin/EmailAnalytics.tsx`)**
   - React component for admin interface
   - Real-time performance monitoring
   - Interactive charts and tables
   - Filtering and export capabilities

5. **Email Integration (`src/lib/email.ts`)**
   - Enhanced email functions with analytics tracking
   - Automatic event logging for all email operations

## Setup Instructions

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Resend Configuration (existing)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_from_email

# Email Analytics Configuration
RESEND_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 2. Resend Webhook Setup

1. Go to your Resend Dashboard
2. Navigate to **Webhooks** section
3. Add a new webhook with the following details:
   - **Endpoint URL**: `https://your-domain.com/api/webhooks/resend`
   - **Events**: Select all events (sent, delivered, opened, clicked, bounced, complained, rejected)
   - **Secret**: Generate and set as `RESEND_WEBHOOK_SECRET`
4. Test the webhook to ensure it's working

### 3. Database Setup

The system uses MongoDB collections for analytics data:

- `email_analytics` - Individual email events
- `email_analytics_summary` - Aggregated email summaries
- `email_analytics_config` - System configuration

Indexes are automatically created for optimal query performance.

### 4. Admin Dashboard

To use the dashboard component, you need to:

1. Create an admin page that uses the `EmailAnalytics` component
2. Pass a valid authentication token
3. Ensure the user has admin permissions

Example usage:

```tsx
import EmailAnalytics from '@/components/admin/EmailAnalytics';

export default function AdminAnalyticsPage() {
  const authToken = 'your_auth_token'; // Get from auth context

  return <EmailAnalytics authToken={authToken} />;
}
```

## Features

### Real-time Tracking

- **Email Sent**: Tracks when emails are successfully sent
- **Delivery Status**: Monitors delivery confirmation
- **Open Tracking**: Records when emails are opened
- **Click Tracking**: Monitors link clicks in emails
- **Bounce Handling**: Tracks hard and soft bounces
- **Complaint Tracking**: Records spam complaints
- **Rejection Tracking**: Monitored rejected emails

### Performance Metrics

- **Delivery Rate**: Percentage of emails successfully delivered
- **Open Rate**: Percentage of delivered emails that were opened
- **Click Rate**: Percentage of opened emails that were clicked
- **Bounce Rate**: Percentage of emails that bounced
- **Complaint Rate**: Percentage of emails marked as spam
- **Average Delivery Time**: Time from send to delivery

### Dashboard Features

1. **Overview Tab**
   - Key performance metrics
   - Recent trends
   - Top issues

2. **Performance Tab**
   - Detailed metrics
   - Rate calculations
   - Email type breakdown

3. **Charts Tab**
   - Daily performance trends
   - Hourly distribution
   - Email type analytics

4. **Issues Tab**
   - Delivery failures
   - Bounced emails
   - Error tracking

### Alert System

The system automatically generates alerts for:

- **High Bounce Rate**: When bounce rate exceeds threshold (default: 5%)
- **Complaint Surge**: When complaint rate exceeds threshold (default: 0.1%)
- **Delivery Failures**: When delivery rate drops below 90%
- **Performance Drop**: Sudden changes in email performance

### Data Management

- **Automatic Cleanup**: Old data is automatically cleaned up based on retention settings
- **Export Options**: Data can be exported in CSV or JSON format
- **Configurable Retention**: Customizable data retention periods
- **Manual Cleanup**: Admin can trigger manual cleanup operations

## API Usage

### Get Analytics Data

```http
GET /api/admin/email-analytics?emailType=order_confirmation&startDate=2024-01-01&endDate=2024-01-31
```

Parameters:
- `emailType`: Filter by email type
- `status`: Filter by delivery status
- `startDate`: Filter by start date
- `endDate`: Filter by end date
- `orderId`: Filter by specific order
- `userId`: Filter by specific user
- `toEmail`: Filter by recipient email
- `limit`: Number of results to return (max 1000)
- `offset`: Pagination offset
- `sortBy`: Field to sort by
- `sortOrder`: Sort direction (asc/desc)

### Get Dashboard Data

```http
GET /api/admin/email-analytics/dashboard
```

Returns pre-formatted dashboard data optimized for the UI.

### Export Data

```http
GET /api/admin/email-analytics/export?format=csv&startDate=2024-01-01
```

Parameters:
- `format`: Export format (json/csv)
- `filename`: Custom filename (optional)

### Trigger Cleanup

```http
POST /api/admin/email-analytics/cleanup
```

Triggers manual cleanup of old analytics data.

## Monitoring and Maintenance

### Regular Tasks

1. **Monitor Dashboard**: Check email performance regularly
2. **Review Alerts**: Address any critical alerts promptly
3. **Export Reports**: Generate periodic performance reports
4. **Data Cleanup**: Ensure automatic cleanup is working
5. **Webhook Health**: Verify webhook processing is working

### Troubleshooting

#### Common Issues

1. **Missing Analytics Data**
   - Check if email functions are calling tracking methods
   - Verify webhook is properly configured
   - Check database connection

2. **High Bounce Rate**
   - Review email list quality
   - Check DNS settings (SPF, DKIM)
   - Monitor sender reputation

3. **Low Open Rate**
   - Review subject lines
   - Test email content
   - Check timing of sends

4. **Webhook Issues**
   - Verify webhook URL is accessible
   - Check webhook secret configuration
   - Monitor webhook processing logs

#### Logging

The system includes comprehensive logging:

- `[Email Service]` - Email sending operations
- `[EmailAnalytics]` - Analytics tracking operations
- `[Webhook]` - Webhook processing operations

Logs are written to console and can be monitored for troubleshooting.

## Security Considerations

1. **Webhook Security**: Always use webhook signatures for verification
2. **Access Control**: Ensure only authorized users can access analytics
3. **Data Privacy**: Analytics data may contain email addresses
4. **Rate Limiting**: Implement rate limiting for export endpoints

## Performance Considerations

1. **Database Indexes**: Automatic indexing for optimal query performance
2. **Data Retention**: Configurable cleanup to prevent database bloat
3. **Caching**: Dashboard data can be cached for better performance
4. **Batch Processing**: Webhook events are processed efficiently

## Future Enhancements

Potential improvements:

1. **A/B Testing**: Integration with email A/B testing
2. **Advanced Segmentation**: More detailed email recipient segmentation
3. **Machine Learning**: Predictive analytics for email performance
4. **Integration**: Connection with other analytics platforms
5. **Real-time Updates**: WebSocket-based real-time dashboard updates
6. **Mobile Dashboard**: Responsive mobile admin interface

## Support

For questions or issues with the email analytics system:

1. Check application logs for detailed error information
2. Verify configuration settings
3. Review webhook setup in Resend dashboard
4. Consult this documentation for troubleshooting steps