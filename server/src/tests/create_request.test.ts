import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  categoriesTable, 
  itemsTable, 
  requestsTable, 
  requestItemsTable 
} from '../db/schema';
import { type CreateRequestInput } from '../schema';
import { createRequest } from '../handlers/create_request';
import { eq } from 'drizzle-orm';

describe('createRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createTestData = async () => {
    // Create a staff user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'staff@test.com',
        name: 'Test Staff',
        role: 'staff'
      })
      .returning()
      .execute();

    // Create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Office Supplies',
        description: 'General office supplies'
      })
      .returning()
      .execute();

    // Create items with estimated prices
    const itemsResult = await db.insert(itemsTable)
      .values([
        {
          name: 'Notebooks',
          description: '80-page spiral notebooks',
          category_id: categoryResult[0].id,
          unit: 'piece',
          estimated_price: '5.99'
        },
        {
          name: 'Pens',
          description: 'Blue ballpoint pens',
          category_id: categoryResult[0].id,
          unit: 'pack',
          estimated_price: '12.50'
        },
        {
          name: 'Stapler',
          description: 'Heavy duty stapler',
          category_id: categoryResult[0].id,
          unit: 'piece',
          estimated_price: null // No price set
        }
      ])
      .returning()
      .execute();

    return {
      user: userResult[0],
      category: categoryResult[0],
      items: itemsResult
    };
  };

  it('should create a request with items', async () => {
    const testData = await createTestData();
    
    const input: CreateRequestInput = {
      staff_id: testData.user.id,
      title: 'Monthly Office Supplies',
      justification: 'Need supplies for the team',
      items: [
        {
          item_id: testData.items[0].id, // Notebooks
          quantity: 10,
          notes: 'For meeting notes'
        },
        {
          item_id: testData.items[1].id, // Pens
          quantity: 2,
          notes: null
        }
      ]
    };

    const result = await createRequest(input);

    // Verify request fields
    expect(result.id).toBeDefined();
    expect(result.staff_id).toEqual(testData.user.id);
    expect(result.title).toEqual('Monthly Office Supplies');
    expect(result.justification).toEqual('Need supplies for the team');
    expect(result.status).toEqual('pending');
    expect(result.manager_id).toBeNull();
    expect(result.admin_id).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify calculated total estimated cost
    // (10 * 5.99) + (2 * 12.50) = 59.90 + 25.00 = 84.90
    expect(result.total_estimated_cost).toEqual(84.90);
    expect(typeof result.total_estimated_cost).toBe('number');
  });

  it('should create request items in database', async () => {
    const testData = await createTestData();
    
    const input: CreateRequestInput = {
      staff_id: testData.user.id,
      title: 'Test Request',
      justification: null,
      items: [
        {
          item_id: testData.items[0].id,
          quantity: 5,
          notes: 'Test notes'
        }
      ]
    };

    const result = await createRequest(input);

    // Check that request items were created
    const requestItems = await db.select()
      .from(requestItemsTable)
      .where(eq(requestItemsTable.request_id, result.id))
      .execute();

    expect(requestItems).toHaveLength(1);
    expect(requestItems[0].item_id).toEqual(testData.items[0].id);
    expect(requestItems[0].quantity).toEqual(5);
    expect(requestItems[0].notes).toEqual('Test notes');
    expect(parseFloat(requestItems[0].estimated_unit_cost!)).toEqual(5.99);
  });

  it('should handle items without estimated prices', async () => {
    const testData = await createTestData();
    
    const input: CreateRequestInput = {
      staff_id: testData.user.id,
      title: 'Mixed Items Request',
      items: [
        {
          item_id: testData.items[0].id, // Has price (5.99)
          quantity: 2
        },
        {
          item_id: testData.items[2].id, // No price (stapler)
          quantity: 1
        }
      ]
    };

    const result = await createRequest(input);

    // Total should be null when not all items have prices
    expect(result.total_estimated_cost).toBeNull();

    // Check request items
    const requestItems = await db.select()
      .from(requestItemsTable)
      .where(eq(requestItemsTable.request_id, result.id))
      .execute();

    expect(requestItems).toHaveLength(2);
    
    // First item should have price
    const notebookItem = requestItems.find(ri => ri.item_id === testData.items[0].id);
    expect(parseFloat(notebookItem!.estimated_unit_cost!)).toEqual(5.99);
    
    // Second item should have null price
    const staplerItem = requestItems.find(ri => ri.item_id === testData.items[2].id);
    expect(staplerItem!.estimated_unit_cost).toBeNull();
  });

  it('should save request to database correctly', async () => {
    const testData = await createTestData();
    
    const input: CreateRequestInput = {
      staff_id: testData.user.id,
      title: 'Database Test Request',
      justification: 'Testing database persistence',
      items: [
        {
          item_id: testData.items[1].id, // Pens
          quantity: 3,
          notes: 'Blue pens only'
        }
      ]
    };

    const result = await createRequest(input);

    // Verify request was saved to database
    const savedRequest = await db.select()
      .from(requestsTable)
      .where(eq(requestsTable.id, result.id))
      .execute();

    expect(savedRequest).toHaveLength(1);
    expect(savedRequest[0].title).toEqual('Database Test Request');
    expect(savedRequest[0].justification).toEqual('Testing database persistence');
    expect(savedRequest[0].status).toEqual('pending');
    expect(parseFloat(savedRequest[0].total_estimated_cost!)).toEqual(37.50); // 3 * 12.50
  });

  it('should throw error for non-existent staff user', async () => {
    const testData = await createTestData();
    
    const input: CreateRequestInput = {
      staff_id: 99999, // Non-existent user
      title: 'Invalid Request',
      items: [
        {
          item_id: testData.items[0].id,
          quantity: 1
        }
      ]
    };

    await expect(createRequest(input)).rejects.toThrow(/staff user not found/i);
  });

  it('should throw error for inactive staff user', async () => {
    const testData = await createTestData();
    
    // Deactivate the user
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, testData.user.id))
      .execute();
    
    const input: CreateRequestInput = {
      staff_id: testData.user.id,
      title: 'Invalid Request',
      items: [
        {
          item_id: testData.items[0].id,
          quantity: 1
        }
      ]
    };

    await expect(createRequest(input)).rejects.toThrow(/staff user not found/i);
  });

  it('should throw error for non-existent items', async () => {
    const testData = await createTestData();
    
    const input: CreateRequestInput = {
      staff_id: testData.user.id,
      title: 'Invalid Items Request',
      items: [
        {
          item_id: 99999, // Non-existent item
          quantity: 1
        }
      ]
    };

    await expect(createRequest(input)).rejects.toThrow(/items not found/i);
  });

  it('should throw error for inactive items', async () => {
    const testData = await createTestData();
    
    // Deactivate an item
    await db.update(itemsTable)
      .set({ is_active: false })
      .where(eq(itemsTable.id, testData.items[0].id))
      .execute();
    
    const input: CreateRequestInput = {
      staff_id: testData.user.id,
      title: 'Inactive Item Request',
      items: [
        {
          item_id: testData.items[0].id, // Inactive item
          quantity: 1
        }
      ]
    };

    await expect(createRequest(input)).rejects.toThrow(/items not found/i);
  });

  it('should handle optional fields correctly', async () => {
    const testData = await createTestData();
    
    const input: CreateRequestInput = {
      staff_id: testData.user.id,
      title: 'Minimal Request',
      // justification is optional and omitted
      items: [
        {
          item_id: testData.items[0].id,
          quantity: 1
          // notes is optional and omitted
        }
      ]
    };

    const result = await createRequest(input);

    expect(result.justification).toBeNull();
    
    // Check request item notes
    const requestItems = await db.select()
      .from(requestItemsTable)
      .where(eq(requestItemsTable.request_id, result.id))
      .execute();

    expect(requestItems[0].notes).toBeNull();
  });

  it('should handle multiple items with complex calculations', async () => {
    const testData = await createTestData();
    
    const input: CreateRequestInput = {
      staff_id: testData.user.id,
      title: 'Complex Order',
      justification: 'Large team supplies order',
      items: [
        {
          item_id: testData.items[0].id, // Notebooks: 5.99 each
          quantity: 15,
          notes: 'Various colors needed'
        },
        {
          item_id: testData.items[1].id, // Pens: 12.50 each
          quantity: 8,
          notes: 'Blue and black pens'
        }
      ]
    };

    const result = await createRequest(input);

    // Calculate expected total: (15 * 5.99) + (8 * 12.50) = 89.85 + 100.00 = 189.85
    expect(result.total_estimated_cost).toEqual(189.85);

    // Verify all request items were created
    const requestItems = await db.select()
      .from(requestItemsTable)
      .where(eq(requestItemsTable.request_id, result.id))
      .execute();

    expect(requestItems).toHaveLength(2);
  });
});