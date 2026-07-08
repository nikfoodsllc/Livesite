/**
 * Email Analytics Service
 * Comprehensive email tracking, analytics, and performance monitoring
 */

import {
  EmailAnalyticsEvent,
  EmailAnalyticsSummary,
  EmailAnalyticsQuery,
  EmailAnalyticsResponse,
  EmailAnalyticsDashboard,
  EmailPerformanceMetrics,
  EmailAnalyticsByType,
  EmailAnalyticsByDate,
  WebhookPayload,
  WebhookEvent,
  EmailType,
  EmailDeliveryStatus,
  BounceType,
  DEFAULT_ANALYTICS_CONFIG,
  EMAIL_ANALYTICS_COLLECTION,
  EMAIL_SUMMARY_COLLECTION
} from '@/types/email';
import { db } from '@/lib/server/db';
import { getPSTDateString, getPSTMidnight } from '@/lib/timezone';
// Simple UUID generator since uuid package is not available
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Email Analytics Service Class
 */
class EmailAnalyticsService {
  private static instance: EmailAnalyticsService;
  private config = DEFAULT_ANALYTICS_CONFIG;

  private constructor() {}

  public static getInstance(): EmailAnalyticsService {
    if (!EmailAnalyticsService.instance) {
      EmailAnalyticsService.instance = new EmailAnalyticsService();
    }
    return EmailAnalyticsService.instance;
  }

