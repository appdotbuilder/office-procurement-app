import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createItemInputSchema,
  updateItemInputSchema,
  createRequestInputSchema,
  managerActionInputSchema,
  adminProcessInputSchema,
  requestFilterSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { updateUser } from './handlers/update_user';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { updateCategory } from './handlers/update_category';
import { createItem } from './handlers/create_item';
import { getItems } from './handlers/get_items';
import { updateItem } from './handlers/update_item';
import { createRequest } from './handlers/create_request';
import { getRequests } from './handlers/get_requests';
import { getRequestById } from './handlers/get_request_by_id';
import { managerActionOnRequest } from './handlers/manager_action_on_request';
import { adminProcessRequest } from './handlers/admin_process_request';
import { getStaffRequests } from './handlers/get_staff_requests';
import { getPendingRequestsForManager } from './handlers/get_pending_requests_for_manager';
import { getReports } from './handlers/get_reports';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes (Super Admin only)
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Category management routes (Super Admin only)
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  getCategories: publicProcedure
    .query(() => getCategories()),

  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),

  // Item management routes (Super Admin only)
  createItem: publicProcedure
    .input(createItemInputSchema)
    .mutation(({ input }) => createItem(input)),

  getItems: publicProcedure
    .query(() => getItems()),

  updateItem: publicProcedure
    .input(updateItemInputSchema)
    .mutation(({ input }) => updateItem(input)),

  // Request management routes
  createRequest: publicProcedure
    .input(createRequestInputSchema)
    .mutation(({ input }) => createRequest(input)),

  getRequests: publicProcedure
    .input(requestFilterSchema.optional())
    .query(({ input }) => getRequests(input)),

  getRequestById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getRequestById(input.id)),

  getStaffRequests: publicProcedure
    .input(z.object({ staffId: z.number() }))
    .query(({ input }) => getStaffRequests(input.staffId)),

  // Manager actions
  getPendingRequestsForManager: publicProcedure
    .query(() => getPendingRequestsForManager()),

  managerActionOnRequest: publicProcedure
    .input(managerActionInputSchema)
    .mutation(({ input }) => managerActionOnRequest(input)),

  // Admin actions (Super Admin only)
  adminProcessRequest: publicProcedure
    .input(adminProcessInputSchema)
    .mutation(({ input }) => adminProcessRequest(input)),

  // Reports (Manager and Super Admin)
  getReports: publicProcedure
    .query(() => getReports()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();