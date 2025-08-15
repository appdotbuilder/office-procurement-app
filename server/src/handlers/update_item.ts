import { db } from '../db';
import { itemsTable, categoriesTable } from '../db/schema';
import { type UpdateItemInput, type Item } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateItem = async (input: UpdateItemInput): Promise<Item> => {
  try {
    // First verify the item exists
    const existingItem = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.id))
      .execute();

    if (existingItem.length === 0) {
      throw new Error(`Item with id ${input.id} not found`);
    }

    // If category_id is being updated, verify the category exists and is active
    if (input.category_id !== undefined) {
      const category = await db.select()
        .from(categoriesTable)
        .where(and(
          eq(categoriesTable.id, input.category_id),
          eq(categoriesTable.is_active, true)
        ))
        .execute();

      if (category.length === 0) {
        throw new Error(`Active category with id ${input.category_id} not found`);
      }
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }

    if (input.unit !== undefined) {
      updateData.unit = input.unit;
    }

    if (input.estimated_price !== undefined) {
      updateData.estimated_price = input.estimated_price !== null ? input.estimated_price.toString() : null;
    }

    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Update the item
    const result = await db.update(itemsTable)
      .set(updateData)
      .where(eq(itemsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const item = result[0];
    return {
      ...item,
      estimated_price: item.estimated_price ? parseFloat(item.estimated_price) : null
    };
  } catch (error) {
    console.error('Item update failed:', error);
    throw error;
  }
};