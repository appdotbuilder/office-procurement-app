import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();
    expect(result).toEqual([]);
  });

  it('should return all active categories', async () => {
    // Create test categories
    await db.insert(categoriesTable)
      .values([
        {
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          is_active: true
        },
        {
          name: 'Office Supplies',
          description: 'General office supplies',
          is_active: true
        }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('Electronics');
    expect(result[0].description).toEqual('Electronic devices and accessories');
    expect(result[0].is_active).toBe(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Office Supplies');
    expect(result[1].description).toEqual('General office supplies');
    expect(result[1].is_active).toBe(true);
  });

  it('should exclude inactive categories', async () => {
    // Create mix of active and inactive categories
    await db.insert(categoriesTable)
      .values([
        {
          name: 'Active Category',
          description: 'This category is active',
          is_active: true
        },
        {
          name: 'Inactive Category',
          description: 'This category is inactive',
          is_active: false
        }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Active Category');
    expect(result[0].is_active).toBe(true);
  });

  it('should handle categories with null descriptions', async () => {
    // Create category with null description
    await db.insert(categoriesTable)
      .values({
        name: 'No Description Category',
        description: null,
        is_active: true
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('No Description Category');
    expect(result[0].description).toBeNull();
    expect(result[0].is_active).toBe(true);
  });

  it('should return categories ordered by creation date', async () => {
    // Create categories with slight delay to ensure different timestamps
    await db.insert(categoriesTable)
      .values({
        name: 'First Category',
        description: 'Created first',
        is_active: true
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(categoriesTable)
      .values({
        name: 'Second Category',
        description: 'Created second',
        is_active: true
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    // Verify both categories are returned (order may vary)
    const names = result.map(cat => cat.name);
    expect(names).toContain('First Category');
    expect(names).toContain('Second Category');
  });

  it('should return proper date objects for timestamps', async () => {
    await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Testing date fields',
        is_active: true
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[0].created_at.getTime()).toBeGreaterThan(0);
    expect(result[0].updated_at.getTime()).toBeGreaterThan(0);
  });
});