import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable, categoriesTable } from '../db/schema';
import { type UpdateItemInput } from '../schema';
import { updateItem } from '../handlers/update_item';
import { eq } from 'drizzle-orm';

describe('updateItem', () => {
  let categoryId: number;
  let secondCategoryId: number;
  let itemId: number;

  beforeEach(async () => {
    await createDB();

    // Create test categories
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    categoryId = category[0].id;

    const secondCategory = await db.insert(categoriesTable)
      .values({
        name: 'Second Category',
        description: 'Another category for testing'
      })
      .returning()
      .execute();
    secondCategoryId = secondCategory[0].id;

    // Create test item
    const item = await db.insert(itemsTable)
      .values({
        name: 'Test Item',
        description: 'Original description',
        category_id: categoryId,
        unit: 'pcs',
        estimated_price: '10.99'
      })
      .returning()
      .execute();
    itemId = item[0].id;
  });

  afterEach(resetDB);

  it('should update item name only', async () => {
    const input: UpdateItemInput = {
      id: itemId,
      name: 'Updated Item Name'
    };

    const result = await updateItem(input);

    expect(result.id).toBe(itemId);
    expect(result.name).toBe('Updated Item Name');
    expect(result.description).toBe('Original description'); // Should remain unchanged
    expect(result.category_id).toBe(categoryId); // Should remain unchanged
    expect(result.unit).toBe('pcs'); // Should remain unchanged
    expect(result.estimated_price).toBe(10.99); // Should remain unchanged
    expect(result.is_active).toBe(true); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields', async () => {
    const input: UpdateItemInput = {
      id: itemId,
      name: 'Completely Updated Item',
      description: 'New description',
      category_id: secondCategoryId,
      unit: 'kg',
      estimated_price: 25.50,
      is_active: false
    };

    const result = await updateItem(input);

    expect(result.id).toBe(itemId);
    expect(result.name).toBe('Completely Updated Item');
    expect(result.description).toBe('New description');
    expect(result.category_id).toBe(secondCategoryId);
    expect(result.unit).toBe('kg');
    expect(result.estimated_price).toBe(25.50);
    expect(result.is_active).toBe(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update description to null', async () => {
    const input: UpdateItemInput = {
      id: itemId,
      description: null
    };

    const result = await updateItem(input);

    expect(result.description).toBeNull();
    expect(result.name).toBe('Test Item'); // Should remain unchanged
  });

  it('should update estimated_price to null', async () => {
    const input: UpdateItemInput = {
      id: itemId,
      estimated_price: null
    };

    const result = await updateItem(input);

    expect(result.estimated_price).toBeNull();
    expect(result.name).toBe('Test Item'); // Should remain unchanged
  });

  it('should save updated item to database', async () => {
    const input: UpdateItemInput = {
      id: itemId,
      name: 'Database Test Item',
      estimated_price: 99.99
    };

    await updateItem(input);

    // Verify changes were saved to database
    const items = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, itemId))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Database Test Item');
    expect(parseFloat(items[0].estimated_price!)).toBe(99.99);
    expect(items[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when item does not exist', async () => {
    const input: UpdateItemInput = {
      id: 99999, // Non-existent ID
      name: 'Non-existent Item'
    };

    await expect(updateItem(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error when category does not exist', async () => {
    const input: UpdateItemInput = {
      id: itemId,
      category_id: 99999 // Non-existent category ID
    };

    await expect(updateItem(input)).rejects.toThrow(/category.*not found/i);
  });

  it('should throw error when category is inactive', async () => {
    // Create inactive category
    const inactiveCategory = await db.insert(categoriesTable)
      .values({
        name: 'Inactive Category',
        description: 'This category is inactive',
        is_active: false
      })
      .returning()
      .execute();

    const input: UpdateItemInput = {
      id: itemId,
      category_id: inactiveCategory[0].id
    };

    await expect(updateItem(input)).rejects.toThrow(/category.*not found/i);
  });

  it('should handle numeric conversion correctly', async () => {
    const input: UpdateItemInput = {
      id: itemId,
      estimated_price: 123.45 // Test precision handling (2 decimal places to match DB schema)
    };

    const result = await updateItem(input);

    expect(typeof result.estimated_price).toBe('number');
    expect(result.estimated_price).toBe(123.45);

    // Verify database storage
    const items = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, itemId))
      .execute();

    expect(typeof items[0].estimated_price).toBe('string'); // Stored as string in DB
    expect(parseFloat(items[0].estimated_price!)).toBe(123.45);
  });

  it('should update only updated_at when no other fields provided', async () => {
    const originalItem = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, itemId))
      .execute();

    // Small delay to ensure updated_at changes
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateItemInput = {
      id: itemId
    };

    const result = await updateItem(input);

    expect(result.name).toBe(originalItem[0].name);
    expect(result.description).toBe(originalItem[0].description);
    expect(result.category_id).toBe(originalItem[0].category_id);
    expect(result.unit).toBe(originalItem[0].unit);
    expect(result.updated_at > originalItem[0].updated_at).toBe(true);
  });
});