  /**
   * Initialize analytics service
   */
  public async initialize(): Promise<void> {
    try {
      // Check if we're in build time
      if (typeof window === 'undefined' && (process.env.NEXT_PHASE === 'phase-production-build' || process.env.BUILD_TIME === 'true')) {
        console.log('[EmailAnalytics] Skipping initialization during build time');
        return;
      }

      // Load config from database if exists
      try {
        const configResult = await db.readOne('email_analytics_config', { type: 'global' });
        if (configResult.success && configResult.data) {
          this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...configResult.data.config };
        }
      } catch (dbError) {
        // If database is not available during build, use default config
        console.warn('[EmailAnalytics] Could not load config from database, using defaults:', dbError);
      }

      // Create indexes for better query performance
      await this.createIndexes();

      console.log('[EmailAnalytics] Service initialized successfully');
    } catch (error) {
      console.error('[EmailAnalytics] Failed to initialize service:', error);
      // Don't throw error during build time to prevent build failures
      if (typeof window === 'undefined' && (process.env.NEXT_PHASE === 'phase-production-build' || process.env.BUILD_TIME === 'true')) {
        console.warn('[EmailAnalytics] Initialization failed during build, continuing...');
        return;
      }
      throw error;
    }
  }

  /**
   * Create database indexes for analytics collections
   */
  private async createIndexes(): Promise<void> {
    try {
      // Email analytics events collection indexes
      // Note: createIndex method not available on DatabaseHandler, skipping index creation
      console.log('[EmailAnalytics] Index creation skipped - createIndex method not available');
    } catch (error) {
      console.error('[EmailAnalytics] Failed to create indexes:', error);
    }
  }

  /**
   * Track email sent event
   */
  public async trackEmailSent(
    messageId: string,
    emailType: EmailType,
    toEmail: string,
    orderId?: string,
    userId?: string,
    subject?: string,
    fromEmail?: string
  ): Promise<{ success: boolean; summaryId?: string; error?: string }> {
    try {
      const now = new Date();
      const summaryId = generateId();

      // Create initial summary record
      const summary: EmailAnalyticsSummary = {
        messageId,
        emailType,
        toEmail,
        orderId,
        userId,
        subject: subject || this.getDefaultSubject(emailType),
        fromEmail: fromEmail || process.env.RESEND_FROM_EMAIL || '"Nikfoods" <no-reply@nikfoods-email.synngular.com>',
        sentAt: now,
        lastStatus: 'sent',
        events: [],
        totalEvents: 0,
        isDelivered: false,
        isBounced: false,
        isComplained: false,
        createdAt: now,
        updatedAt: now,
      };

      // Track the sent event
      await this.trackEvent(
        messageId,
        emailType,
        toEmail,
        orderId,
        userId,
        'sent',
        {},
        generateId()
      );

      // Save summary
      await db.create(EMAIL_SUMMARY_COLLECTION, summary);

      console.log('[EmailAnalytics] Email sent tracked:', {
        messageId,
        emailType,
        toEmail,
        summaryId,
      });

      return { success: true, summaryId };
    } catch (error) {
      console.error('[EmailAnalytics] Failed to track email sent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Track email event (delivery, open, click, bounce, etc.)
   */
  public async trackEvent(
    messageId: string,
    emailType: EmailType,
    toEmail: string,
    orderId: string | undefined,
    userId: string | undefined,
    event: WebhookEvent,
    eventData: Partial<EmailAnalyticsEvent['data']> = {},
    eventId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const timestamp = new Date();
      const finalEventId = eventId || generateId();

      // Create event record
      const analyticsEvent: EmailAnalyticsEvent = {
        eventId: finalEventId,
        messageId,
        emailType,
        toEmail,
        orderId,
        userId,
        event,
        timestamp,
        data: eventData,
        createdAt: timestamp,
      };

      // Save event
      const eventResult = await db.create(EMAIL_ANALYTICS_COLLECTION, analyticsEvent);
      if (!eventResult.success) {
        throw new Error(`Failed to save event: ${eventResult.error}`);
      }

      // Update summary
      await this.updateSummary(messageId, event, timestamp, eventData, finalEventId);

      console.log('[EmailAnalytics] Event tracked:', {
        messageId,
        event,
        toEmail,
        timestamp,
      });

      return { success: true };
    } catch (error) {
      console.error('[EmailAnalytics] Failed to track event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update email summary based on new event
   */
  private async updateSummary(
    messageId: string,
    event: WebhookEvent,
    timestamp: Date,
    eventData: Partial<EmailAnalyticsEvent['data']>,
    eventId: string
  ): Promise<void> {
    try {
      // Get current summary
      const summaryResult = await db.readOne<EmailAnalyticsSummary>(EMAIL_SUMMARY_COLLECTION, { messageId });
      if (!summaryResult.success || !summaryResult.data) {
        console.warn('[EmailAnalytics] Summary not found for messageId:', messageId);
        return;
      }

      const summary = summaryResult.data;

      // Update based on event type
      switch (event) {
        case 'delivered':
          summary.deliveredAt = timestamp;
          summary.lastStatus = 'delivered';
          summary.isDelivered = true;
          if (summary.sentAt) {
            summary.deliveryTime = timestamp.getTime() - summary.sentAt.getTime();
          }
          break;

        case 'opened':
          summary.openedAt = summary.openedAt || timestamp; // Keep first open
          break;

        case 'clicked':
          summary.clickedAt = summary.clickedAt || timestamp; // Keep first click
          break;

        case 'bounced':
          summary.bouncedAt = timestamp;
          summary.lastStatus = 'bounced';
          summary.isBounced = true;
          break;

        case 'complained':
          summary.complainedAt = timestamp;
          summary.lastStatus = 'complained';
          summary.isComplained = true;
          break;

        case 'rejected':
          summary.rejectedAt = timestamp;
          summary.lastStatus = 'rejected';
          break;

        case 'sent':
          summary.sentAt = summary.sentAt || timestamp;
          summary.lastStatus = 'sent';
          break;
      }

      // Add event to events array (keep only last 10 events for storage efficiency)
      const newEvent: EmailAnalyticsEvent = {
        eventId,
        messageId: summary.messageId,
        emailType: summary.emailType,
        toEmail: summary.toEmail,
        orderId: summary.orderId,
        userId: summary.userId,
        event,
        timestamp,
        data: eventData as EmailAnalyticsEvent['data'],
        createdAt: timestamp,
      };
      summary.events = [newEvent, ...summary.events].slice(0, 10);
      summary.totalEvents += 1;
      summary.updatedAt = timestamp;

      // Update rates
      if (summary.isDelivered && summary.sentAt) {
        // Calculate rates if we have the data
        // Note: These could be calculated on the fly for more accuracy
      }

      // Save updated summary
      await db.updateOne(EMAIL_SUMMARY_COLLECTION, { messageId }, { $set: summary });
    } catch (error) {
      console.error('[EmailAnalytics] Failed to update summary:', error);
    }
  }

  /**
   * Process webhook payload from Resend
   */
  public async processWebhook(payload: WebhookPayload): Promise<{ success: boolean; processedEvents: number; error?: string }> {
    try {
      if (!payload.data || !payload.data.events) {
        return { success: false, processedEvents: 0, error: 'Invalid webhook payload' };
      }

      const emailData = payload.data;
      let processedEvents = 0;

      // Find the summary for this email
      const summaryResult = await db.readOne<EmailAnalyticsSummary>(EMAIL_SUMMARY_COLLECTION, {
        messageId: emailData.email_id
      });

      if (!summaryResult.success || !summaryResult.data) {
        console.warn('[EmailAnalytics] No summary found for webhook email:', emailData.email_id);
        return { success: true, processedEvents };
      }

      const summary = summaryResult.data;

      // Process each event in the webhook
      for (const event of emailData.events) {
        await this.trackEvent(
          emailData.email_id,
          summary.emailType,
          summary.toEmail,
          summary.orderId,
          summary.userId,
          event.type as WebhookEvent,
          event.payload || {},
          event.id
        );
        processedEvents++;
      }

      console.log('[EmailAnalytics] Webhook processed:', {
        emailId: emailData.email_id,
        eventsCount: emailData.events.length,
        processedEvents,
      });

      return { success: true, processedEvents };
    } catch (error) {
      console.error('[EmailAnalytics] Failed to process webhook:', error);
      return {
        success: false,
        processedEvents: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get analytics data with query parameters
   */
  public async getAnalytics(query: EmailAnalyticsQuery): Promise<{ success: boolean; data?: EmailAnalyticsResponse; error?: string }> {
    try {
      const dbQuery: Record<string, unknown> = {};

      // Build database query
      if (query.emailType) {
        dbQuery.emailType = query.emailType;
      }
      if (query.toEmail) {
        dbQuery.toEmail = query.toEmail;
      }
      if (query.orderId) {
        dbQuery.orderId = query.orderId;
      }
      if (query.userId) {
        dbQuery.userId = query.userId;
      }

      // Date range
      if (query.startDate || query.endDate) {
        dbQuery.createdAt = {};
        if (query.startDate) {
          const startDatePST = getPSTMidnight(new Date(query.startDate));
          (dbQuery.createdAt as Record<string, Date>).$gte = startDatePST;
        }
        if (query.endDate) {
          // End of day in PST: get midnight of endDate, add 1 day, subtract 1ms
          const endDateMidnight = getPSTMidnight(new Date(query.endDate));
          const endDatePST = new Date(endDateMidnight.getTime() + (24 * 60 * 60 * 1000) - 1);
          (dbQuery.createdAt as Record<string, Date>).$lte = endDatePST;
        }
      }

      // Get analytics summaries
      const summariesResult = await db.read<EmailAnalyticsSummary>(
        EMAIL_SUMMARY_COLLECTION,
        dbQuery,
        {
          limit: query.limit || 100,
          skip: query.offset || 0,
          sort: { [query.sortBy || 'createdAt']: query.sortOrder === 'asc' ? 1 : -1 },
        }
      );

      if (!summariesResult.success) {
        throw new Error(`Failed to fetch summaries: ${summariesResult.error}`);
      }

      const summaries = summariesResult.data || [];

      // Calculate overall metrics
      const performance = await this.calculatePerformanceMetrics(summaries);

      // Get breakdown by type
      const byType = await this.getAnalyticsByType(query);

      // Get breakdown by date
      const byDate = await this.getAnalyticsByDate(query);

      // Get recent events
      const recentEvents = await this.getRecentEvents(50);

      // Get bounced domains
      const topBouncedDomains = await this.getTopBouncedDomains();

      // Get delivery issues
      const deliveryIssues = await this.getDeliveryIssues(query);

      const response: EmailAnalyticsResponse = {
        query,
        summary: {
          totalEmails: summaries.length,
          totalEvents: recentEvents.length,
          performance,
        },
        analytics: summaries,
        byType,
        byDate,
        recentEvents,
        topBouncedDomains,
        deliveryIssues,
      };

      return { success: true, data: response };
    } catch (error) {
      console.error('[EmailAnalytics] Failed to get analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get dashboard data
   */
  public async getDashboard(query: EmailAnalyticsQuery = {}): Promise<{ success: boolean; data?: EmailAnalyticsDashboard; error?: string }> {
    try {
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      // Get data for different time periods
      const last7DaysQuery = { ...query, startDate: last7Days.toISOString(), endDate: now.toISOString() };
    
      const last7DaysResult = await this.getAnalytics(last7DaysQuery);

      if (!last7DaysResult.success || !last7DaysResult.data) {
        throw new Error('Failed to get 7-day analytics');
      }

      const last7DaysData = last7DaysResult.data;

      // Calculate overview metrics
      const overview = {
        totalEmails: last7DaysData.summary.totalEmails,
        deliveryRate: last7DaysData.summary.performance.deliveryRate,
        openRate: last7DaysData.summary.performance.openRate,
        clickRate: last7DaysData.summary.performance.clickRate,
        bounceRate: last7DaysData.summary.performance.bounceRate,
        complaintRate: last7DaysData.summary.performance.complaintRate,
        averageDeliveryTime: last7DaysData.summary.performance.averageDeliveryTime,
        recentTrend: this.calculateTrend(last7DaysData.byDate) as 'improving' | 'declining' | 'stable',
      };

      // Generate charts data
      const charts = {
        dailyPerformance: last7DaysData.byDate.map(dateData => ({
          date: dateData.date,
          sent: dateData.metrics.totalEmails,
          delivered: dateData.metrics.deliveredEmails,
          opened: dateData.metrics.openedEmails,
          bounced: dateData.metrics.bouncedEmails,
        })),
        emailTypeBreakdown: last7DaysData.byType.map(typeData => ({
          emailType: typeData.emailType,
          emailTypeLabel: typeData.emailTypeLabel,
          count: typeData.metrics.totalEmails,
          deliveryRate: typeData.metrics.deliveryRate,
        })),
        hourlyDistribution: await this.getHourlyDistribution(last7DaysQuery),
        deliveryTimeline: last7DaysData.recentEvents
          .filter(event => ['sent', 'delivered', 'bounced'].includes(event.event))
          .slice(0, 100)
          .map(event => ({
            timestamp: event.timestamp,
            status: event.event as EmailDeliveryStatus,
            count: 1,
          })),
      };

      // Generate alerts
      const alerts = await this.generateAlerts(last7DaysData.summary.performance);

      // Generate top issues
      const topIssues = await this.getTopIssues(last7DaysData);

      const dashboard: EmailAnalyticsDashboard = {
        overview,
        performance: last7DaysData.summary.performance,
        charts,
        alerts,
        topIssues,
      };

      return { success: true, data: dashboard };
    } catch (error) {
      console.error('[EmailAnalytics] Failed to get dashboard:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate performance metrics from summaries
   */
  private async calculatePerformanceMetrics(summaries: EmailAnalyticsSummary[]): Promise<EmailPerformanceMetrics> {
    const metrics: EmailPerformanceMetrics = {
      totalEmails: summaries.length,
      sentEmails: summaries.filter(s => s.sentAt).length,
      deliveredEmails: summaries.filter(s => s.isDelivered).length,
      openedEmails: summaries.filter(s => s.openedAt).length,
      clickedEmails: summaries.filter(s => s.clickedAt).length,
      bouncedEmails: summaries.filter(s => s.isBounced).length,
      complainedEmails: summaries.filter(s => s.isComplained).length,
      rejectedEmails: summaries.filter(s => s.rejectedAt).length,
      pendingEmails: summaries.filter(s => s.lastStatus === 'pending').length,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      complaintRate: 0,
      rejectionRate: 0,
      averageDeliveryTime: 0,
    };

    // Calculate rates
    if (metrics.sentEmails > 0) {
      metrics.deliveryRate = (metrics.deliveredEmails / metrics.sentEmails) * 100;
      metrics.bounceRate = (metrics.bouncedEmails / metrics.sentEmails) * 100;
      metrics.complaintRate = (metrics.complainedEmails / metrics.sentEmails) * 100;
      metrics.rejectionRate = (metrics.rejectedEmails / metrics.sentEmails) * 100;
    }

    if (metrics.deliveredEmails > 0) {
      metrics.openRate = (metrics.openedEmails / metrics.deliveredEmails) * 100;
      metrics.clickRate = (metrics.clickedEmails / metrics.openedEmails) * 100;
    }

    // Calculate average delivery time
    const deliveredEmails = summaries.filter(s => s.isDelivered && s.deliveryTime);
    if (deliveredEmails.length > 0) {
      metrics.averageDeliveryTime = deliveredEmails.reduce((sum, s) => sum + (s.deliveryTime || 0), 0) / deliveredEmails.length;
    }

    return metrics;
  }

  /**
   * Get analytics breakdown by email type
   */
  private async getAnalyticsByType(_query: EmailAnalyticsQuery): Promise<EmailAnalyticsByType[]> {
    try {
      const summariesResult = await db.read<EmailAnalyticsSummary>(EMAIL_SUMMARY_COLLECTION, {}, { limit: 1000 });
      if (!summariesResult.success || !summariesResult.data) {
        return [];
      }

      const summaries = summariesResult.data;
      const typeGroups: Record<string, EmailAnalyticsSummary[]> = {};

      summaries.forEach(summary => {
        if (!typeGroups[summary.emailType]) {
          typeGroups[summary.emailType] = [];
        }
        typeGroups[summary.emailType].push(summary);
      });

      const byType: EmailAnalyticsByType[] = [];
      for (const [emailType, typeSummaries] of Object.entries(typeGroups)) {
        const metrics = await this.calculatePerformanceMetrics(typeSummaries);
        byType.push({
          emailType: emailType as EmailType,
          metrics,
          emailTypeLabel: this.getEmailTypeLabel(emailType as EmailType),
        });
      }

      return byType.sort((a, b) => b.metrics.totalEmails - a.metrics.totalEmails);
    } catch (error) {
      console.error('[EmailAnalytics] Failed to get analytics by type:', error);
      return [];
    }
  }

  /**
   * Get analytics breakdown by date
   */
  private async getAnalyticsByDate(_query: EmailAnalyticsQuery): Promise<EmailAnalyticsByDate[]> {
    try {
      const summariesResult = await db.read<EmailAnalyticsSummary>(EMAIL_SUMMARY_COLLECTION, {}, { limit: 1000 });
      if (!summariesResult.success || !summariesResult.data) {
        return [];
      }

      const summaries = summariesResult.data;
      const dateGroups: Record<string, EmailAnalyticsSummary[]> = {};

      summaries.forEach(summary => {
        const date = getPSTDateString(new Date(summary.createdAt));
        if (!dateGroups[date]) {
          dateGroups[date] = [];
        }
        dateGroups[date].push(summary);
      });

      const byDate: EmailAnalyticsByDate[] = [];
      for (const [date, dateSummaries] of Object.entries(dateGroups)) {
        const metrics = await this.calculatePerformanceMetrics(dateSummaries);
        const hourly = await this.getHourlyBreakdown(date, dateSummaries);

        byDate.push({
          date,
          metrics,
          breakdown: { hourly },
        });
      }

      return byDate.sort((a, b) => b.date.localeCompare(a.date));
    } catch (error) {
      console.error('[EmailAnalytics] Failed to get analytics by date:', error);
      return [];
    }
  }

  /**
   * Get hourly breakdown for a specific date
   */
  private async getHourlyBreakdown(date: string, summaries: EmailAnalyticsSummary[]): Promise<Array<{ hour: number; metrics: EmailPerformanceMetrics }>> {
    const hourlyBreakdown: Array<{ hour: number; metrics: EmailPerformanceMetrics }> = [];

    for (let hour = 0; hour < 24; hour++) {
      const hourSummaries = summaries.filter(summary => {
        const summaryHour = new Date(summary.createdAt).getHours();
        return summaryHour === hour;
      });

      const metrics = await this.calculatePerformanceMetrics(hourSummaries);
      hourlyBreakdown.push({ hour, metrics });
    }

    return hourlyBreakdown;
  }

  /**
   * Get recent events
   */
  private async getRecentEvents(limit: number = 50): Promise<EmailAnalyticsEvent[]> {
    try {
      const result = await db.read<EmailAnalyticsEvent>(
        EMAIL_ANALYTICS_COLLECTION,
        {},
        {
          limit,
          sort: { timestamp: -1 },
        }
      );

      return result.data || [];
    } catch (error) {
      console.error('[EmailAnalytics] Failed to get recent events:', error);
      return [];
    }
  }

  /**
   * Get top bounced domains
   */
  private async getTopBouncedDomains(limit: number = 10): Promise<Array<{ domain: string; count: number; bounceType: BounceType }>> {
    try {
      // Get bounced events
      const bouncedEventsResult = await db.read<EmailAnalyticsEvent>(
        EMAIL_ANALYTICS_COLLECTION,
        { event: 'bounced' },
        { limit: 1000 }
      );

      if (!bouncedEventsResult.success || !bouncedEventsResult.data) {
        return [];
      }

      const bouncedEvents = bouncedEventsResult.data;
      const domainCounts: Record<string, { count: number; bounceType: BounceType }> = {};

      bouncedEvents.forEach(event => {
        const domain = event.toEmail.split('@')[1];
        if (domain) {
          if (!domainCounts[domain]) {
            domainCounts[domain] = { count: 0, bounceType: 'soft' };
          }
          domainCounts[domain].count++;
          if (event.data.bounceType === 'hard') {
            domainCounts[domain].bounceType = 'hard';
          }
        }
      });

      return Object.entries(domainCounts)
        .map(([domain, data]) => ({ domain, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('[EmailAnalytics] Failed to get top bounced domains:', error);
      return [];
    }
  }

  /**
   * Get delivery issues
   */
  private async getDeliveryIssues(query: EmailAnalyticsQuery): Promise<Array<{
    messageId: string;
    emailType: EmailType;
    toEmail: string;
    orderId?: string;
    status: EmailDeliveryStatus;
    lastEvent: WebhookEvent;
    error: string;
    lastAttempt: Date;
    events: EmailAnalyticsEvent[];
  }>> {
    try {
      const issuesQuery: Record<string, unknown> = {
        $or: [
          { lastStatus: 'bounced' },
          { lastStatus: 'rejected' },
          { lastStatus: 'failed' },
          { isBounced: true },
          { isComplained: true },
        ],
      };

      if (query.startDate || query.endDate) {
        issuesQuery.createdAt = {};
        if (query.startDate) {
          const startDatePST = getPSTMidnight(new Date(query.startDate));
          (issuesQuery.createdAt as Record<string, Date>).$gte = startDatePST;
        }
        if (query.endDate) {
          // End of day in PST: get midnight of endDate, add 1 day, subtract 1ms
          const endDateMidnight = getPSTMidnight(new Date(query.endDate));
          const endDatePST = new Date(endDateMidnight.getTime() + (24 * 60 * 60 * 1000) - 1);
          (issuesQuery.createdAt as Record<string, Date>).$lte = endDatePST;
        }
      }

      const result = await db.read<EmailAnalyticsSummary>(
        EMAIL_SUMMARY_COLLECTION,
        issuesQuery,
        { limit: query.limit || 50, sort: { updatedAt: -1 } }
      );

      if (!result.success || !result.data) {
        return [];
      }

      const issues = [];
      for (const summary of result.data) {
        // Get events for this email
        const eventsResult = await db.read<EmailAnalyticsEvent>(
          EMAIL_ANALYTICS_COLLECTION,
          { messageId: summary.messageId },
          { sort: { timestamp: -1 } }
        );

        const events = eventsResult.data || [];
        const lastEvent = events[0];

        if (lastEvent) {
          issues.push({
            messageId: summary.messageId,
            emailType: summary.emailType,
            toEmail: summary.toEmail,
            orderId: summary.orderId,
            status: summary.lastStatus,
            lastEvent: lastEvent.event,
            error: lastEvent.data.error || summary.events[0]?.data.error || 'Unknown error',
            lastAttempt: summary.updatedAt,
            events: events.slice(0, 5),
          });
        }
      }

      return issues;
    } catch (error) {
      console.error('[EmailAnalytics] Failed to get delivery issues:', error);
      return [];
    }
  }

  /**
   * Get hourly distribution
   */
  private async getHourlyDistribution(_query: EmailAnalyticsQuery): Promise<Array<{ hour: number; count: number }>> {
    try {
      const result = await db.read<EmailAnalyticsSummary>(
        EMAIL_SUMMARY_COLLECTION,
        {},
        { limit: 1000 }
      );

      if (!result.success || !result.data) {
        return [];
      }

      const summaries = result.data;
      const hourlyCounts = new Array(24).fill(0);

      summaries.forEach(summary => {
        const hour = new Date(summary.createdAt).getHours();
        hourlyCounts[hour]++;
      });

      return hourlyCounts.map((count, hour) => ({ hour, count }));
    } catch (error) {
      console.error('[EmailAnalytics] Failed to get hourly distribution:', error);
      return new Array(24).fill(0).map((_, hour) => ({ hour, count: 0 }));
    }
  }

  /**
   * Generate alerts based on performance metrics
   */
  private async generateAlerts(metrics: EmailPerformanceMetrics): Promise<Array<{
    type: "high_bounce_rate" | "delivery_failure" | "complaint_surge" | "performance_drop";
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    timestamp: Date;
    affectedEmails?: number;
    recommendations?: string[];
  }>> {
    const alerts: Array<{
      type: "high_bounce_rate" | "delivery_failure" | "complaint_surge" | "performance_drop";
      severity: "low" | "medium" | "high" | "critical";
      message: string;
      timestamp: Date;
      affectedEmails?: number;
      recommendations?: string[];
    }> = [];
    const threshold = this.config.settings.alertThresholds;

    // High bounce rate alert
    if (metrics.bounceRate > threshold.bounceRate) {
      alerts.push({
        type: 'high_bounce_rate' as const,
        severity: metrics.bounceRate > threshold.bounceRate * 2 ? 'critical' : 'high',
        message: `Bounce rate is ${metrics.bounceRate.toFixed(2)}% (threshold: ${threshold.bounceRate}%)`,
        timestamp: new Date(),
        affectedEmails: metrics.bouncedEmails,
        recommendations: [
          'Review email list for invalid addresses',
          'Check SPF/DNS records',
          'Monitor sender reputation',
        ],
      });
    }

    // High complaint rate alert
    if (metrics.complaintRate > threshold.complaintRate) {
      alerts.push({
        type: 'complaint_surge' as const,
        severity: 'critical',
        message: `Complaint rate is ${metrics.complaintRate.toFixed(3)}% (threshold: ${threshold.complaintRate}%)`,
        timestamp: new Date(),
        affectedEmails: metrics.complainedEmails,
        recommendations: [
          'Review content for compliance',
          'Check unsubscribe process',
          'Review mailing practices',
        ],
      });
    }

    // Low delivery rate alert
    if (metrics.deliveryRate < 90 && metrics.sentEmails > 10) {
      alerts.push({
        type: 'delivery_failure',
        severity: metrics.deliveryRate < 80 ? 'critical' : 'high',
        message: `Delivery rate is ${metrics.deliveryRate.toFixed(2)}% (expected: >90%)`,
        timestamp: new Date(),
        affectedEmails: metrics.sentEmails - metrics.deliveredEmails,
        recommendations: [
          'Check SMTP configuration',
          'Monitor sender reputation',
          'Review email content',
        ],
      });
    }

    // Performance drop alert (if overall performance is declining)
    if (metrics.deliveryRate < 85 && metrics.openRate < 15) {
      alerts.push({
        type: 'performance_drop',
        severity: 'medium',
        message: `Overall performance drop detected - Delivery: ${metrics.deliveryRate.toFixed(2)}%, Open: ${metrics.openRate.toFixed(2)}%`,
        timestamp: new Date(),
        affectedEmails: metrics.sentEmails,
        recommendations: [
          'Review email content and sending practices',
          'Check email authentication (SPF, DKIM, DMARC)',
          'Monitor sender reputation scores',
        ],
      });
    }

    return alerts;
  }

  /**
   * Get top issues from analytics data
   */
  private async getTopIssues(analyticsData: EmailAnalyticsResponse): Promise<Array<{
    issue: string;
    count: number;
    percentage: number;
    recent: boolean;
    suggestions: string[];
  }>> {
    const issues = [];

    // Bounced emails
    if (analyticsData.summary.performance.bouncedEmails > 0) {
      const percentage = (analyticsData.summary.performance.bouncedEmails / analyticsData.summary.totalEmails) * 100;
      issues.push({
        issue: 'Bounced emails',
        count: analyticsData.summary.performance.bouncedEmails,
        percentage,
        recent: analyticsData.deliveryIssues.length > 0,
        suggestions: [
          'Clean email list regularly',
          'Implement double opt-in',
          'Monitor bounce reasons',
        ],
      });
    }

    // Delivery failures
    const undelivered = analyticsData.summary.performance.sentEmails - analyticsData.summary.performance.deliveredEmails;
    if (undelivered > 0) {
      const percentage = (undelivered / analyticsData.summary.performance.sentEmails) * 100;
      issues.push({
        issue: 'Delivery failures',
        count: undelivered,
        percentage,
        recent: true,
        suggestions: [
          'Check SMTP configuration',
          'Monitor queue health',
          'Review sending limits',
        ],
      });
    }

    // Low open rate
    if (analyticsData.summary.performance.openRate < 20) {
      issues.push({
        issue: 'Low open rate',
        count: analyticsData.summary.performance.deliveredEmails - analyticsData.summary.performance.openedEmails,
        percentage: 100 - analyticsData.summary.performance.openRate,
        recent: true,
        suggestions: [
          'Improve subject lines',
          'Test send times',
          'Segment audience better',
        ],
      });
    }

    return issues.sort((a, b) => b.percentage - a.percentage).slice(0, 5);
  }

  /**
   * Calculate trend from date data
   */
  private calculateTrend(byDate: EmailAnalyticsByDate[]): string {
    if (byDate.length < 2) return 'stable';

    const recent = byDate.slice(0, 3); // Last 3 days
    const older = byDate.slice(3, 7); // Previous 4 days (if available)

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, d) => sum + d.metrics.deliveryRate, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.metrics.deliveryRate, 0) / older.length;

    const difference = recentAvg - olderAvg;

    if (difference > 2) return 'improving';
    if (difference < -2) return 'declining';
    return 'stable';
  }

  /**
   * Get default subject for email type
   */
  private getDefaultSubject(emailType: EmailType): string {
    const subjects = {
      order_confirmation: 'NikFoods order confirmation',
      payment_failed: 'Action Required: Nikfoods Order Could Not Be Placed',
      password_reset: 'Reset Your Password - NikFoods',
      password_reset_confirmation: 'Password Reset Successful - NikFoods',
      marketing: 'Special Offer from NikFoods',
      support: 'Support Response - NikFoods',
    };
    return subjects[emailType] || 'Email from NikFoods';
  }

  /**
   * Get human readable label for email type
   */
  private getEmailTypeLabel(emailType: EmailType): string {
    const labels = {
      order_confirmation: 'Order Confirmation',
      payment_failed: 'Payment Failed',
      password_reset: 'Password Reset',
      password_reset_confirmation: 'Password Reset Confirmation',
      marketing: 'Marketing Email',
      support: 'Support Email',
    };
    return labels[emailType] || emailType;
  }

  /**
   * Cleanup old analytics data
   */
  public async cleanupOldData(): Promise<{ success: boolean; deletedEvents?: number; deletedSummaries?: number; error?: string }> {
    try {
      if (!this.config.autoCleanup.enabled) {
        return { success: true, deletedEvents: 0, deletedSummaries: 0 };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.autoCleanup.retentionDays);

      // Delete old events
      const eventsDeleteResult = await db.delete(EMAIL_ANALYTICS_COLLECTION, {
        createdAt: { $lt: cutoffDate },
      });

      // Delete old summaries (keep summaries longer as they're useful for historical analysis)
      const summaryCutoffDate = new Date();
      summaryCutoffDate.setDate(summaryCutoffDate.getDate() - (this.config.autoCleanup.retentionDays * 2));

      const summariesDeleteResult = await db.delete(EMAIL_SUMMARY_COLLECTION, {
        createdAt: { $lt: summaryCutoffDate },
      });

      console.log('[EmailAnalytics] Cleanup completed:', {
        cutoffDate: cutoffDate.toISOString(),
        deletedEvents: eventsDeleteResult.deletedCount,
        deletedSummaries: summariesDeleteResult.deletedCount,
      });

      return {
        success: true,
        deletedEvents: eventsDeleteResult.deletedCount,
        deletedSummaries: summariesDeleteResult.deletedCount,
      };
    } catch (error) {
      console.error('[EmailAnalytics] Failed to cleanup old data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const emailAnalytics = EmailAnalyticsService.getInstance();

// Initialize analytics service (call this during app initialization)
export async function initializeEmailAnalytics(): Promise<void> {
  try {
    await emailAnalytics.initialize();
  } catch (error) {
    console.error('[EmailAnalytics] Failed to initialize:', error);
    // Don't throw error to prevent app startup failure
  }
}