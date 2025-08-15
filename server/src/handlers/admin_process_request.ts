import { db } from '../db';
import { requestsTable, usersTable } from '../db/schema';
import { type AdminProcessInput, type Request } from '../schema';
import { eq, and } from 'drizzle-orm';

export const adminProcessRequest = async (input: AdminProcessInput): Promise<Request> => {
  try {
    // First, verify the admin exists and has super_admin role
    const adminUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.admin_id))
      .execute();

    if (adminUser.length === 0) {
      throw new Error('Admin user not found');
    }

    if (adminUser[0].role !== 'super_admin') {
      throw new Error('Only Super Admin can process requests');
    }

    // Get the existing request to validate status transitions
    const existingRequest = await db.select()
      .from(requestsTable)
      .where(eq(requestsTable.id, input.request_id))
      .execute();

    if (existingRequest.length === 0) {
      throw new Error('Request not found');
    }

    const request = existingRequest[0];

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'manager_approved': ['start_processing', 'cancel'],
      'admin_processing': ['mark_purchased', 'cancel'],
      'purchased': ['mark_received', 'cancel'],
      'received': [], // Terminal state
      'cancelled': [] // Terminal state
    };

    const allowedActions = validTransitions[request.status] || [];
    if (!allowedActions.includes(input.action)) {
      throw new Error(`Cannot perform action '${input.action}' on request with status '${request.status}'`);
    }

    // Determine new status based on action
    let newStatus: 'admin_processing' | 'purchased' | 'received' | 'cancelled';
    switch (input.action) {
      case 'start_processing':
        newStatus = 'admin_processing';
        break;
      case 'mark_purchased':
        newStatus = 'purchased';
        break;
      case 'mark_received':
        newStatus = 'received';
        break;
      case 'cancel':
        newStatus = 'cancelled';
        break;
      default:
        throw new Error(`Invalid action: ${input.action}`);
    }

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      admin_id: input.admin_id,
      updated_at: new Date()
    };

    // Add optional fields if provided
    if (input.notes !== undefined) {
      updateData.admin_notes = input.notes;
    }

    if (input.actual_cost !== undefined) {
      updateData.actual_cost = input.actual_cost !== null ? input.actual_cost.toString() : null;
    }

    if (input.purchase_date !== undefined) {
      updateData.purchase_date = input.purchase_date;
    }

    if (input.received_date !== undefined) {
      updateData.received_date = input.received_date;
    }

    // Update the request
    const result = await db.update(requestsTable)
      .set(updateData)
      .where(eq(requestsTable.id, input.request_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to update request');
    }

    // Convert numeric fields back to numbers before returning
    const updatedRequest = result[0];
    return {
      ...updatedRequest,
      total_estimated_cost: updatedRequest.total_estimated_cost 
        ? parseFloat(updatedRequest.total_estimated_cost) 
        : null,
      actual_cost: updatedRequest.actual_cost 
        ? parseFloat(updatedRequest.actual_cost) 
        : null
    };
  } catch (error) {
    console.error('Admin process request failed:', error);
    throw error;
  }
};