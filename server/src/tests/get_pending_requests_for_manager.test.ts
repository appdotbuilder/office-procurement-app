import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, itemsTable, requestsTable, requestItemsTable } from '../db/schema';
import { getPendingRequestsForManager } from '../handlers/get_pending_requests_for_manager';
import { eq } from 'drizzle-orm';

describe('getPendingRequestsForManager', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no pending requests exist', async () => {
    const result = await getPendingRequestsForManager();
    expect(result).toEqual([]);
  });

  it('should return pending requests with staff details', async () => {
    // Create test users
    const staffUsers = await db.insert(usersTable)
      .values([
        { email: 'staff1@test.com', name: 'Staff User 1', role: 'staff' },
        { email: 'staff2@test.com', name: 'Staff User 2', role: 'staff' }
      ])
      .returning()
      .execute();

    // Create test category
    const categories = await db.insert(categoriesTable)
      .values({ name: 'Office Supplies', description: 'General office supplies' })
      .returning()
      .execute();

    // Create test items
    const items = await db.insert(itemsTable)
      .values([
        {
          name: 'Laptop',
          description: 'Business laptop',
          category_id: categories[0].id,
          unit: 'piece',
          estimated_price: '1000.00'
        },
        {
          name: 'Office Chair',
          description: 'Ergonomic office chair',
          category_id: categories[0].id,
          unit: 'piece',
          estimated_price: '250.50'
        }
      ])
      .returning()
      .execute();

    // Create test requests with different statuses
    const requests = await db.insert(requestsTable)
      .values([
        {
          staff_id: staffUsers[0].id,
          title: 'Pending Request 1',
          justification: 'Need for work',
          status: 'pending',
          total_estimated_cost: '1500.75'
        },
        {
          staff_id: staffUsers[1].id,
          title: 'Approved Request',
          justification: 'Another request',
          status: 'manager_approved',
          total_estimated_cost: '500.00'
        },
        {
          staff_id: staffUsers[0].id,
          title: 'Pending Request 2',
          justification: 'Urgent need',
          status: 'pending',
          total_estimated_cost: '250.50'
        }
      ])
      .returning()
      .execute();

    // Add request items
    await db.insert(requestItemsTable)
      .values([
        {
          request_id: requests[0].id,
          item_id: items[0].id,
          quantity: 1,
          estimated_unit_cost: '1000.00',
          notes: 'High priority'
        },
        {
          request_id: requests[0].id,
          item_id: items[1].id,
          quantity: 2,
          estimated_unit_cost: '250.50',
          notes: 'For team'
        },
        {
          request_id: requests[2].id,
          item_id: items[1].id,
          quantity: 1,
          estimated_unit_cost: '250.50'
        }
      ])
      .execute();

    const result = await getPendingRequestsForManager();

    // Should return only pending requests (2 out of 3)
    expect(result).toHaveLength(2);

    // Check first request details
    const firstRequest = result.find(r => r.title === 'Pending Request 1');
    expect(firstRequest).toBeDefined();
    expect(firstRequest!.status).toEqual('pending');
    expect(firstRequest!.total_estimated_cost).toEqual(1500.75);
    expect(typeof firstRequest!.total_estimated_cost).toBe('number');
    
    // Check staff details
    expect(firstRequest!.staff.name).toEqual('Staff User 1');
    expect(firstRequest!.staff.email).toEqual('staff1@test.com');
    expect(firstRequest!.staff.role).toEqual('staff');

    // Check manager and admin are null for pending requests
    expect(firstRequest!.manager).toBeNull();
    expect(firstRequest!.admin).toBeNull();

    // Check request items
    expect(firstRequest!.items).toHaveLength(2);
    
    const laptopItem = firstRequest!.items.find(item => item.item.name === 'Laptop');
    expect(laptopItem).toBeDefined();
    expect(laptopItem!.quantity).toEqual(1);
    expect(laptopItem!.estimated_unit_cost).toEqual(1000.00);
    expect(typeof laptopItem!.estimated_unit_cost).toBe('number');
    expect(laptopItem!.notes).toEqual('High priority');
    expect(laptopItem!.item.estimated_price).toEqual(1000.00);
    expect(typeof laptopItem!.item.estimated_price).toBe('number');
    expect(laptopItem!.item.category.name).toEqual('Office Supplies');

    // Check second request
    const secondRequest = result.find(r => r.title === 'Pending Request 2');
    expect(secondRequest).toBeDefined();
    expect(secondRequest!.items).toHaveLength(1);
    expect(secondRequest!.staff.name).toEqual('Staff User 1');
  });

  it('should handle requests with no items', async () => {
    // Create test user
    const staffUsers = await db.insert(usersTable)
      .values({ email: 'staff@test.com', name: 'Staff User', role: 'staff' })
      .returning()
      .execute();

    // Create request without items
    await db.insert(requestsTable)
      .values({
        staff_id: staffUsers[0].id,
        title: 'Request Without Items',
        justification: 'Test request',
        status: 'pending'
      })
      .execute();

    const result = await getPendingRequestsForManager();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Request Without Items');
    expect(result[0].items).toEqual([]);
    expect(result[0].staff.name).toEqual('Staff User');
  });

  it('should handle numeric field conversions correctly', async () => {
    // Create test data
    const staffUsers = await db.insert(usersTable)
      .values({ email: 'staff@test.com', name: 'Staff User', role: 'staff' })
      .returning()
      .execute();

    const categories = await db.insert(categoriesTable)
      .values({ name: 'Electronics' })
      .returning()
      .execute();

    const items = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        category_id: categories[0].id,
        unit: 'piece',
        estimated_price: '123.45'
      })
      .returning()
      .execute();

    const requests = await db.insert(requestsTable)
      .values({
        staff_id: staffUsers[0].id,
        title: 'Numeric Test Request',
        status: 'pending',
        total_estimated_cost: '987.65'
      })
      .returning()
      .execute();

    await db.insert(requestItemsTable)
      .values({
        request_id: requests[0].id,
        item_id: items[0].id,
        quantity: 3,
        estimated_unit_cost: '123.45'
      })
      .execute();

    const result = await getPendingRequestsForManager();

    expect(result).toHaveLength(1);
    
    // Check request numeric fields
    expect(result[0].total_estimated_cost).toEqual(987.65);
    expect(typeof result[0].total_estimated_cost).toBe('number');
    expect(result[0].actual_cost).toBeNull();

    // Check item numeric fields
    expect(result[0].items[0].estimated_unit_cost).toEqual(123.45);
    expect(typeof result[0].items[0].estimated_unit_cost).toBe('number');
    expect(result[0].items[0].actual_unit_cost).toBeNull();
    expect(result[0].items[0].item.estimated_price).toEqual(123.45);
    expect(typeof result[0].items[0].item.estimated_price).toBe('number');
  });

  it('should order results by created_at descending', async () => {
    // Create test user
    const staffUsers = await db.insert(usersTable)
      .values({ email: 'staff@test.com', name: 'Staff User', role: 'staff' })
      .returning()
      .execute();

    // Create requests with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Insert in random order
    await db.insert(requestsTable)
      .values([
        {
          staff_id: staffUsers[0].id,
          title: 'Oldest Request',
          status: 'pending',
          created_at: twoHoursAgo
        },
        {
          staff_id: staffUsers[0].id,
          title: 'Newest Request',
          status: 'pending',
          created_at: now
        },
        {
          staff_id: staffUsers[0].id,
          title: 'Middle Request',
          status: 'pending',
          created_at: oneHourAgo
        }
      ])
      .execute();

    const result = await getPendingRequestsForManager();

    expect(result).toHaveLength(3);
    // Should be ordered by created_at descending (newest first)
    expect(result[0].title).toEqual('Newest Request');
    expect(result[1].title).toEqual('Middle Request');
    expect(result[2].title).toEqual('Oldest Request');
  });

  it('should only return requests with pending status', async () => {
    // Create test user
    const staffUsers = await db.insert(usersTable)
      .values({ email: 'staff@test.com', name: 'Staff User', role: 'staff' })
      .returning()
      .execute();

    // Create requests with various statuses
    await db.insert(requestsTable)
      .values([
        { staff_id: staffUsers[0].id, title: 'Pending Request', status: 'pending' },
        { staff_id: staffUsers[0].id, title: 'Approved Request', status: 'manager_approved' },
        { staff_id: staffUsers[0].id, title: 'Rejected Request', status: 'manager_rejected' },
        { staff_id: staffUsers[0].id, title: 'Processing Request', status: 'admin_processing' },
        { staff_id: staffUsers[0].id, title: 'Another Pending Request', status: 'pending' }
      ])
      .execute();

    const result = await getPendingRequestsForManager();

    expect(result).toHaveLength(2);
    expect(result.every(r => r.status === 'pending')).toBe(true);
    
    const titles = result.map(r => r.title);
    expect(titles).toContain('Pending Request');
    expect(titles).toContain('Another Pending Request');
  });
});