import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type CreateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

// Helper to create a test category
const createTestCategory = async (categoryData: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing'
}) => {
  const result = await db.insert(categoriesTable)
    .values({
      name: categoryData.name,
      description: categoryData.description ?? null
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update category name', async () => {
    // Create test category
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Category Name'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.description).toEqual(category.description);
    expect(result.is_active).toEqual(category.is_active);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(category.updated_at.getTime());
  });

  it('should update category description', async () => {
    // Create test category
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: 'Updated description'
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual(category.name);
    expect(result.description).toEqual('Updated description');
    expect(result.is_active).toEqual(category.is_active);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update category active status', async () => {
    // Create test category
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      is_active: false
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual(category.name);
    expect(result.description).toEqual(category.description);
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    // Create test category
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Multi-Update Category',
      description: 'Updated with multiple fields',
      is_active: false
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual('Multi-Update Category');
    expect(result.description).toEqual('Updated with multiple fields');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set description to null when explicitly provided', async () => {
    // Create test category with description
    const category = await createTestCategory({
      name: 'Category with Description',
      description: 'Original description'
    });
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      description: null
    };

    const result = await updateCategory(updateInput);

    expect(result.id).toEqual(category.id);
    expect(result.name).toEqual(category.name);
    expect(result.description).toBeNull();
    expect(result.is_active).toEqual(category.is_active);
  });

  it('should save changes to database', async () => {
    // Create test category
    const category = await createTestCategory();
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Database Update Test',
      description: 'Testing database persistence'
    };

    await updateCategory(updateInput);

    // Verify changes were saved to database
    const savedCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, category.id))
      .execute();

    expect(savedCategory).toHaveLength(1);
    expect(savedCategory[0].name).toEqual('Database Update Test');
    expect(savedCategory[0].description).toEqual('Testing database persistence');
    expect(savedCategory[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateCategoryInput = {
      id: 99999, // Non-existent ID
      name: 'This should fail'
    };

    await expect(updateCategory(updateInput)).rejects.toThrow(/Category with id 99999 not found/i);
  });

  it('should only update provided fields', async () => {
    // Create test category
    const category = await createTestCategory({
      name: 'Original Name',
      description: 'Original description'
    });
    
    // Only update name, leave other fields unchanged
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Only Name Updated'
    };

    const result = await updateCategory(updateInput);

    expect(result.name).toEqual('Only Name Updated');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.is_active).toEqual(true); // Should remain unchanged
  });

  it('should handle category with null description', async () => {
    // Create test category with null description
    const category = await createTestCategory({
      name: 'Category without description',
      description: null
    });
    
    const updateInput: UpdateCategoryInput = {
      id: category.id,
      name: 'Updated Name Only'
    };

    const result = await updateCategory(updateInput);

    expect(result.name).toEqual('Updated Name Only');
    expect(result.description).toBeNull(); // Should remain null
    expect(result.is_active).toEqual(true);
  });
});