import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';
import { eq } from 'drizzle-orm';

export const getCategories = async (): Promise<Category[]> => {
  try {
    // Fetch all active categories from the database
    const results = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};