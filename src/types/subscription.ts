/**
 * Menu Subscription Types
 * Types for email subscription functionality for menu update notifications
 */

export interface MenuSubscription {
  _id?: string;
  email: string;
  userId?: string;            // For logged-in users
  subscribedAt: Date;
  consentGiven: boolean;
  isActive: boolean;          // For unsubscribe functionality
  source: 'home_modal';
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscribeRequest {
  email: string;
  consentGiven: boolean;
}

export interface SubscribeResponse {
  success: boolean;
  message: string;
  data?: { email: string; subscribedAt: Date };
  error?: string;
}

export interface CheckSubscriptionResponse {
  subscribed: boolean;
  email: string;
  subscribedAt?: Date;
}
