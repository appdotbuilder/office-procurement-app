import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, itemsTable, requestsTable, requestItemsTable } from '../db/schema';
import { getStaffRequests } from '../handlers/get_staff_requests';
import { type RequestWithDetails } from '../schema';

describe('getStaffRequests', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let staffUser: any;
  let managerUser: any;
  let adminUser: any;
  let category: any;
  let item1: any;
  let item2: any;

  beforeEach(async () => {
    // Create test users
    const staffResults = await db.insert(usersTable)
      .values({
        email: 'staff@test.com',
        name: 'Test Staff',
        role: 'staff'
      })
      .returning()
      .execute();
    staffUser = staffResults[0];

    const managerResults = await db.insert(usersTable)
      .values({
        email: 'manager@test.com',
        name: 'Test Manager',
        role: 'manager'
      })
      .returning()
      .execute();
    managerUser = managerResults[0];

    const adminResults = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'super_admin'
      })
      .returning()
      .execute();
    adminUser = adminResults[0];

    // Create test category
    const categoryResults = await db.insert(categoriesTable)
      .values({
        name: 'Office Supplies',
        description: 'General office supplies'
      })
      .returning()
      .execute();
    category = categoryResults[0];

    // Create test items
    const item1Results = await db.insert(itemsTable)
      .values({
        name: 'Laptop',
        description: 'Dell laptop',
        category_id: category.id,
        unit: 'piece',
        estimated_price: '1500.00'
      })
      .returning()
      .execute();
    item1 = item1Results[0];

    const item2Results = await db.insert(itemsTable)
      .values({
        name: 'Mouse',
        description: 'Wireless mouse',
        category_id: category.id,
        unit: 'piece',
        estimated_price: '25.99'
      })
      .returning()
      .execute();
    item2 = item2Results[0];
  });

  it('should return empty array when staff has no requests', async () => {
    const result = await getStaffRequests(staffUser.id);
    
    expect(result).toEqual([]);
  });

  it('should return staff requests with basic details', async () => {
    // Create a simple request
    const requestResults = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Office Equipment Request',
        justification: 'Need new equipment for work',
        status: 'pending'
      })
      .returning()
      .execute();
    const request = requestResults[0];

    // Add request item
    await db.insert(requestItemsTable)
      .values({
        request_id: request.id,
        item_id: item1.id,
        quantity: 1,
        estimated_unit_cost: '1500.00',
        notes: 'Urgent need'
      })
      .execute();

    const result = await getStaffRequests(staffUser.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(request.id);
    expect(result[0].title).toEqual('Office Equipment Request');
    expect(result[0].status).toEqual('pending');
    expect(result[0].staff.id).toEqual(staffUser.id);
    expect(result[0].staff.name).toEqual('Test Staff');
    expect(result[0].manager).toBeNull();
    expect(result[0].admin).toBeNull();
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].quantity).toEqual(1);
    expect(result[0].items[0].estimated_unit_cost).toEqual(1500);
    expect(typeof result[0].items[0].estimated_unit_cost).toBe('number');
  });

  it('should return requests with manager and admin details when assigned', async () => {
    // Create a request with manager and admin assigned
    const requestResults = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Approved Equipment Request',
        justification: 'Need new equipment',
        status: 'admin_processing',
        manager_id: managerUser.id,
        manager_notes: 'Approved by manager',
        admin_id: adminUser.id,
        admin_notes: 'Processing purchase',
        total_estimated_cost: '1525.99',
        actual_cost: '1450.00'
      })
      .returning()
      .execute();
    const request = requestResults[0];

    // Add multiple request items
    await db.insert(requestItemsTable)
      .values([
        {
          request_id: request.id,
          item_id: item1.id,
          quantity: 1,
          estimated_unit_cost: '1500.00',
          actual_unit_cost: '1425.00'
        },
        {
          request_id: request.id,
          item_id: item2.id,
          quantity: 1,
          estimated_unit_cost: '25.99',
          actual_unit_cost: '25.00'
        }
      ])
      .execute();

    const result = await getStaffRequests(staffUser.id);

    expect(result).toHaveLength(1);
    const requestWithDetails = result[0];
    
    // Test request details
    expect(requestWithDetails.status).toEqual('admin_processing');
    expect(requestWithDetails.manager_notes).toEqual('Approved by manager');
    expect(requestWithDetails.admin_notes).toEqual('Processing purchase');
    expect(requestWithDetails.total_estimated_cost).toEqual(1525.99);
    expect(requestWithDetails.actual_cost).toEqual(1450);
    expect(typeof requestWithDetails.total_estimated_cost).toBe('number');
    expect(typeof requestWithDetails.actual_cost).toBe('number');

    // Test manager details
    expect(requestWithDetails.manager).not.toBeNull();
    expect(requestWithDetails.manager!.id).toEqual(managerUser.id);
    expect(requestWithDetails.manager!.name).toEqual('Test Manager');
    expect(requestWithDetails.manager!.role).toEqual('manager');

    // Test admin details
    expect(requestWithDetails.admin).not.toBeNull();
    expect(requestWithDetails.admin!.id).toEqual(adminUser.id);
    expect(requestWithDetails.admin!.name).toEqual('Test Admin');
    expect(requestWithDetails.admin!.role).toEqual('super_admin');

    // Test items
    expect(requestWithDetails.items).toHaveLength(2);
    
    const laptopItem = requestWithDetails.items.find(item => item.item.name === 'Laptop');
    expect(laptopItem).toBeDefined();
    expect(laptopItem!.quantity).toEqual(1);
    expect(laptopItem!.estimated_unit_cost).toEqual(1500);
    expect(laptopItem!.actual_unit_cost).toEqual(1425);
    expect(laptopItem!.item.category.name).toEqual('Office Supplies');
    expect(laptopItem!.item.unit).toEqual('piece');
    
    const mouseItem = requestWithDetails.items.find(item => item.item.name === 'Mouse');
    expect(mouseItem).toBeDefined();
    expect(mouseItem!.estimated_unit_cost).toEqual(25.99);
    expect(mouseItem!.actual_unit_cost).toEqual(25);
  });

  it('should return multiple requests ordered by creation date (newest first)', async () => {
    // Create older request
    const olderRequestResults = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Older Request',
        status: 'purchased'
      })
      .returning()
      .execute();
    const olderRequest = olderRequestResults[0];

    // Add item to older request
    await db.insert(requestItemsTable)
      .values({
        request_id: olderRequest.id,
        item_id: item1.id,
        quantity: 1
      })
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create newer request
    const newerRequestResults = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Newer Request',
        status: 'pending'
      })
      .returning()
      .execute();
    const newerRequest = newerRequestResults[0];

    // Add item to newer request
    await db.insert(requestItemsTable)
      .values({
        request_id: newerRequest.id,
        item_id: item2.id,
        quantity: 2
      })
      .execute();

    const result = await getStaffRequests(staffUser.id);

    expect(result).toHaveLength(2);
    // Should be ordered by creation date descending (newest first)
    expect(result[0].title).toEqual('Newer Request');
    expect(result[1].title).toEqual('Older Request');
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle requests without items', async () => {
    // Create a request without any items
    const requestResults = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Empty Request',
        status: 'pending'
      })
      .returning()
      .execute();

    const result = await getStaffRequests(staffUser.id);

    expect(result).toHaveLength(1);
    expect(result[0].items).toHaveLength(0);
  });

  it('should handle numeric field conversions correctly', async () => {
    const requestResults = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Numeric Test Request',
        status: 'received',
        total_estimated_cost: '999.99',
        actual_cost: '888.88'
      })
      .returning()
      .execute();
    const request = requestResults[0];

    await db.insert(requestItemsTable)
      .values({
        request_id: request.id,
        item_id: item1.id,
        quantity: 2,
        estimated_unit_cost: '500.50',
        actual_unit_cost: '444.44'
      })
      .execute();

    const result = await getStaffRequests(staffUser.id);

    expect(result).toHaveLength(1);
    const requestWithDetails = result[0];
    
    // Test request numeric conversions
    expect(typeof requestWithDetails.total_estimated_cost).toBe('number');
    expect(requestWithDetails.total_estimated_cost).toEqual(999.99);
    expect(typeof requestWithDetails.actual_cost).toBe('number');
    expect(requestWithDetails.actual_cost).toEqual(888.88);

    // Test request item numeric conversions
    expect(typeof requestWithDetails.items[0].estimated_unit_cost).toBe('number');
    expect(requestWithDetails.items[0].estimated_unit_cost).toEqual(500.5);
    expect(typeof requestWithDetails.items[0].actual_unit_cost).toBe('number');
    expect(requestWithDetails.items[0].actual_unit_cost).toEqual(444.44);

    // Test item estimated price conversion
    expect(typeof requestWithDetails.items[0].item.estimated_price).toBe('number');
    expect(requestWithDetails.items[0].item.estimated_price).toEqual(1500);
  });

  it('should only return requests for the specified staff member', async () => {
    // Create another staff user
    const otherStaffResults = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        name: 'Other Staff',
        role: 'staff'
      })
      .returning()
      .execute();
    const otherStaff = otherStaffResults[0];

    // Create request for original staff
    const staffRequestResults = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Staff Request',
        status: 'pending'
      })
      .returning()
      .execute();

    // Create request for other staff
    await db.insert(requestsTable)
      .values({
        staff_id: otherStaff.id,
        title: 'Other Staff Request',
        status: 'pending'
      })
      .execute();

    // Add items to both requests
    await db.insert(requestItemsTable)
      .values({
        request_id: staffRequestResults[0].id,
        item_id: item1.id,
        quantity: 1
      })
      .execute();

    const result = await getStaffRequests(staffUser.id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Staff Request');
    expect(result[0].staff_id).toEqual(staffUser.id);
  });

  it('should throw error for non-existent staff member', async () => {
    const nonExistentStaffId = 99999;
    
    await expect(getStaffRequests(nonExistentStaffId)).rejects.toThrow(
      /Staff member with id 99999 not found/i
    );
  });
});