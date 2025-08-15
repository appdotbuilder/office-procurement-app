import { db } from '../db';
import { requestsTable, usersTable, requestItemsTable, itemsTable, categoriesTable } from '../db/schema';
import { type RequestWithDetails } from '../schema';
import { eq, desc, inArray } from 'drizzle-orm';

export async function getStaffRequests(staffId: number): Promise<RequestWithDetails[]> {
  try {
    // First, verify the staff member exists
    const staff = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, staffId))
      .execute();

    if (staff.length === 0) {
      throw new Error(`Staff member with id ${staffId} not found`);
    }

    // Get all requests for the staff member
    const requests = await db.select()
      .from(requestsTable)
      .where(eq(requestsTable.staff_id, staffId))
      .orderBy(desc(requestsTable.created_at))
      .execute();

    if (requests.length === 0) {
      return [];
    }

    // Get managers and admins for these requests
    const managerIds = requests.map(r => r.manager_id).filter(Boolean) as number[];
    const adminIds = requests.map(r => r.admin_id).filter(Boolean) as number[];
    const userIds = [...new Set([...managerIds, ...adminIds])];

    let managers: any[] = [];
    let admins: any[] = [];
    
    if (userIds.length > 0) {
      const users = await db.select()
        .from(usersTable)
        .where(inArray(usersTable.id, userIds))
        .execute();
      
      managers = users.filter(u => managerIds.includes(u.id));
      admins = users.filter(u => adminIds.includes(u.id));
    }

    // Get request items with item and category details
    const requestIds = requests.map(r => r.id);
    const requestItemsResults = await db.select()
      .from(requestItemsTable)
      .innerJoin(itemsTable, eq(requestItemsTable.item_id, itemsTable.id))
      .innerJoin(categoriesTable, eq(itemsTable.category_id, categoriesTable.id))
      .where(inArray(requestItemsTable.request_id, requestIds))
      .execute();

    // Transform the data to match RequestWithDetails schema
    return requests.map(request => {
      const requestItems = requestItemsResults
        .filter(result => (result as any).request_items.request_id === request.id)
        .map(result => {
          const requestItem = (result as any).request_items;
          const item = (result as any).items;
          const category = (result as any).categories;
          
          return {
            id: requestItem.id,
            request_id: requestItem.request_id,
            item_id: requestItem.item_id,
            quantity: requestItem.quantity,
            estimated_unit_cost: requestItem.estimated_unit_cost 
              ? parseFloat(requestItem.estimated_unit_cost) 
              : null,
            actual_unit_cost: requestItem.actual_unit_cost 
              ? parseFloat(requestItem.actual_unit_cost) 
              : null,
            notes: requestItem.notes,
            created_at: requestItem.created_at,
            item: {
              id: item.id,
              name: item.name,
              description: item.description,
              category_id: item.category_id,
              unit: item.unit,
              estimated_price: item.estimated_price 
                ? parseFloat(item.estimated_price) 
                : null,
              is_active: item.is_active,
              created_at: item.created_at,
              updated_at: item.updated_at,
              category: {
                id: category.id,
                name: category.name,
                description: category.description,
                is_active: category.is_active,
                created_at: category.created_at,
                updated_at: category.updated_at
              }
            }
          };
        });

      const manager = request.manager_id 
        ? managers.find(m => m.id === request.manager_id) || null
        : null;
      
      const admin = request.admin_id 
        ? admins.find(a => a.id === request.admin_id) || null
        : null;

      return {
        id: request.id,
        staff_id: request.staff_id,
        title: request.title,
        justification: request.justification,
        status: request.status,
        manager_id: request.manager_id,
        manager_notes: request.manager_notes,
        admin_id: request.admin_id,
        admin_notes: request.admin_notes,
        total_estimated_cost: request.total_estimated_cost 
          ? parseFloat(request.total_estimated_cost) 
          : null,
        actual_cost: request.actual_cost 
          ? parseFloat(request.actual_cost) 
          : null,
        purchase_date: request.purchase_date,
        received_date: request.received_date,
        created_at: request.created_at,
        updated_at: request.updated_at,
        staff: staff[0],
        manager,
        admin,
        items: requestItems
      };
    });
  } catch (error) {
    console.error('Failed to fetch staff requests:', error);
    throw error;
  }
}