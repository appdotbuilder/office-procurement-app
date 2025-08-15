import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCategory = async (input: UpdateCategoryInput): Promise<Category> => {
  try {
    // Build update values object with only provided fields
    const updateValues: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateValues['name'] = input.name;
    }

    if (input.description !== undefined) {
      updateValues['description'] = input.description;
    }

    if (input.is_active !== undefined) {
      updateValues['is_active'] = input.is_active;
    }

    // Update category record
    const result = await db.update(categoriesTable)
      .set(updateValues)
      .where(eq(categoriesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Category with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Category update failed:', error);
    throw error;
  }
};