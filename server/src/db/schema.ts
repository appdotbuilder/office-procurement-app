import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer, 
  boolean,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'manager', 'staff']);
export const requestStatusEnum = pgEnum('request_status', [
  'pending',
  'manager_approved', 
  'manager_rejected',
  'admin_processing',
  'purchased',
  'received',
  'cancelled'
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Categories table
export const categoriesTable = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Items table
export const itemsTable = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  category_id: integer('category_id').notNull().references(() => categoriesTable.id),
  unit: text('unit').notNull(),
  estimated_price: numeric('estimated_price', { precision: 10, scale: 2 }), // Nullable by default
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Requests table
export const requestsTable = pgTable('requests', {
  id: serial('id').primaryKey(),
  staff_id: integer('staff_id').notNull().references(() => usersTable.id),
  title: text('title').notNull(),
  justification: text('justification'), // Nullable by default
  status: requestStatusEnum('status').default('pending').notNull(),
  manager_id: integer('manager_id').references(() => usersTable.id), // Nullable by default
  manager_notes: text('manager_notes'), // Nullable by default
  admin_id: integer('admin_id').references(() => usersTable.id), // Nullable by default
  admin_notes: text('admin_notes'), // Nullable by default
  total_estimated_cost: numeric('total_estimated_cost', { precision: 10, scale: 2 }), // Nullable by default
  actual_cost: numeric('actual_cost', { precision: 10, scale: 2 }), // Nullable by default
  purchase_date: timestamp('purchase_date'), // Nullable by default
  received_date: timestamp('received_date'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Request items table (junction table for requests and items)
export const requestItemsTable = pgTable('request_items', {
  id: serial('id').primaryKey(),
  request_id: integer('request_id').notNull().references(() => requestsTable.id, { onDelete: 'cascade' }),
  item_id: integer('item_id').notNull().references(() => itemsTable.id),
  quantity: integer('quantity').notNull(),
  estimated_unit_cost: numeric('estimated_unit_cost', { precision: 10, scale: 2 }), // Nullable by default
  actual_unit_cost: numeric('actual_unit_cost', { precision: 10, scale: 2 }), // Nullable by default
  notes: text('notes'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  staffRequests: many(requestsTable, { relationName: 'staff_requests' }),
  managedRequests: many(requestsTable, { relationName: 'managed_requests' }),
  processedRequests: many(requestsTable, { relationName: 'processed_requests' })
}));

export const categoriesRelations = relations(categoriesTable, ({ many }) => ({
  items: many(itemsTable)
}));

export const itemsRelations = relations(itemsTable, ({ one, many }) => ({
  category: one(categoriesTable, {
    fields: [itemsTable.category_id],
    references: [categoriesTable.id]
  }),
  requestItems: many(requestItemsTable)
}));

export const requestsRelations = relations(requestsTable, ({ one, many }) => ({
  staff: one(usersTable, {
    fields: [requestsTable.staff_id],
    references: [usersTable.id],
    relationName: 'staff_requests'
  }),
  manager: one(usersTable, {
    fields: [requestsTable.manager_id],
    references: [usersTable.id],
    relationName: 'managed_requests'
  }),
  admin: one(usersTable, {
    fields: [requestsTable.admin_id],
    references: [usersTable.id],
    relationName: 'processed_requests'
  }),
  requestItems: many(requestItemsTable)
}));

export const requestItemsRelations = relations(requestItemsTable, ({ one }) => ({
  request: one(requestsTable, {
    fields: [requestItemsTable.request_id],
    references: [requestsTable.id]
  }),
  item: one(itemsTable, {
    fields: [requestItemsTable.item_id],
    references: [itemsTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Category = typeof categoriesTable.$inferSelect;
export type NewCategory = typeof categoriesTable.$inferInsert;

export type Item = typeof itemsTable.$inferSelect;
export type NewItem = typeof itemsTable.$inferInsert;

export type Request = typeof requestsTable.$inferSelect;
export type NewRequest = typeof requestsTable.$inferInsert;

export type RequestItem = typeof requestItemsTable.$inferSelect;
export type NewRequestItem = typeof requestItemsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  categories: categoriesTable,
  items: itemsTable,
  requests: requestsTable,
  requestItems: requestItemsTable
};