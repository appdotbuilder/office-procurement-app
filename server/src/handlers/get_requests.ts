import { db } from '../db';
import { requestsTable, usersTable, requestItemsTable, itemsTable, categoriesTable } from '../db/schema';
import { type RequestWithDetails, type RequestFilter } from '../schema';
import { eq, and, gte, lte, SQL, inArray } from 'drizzle-orm';

export const getRequests = async (filter?: RequestFilter): Promise<RequestWithDetails[]> => {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filter?.status) {
      conditions.push(eq(requestsTable.status, filter.status));
    }

    if (filter?.staff_id) {
      conditions.push(eq(requestsTable.staff_id, filter.staff_id));
    }

    if (filter?.manager_id) {
      conditions.push(eq(requestsTable.manager_id, filter.manager_id));
    }

    if (filter?.date_from) {
      conditions.push(gte(requestsTable.created_at, filter.date_from));
    }

    if (filter?.date_to) {
      conditions.push(lte(requestsTable.created_at, filter.date_to));
    }

    // Build the query with proper conditional where clause
    const baseQuery = db.select()
      .from(requestsTable)
      .innerJoin(usersTable, eq(requestsTable.staff_id, usersTable.id));

    const query = conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery;

    const requestResults = await query.execute();

    if (requestResults.length === 0) {
      return [];
    }

    // Get all unique manager and admin IDs
    const managerIds = [...new Set(requestResults.filter(r => r.requests.manager_id).map(r => r.requests.manager_id!))];
    const adminIds = [...new Set(requestResults.filter(r => r.requests.admin_id).map(r => r.requests.admin_id!))];
    const allUserIds = [...new Set([...managerIds, ...adminIds])];

    // Get manager and admin details
    const additionalUsers = allUserIds.length > 0 
      ? await db.select().from(usersTable).where(inArray(usersTable.id, allUserIds)).execute()
      : [];

    const usersMap = new Map(additionalUsers.map(u => [u.id, u]));

    // Get all request items with item and category details
    const requestIds = requestResults.map(r => r.requests.id);
    const requestItemsQuery = db.select()
      .from(requestItemsTable)
      .innerJoin(itemsTable, eq(requestItemsTable.item_id, itemsTable.id))
      .innerJoin(categoriesTable, eq(itemsTable.category_id, categoriesTable.id))
      .where(inArray(requestItemsTable.request_id, requestIds));

    const requestItemResults = await requestItemsQuery.execute();

    // Group request items by request_id
    const requestItemsMap = new Map<number, any[]>();
    requestItemResults.forEach(item => {
      if (!requestItemsMap.has(item.request_items.request_id)) {
        requestItemsMap.set(item.request_items.request_id, []);
      }
      requestItemsMap.get(item.request_items.request_id)!.push({
        id: item.request_items.id,
        request_id: item.request_items.request_id,
        item_id: item.request_items.item_id,
        quantity: item.request_items.quantity,
        estimated_unit_cost: item.request_items.estimated_unit_cost ? parseFloat(item.request_items.estimated_unit_cost) : null,
        actual_unit_cost: item.request_items.actual_unit_cost ? parseFloat(item.request_items.actual_unit_cost) : null,
        notes: item.request_items.notes,
        created_at: item.request_items.created_at,
        item: {
          id: item.items.id,
          name: item.items.name,
          description: item.items.description,
          category_id: item.items.category_id,
          unit: item.items.unit,
          estimated_price: item.items.estimated_price ? parseFloat(item.items.estimated_price) : null,
          is_active: item.items.is_active,
          created_at: item.items.created_at,
          updated_at: item.items.updated_at,
          category: {
            id: item.categories.id,
            name: item.categories.name,
            description: item.categories.description,
            is_active: item.categories.is_active,
            created_at: item.categories.created_at,
            updated_at: item.categories.updated_at
          }
        }
      });
    });

    // Transform results to match RequestWithDetails schema
    return requestResults.map(result => ({
      id: result.requests.id,
      staff_id: result.requests.staff_id,
      title: result.requests.title,
      justification: result.requests.justification,
      status: result.requests.status,
      manager_id: result.requests.manager_id,
      manager_notes: result.requests.manager_notes,
      admin_id: result.requests.admin_id,
      admin_notes: result.requests.admin_notes,
      total_estimated_cost: result.requests.total_estimated_cost ? parseFloat(result.requests.total_estimated_cost) : null,
      actual_cost: result.requests.actual_cost ? parseFloat(result.requests.actual_cost) : null,
      purchase_date: result.requests.purchase_date,
      received_date: result.requests.received_date,
      created_at: result.requests.created_at,
      updated_at: result.requests.updated_at,
      staff: result.users,
      manager: result.requests.manager_id ? usersMap.get(result.requests.manager_id) || null : null,
      admin: result.requests.admin_id ? usersMap.get(result.requests.admin_id) || null : null,
      items: requestItemsMap.get(result.requests.id) || []
    }));
  } catch (error) {
    console.error('Failed to get requests:', error);
    throw error;
  }
};