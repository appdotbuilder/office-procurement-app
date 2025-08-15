import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async (userData: CreateUserInput) => {
  const result = await db.insert(usersTable)
    .values({
      email: userData.email,
      name: userData.name,
      role: userData.role
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user email', async () => {
    // Create test user
    const testUser = await createTestUser({
      email: 'original@example.com',
      name: 'Original Name',
      role: 'staff'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'updated@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('updated@example.com');
    expect(result.name).toEqual('Original Name'); // Should remain unchanged
    expect(result.role).toEqual('staff'); // Should remain unchanged
    expect(result.is_active).toEqual(true); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });

  it('should update user name', async () => {
    const testUser = await createTestUser({
      email: 'test@example.com',
      name: 'Original Name',
      role: 'manager'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.name).toEqual('Updated Name');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.role).toEqual('manager'); // Should remain unchanged
  });

  it('should update user role', async () => {
    const testUser = await createTestUser({
      email: 'test@example.com',
      name: 'Test User',
      role: 'staff'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      role: 'manager'
    };

    const result = await updateUser(updateInput);

    expect(result.role).toEqual('manager');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.name).toEqual('Test User'); // Should remain unchanged
  });

  it('should update user active status', async () => {
    const testUser = await createTestUser({
      email: 'test@example.com',
      name: 'Test User',
      role: 'staff'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.is_active).toEqual(false);
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const testUser = await createTestUser({
      email: 'original@example.com',
      name: 'Original Name',
      role: 'staff'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'updated@example.com',
      name: 'Updated Name',
      role: 'manager',
      is_active: false
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(testUser.id);
    expect(result.email).toEqual('updated@example.com');
    expect(result.name).toEqual('Updated Name');
    expect(result.role).toEqual('manager');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const testUser = await createTestUser({
      email: 'test@example.com',
      name: 'Test User',
      role: 'staff'
    });

    const updateInput: UpdateUserInput = {
      id: testUser.id,
      email: 'updated@example.com',
      name: 'Updated User'
    };

    await updateUser(updateInput);

    // Verify changes were persisted
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].email).toEqual('updated@example.com');
    expect(updatedUser[0].name).toEqual('Updated User');
    expect(updatedUser[0].role).toEqual('staff');
    expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999, // Non-existent ID
      email: 'test@example.com'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/user with id 99999 not found/i);
  });

  it('should handle email uniqueness constraint', async () => {
    // Create two test users
    const user1 = await createTestUser({
      email: 'user1@example.com',
      name: 'User 1',
      role: 'staff'
    });

    const user2 = await createTestUser({
      email: 'user2@example.com',
      name: 'User 2',
      role: 'manager'
    });

    // Try to update user2 with user1's email
    const updateInput: UpdateUserInput = {
      id: user2.id,
      email: 'user1@example.com'
    };

    await expect(updateUser(updateInput)).rejects.toThrow();
  });

  it('should update only the updated_at timestamp when no changes are made', async () => {
    const testUser = await createTestUser({
      email: 'test@example.com',
      name: 'Test User',
      role: 'staff'
    });

    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserInput = {
      id: testUser.id
    };

    const result = await updateUser(updateInput);

    expect(result.email).toEqual(testUser.email);
    expect(result.name).toEqual(testUser.name);
    expect(result.role).toEqual(testUser.role);
    expect(result.is_active).toEqual(testUser.is_active);
    expect(result.updated_at.getTime()).toBeGreaterThan(testUser.updated_at.getTime());
  });
});