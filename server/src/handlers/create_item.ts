import { db } from '../db';
import { itemsTable, categoriesTable } from '../db/schema';
import { type CreateItemInput, type Item } from '../schema';
import { eq } from 'drizzle-orm';

export const createItem = async (input: CreateItemInput): Promise<Item> => {
  try {
    // Verify that the category exists and is active
    const category = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.category_id))
      .execute();

    if (category.length === 0) {
      throw new Error(`Category with ID ${input.category_id} not found`);
    }

    if (!category[0].is_active) {
      throw new Error(`Category with ID ${input.category_id} is not active`);
    }

    // Insert item record
    const result = await db.insert(itemsTable)
      .values({
        name: input.name,
        description: input.description,
        category_id: input.category_id,
        unit: input.unit,
        estimated_price: input.estimated_price ? input.estimated_price.toString() : null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const item = result[0];
    return {
      ...item,
      estimated_price: item.estimated_price ? parseFloat(item.estimated_price) : null
    };
  } catch (error) {
    console.error('Item creation failed:', error);
    throw error;
  }
};