import { db } from '../db';
import { requestsTable, requestItemsTable, itemsTable, usersTable } from '../db/schema';
import { type CreateRequestInput, type Request } from '../schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function createRequest(input: CreateRequestInput): Promise<Request> {
  try {
    // Verify staff user exists and is active
    const staff = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, input.staff_id),
        eq(usersTable.is_active, true)
      ))
      .execute();

    if (staff.length === 0) {
      throw new Error('Staff user not found or inactive');
    }

    // Verify all items exist and are active
    const itemIds = input.items.map(item => item.item_id);
    const items = await db.select()
      .from(itemsTable)
      .where(and(
        inArray(itemsTable.id, itemIds),
        eq(itemsTable.is_active, true)
      ))
      .execute();

    if (items.length !== itemIds.length) {
      throw new Error('One or more items not found or inactive');
    }

    // Calculate total estimated cost based on item prices and quantities
    let totalEstimatedCost: number | null = null;
    
    // Create a map of item prices for quick lookup
    const itemPriceMap = new Map(
      items.map(item => [
        item.id,
        item.estimated_price ? parseFloat(item.estimated_price) : null
      ])
    );

    // Calculate total if all items have estimated prices
    const hasAllPrices = input.items.every(reqItem => {
      const price = itemPriceMap.get(reqItem.item_id);
      return price !== null && price !== undefined;
    });

    if (hasAllPrices) {
      totalEstimatedCost = input.items.reduce((total, reqItem) => {
        const price = itemPriceMap.get(reqItem.item_id)!;
        return total + (price * reqItem.quantity);
      }, 0);
    }

    // Insert the request
    const requestResult = await db.insert(requestsTable)
      .values({
        staff_id: input.staff_id,
        title: input.title,
        justification: input.justification || null,
        total_estimated_cost: totalEstimatedCost ? totalEstimatedCost.toString() : null
      })
      .returning()
      .execute();

    const request = requestResult[0];

    // Insert request items
    const requestItemsData = input.items.map(item => ({
      request_id: request.id,
      item_id: item.item_id,
      quantity: item.quantity,
      estimated_unit_cost: itemPriceMap.get(item.item_id)?.toString() || null,
      notes: item.notes || null
    }));

    await db.insert(requestItemsTable)
      .values(requestItemsData)
      .execute();

    // Return the request with proper numeric conversion
    return {
      ...request,
      total_estimated_cost: request.total_estimated_cost ? parseFloat(request.total_estimated_cost) : null,
      actual_cost: request.actual_cost ? parseFloat(request.actual_cost) : null
    };

  } catch (error) {
    console.error('Request creation failed:', error);
    throw error;
  }
}