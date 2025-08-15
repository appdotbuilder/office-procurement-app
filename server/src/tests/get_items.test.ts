import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, itemsTable } from '../db/schema';
import { type CreateCategoryInput, type CreateItemInput } from '../schema';
import { getItems } from '../handlers/get_items';
import { eq } from 'drizzle-orm';

// Test category for items
const testCategory: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing'
};

// Test items
const testItem1: CreateItemInput = {
  name: 'Test Item 1',
  description: 'First test item',
  category_id: 1, // Will be set after category creation
  unit: 'pcs',
  estimated_price: 19.99
};

const testItem2: CreateItemInput = {
  name: 'Test Item 2',
  description: 'Second test item',
  category_id: 1, // Will be set after category creation
  unit: 'kg',
  estimated_price: null
};

const testItem3: CreateItemInput = {
  name: 'Test Item 3',
  description: 'Third test item',
  category_id: 1, // Will be set after category creation
  unit: 'liters',
  estimated_price: 5.50
};

describe('getItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no items exist', async () => {
    const result = await getItems();
    expect(result).toEqual([]);
  });

  it('should return all active items', async () => {
    // Create a category first (required for foreign key)
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test items
    await db.insert(itemsTable)
      .values([
        {
          name: testItem1.name,
          description: testItem1.description,
          category_id: categoryId,
          unit: testItem1.unit,
          estimated_price: testItem1.estimated_price?.toString()
        },
        {
          name: testItem2.name,
          description: testItem2.description,
          category_id: categoryId,
          unit: testItem2.unit,
          estimated_price: null
        },
        {
          name: testItem3.name,
          description: testItem3.description,
          category_id: categoryId,
          unit: testItem3.unit,
          estimated_price: testItem3.estimated_price?.toString()
        }
      ])
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(3);
    
    // Check first item
    const item1 = result.find(item => item.name === 'Test Item 1');
    expect(item1).toBeDefined();
    expect(item1!.name).toEqual('Test Item 1');
    expect(item1!.description).toEqual('First test item');
    expect(item1!.category_id).toEqual(categoryId);
    expect(item1!.unit).toEqual('pcs');
    expect(item1!.estimated_price).toEqual(19.99);
    expect(typeof item1!.estimated_price).toEqual('number');
    expect(item1!.is_active).toBe(true);
    expect(item1!.id).toBeDefined();
    expect(item1!.created_at).toBeInstanceOf(Date);
    expect(item1!.updated_at).toBeInstanceOf(Date);

    // Check second item (with null estimated_price)
    const item2 = result.find(item => item.name === 'Test Item 2');
    expect(item2).toBeDefined();
    expect(item2!.estimated_price).toBeNull();

    // Check third item
    const item3 = result.find(item => item.name === 'Test Item 3');
    expect(item3).toBeDefined();
    expect(item3!.estimated_price).toEqual(5.50);
    expect(typeof item3!.estimated_price).toEqual('number');
  });

  it('should only return active items', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create active and inactive items
    const itemResults = await db.insert(itemsTable)
      .values([
        {
          name: 'Active Item',
          description: 'This item is active',
          category_id: categoryId,
          unit: 'pcs',
          estimated_price: '10.00',
          is_active: true
        },
        {
          name: 'Inactive Item',
          description: 'This item is inactive',
          category_id: categoryId,
          unit: 'kg',
          estimated_price: '20.00',
          is_active: false
        }
      ])
      .returning()
      .execute();

    const result = await getItems();

    // Should only return the active item
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Active Item');
    expect(result[0].is_active).toBe(true);

    // Verify the inactive item exists in the database but wasn't returned
    const allItems = await db.select()
      .from(itemsTable)
      .execute();
    expect(allItems).toHaveLength(2);
  });

  it('should handle numeric conversion correctly for estimated_price', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create items with different price scenarios
    await db.insert(itemsTable)
      .values([
        {
          name: 'Item with Price',
          description: 'Has estimated price',
          category_id: categoryId,
          unit: 'pcs',
          estimated_price: '123.45' // Stored as string in database
        },
        {
          name: 'Item without Price',
          description: 'No estimated price',
          category_id: categoryId,
          unit: 'kg',
          estimated_price: null
        }
      ])
      .execute();

    const result = await getItems();

    expect(result).toHaveLength(2);

    // Check item with price
    const itemWithPrice = result.find(item => item.name === 'Item with Price');
    expect(itemWithPrice!.estimated_price).toEqual(123.45);
    expect(typeof itemWithPrice!.estimated_price).toEqual('number');

    // Check item without price
    const itemWithoutPrice = result.find(item => item.name === 'Item without Price');
    expect(itemWithoutPrice!.estimated_price).toBeNull();
  });

  it('should handle database query correctly', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create an item
    const itemResult = await db.insert(itemsTable)
      .values({
        name: 'Query Test Item',
        description: 'Testing database query',
        category_id: categoryId,
        unit: 'units',
        estimated_price: '99.99'
      })
      .returning()
      .execute();

    const result = await getItems();

    // Verify the item was returned correctly
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(itemResult[0].id);
    expect(result[0].name).toEqual('Query Test Item');

    // Verify it's the same item from the database
    const dbItem = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, result[0].id))
      .execute();

    expect(dbItem).toHaveLength(1);
    expect(dbItem[0].name).toEqual(result[0].name);
    expect(dbItem[0].category_id).toEqual(result[0].category_id);
  });
});