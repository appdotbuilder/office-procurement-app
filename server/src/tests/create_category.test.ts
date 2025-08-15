import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInputWithDescription: CreateCategoryInput = {
  name: 'Office Supplies',
  description: 'All office supplies and stationery items'
};

// Test input without description
const testInputWithoutDescription: CreateCategoryInput = {
  name: 'Electronics'
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with description', async () => {
    const result = await createCategory(testInputWithDescription);

    // Basic field validation
    expect(result.name).toEqual('Office Supplies');
    expect(result.description).toEqual('All office supplies and stationery items');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a category without description', async () => {
    const result = await createCategory(testInputWithoutDescription);

    // Basic field validation
    expect(result.name).toEqual('Electronics');
    expect(result.description).toBeNull();
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInputWithDescription);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Office Supplies');
    expect(categories[0].description).toEqual('All office supplies and stationery items');
    expect(categories[0].is_active).toBe(true);
    expect(categories[0].created_at).toBeInstanceOf(Date);
    expect(categories[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly in database', async () => {
    const result = await createCategory(testInputWithoutDescription);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Electronics');
    expect(categories[0].description).toBeNull();
    expect(categories[0].is_active).toBe(true);
  });

  it('should set default values correctly', async () => {
    const result = await createCategory(testInputWithDescription);

    // Verify default values
    expect(result.is_active).toBe(true); // Default should be true
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Timestamps should be recent (within last few seconds)
    const now = new Date();
    const timeDiff = now.getTime() - result.created_at.getTime();
    expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds ago
  });

  it('should create multiple categories with unique names', async () => {
    const firstCategory = await createCategory({
      name: 'First Category',
      description: 'First test category'
    });

    const secondCategory = await createCategory({
      name: 'Second Category',
      description: 'Second test category'
    });

    expect(firstCategory.id).not.toEqual(secondCategory.id);
    expect(firstCategory.name).toEqual('First Category');
    expect(secondCategory.name).toEqual('Second Category');

    // Verify both exist in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
  });
});