import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['super_admin', 'manager', 'staff']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Category schema
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

// Input schema for creating categories
export const createCategoryInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Input schema for updating categories
export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Item schema
export const itemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  category_id: z.number(),
  unit: z.string(),
  estimated_price: z.number().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Item = z.infer<typeof itemSchema>;

// Input schema for creating items
export const createItemInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category_id: z.number(),
  unit: z.string().min(1),
  estimated_price: z.number().positive().nullable().optional()
});

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

// Input schema for updating items
export const updateItemInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category_id: z.number().optional(),
  unit: z.string().min(1).optional(),
  estimated_price: z.number().positive().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;

// Request status enum
export const requestStatusSchema = z.enum([
  'pending',
  'manager_approved',
  'manager_rejected',
  'admin_processing',
  'purchased',
  'received',
  'cancelled'
]);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

// Request schema
export const requestSchema = z.object({
  id: z.number(),
  staff_id: z.number(),
  title: z.string(),
  justification: z.string().nullable(),
  status: requestStatusSchema,
  manager_id: z.number().nullable(),
  manager_notes: z.string().nullable(),
  admin_id: z.number().nullable(),
  admin_notes: z.string().nullable(),
  total_estimated_cost: z.number().nullable(),
  actual_cost: z.number().nullable(),
  purchase_date: z.coerce.date().nullable(),
  received_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Request = z.infer<typeof requestSchema>;

// Input schema for creating requests
export const createRequestInputSchema = z.object({
  staff_id: z.number(),
  title: z.string().min(1),
  justification: z.string().nullable().optional(),
  items: z.array(z.object({
    item_id: z.number(),
    quantity: z.number().int().positive(),
    notes: z.string().nullable().optional()
  })).min(1)
});

export type CreateRequestInput = z.infer<typeof createRequestInputSchema>;

// Input schema for manager approval/rejection
export const managerActionInputSchema = z.object({
  request_id: z.number(),
  manager_id: z.number(),
  action: z.enum(['approve', 'reject']),
  notes: z.string().nullable().optional()
});

export type ManagerActionInput = z.infer<typeof managerActionInputSchema>;

// Input schema for admin processing
export const adminProcessInputSchema = z.object({
  request_id: z.number(),
  admin_id: z.number(),
  action: z.enum(['start_processing', 'mark_purchased', 'mark_received', 'cancel']),
  notes: z.string().nullable().optional(),
  actual_cost: z.number().positive().nullable().optional(),
  purchase_date: z.coerce.date().nullable().optional(),
  received_date: z.coerce.date().nullable().optional()
});

export type AdminProcessInput = z.infer<typeof adminProcessInputSchema>;

// Request item schema
export const requestItemSchema = z.object({
  id: z.number(),
  request_id: z.number(),
  item_id: z.number(),
  quantity: z.number().int(),
  estimated_unit_cost: z.number().nullable(),
  actual_unit_cost: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type RequestItem = z.infer<typeof requestItemSchema>;

// Query filters
export const requestFilterSchema = z.object({
  status: requestStatusSchema.optional(),
  staff_id: z.number().optional(),
  manager_id: z.number().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional()
});

export type RequestFilter = z.infer<typeof requestFilterSchema>;

// Detailed request with relations
export const requestWithDetailsSchema = requestSchema.extend({
  staff: userSchema,
  manager: userSchema.nullable(),
  admin: userSchema.nullable(),
  items: z.array(requestItemSchema.extend({
    item: itemSchema.extend({
      category: categorySchema
    })
  }))
});

export type RequestWithDetails = z.infer<typeof requestWithDetailsSchema>;