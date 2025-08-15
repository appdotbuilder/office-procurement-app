import { db } from '../db';
import { requestsTable, usersTable, requestItemsTable, itemsTable, categoriesTable } from '../db/schema';
import { type RequestWithDetails } from '../schema';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function getRequestById(id: number): Promise<RequestWithDetails | null> {
  try {
    // Create aliases for the different user roles
    const staffTable = alias(usersTable, 'staff');
    const managerTable = alias(usersTable, 'manager');
    const adminTable = alias(usersTable, 'admin');

    // Query request with all related data using joins
    const results = await db.select({
      // Request fields
      request: requestsTable,
      // Staff user fields
      staff: staffTable,
      // Manager user fields (nullable)
      manager: managerTable,
      // Admin user fields (nullable)
      admin: adminTable
    })
      .from(requestsTable)
      .innerJoin(staffTable, eq(requestsTable.staff_id, staffTable.id))
      .leftJoin(managerTable, eq(requestsTable.manager_id, managerTable.id))
      .leftJoin(adminTable, eq(requestsTable.admin_id, adminTable.id))
      .where(eq(requestsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const result = results[0];

    // Query request items with item and category details
    const requestItemsResults = await db.select({
      requestItem: requestItemsTable,
      item: itemsTable,
      category: categoriesTable
    })
      .from(requestItemsTable)
      .innerJoin(itemsTable, eq(requestItemsTable.item_id, itemsTable.id))
      .innerJoin(categoriesTable, eq(itemsTable.category_id, categoriesTable.id))
      .where(eq(requestItemsTable.request_id, id))
      .execute();

    // Convert numeric fields and build response
    const requestWithDetails: RequestWithDetails = {
      id: result.request.id,
      staff_id: result.request.staff_id,
      title: result.request.title,
      justification: result.request.justification,
      status: result.request.status,
      manager_id: result.request.manager_id,
      manager_notes: result.request.manager_notes,
      admin_id: result.request.admin_id,
      admin_notes: result.request.admin_notes,
      total_estimated_cost: result.request.total_estimated_cost ? parseFloat(result.request.total_estimated_cost) : null,
      actual_cost: result.request.actual_cost ? parseFloat(result.request.actual_cost) : null,
      purchase_date: result.request.purchase_date,
      received_date: result.request.received_date,
      created_at: result.request.created_at,
      updated_at: result.request.updated_at,
      staff: result.staff,
      manager: result.manager,
      admin: result.admin,
      items: requestItemsResults.map(item => ({
        id: item.requestItem.id,
        request_id: item.requestItem.request_id,
        item_id: item.requestItem.item_id,
        quantity: item.requestItem.quantity,
        estimated_unit_cost: item.requestItem.estimated_unit_cost ? parseFloat(item.requestItem.estimated_unit_cost) : null,
        actual_unit_cost: item.requestItem.actual_unit_cost ? parseFloat(item.requestItem.actual_unit_cost) : null,
        notes: item.requestItem.notes,
        created_at: item.requestItem.created_at,
        item: {
          id: item.item.id,
          name: item.item.name,
          description: item.item.description,
          category_id: item.item.category_id,
          unit: item.item.unit,
          estimated_price: item.item.estimated_price ? parseFloat(item.item.estimated_price) : null,
          is_active: item.item.is_active,
          created_at: item.item.created_at,
          updated_at: item.item.updated_at,
          category: item.category
        }
      }))
    };

    return requestWithDetails;
  } catch (error) {
    console.error('Failed to fetch request by ID:', error);
    throw error;
  }
}