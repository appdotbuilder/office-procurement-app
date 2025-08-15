import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, itemsTable, requestsTable, requestItemsTable } from '../db/schema';
import { getRequestById } from '../handlers/get_request_by_id';
import type { RequestWithDetails } from '../schema';

describe('getRequestById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let staffUser: any;
  let managerUser: any;
  let adminUser: any;
  let category: any;
  let item1: any;
  let item2: any;
  let request: any;

  beforeEach(async () => {
    // Create test users
    const staffResult = await db.insert(usersTable)
      .values({
        email: 'staff@test.com',
        name: 'Test Staff',
        role: 'staff'
      })
      .returning()
      .execute();
    staffUser = staffResult[0];

    const managerResult = await db.insert(usersTable)
      .values({
        email: 'manager@test.com',
        name: 'Test Manager',
        role: 'manager'
      })
      .returning()
      .execute();
    managerUser = managerResult[0];

    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        name: 'Test Admin',
        role: 'super_admin'
      })
      .returning()
      .execute();
    adminUser = adminResult[0];

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    category = categoryResult[0];

    // Create test items
    const item1Result = await db.insert(itemsTable)
      .values({
        name: 'Test Item 1',
        description: 'First test item',
        category_id: category.id,
        unit: 'pieces',
        estimated_price: '10.50'
      })
      .returning()
      .execute();
    item1 = item1Result[0];

    const item2Result = await db.insert(itemsTable)
      .values({
        name: 'Test Item 2',
        description: 'Second test item',
        category_id: category.id,
        unit: 'boxes',
        estimated_price: '25.99'
      })
      .returning()
      .execute();
    item2 = item2Result[0];
  });

  it('should return null for non-existent request', async () => {
    const result = await getRequestById(999);
    expect(result).toBeNull();
  });

  it('should fetch request with basic details and no manager/admin', async () => {
    // Create basic request
    const requestResult = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Test Request',
        justification: 'Testing purposes',
        status: 'pending'
      })
      .returning()
      .execute();
    request = requestResult[0];

    // Add request items
    await db.insert(requestItemsTable)
      .values([
        {
          request_id: request.id,
          item_id: item1.id,
          quantity: 2,
          estimated_unit_cost: '10.50',
          notes: 'Item 1 notes'
        },
        {
          request_id: request.id,
          item_id: item2.id,
          quantity: 1,
          estimated_unit_cost: '25.99'
        }
      ])
      .execute();

    const result = await getRequestById(request.id);

    expect(result).toBeDefined();
    expect(result!.id).toBe(request.id);
    expect(result!.title).toBe('Test Request');
    expect(result!.justification).toBe('Testing purposes');
    expect(result!.status).toBe('pending');
    expect(result!.staff_id).toBe(staffUser.id);
    expect(result!.manager_id).toBeNull();
    expect(result!.admin_id).toBeNull();
    expect(result!.total_estimated_cost).toBeNull();
    expect(result!.actual_cost).toBeNull();

    // Verify staff user details
    expect(result!.staff.id).toBe(staffUser.id);
    expect(result!.staff.name).toBe('Test Staff');
    expect(result!.staff.email).toBe('staff@test.com');
    expect(result!.staff.role).toBe('staff');

    // Verify manager and admin are null
    expect(result!.manager).toBeNull();
    expect(result!.admin).toBeNull();

    // Verify request items
    expect(result!.items).toHaveLength(2);
    
    const firstItem = result!.items.find(item => item.item_id === item1.id);
    expect(firstItem).toBeDefined();
    expect(firstItem!.quantity).toBe(2);
    expect(firstItem!.estimated_unit_cost).toBe(10.50); // Numeric conversion
    expect(firstItem!.actual_unit_cost).toBeNull();
    expect(firstItem!.notes).toBe('Item 1 notes');
    expect(firstItem!.item.name).toBe('Test Item 1');
    expect(firstItem!.item.estimated_price).toBe(10.50); // Numeric conversion
    expect(firstItem!.item.category.name).toBe('Test Category');

    const secondItem = result!.items.find(item => item.item_id === item2.id);
    expect(secondItem).toBeDefined();
    expect(secondItem!.quantity).toBe(1);
    expect(secondItem!.estimated_unit_cost).toBe(25.99); // Numeric conversion
    expect(secondItem!.notes).toBeNull();
    expect(secondItem!.item.name).toBe('Test Item 2');
  });

  it('should fetch request with manager assigned', async () => {
    // Create request with manager
    const requestResult = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Manager Approved Request',
        justification: 'Need approval',
        status: 'manager_approved',
        manager_id: managerUser.id,
        manager_notes: 'Approved by manager',
        total_estimated_cost: '36.49'
      })
      .returning()
      .execute();
    request = requestResult[0];

    // Add one request item
    await db.insert(requestItemsTable)
      .values({
        request_id: request.id,
        item_id: item1.id,
        quantity: 3,
        estimated_unit_cost: '12.16'
      })
      .execute();

    const result = await getRequestById(request.id);

    expect(result).toBeDefined();
    expect(result!.status).toBe('manager_approved');
    expect(result!.manager_id).toBe(managerUser.id);
    expect(result!.manager_notes).toBe('Approved by manager');
    expect(result!.total_estimated_cost).toBe(36.49); // Numeric conversion
    
    // Verify manager details
    expect(result!.manager).toBeDefined();
    expect(result!.manager!.id).toBe(managerUser.id);
    expect(result!.manager!.name).toBe('Test Manager');
    expect(result!.manager!.role).toBe('manager');
    
    // Admin should still be null
    expect(result!.admin).toBeNull();
  });

  it('should fetch request with admin assigned', async () => {
    // Create request with both manager and admin
    const requestResult = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Admin Processing Request',
        justification: 'In process',
        status: 'admin_processing',
        manager_id: managerUser.id,
        manager_notes: 'Approved',
        admin_id: adminUser.id,
        admin_notes: 'Processing purchase',
        total_estimated_cost: '50.00',
        actual_cost: '48.75',
        purchase_date: new Date('2024-01-15')
      })
      .returning()
      .execute();
    request = requestResult[0];

    // Add request items with actual costs
    await db.insert(requestItemsTable)
      .values({
        request_id: request.id,
        item_id: item1.id,
        quantity: 2,
        estimated_unit_cost: '25.00',
        actual_unit_cost: '24.37'
      })
      .execute();

    const result = await getRequestById(request.id);

    expect(result).toBeDefined();
    expect(result!.status).toBe('admin_processing');
    expect(result!.admin_id).toBe(adminUser.id);
    expect(result!.admin_notes).toBe('Processing purchase');
    expect(result!.actual_cost).toBe(48.75); // Numeric conversion
    expect(result!.purchase_date).toEqual(new Date('2024-01-15'));

    // Verify admin details
    expect(result!.admin).toBeDefined();
    expect(result!.admin!.id).toBe(adminUser.id);
    expect(result!.admin!.name).toBe('Test Admin');
    expect(result!.admin!.role).toBe('super_admin');

    // Verify both manager and admin are present
    expect(result!.manager).toBeDefined();
    expect(result!.manager!.id).toBe(managerUser.id);

    // Verify request item actual costs
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].actual_unit_cost).toBe(24.37); // Numeric conversion
  });

  it('should handle request with received status and dates', async () => {
    const purchaseDate = new Date('2024-01-15');
    const receivedDate = new Date('2024-01-20');

    // Create completed request
    const requestResult = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Completed Request',
        status: 'received',
        manager_id: managerUser.id,
        admin_id: adminUser.id,
        total_estimated_cost: '100.00',
        actual_cost: '95.50',
        purchase_date: purchaseDate,
        received_date: receivedDate
      })
      .returning()
      .execute();
    request = requestResult[0];

    const result = await getRequestById(request.id);

    expect(result).toBeDefined();
    expect(result!.status).toBe('received');
    expect(result!.purchase_date).toEqual(purchaseDate);
    expect(result!.received_date).toEqual(receivedDate);
    expect(result!.total_estimated_cost).toBe(100.00);
    expect(result!.actual_cost).toBe(95.50);
  });

  it('should handle request with no items', async () => {
    // Create request without any items
    const requestResult = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Empty Request',
        status: 'pending'
      })
      .returning()
      .execute();
    request = requestResult[0];

    const result = await getRequestById(request.id);

    expect(result).toBeDefined();
    expect(result!.items).toHaveLength(0);
  });

  it('should handle items with null estimated prices', async () => {
    // Create item with null estimated price
    const nullPriceItemResult = await db.insert(itemsTable)
      .values({
        name: 'No Price Item',
        category_id: category.id,
        unit: 'pieces',
        estimated_price: null
      })
      .returning()
      .execute();
    const nullPriceItem = nullPriceItemResult[0];

    const requestResult = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Null Price Test',
        status: 'pending'
      })
      .returning()
      .execute();
    request = requestResult[0];

    await db.insert(requestItemsTable)
      .values({
        request_id: request.id,
        item_id: nullPriceItem.id,
        quantity: 1,
        estimated_unit_cost: null,
        actual_unit_cost: null
      })
      .execute();

    const result = await getRequestById(request.id);

    expect(result).toBeDefined();
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].estimated_unit_cost).toBeNull();
    expect(result!.items[0].actual_unit_cost).toBeNull();
    expect(result!.items[0].item.estimated_price).toBeNull();
  });

  it('should verify proper type conversions for all numeric fields', async () => {
    // Create request with all numeric fields set
    const requestResult = await db.insert(requestsTable)
      .values({
        staff_id: staffUser.id,
        title: 'Numeric Test',
        status: 'received',
        total_estimated_cost: '123.45',
        actual_cost: '678.90'
      })
      .returning()
      .execute();
    request = requestResult[0];

    await db.insert(requestItemsTable)
      .values({
        request_id: request.id,
        item_id: item1.id,
        quantity: 5,
        estimated_unit_cost: '24.69',
        actual_unit_cost: '135.78'
      })
      .execute();

    const result = await getRequestById(request.id);

    // Verify all numeric fields are properly converted to numbers
    expect(typeof result!.total_estimated_cost).toBe('number');
    expect(result!.total_estimated_cost).toBe(123.45);
    expect(typeof result!.actual_cost).toBe('number');
    expect(result!.actual_cost).toBe(678.90);

    expect(typeof result!.items[0].estimated_unit_cost).toBe('number');
    expect(result!.items[0].estimated_unit_cost).toBe(24.69);
    expect(typeof result!.items[0].actual_unit_cost).toBe('number');
    expect(result!.items[0].actual_unit_cost).toBe(135.78);

    expect(typeof result!.items[0].item.estimated_price).toBe('number');
    expect(result!.items[0].item.estimated_price).toBe(10.50);
  });
});