import { db } from '../db';
import { requestsTable, usersTable } from '../db/schema';
import { type ManagerActionInput, type Request } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function managerActionOnRequest(input: ManagerActionInput): Promise<Request> {
  try {
    // Validate that the request exists and is in 'pending' status
    const existingRequest = await db.select()
      .from(requestsTable)
      .where(eq(requestsTable.id, input.request_id))
      .execute();

    if (existingRequest.length === 0) {
      throw new Error(`Request with ID ${input.request_id} not found`);
    }

    const request = existingRequest[0];
    if (request.status !== 'pending') {
      throw new Error(`Request ${input.request_id} is not in pending status. Current status: ${request.status}`);
    }

    // Validate that the manager exists and has the correct role
    const manager = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, input.manager_id),
        eq(usersTable.role, 'manager'),
        eq(usersTable.is_active, true)
      ))
      .execute();

    if (manager.length === 0) {
      throw new Error(`Manager with ID ${input.manager_id} not found or not active`);
    }

    // Determine the new status based on the action
    const newStatus = input.action === 'approve' ? 'manager_approved' : 'manager_rejected';

    // Update the request with manager action
    const result = await db.update(requestsTable)
      .set({
        status: newStatus,
        manager_id: input.manager_id,
        manager_notes: input.notes || null,
        updated_at: new Date()
      })
      .where(eq(requestsTable.id, input.request_id))
      .returning()
      .execute();

    const updatedRequest = result[0];

    // Convert numeric fields back to numbers
    return {
      ...updatedRequest,
      total_estimated_cost: updatedRequest.total_estimated_cost ? parseFloat(updatedRequest.total_estimated_cost) : null,
      actual_cost: updatedRequest.actual_cost ? parseFloat(updatedRequest.actual_cost) : null
    };
  } catch (error) {
    console.error('Manager action on request failed:', error);
    throw error;
  }
}