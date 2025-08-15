import { db } from '../db';
import { requestsTable, usersTable, requestItemsTable, itemsTable, categoriesTable } from '../db/schema';
import { type RequestWithDetails } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getPendingRequestsForManager = async (): Promise<RequestWithDetails[]> => {
  try {
    // Query requests with status 'pending' and all related data
    const results = await db.select()
      .from(requestsTable)
      .innerJoin(usersTable, eq(requestsTable.staff_id, usersTable.id))
      .leftJoin(requestItemsTable, eq(requestsTable.id, requestItemsTable.request_id))
      .leftJoin(itemsTable, eq(requestItemsTable.item_id, itemsTable.id))
      .leftJoin(categoriesTable, eq(itemsTable.category_id, categoriesTable.id))
      .where(eq(requestsTable.status, 'pending'))
      .orderBy(desc(requestsTable.created_at))
      .execute();

    // Group results by request ID to handle multiple items per request
    const requestsMap = new Map<number, RequestWithDetails>();

    for (const result of results) {
      const requestId = result.requests.id;

      // Convert numeric fields from string to number
      const request = {
        ...result.requests,
        total_estimated_cost: result.requests.total_estimated_cost 
          ? parseFloat(result.requests.total_estimated_cost) 
          : null,
        actual_cost: result.requests.actual_cost 
          ? parseFloat(result.requests.actual_cost) 
          : null
      };

      const staff = result.users;

      if (!requestsMap.has(requestId)) {
        // Create new request entry
        requestsMap.set(requestId, {
          ...request,
          staff,
          manager: null, // Pending requests don't have manager assigned yet
          admin: null,   // Pending requests don't have admin assigned yet
          items: []
        });
      }

      // Add request item if it exists
      if (result.request_items && result.items && result.categories) {
        const requestItem = {
          ...result.request_items,
          estimated_unit_cost: result.request_items.estimated_unit_cost
            ? parseFloat(result.request_items.estimated_unit_cost)
            : null,
          actual_unit_cost: result.request_items.actual_unit_cost
            ? parseFloat(result.request_items.actual_unit_cost)
            : null,
          item: {
            ...result.items,
            estimated_price: result.items.estimated_price
              ? parseFloat(result.items.estimated_price)
              : null,
            category: result.categories
          }
        };

        requestsMap.get(requestId)!.items.push(requestItem);
      }
    }

    return Array.from(requestsMap.values());
  } catch (error) {
    console.error('Failed to get pending requests for manager:', error);
    throw error;
  }
};