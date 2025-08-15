import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, categoriesTable } from '../db/schema';
import { type CreateItemInput } from '../schema';
import { createItem } from '../handlers/create_item';
import { eq } from 'drizzle-orm';

// Test category setup
const createTestCategory = async () => {
  const result = await db.insert(categoriesTable)
    .values({
      name: 'Test Category',
      description: 'A category for testing'
    })
    .returning()
    .execute();
  return result[0];
};

// Test input with all required fields
const testInput: CreateItemInput = {
  name: 'Test Item',
  description: 'A test item description',
  category_id: 1, // Will be set dynamically in tests
  unit: 'pieces',
  estimated_price: 29.99
};

describe('createItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an item with all fields', async () => {
    const category = await createTestCategory();
    const input = { ...testInput, category_id: category.id };

    const result = await createItem(input);

    expect(result.name).toEqual('Test Item');
    expect(result.description).toEqual('A test item description');
    expect(result.category_id).toEqual(category.id);
    expect(result.unit).toEqual('pieces');
    expect(result.estimated_price).toEqual(29.99);
    expect(typeof result.estimated_price).toBe('number');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an item with minimal fields (no optional fields)', async () => {
    const category = await createTestCategory();
    const minimalInput: CreateItemInput = {
      name: 'Minimal Item',
      category_id: category.id,
      unit: 'kg'
    };

    const result = await createItem(minimalInput);

    expect(result.name).toEqual('Minimal Item');
    expect(result.description).toBeNull();
    expect(result.category_id).toEqual(category.id);
    expect(result.unit).toEqual('kg');
    expect(result.estimated_price).toBeNull();
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
  });

  it('should create an item with null estimated_price when not provided', async () => {
    const category = await createTestCategory();
    const input: CreateItemInput = {
      name: 'No Price Item',
      category_id: category.id,
      unit: 'liters',
      estimated_price: null
    };

    const result = await createItem(input);

    expect(result.estimated_price).toBeNull();
    expect(result.name).toEqual('No Price Item');
    expect(result.unit).toEqual('liters');
  });

  it('should save item to database correctly', async () => {
    const category = await createTestCategory();
    const input = { ...testInput, category_id: category.id };

    const result = await createItem(input);

    // Verify item was saved to database
    const items = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    const savedItem = items[0];
    
    expect(savedItem.name).toEqual('Test Item');
    expect(savedItem.description).toEqual('A test item description');
    expect(savedItem.category_id).toEqual(category.id);
    expect(savedItem.unit).toEqual('pieces');
    expect(parseFloat(savedItem.estimated_price!)).toEqual(29.99);
    expect(savedItem.is_active).toEqual(true);
    expect(savedItem.created_at).toBeInstanceOf(Date);
    expect(savedItem.updated_at).toBeInstanceOf(Date);
  });

  it('should handle decimal prices correctly', async () => {
    const category = await createTestCategory();
    const input = { 
      ...testInput, 
      category_id: category.id,
      estimated_price: 123.45 // Using 2 decimal places to match numeric(10, 2) precision
    };

    const result = await createItem(input);

    expect(result.estimated_price).toEqual(123.45);
    expect(typeof result.estimated_price).toBe('number');

    // Verify precision is maintained in database
    const items = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, result.id))
      .execute();

    expect(parseFloat(items[0].estimated_price!)).toEqual(123.45);
  });

  it('should throw error when category does not exist', async () => {
    const input = { ...testInput, category_id: 9999 }; // Non-existent category

    await expect(createItem(input)).rejects.toThrow(/Category with ID 9999 not found/i);
  });

  it('should throw error when category is inactive', async () => {
    // Create an inactive category
    const inactiveCategory = await db.insert(categoriesTable)
      .values({
        name: 'Inactive Category',
        description: 'An inactive category',
        is_active: false
      })
      .returning()
      .execute();

    const input = { ...testInput, category_id: inactiveCategory[0].id };

    await expect(createItem(input)).rejects.toThrow(/Category with ID .+ is not active/i);
  });

  it('should create multiple items in the same category', async () => {
    const category = await createTestCategory();
    
    const item1Input = { 
      ...testInput, 
      category_id: category.id,
      name: 'Item 1' 
    };
    const item2Input = { 
      ...testInput, 
      category_id: category.id,
      name: 'Item 2',
      unit: 'boxes'
    };

    const result1 = await createItem(item1Input);
    const result2 = await createItem(item2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.category_id).toEqual(category.id);
    expect(result2.category_id).toEqual(category.id);
    expect(result1.name).toEqual('Item 1');
    expect(result2.name).toEqual('Item 2');
    expect(result2.unit).toEqual('boxes');

    // Verify both items exist in database
    const allItems = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.category_id, category.id))
      .execute();

    expect(allItems).toHaveLength(2);
  });
});