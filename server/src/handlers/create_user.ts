import { type CreateUserInput, type User } from '../schema';

export async function createUser(input: CreateUserInput): Promise<User> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new user and persisting it in the database.
    // Only Super Admin should be able to create users.
    return Promise.resolve({
        id: 0, // Placeholder ID
        email: input.email,
        name: input.name,
        role: input.role,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
    } as User);
}