import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, itemsTable, requestsTable, requestItemsTable } from '../db/schema';
import { type ManagerActionInput } from '../schema';
import { managerActionOnRequest } from '../handlers/manager_action_on_request';
import { eq } from 'drizzle-orm';

describe('managerActionOnRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testStaffId: number;
  let testManagerId: number;
  let testCategoryId: number;
  let testItemId: number;
  let testRequestId: number;

  // Create test data before each test
  beforeEach(async () => {
    // Create test users
    const staffUser = await db.insert(usersTable)
      .values({
        email: 'staff@test.com',
        name: 'Test Staff',
        role: 'staff'
      })
      .returning()
      .execute();
    testStaffId = staffUser[0].id;

    const managerUser = await db.insert(usersTable)
      .values({
        email: 'manager@test.com',
        name: 'Test Manager',
        role: 'manager'
      })
      .returning()
      .execute();
    testManagerId = managerUser[0].id;

    // Create test category
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category for requests'
      })
      .returning()
      .execute();
    testCategoryId = category[0].id;

    // Create test item
    const item = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        description: 'Test item for requests',
        category_id: testCategoryId,
        unit: 'pcs',
        estimated_price: '10.99'
      })
      .returning()
      .execute();
    testItemId = item[0].id;

    // Create test request
    const request = await db.insert(requestsTable)
      .values({
        staff_id: testStaffId,
        title: 'Test Request',
        justification: 'Need for testing',
        status: 'pending',
        total_estimated_cost: '50.00'
      })
      .returning()
      .execute();
    testRequestId = request[0].id;

    // Create test request item
    await db.insert(requestItemsTable)
      .values({
        request_id: testRequestId,
        item_id: testItemId,
        quantity: 5,
        estimated_unit_cost: '10.00'
      })
      .execute();
  });

  it('should approve a pending request successfully', async () => {
    const input: ManagerActionInput = {
      request_id: testRequestId,
      manager_id: testManagerId,
      action: 'approve',
      notes: 'Approved for testing purposes'
    };

    const result = await managerActionOnRequest(input);

    expect(result.id).toEqual(testRequestId);
    expect(result.status).toEqual('manager_approved');
    expect(result.manager_id).toEqual(testManagerId);
    expect(result.manager_notes).toEqual('Approved for testing purposes');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_estimated_cost).toBe('number');
    expect(result.total_estimated_cost).toEqual(50.00);
  });

  it('should reject a pending request successfully', async () => {
    const input: ManagerActionInput = {
      request_id: testRequestId,
      manager_id: testManagerId,
      action: 'reject',
      notes: 'Not necessary at this time'
    };

    const result = await managerActionOnRequest(input);

    expect(result.id).toEqual(testRequestId);
    expect(result.status).toEqual('manager_rejected');
    expect(result.manager_id).toEqual(testManagerId);
    expect(result.manager_notes).toEqual('Not necessary at this time');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle approval without notes', async () => {
    const input: ManagerActionInput = {
      request_id: testRequestId,
      manager_id: testManagerId,
      action: 'approve'
    };

    const result = await managerActionOnRequest(input);

    expect(result.status).toEqual('manager_approved');
    expect(result.manager_notes).toBeNull();
  });

  it('should update the request record in database', async () => {
    const input: ManagerActionInput = {
      request_id: testRequestId,
      manager_id: testManagerId,
      action: 'approve',
      notes: 'Database update test'
    };

    await managerActionOnRequest(input);

    // Verify the request was updated in the database
    const updatedRequest = await db.select()
      .from(requestsTable)
      .where(eq(requestsTable.id, testRequestId))
      .execute();

    expect(updatedRequest).toHaveLength(1);
    expect(updatedRequest[0].status).toEqual('manager_approved');
    expect(updatedRequest[0].manager_id).toEqual(testManagerId);
    expect(updatedRequest[0].manager_notes).toEqual('Database update test');
    expect(updatedRequest[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when request does not exist', async () => {
    const input: ManagerActionInput = {
      request_id: 99999,
      manager_id: testManagerId,
      action: 'approve'
    };

    await expect(managerActionOnRequest(input)).rejects.toThrow(/Request with ID 99999 not found/i);
  });

  it('should throw error when request is not in pending status', async () => {
    // First approve the request
    await db.update(requestsTable)
      .set({ status: 'manager_approved' })
      .where(eq(requestsTable.id, testRequestId))
      .execute();

    const input: ManagerActionInput = {
      request_id: testRequestId,
      manager_id: testManagerId,
      action: 'reject'
    };

    await expect(managerActionOnRequest(input)).rejects.toThrow(/not in pending status/i);
  });

  it('should throw error when manager does not exist', async () => {
    const input: ManagerActionInput = {
      request_id: testRequestId,
      manager_id: 99999,
      action: 'approve'
    };

    await expect(managerActionOnRequest(input)).rejects.toThrow(/Manager with ID 99999 not found/i);
  });

  it('should throw error when user is not a manager', async () => {
    // Create a staff user to test with
    const nonManager = await db.insert(usersTable)
      .values({
        email: 'notmanager@test.com',
        name: 'Not Manager',
        role: 'staff'
      })
      .returning()
      .execute();

    const input: ManagerActionInput = {
      request_id: testRequestId,
      manager_id: nonManager[0].id,
      action: 'approve'
    };

    await expect(managerActionOnRequest(input)).rejects.toThrow(/Manager with ID .+ not found or not active/i);
  });

  it('should throw error when manager is inactive', async () => {
    // Deactivate the manager
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, testManagerId))
      .execute();

    const input: ManagerActionInput = {
      request_id: testRequestId,
      manager_id: testManagerId,
      action: 'approve'
    };

    await expect(managerActionOnRequest(input)).rejects.toThrow(/Manager with ID .+ not found or not active/i);
  });

  it('should handle numeric field conversions correctly', async () => {
    // Create a request with actual_cost set
    const requestWithCost = await db.insert(requestsTable)
      .values({
        staff_id: testStaffId,
        title: 'Request With Costs',
        status: 'pending',
        total_estimated_cost: '123.45',
        actual_cost: '100.00'
      })
      .returning()
      .execute();

    const input: ManagerActionInput = {
      request_id: requestWithCost[0].id,
      manager_id: testManagerId,
      action: 'approve'
    };

    const result = await managerActionOnRequest(input);

    expect(typeof result.total_estimated_cost).toBe('number');
    expect(typeof result.actual_cost).toBe('number');
    expect(result.total_estimated_cost).toEqual(123.45);
    expect(result.actual_cost).toEqual(100.00);
  });
});