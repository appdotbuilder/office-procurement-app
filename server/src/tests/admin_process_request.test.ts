import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, itemsTable, requestsTable } from '../db/schema';
import { type AdminProcessInput } from '../schema';
import { adminProcessRequest } from '../handlers/admin_process_request';
import { eq } from 'drizzle-orm';

describe('adminProcessRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let superAdminId: number;
  let managerId: number;
  let staffId: number;
  let requestId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'admin@test.com', name: 'Super Admin', role: 'super_admin' },
        { email: 'manager@test.com', name: 'Manager User', role: 'manager' },
        { email: 'staff@test.com', name: 'Staff User', role: 'staff' }
      ])
      .returning()
      .execute();

    superAdminId = users[0].id;
    managerId = users[1].id;
    staffId = users[2].id;

    // Create test category and item
    const category = await db.insert(categoriesTable)
      .values({ name: 'Test Category', description: 'Test category description' })
      .returning()
      .execute();

    await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        description: 'Test item description',
        category_id: category[0].id,
        unit: 'piece',
        estimated_price: '10.99'
      })
      .execute();

    // Create a manager-approved request for testing
    const request = await db.insert(requestsTable)
      .values({
        staff_id: staffId,
        title: 'Test Request',
        justification: 'Testing admin processing',
        status: 'manager_approved',
        manager_id: managerId,
        manager_notes: 'Approved by manager',
        total_estimated_cost: '100.00'
      })
      .returning()
      .execute();

    requestId = request[0].id;
  });

  it('should start processing an approved request', async () => {
    const input: AdminProcessInput = {
      request_id: requestId,
      admin_id: superAdminId,
      action: 'start_processing',
      notes: 'Starting to process the request'
    };

    const result = await adminProcessRequest(input);

    expect(result.id).toEqual(requestId);
    expect(result.status).toEqual('admin_processing');
    expect(result.admin_id).toEqual(superAdminId);
    expect(result.admin_notes).toEqual('Starting to process the request');
    expect(typeof result.total_estimated_cost).toBe('number');
    expect(result.total_estimated_cost).toEqual(100);
  });

  it('should mark request as purchased with cost and date', async () => {
    // First start processing
    await adminProcessRequest({
      request_id: requestId,
      admin_id: superAdminId,
      action: 'start_processing'
    });

    const purchaseDate = new Date('2024-01-15');
    const input: AdminProcessInput = {
      request_id: requestId,
      admin_id: superAdminId,
      action: 'mark_purchased',
      actual_cost: 95.50,
      purchase_date: purchaseDate,
      notes: 'Items purchased from vendor'
    };

    const result = await adminProcessRequest(input);

    expect(result.status).toEqual('purchased');
    expect(result.actual_cost).toEqual(95.50);
    expect(typeof result.actual_cost).toBe('number');
    expect(result.purchase_date).toEqual(purchaseDate);
    expect(result.admin_notes).toEqual('Items purchased from vendor');
  });

  it('should mark request as received with date', async () => {
    // Progress through the workflow: start processing -> purchased -> received
    await adminProcessRequest({
      request_id: requestId,
      admin_id: superAdminId,
      action: 'start_processing'
    });

    await adminProcessRequest({
      request_id: requestId,
      admin_id: superAdminId,
      action: 'mark_purchased',
      actual_cost: 95.50,
      purchase_date: new Date('2024-01-15')
    });

    const receivedDate = new Date('2024-01-20');
    const input: AdminProcessInput = {
      request_id: requestId,
      admin_id: superAdminId,
      action: 'mark_received',
      received_date: receivedDate,
      notes: 'All items received and verified'
    };

    const result = await adminProcessRequest(input);

    expect(result.status).toEqual('received');
    expect(result.received_date).toEqual(receivedDate);
    expect(result.admin_notes).toEqual('All items received and verified');
  });

  it('should cancel request from any valid state', async () => {
    const input: AdminProcessInput = {
      request_id: requestId,
      admin_id: superAdminId,
      action: 'cancel',
      notes: 'Request cancelled due to budget constraints'
    };

    const result = await adminProcessRequest(input);

    expect(result.status).toEqual('cancelled');
    expect(result.admin_notes).toEqual('Request cancelled due to budget constraints');
  });

  it('should update the request in database', async () => {
    await adminProcessRequest({
      request_id: requestId,
      admin_id: superAdminId,
      action: 'start_processing',
      notes: 'Processing started'
    });

    // Verify in database
    const requests = await db.select()
      .from(requestsTable)
      .where(eq(requestsTable.id, requestId))
      .execute();

    expect(requests).toHaveLength(1);
    expect(requests[0].status).toEqual('admin_processing');
    expect(requests[0].admin_id).toEqual(superAdminId);
    expect(requests[0].admin_notes).toEqual('Processing started');
  });

  it('should throw error if admin user not found', async () => {
    const input: AdminProcessInput = {
      request_id: requestId,
      admin_id: 999999,
      action: 'start_processing'
    };

    await expect(adminProcessRequest(input)).rejects.toThrow(/admin user not found/i);
  });

  it('should throw error if user is not super admin', async () => {
    const input: AdminProcessInput = {
      request_id: requestId,
      admin_id: managerId, // manager, not super_admin
      action: 'start_processing'
    };

    await expect(adminProcessRequest(input)).rejects.toThrow(/only super admin can process requests/i);
  });

  it('should throw error if request not found', async () => {
    const input: AdminProcessInput = {
      request_id: 999999,
      admin_id: superAdminId,
      action: 'start_processing'
    };

    await expect(adminProcessRequest(input)).rejects.toThrow(/request not found/i);
  });

  it('should throw error for invalid status transitions', async () => {
    // Try to mark as purchased without starting processing first
    const input: AdminProcessInput = {
      request_id: requestId,
      admin_id: superAdminId,
      action: 'mark_purchased'
    };

    await expect(adminProcessRequest(input)).rejects.toThrow(/cannot perform action 'mark_purchased' on request with status 'manager_approved'/i);
  });

  it('should throw error when trying to process completed request', async () => {
    // Complete the request workflow first
    await adminProcessRequest({
      request_id: requestId,
      admin_id: superAdminId,
      action: 'start_processing'
    });

    await adminProcessRequest({
      request_id: requestId,
      admin_id: superAdminId,
      action: 'mark_purchased',
      actual_cost: 95.50
    });

    await adminProcessRequest({
      request_id: requestId,
      admin_id: superAdminId,
      action: 'mark_received'
    });

    // Now try to process the completed request
    const input: AdminProcessInput = {
      request_id: requestId,
      admin_id: superAdminId,
      action: 'start_processing'
    };

    await expect(adminProcessRequest(input)).rejects.toThrow(/cannot perform action 'start_processing' on request with status 'received'/i);
  });

  it('should handle workflow transitions correctly', async () => {
    // Test the complete workflow
    
    // 1. Start processing
    let result = await adminProcessRequest({
      request_id: requestId,
      admin_id: superAdminId,
      action: 'start_processing',
      notes: 'Starting processing'
    });
    expect(result.status).toEqual('admin_processing');

    // 2. Mark as purchased
    result = await adminProcessRequest({
      request_id: requestId,
      admin_id: superAdminId,
      action: 'mark_purchased',
      actual_cost: 89.99,
      purchase_date: new Date('2024-01-15'),
      notes: 'Items purchased'
    });
    expect(result.status).toEqual('purchased');
    expect(result.actual_cost).toEqual(89.99);

    // 3. Mark as received
    result = await adminProcessRequest({
      request_id: requestId,
      admin_id: superAdminId,
      action: 'mark_received',
      received_date: new Date('2024-01-20'),
      notes: 'Items received and inspected'
    });
    expect(result.status).toEqual('received');
    expect(result.received_date).toEqual(new Date('2024-01-20'));
  });

  it('should handle processing from different starting states', async () => {
    // Create a request in admin_processing state
    const processingRequest = await db.insert(requestsTable)
      .values({
        staff_id: staffId,
        title: 'Processing Request',
        status: 'admin_processing',
        manager_id: managerId,
        admin_id: superAdminId
      })
      .returning()
      .execute();

    // Should be able to mark as purchased from admin_processing
    const result = await adminProcessRequest({
      request_id: processingRequest[0].id,
      admin_id: superAdminId,
      action: 'mark_purchased',
      actual_cost: 150.00
    });

    expect(result.status).toEqual('purchased');
    expect(result.actual_cost).toEqual(150);
  });
});