import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input for creating a user
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  role: 'staff'
};

const managerInput: CreateUserInput = {
  email: 'manager@example.com',
  name: 'Test Manager',
  role: 'manager'
};

const superAdminInput: CreateUserInput = {
  email: 'admin@example.com',
  name: 'Super Admin',
  role: 'super_admin'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a staff user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.role).toEqual('staff');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a manager user', async () => {
    const result = await createUser(managerInput);

    expect(result.email).toEqual('manager@example.com');
    expect(result.name).toEqual('Test Manager');
    expect(result.role).toEqual('manager');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a super admin user', async () => {
    const result = await createUser(superAdminInput);

    expect(result.email).toEqual('admin@example.com');
    expect(result.name).toEqual('Super Admin');
    expect(result.role).toEqual('super_admin');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].role).toEqual('staff');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple users with unique IDs', async () => {
    const user1 = await createUser(testInput);
    const user2 = await createUser({
      email: 'test2@example.com',
      name: 'Test User 2',
      role: 'manager'
    });

    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('test@example.com');
    expect(user2.email).toEqual('test2@example.com');
    expect(user1.role).toEqual('staff');
    expect(user2.role).toEqual('manager');
  });

  it('should handle unique email constraint violation', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with the same email
    await expect(createUser(testInput)).rejects.toThrow(/unique/i);
  });

  it('should set default values correctly', async () => {
    const result = await createUser(testInput);

    // Check that default values are applied
    expect(result.is_active).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify the timestamps are recent (within the last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    expect(result.created_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
  });

  it('should verify user exists in database after creation', async () => {
    const result = await createUser(managerInput);

    // Query all users to verify creation
    const allUsers = await db.select().from(usersTable).execute();
    
    expect(allUsers).toHaveLength(1);
    expect(allUsers[0].id).toEqual(result.id);
    expect(allUsers[0].email).toEqual('manager@example.com');
    expect(allUsers[0].name).toEqual('Test Manager');
    expect(allUsers[0].role).toEqual('manager');
  });
});