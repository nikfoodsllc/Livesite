/**
 * ============================================================================
 * API DATE FORMAT - DEMONSTRATION SCRIPT
 * ============================================================================
 *
 * This script demonstrates the usage of the API date formatting utilities.
 * Run with: npx ts-node src/lib/apiDateFormat.demo.ts
 *
 * ============================================================================
 */

import {
  formatAPIDate,
  formatAPIDateOnly,
  formatAPITimestamp,
  isValidAPIDate,
  formatAPIDateArray,
} from './apiDateFormat';

console.log('=================================');
console.log('API DATE FORMAT - DEMONSTRATION');
console.log('=================================\n');

// Example 1: Formatting order timestamps
console.log('--- Example 1: Order Timestamps ---\n');
const order = {
  orderId: 'ORD-12345',
  createdAt: new Date('2026-01-15T10:30:00Z'),
  updatedAt: new Date('2026-01-15T11:00:00Z'),
  deliveryDate: '2026-01-20',
  deliveredAt: null as Date | null,
};

const orderResponse = {
  orderId: order.orderId,
  createdAt: formatAPIDate(order.createdAt),
  updatedAt: formatAPIDate(order.updatedAt),
  deliveryDate: formatAPIDateOnly(order.deliveryDate),
  deliveredAt: formatAPIDate(order.deliveredAt),
};

console.log('Order Response:');
console.log(JSON.stringify(orderResponse, null, 2));
console.log('\n');

// Example 2: Formatting email analytics
console.log('--- Example 2: Email Analytics ---\n');
const emailEvents = [
  {
    eventId: 'EVT-001',
    type: 'sent',
    timestamp: new Date('2026-01-15T10:00:00Z'),
  },
  {
    eventId: 'EVT-002',
    type: 'delivered',
    timestamp: new Date('2026-01-15T10:01:30.500Z'),
  },
  {
    eventId: 'EVT-003',
    type: 'opened',
    timestamp: new Date('2026-01-15T10:05:45.250Z'),
  },
  {
    eventId: 'EVT-004',
    type: 'clicked',
    timestamp: new Date('2026-01-15T10:10:15.750Z'),
  },
];

const emailResponse = {
  success: true,
  data: {
    events: emailEvents.map(event => ({
      eventId: event.eventId,
      type: event.type,
      timestamp: formatAPITimestamp(event.timestamp),
    })),
  },
};

console.log('Email Analytics Response:');
console.log(JSON.stringify(emailResponse, null, 2));
console.log('\n');

// Example 3: Formatting available dates
console.log('--- Example 3: Available Dates ---\n');
const availableDates = [
  '2026-01-20',
  '2026-01-21',
  '2026-01-22',
  '2026-01-23',
  '2026-01-24',
];

const datesResponse = {
  success: true,
  data: {
    availableDates: formatAPIDateArray(availableDates, formatAPIDateOnly),
    count: availableDates.length,
  },
};

console.log('Available Dates Response:');
console.log(JSON.stringify(datesResponse, null, 2));
console.log('\n');

// Example 4: Handling edge cases
console.log('--- Example 4: Edge Cases ---\n');
const edgeCases = {
  validDate: formatAPIDate(new Date('2026-01-15T10:30:00Z')),
  nullDate: formatAPIDate(null),
  undefinedDate: formatAPIDate(undefined),
  invalidDateString: formatAPIDate('invalid-date'),
  invalidDateObject: formatAPIDate(new Date('invalid')),
};

console.log('Edge Cases Response:');
console.log(JSON.stringify(edgeCases, null, 2));
console.log('\n');

// Example 5: Date validation
console.log('--- Example 5: Date Validation ---\n');
const validationResults = {
  validDateObject: isValidAPIDate(new Date('2026-01-15')),
  validDateString: isValidAPIDate('2026-01-15T10:30:00Z'),
  nullInput: isValidAPIDate(null),
  undefinedInput: isValidAPIDate(undefined),
  invalidDateString: isValidAPIDate('not-a-date'),
  invalidDateObject: isValidAPIDate(new Date('invalid')),
};

console.log('Validation Results:');
console.log(JSON.stringify(validationResults, null, 2));
console.log('\n');

// Example 6: Mixed data types
console.log('--- Example 6: Mixed Data Types ---\n');
const mixedData = [
  new Date('2026-01-15T10:30:00Z'),
  '2026-01-16T11:00:00Z',
  null,
  undefined,
  new Date('2026-01-17T12:00:00Z'),
];

const mixedResponse = {
  timestamps: formatAPIDateArray(mixedData, formatAPIDate),
};

console.log('Mixed Data Types Response:');
console.log(JSON.stringify(mixedResponse, null, 2));
console.log('\n');

// Example 7: Real-world API response
console.log('--- Example 7: Real-World API Response ---\n');
const apiResponse = {
  success: true,
  data: {
    order: {
      orderId: 'ORD-67890',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      status: 'confirmed',
      totalPaid: 45.99,
      createdAt: formatAPIDate(new Date('2026-01-15T09:00:00Z')),
      updatedAt: formatAPIDate(new Date('2026-01-15T10:30:00Z')),
      deliveryDate: formatAPIDateOnly('2026-01-20'),
      estimatedDelivery: formatAPIDateOnly('2026-01-20'),
      actualDeliveryDate: formatAPIDateOnly(null), // Not yet delivered
    },
    timeline: [
      {
        event: 'order_placed',
        timestamp: formatAPITimestamp(new Date('2026-01-15T09:00:00.000Z')),
        description: 'Order was placed',
      },
      {
        event: 'order_confirmed',
        timestamp: formatAPITimestamp(new Date('2026-01-15T09:05:23.456Z')),
        description: 'Order was confirmed',
      },
      {
        event: 'payment_processed',
        timestamp: formatAPITimestamp(new Date('2026-01-15T09:10:15.789Z')),
        description: 'Payment was successfully processed',
      },
    ],
  },
};

console.log('Complete API Response:');
console.log(JSON.stringify(apiResponse, null, 2));
console.log('\n');

// Example 8: Consistency check
console.log('--- Example 8: Consistency Check ---\n');
const testDate = new Date('2026-01-15T10:30:45.123Z');
console.log('Input Date:', testDate.toISOString());
console.log('formatAPIDate:', formatAPIDate(testDate));
console.log('formatAPITimestamp:', formatAPITimestamp(testDate));
console.log('formatAPIDateOnly:', formatAPIDateOnly(testDate));
console.log('\n');

console.log('=================================');
console.log('DEMONSTRATION COMPLETE');
console.log('=================================\n');
