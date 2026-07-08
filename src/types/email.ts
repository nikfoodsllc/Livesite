/**
 * Email Analytics Types
 * Comprehensive tracking for email delivery and performance metrics
 */

export type EmailType = 'order_confirmation' | 'payment_failed' | 'password_reset' | 'password_reset_confirmation' | 'marketing' | 'support';

export type EmailDeliveryStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'rejected'
  | 'failed'
  | 'retrying';

export type BounceType = 'hard' | 'soft' | 'transient';

export type WebhookEvent =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'rejected';

export interface EmailAnalyticsEvent {
  _id?: string;
  eventId: string; // Resend event ID
  messageId: string; // Resend message ID
  emailType: EmailType;
  toEmail: string;
  orderId?: string;
  userId?: string;
  event: WebhookEvent;
  timestamp: Date;
  data: {
    ip?: string;
    userAgent?: string;
    link?: string;
    reason?: string;
    bounceType?: BounceType;
    error?: string;
    deliveryMethod?: string;
    renderedContent?: string;
  };
  createdAt: Date;
}

export interface EmailAnalyticsSummary {
  messageId: string;
  emailType: EmailType;
  toEmail: string;
  orderId?: string;
  userId?: string;
  subject: string;
  fromEmail: string;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  complainedAt?: Date;
  rejectedAt?: Date;
  lastStatus: EmailDeliveryStatus;
  events: EmailAnalyticsEvent[];
  totalEvents: number;
  deliveryTime?: number; // Time from sent to delivered in milliseconds
  openRate?: number; // If we track opens vs sent
  clickRate?: number; // If we track clicks vs opened
  isDelivered: boolean;
  isBounced: boolean;
  isComplained: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailPerformanceMetrics {
  totalEmails: number;
  sentEmails: number;
  deliveredEmails: number;
  openedEmails: number;
  clickedEmails: number;
  bouncedEmails: number;
  complainedEmails: number;
  rejectedEmails: number;
  pendingEmails: number;
  deliveryRate: number; // delivered / sent
  openRate: number; // opened / delivered
  clickRate: number; // clicked / opened
  bounceRate: number; // bounced / sent
  complaintRate: number; // complained / sent
  rejectionRate: number; // rejected / sent
  averageDeliveryTime: number; // milliseconds
}

export interface EmailAnalyticsByType {
  emailType: EmailType;
  metrics: EmailPerformanceMetrics;
  emailTypeLabel: string;
}

export interface EmailAnalyticsByDate {
  date: string; // YYYY-MM-DD format
  metrics: EmailPerformanceMetrics;
  breakdown: {
    hourly: Array<{
      hour: number; // 0-23
      metrics: EmailPerformanceMetrics;
    }>;
  };
}

export interface EmailAnalyticsResponse {
  query: {
    startDate?: string;
    endDate?: string;
    emailType?: EmailType;
    status?: EmailDeliveryStatus;
    limit?: number;
    offset?: number;
  };
  summary: {
    totalEmails: number;
    totalEvents: number;
    performance: EmailPerformanceMetrics;
  };
  analytics: EmailAnalyticsSummary[];
  byType: EmailAnalyticsByType[];
  byDate: EmailAnalyticsByDate[];
  recentEvents: EmailAnalyticsEvent[];
  topBouncedDomains: Array<{
    domain: string;
    count: number;
    bounceType: BounceType;
  }>;
  deliveryIssues: Array<{
    messageId: string;
    emailType: EmailType;
    toEmail: string;
    orderId?: string;
    status: EmailDeliveryStatus;
    lastEvent: WebhookEvent;
    error: string;
    lastAttempt: Date;
    events: EmailAnalyticsEvent[];
  }>;
}

export interface EmailAnalyticsQuery {
  emailType?: EmailType;
  status?: EmailDeliveryStatus;
  startDate?: string;
  endDate?: string;
  orderId?: string;
  userId?: string;
  toEmail?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'sentAt' | 'deliveredAt' | 'openedAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface EmailAnalyticsDashboard {
  overview: {
    totalEmails: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    complaintRate: number;
    averageDeliveryTime: number;
    recentTrend: 'improving' | 'declining' | 'stable';
  };
  performance: EmailPerformanceMetrics;
  charts: {
    dailyPerformance: Array<{
      date: string;
      sent: number;
      delivered: number;
      opened: number;
      bounced: number;
    }>;
    emailTypeBreakdown: Array<{
      emailType: EmailType;
      emailTypeLabel: string;
      count: number;
      deliveryRate: number;
    }>;
    hourlyDistribution: Array<{
      hour: number;
      count: number;
    }>;
    deliveryTimeline: Array<{
      timestamp: Date;
      status: EmailDeliveryStatus;
      count: number;
    }>;
  };
  alerts: Array<{
    type: 'high_bounce_rate' | 'delivery_failure' | 'complaint_surge' | 'performance_drop';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    affectedEmails?: number;
    recommendations?: string[];
  }>;
  topIssues: Array<{
    issue: string;
    count: number;
    percentage: number;
    recent: boolean;
    suggestions: string[];
  }>;
}

export interface WebhookPayload {
  id: string; // Event ID
  created_at: string; // ISO timestamp
  type: string; // Webhook type
  data: {
    created_at: string;
    email_id: string;
    from: string;
    to: Array<{
      email: string;
    }>;
    subject: string;
    html: string;
    text?: string;
    events: Array<{
      id: string;
      created_at: string;
      type: WebhookEvent;
      payload?: {
        ip?: string;
        user_agent?: string;
        link?: string;
        reason?: string;
        bounce_type?: BounceType;
        error?: string;
        delivery_method?: string;
        rendered_content?: string;
      };
    }>;
  };
}

export interface EmailTrackingSettings {
  enabled: boolean;
  trackOpens: boolean;
  trackClicks: boolean;
  trackDelivery: boolean;
  trackBounces: boolean;
  trackComplaints: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  retentionDays: number; // How long to keep analytics data
  realTimeUpdates: boolean;
  alertThresholds: {
    bounceRate: number; // Percentage
    complaintRate: number; // Percentage
    deliveryFailureThreshold: number; // Number of consecutive failures
  };
}

export interface EmailAnalyticsConfig {
  settings: EmailTrackingSettings;
  defaultQueries: {
    last24Hours: EmailAnalyticsQuery;
    last7Days: EmailAnalyticsQuery;
    last30Days: EmailAnalyticsQuery;
    custom: EmailAnalyticsQuery;
  };
  dashboardRefreshInterval: number; // milliseconds
  enableRealTimeDashboard: boolean;
  exportFormats: Array<'csv' | 'json' | 'pdf'>;
  autoCleanup: {
    enabled: boolean;
    retentionDays: number;
    cleanupInterval: number; // hours
  };
}

// Database collection names
export const EMAIL_ANALYTICS_COLLECTION = 'email_analytics';
export const EMAIL_SUMMARY_COLLECTION = 'email_analytics_summary';

// Default values
export const DEFAULT_ANALYTICS_SETTINGS: EmailTrackingSettings = {
  enabled: true,
  trackOpens: true,
  trackClicks: true,
  trackDelivery: true,
  trackBounces: true,
  trackComplaints: true,
  retentionDays: 365, // 1 year
  realTimeUpdates: true,
  alertThresholds: {
    bounceRate: 5, // 5%
    complaintRate: 0.1, // 0.1%
    deliveryFailureThreshold: 3, // 3 consecutive failures
  },
};

export const DEFAULT_ANALYTICS_CONFIG: EmailAnalyticsConfig = {
  settings: DEFAULT_ANALYTICS_SETTINGS,
  defaultQueries: {
    last24Hours: {
      limit: 100,
      sortBy: 'sentAt',
      sortOrder: 'desc',
    },
    last7Days: {
      limit: 500,
      sortBy: 'sentAt',
      sortOrder: 'desc',
    },
    last30Days: {
      limit: 1000,
      sortBy: 'sentAt',
      sortOrder: 'desc',
    },
    custom: {
      limit: 100,
      sortBy: 'sentAt',
      sortOrder: 'desc',
    },
  },
  dashboardRefreshInterval: 30000, // 30 seconds
  enableRealTimeDashboard: true,
  exportFormats: ['csv', 'json'],
  autoCleanup: {
    enabled: true,
    retentionDays: 365,
    cleanupInterval: 24, // hours
  },
};