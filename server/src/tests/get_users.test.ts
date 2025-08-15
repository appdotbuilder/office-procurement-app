import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { getUsers } from '../handlers/get_users';
import { eq } from 'drizzle-orm';

// Test user data
const testUsers: CreateUserInput[] = [
  {
    email: 'admin@example.com',
    name: 'Super Admin User',
    role: 'super_admin'
  },
  {
    email: 'manager@example.com',
    name: 'Manager User',
    role: 'manager'
  },
  {
    email: 'staff@example.com',
    name: 'Staff User',
    role: 'staff'
  }
];

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users from database', async () => {
    // Create test users
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    // Verify all users are returned
    const emails = result.map(user => user.email);
    expect(emails).toContain('admin@example.com');
    expect(emails).toContain('manager@example.com');
    expect(emails).toContain('staff@example.com');
  });

  it('should return users with all required fields', async () => {
    // Create a single test user
    await db.insert(usersTable)
      .values([testUsers[0]])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify all required fields are present
    expect(user.id).toBeDefined();
    expect(typeof user.id).toBe('number');
    expect(user.email).toBe('admin@example.com');
    expect(user.name).toBe('Super Admin User');
    expect(user.role).toBe('super_admin');
    expect(user.is_active).toBe(true);
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should return users ordered by creation date (natural database order)', async () => {
    // Create users with slight delay to ensure different timestamps
    await db.insert(usersTable)
      .values([testUsers[0]])
      .execute();
    
    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(usersTable)
      .values([testUsers[1]])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result[0].email).toBe('admin@example.com');
    expect(result[1].email).toBe('manager@example.com');
    
    // Verify the first user was created before the second
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });

  it('should include both active and inactive users', async () => {
    // Create an active and inactive user
    const activeUser = await db.insert(usersTable)
      .values([testUsers[0]])
      .returning()
      .execute();

    // Update user to be inactive
    await db.update(usersTable)
      .set({ is_active: false })
      .where(eq(usersTable.id, activeUser[0].id))
      .execute();

    // Create another active user
    await db.insert(usersTable)
      .values([testUsers[1]])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    const activeUsers = result.filter(user => user.is_active);
    const inactiveUsers = result.filter(user => !user.is_active);
    
    expect(activeUsers).toHaveLength(1);
    expect(inactiveUsers).toHaveLength(1);
    expect(inactiveUsers[0].email).toBe('admin@example.com');
  });

  it('should return users with different roles', async () => {
    // Create users with all different roles
    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    
    const roles = result.map(user => user.role);
    expect(roles).toContain('super_admin');
    expect(roles).toContain('manager');
    expect(roles).toContain('staff');
  });
});