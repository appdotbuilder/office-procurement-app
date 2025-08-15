import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, itemsTable, requestsTable, requestItemsTable } from '../db/schema';
import { type RequestFilter } from '../schema';
import { getRequests } from '../handlers/get_requests';
import { eq } from 'drizzle-orm';

describe('getRequests', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let testUsers: any;
  let testCategory: any;
  let testItem: any;
  let testRequest: any;

  const setupTestData = async () => {
    // Create test users
    const usersResult = await db.insert(usersTable)
      .values([
        {
          email: 'staff@test.com',
          name: 'Staff User',
          role: 'staff'
        },
        {
          email: 'manager@test.com', 
          name: 'Manager User',
          role: 'manager'
        },
        {
          email: 'admin@test.com',
          name: 'Admin User', 
          role: 'super_admin'
        }
      ])
      .returning()
      .execute();

    testUsers = {
      staff: usersResult[0],
      manager: usersResult[1],
      admin: usersResult[2]
    };

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Office Supplies',
        description: 'General office supplies'
      })
      .returning()
      .execute();

    testCategory = categoryResult[0];

    // Create test item
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Laptop',
        description: 'Business laptop',
        category_id: testCategory.id,
        unit: 'piece',
        estimated_price: '1500.00'
      })
      .returning()
      .execute();

    testItem = itemResult[0];

    // Create test request
    const requestResult = await db.insert(requestsTable)
      .values({
        staff_id: testUsers.staff.id,
        title: 'Need new laptop',
        justification: 'Current laptop is broken',
        status: 'pending',
        total_estimated_cost: '1500.00'
      })
      .returning()
      .execute();

    testRequest = requestResult[0];

    // Create test request item
    await db.insert(requestItemsTable)
      .values({
        request_id: testRequest.id,
        item_id: testItem.id,
        quantity: 1,
        estimated_unit_cost: '1500.00',
        notes: 'Urgent replacement needed'
      })
      .execute();
  };

  it('should return all requests without filter', async () => {
    await setupTestData();

    const results = await getRequests();

    expect(results).toHaveLength(1);
    expect(results[0].id).toEqual(testRequest.id);
    expect(results[0].title).toEqual('Need new laptop');
    expect(results[0].status).toEqual('pending');
    expect(results[0].staff_id).toEqual(testUsers.staff.id);
    expect(results[0].total_estimated_cost).toEqual(1500);
    expect(typeof results[0].total_estimated_cost).toBe('number');
    expect(results[0].created_at).toBeInstanceOf(Date);
  });

  it('should return requests with full staff details', async () => {
    await setupTestData();

    const results = await getRequests();

    expect(results[0].staff).toBeDefined();
    expect(results[0].staff.id).toEqual(testUsers.staff.id);
    expect(results[0].staff.email).toEqual('staff@test.com');
    expect(results[0].staff.name).toEqual('Staff User');
    expect(results[0].staff.role).toEqual('staff');
    expect(results[0].staff.is_active).toBe(true);
  });

  it('should return requests with item details including category', async () => {
    await setupTestData();

    const results = await getRequests();

    expect(results[0].items).toHaveLength(1);
    const requestItem = results[0].items[0];
    
    expect(requestItem.request_id).toEqual(testRequest.id);
    expect(requestItem.item_id).toEqual(testItem.id);
    expect(requestItem.quantity).toEqual(1);
    expect(requestItem.estimated_unit_cost).toEqual(1500);
    expect(typeof requestItem.estimated_unit_cost).toBe('number');
    expect(requestItem.notes).toEqual('Urgent replacement needed');

    // Check item details
    expect(requestItem.item.name).toEqual('Laptop');
    expect(requestItem.item.description).toEqual('Business laptop');
    expect(requestItem.item.unit).toEqual('piece');
    expect(requestItem.item.estimated_price).toEqual(1500);
    expect(typeof requestItem.item.estimated_price).toBe('number');

    // Check category details
    expect(requestItem.item.category.name).toEqual('Office Supplies');
    expect(requestItem.item.category.description).toEqual('General office supplies');
  });

  it('should filter requests by status', async () => {
    await setupTestData();

    // Create another request with different status
    await db.insert(requestsTable)
      .values({
        staff_id: testUsers.staff.id,
        title: 'Approved request',
        status: 'manager_approved',
        manager_id: testUsers.manager.id
      })
      .execute();

    const filter: RequestFilter = { status: 'pending' };
    const results = await getRequests(filter);

    expect(results).toHaveLength(1);
    expect(results[0].status).toEqual('pending');
    expect(results[0].title).toEqual('Need new laptop');
  });

  it('should filter requests by staff_id', async () => {
    await setupTestData();

    // Create another staff user and request
    const anotherStaffResult = await db.insert(usersTable)
      .values({
        email: 'staff2@test.com',
        name: 'Staff User 2',
        role: 'staff'
      })
      .returning()
      .execute();

    await db.insert(requestsTable)
      .values({
        staff_id: anotherStaffResult[0].id,
        title: 'Another request',
        status: 'pending'
      })
      .execute();

    const filter: RequestFilter = { staff_id: testUsers.staff.id };
    const results = await getRequests(filter);

    expect(results).toHaveLength(1);
    expect(results[0].staff_id).toEqual(testUsers.staff.id);
    expect(results[0].title).toEqual('Need new laptop');
  });

  it('should filter requests by manager_id', async () => {
    await setupTestData();

    // Update request to have a manager
    await db.update(requestsTable)
      .set({ 
        manager_id: testUsers.manager.id,
        status: 'manager_approved'
      })
      .where(eq(requestsTable.id, testRequest.id))
      .execute();

    const filter: RequestFilter = { manager_id: testUsers.manager.id };
    const results = await getRequests(filter);

    expect(results).toHaveLength(1);
    expect(results[0].manager_id).toEqual(testUsers.manager.id);
  });

  it('should filter requests by date range', async () => {
    await setupTestData();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Filter for today's requests
    const filter: RequestFilter = { 
      date_from: yesterday,
      date_to: tomorrow
    };
    const results = await getRequests(filter);

    expect(results).toHaveLength(1);
    expect(results[0].created_at >= yesterday).toBe(true);
    expect(results[0].created_at <= tomorrow).toBe(true);
  });

  it('should handle requests with manager and admin details', async () => {
    await setupTestData();

    // Update request to have manager and admin
    await db.update(requestsTable)
      .set({
        manager_id: testUsers.manager.id,
        manager_notes: 'Approved by manager',
        admin_id: testUsers.admin.id,
        admin_notes: 'Processing purchase',
        status: 'admin_processing',
        actual_cost: '1600.00'
      })
      .where(eq(requestsTable.id, testRequest.id))
      .execute();

    const results = await getRequests();

    expect(results[0].manager).toBeDefined();
    expect(results[0].manager!.id).toEqual(testUsers.manager.id);
    expect(results[0].manager!.name).toEqual('Manager User');
    expect(results[0].manager!.role).toEqual('manager');

    expect(results[0].admin).toBeDefined();
    expect(results[0].admin!.id).toEqual(testUsers.admin.id);
    expect(results[0].admin!.name).toEqual('Admin User');
    expect(results[0].admin!.role).toEqual('super_admin');

    expect(results[0].manager_notes).toEqual('Approved by manager');
    expect(results[0].admin_notes).toEqual('Processing purchase');
    expect(results[0].actual_cost).toEqual(1600);
    expect(typeof results[0].actual_cost).toBe('number');
  });

  it('should handle requests without manager or admin', async () => {
    await setupTestData();

    const results = await getRequests();

    expect(results[0].manager).toBeNull();
    expect(results[0].admin).toBeNull();
    expect(results[0].manager_id).toBeNull();
    expect(results[0].admin_id).toBeNull();
  });

  it('should handle multiple filters combined', async () => {
    await setupTestData();

    // Create additional test data
    await db.insert(requestsTable)
      .values([
        {
          staff_id: testUsers.staff.id,
          title: 'Different status request',
          status: 'manager_approved'
        },
        {
          staff_id: testUsers.staff.id,
          title: 'Different manager request',
          status: 'pending',
          manager_id: testUsers.admin.id // Different manager
        }
      ])
      .execute();

    const filter: RequestFilter = {
      status: 'pending',
      staff_id: testUsers.staff.id
    };
    const results = await getRequests(filter);

    expect(results).toHaveLength(2);
    results.forEach(request => {
      expect(request.status).toEqual('pending');
      expect(request.staff_id).toEqual(testUsers.staff.id);
    });
  });

  it('should return empty array when no requests match filter', async () => {
    await setupTestData();

    const filter: RequestFilter = { status: 'cancelled' };
    const results = await getRequests(filter);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle requests with multiple items', async () => {
    await setupTestData();

    // Create another item
    const itemResult2 = await db.insert(itemsTable)
      .values({
        name: 'Mouse',
        description: 'Wireless mouse',
        category_id: testCategory.id,
        unit: 'piece',
        estimated_price: '50.00'
      })
      .returning()
      .execute();

    // Add second item to the request
    await db.insert(requestItemsTable)
      .values({
        request_id: testRequest.id,
        item_id: itemResult2[0].id,
        quantity: 2,
        estimated_unit_cost: '50.00',
        notes: 'Need two mice'
      })
      .execute();

    const results = await getRequests();

    expect(results[0].items).toHaveLength(2);
    
    const laptopItem = results[0].items.find(item => item.item.name === 'Laptop');
    const mouseItem = results[0].items.find(item => item.item.name === 'Mouse');

    expect(laptopItem).toBeDefined();
    expect(laptopItem!.quantity).toEqual(1);
    expect(mouseItem).toBeDefined();
    expect(mouseItem!.quantity).toEqual(2);
  });

  it('should handle nullable numeric fields correctly', async () => {
    await setupTestData();

    // Create request with null numeric fields
    const requestResult = await db.insert(requestsTable)
      .values({
        staff_id: testUsers.staff.id,
        title: 'Request without costs',
        status: 'pending'
        // total_estimated_cost and actual_cost are null
      })
      .returning()
      .execute();

    // Create request item with null costs
    await db.insert(requestItemsTable)
      .values({
        request_id: requestResult[0].id,
        item_id: testItem.id,
        quantity: 1
        // estimated_unit_cost and actual_unit_cost are null
      })
      .execute();

    const results = await getRequests();
    const nullCostRequest = results.find(r => r.title === 'Request without costs');

    expect(nullCostRequest).toBeDefined();
    expect(nullCostRequest!.total_estimated_cost).toBeNull();
    expect(nullCostRequest!.actual_cost).toBeNull();
    
    const nullCostItem = nullCostRequest!.items[0];
    expect(nullCostItem.estimated_unit_cost).toBeNull();
    expect(nullCostItem.actual_unit_cost).toBeNull();
  });
});