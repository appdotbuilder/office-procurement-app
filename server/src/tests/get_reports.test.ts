import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, itemsTable, requestsTable, requestItemsTable } from '../db/schema';
import { getReports, type ProcurementReport } from '../handlers/get_reports';

describe('getReports', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty report when no data exists', async () => {
    const report = await getReports();

    expect(report.totalRequests).toEqual(0);
    expect(report.pendingRequests).toEqual(0);
    expect(report.approvedRequests).toEqual(0);
    expect(report.rejectedRequests).toEqual(0);
    expect(report.completedRequests).toEqual(0);
    expect(report.totalSpent).toEqual(0);
    expect(report.averageProcessingTime).toEqual(0);
    expect(report.topCategories).toEqual([]);
    expect(report.monthlyTrends).toEqual([]);
  });

  it('should calculate basic request statistics correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable).values([
      { email: 'staff@test.com', name: 'Staff User', role: 'staff' },
      { email: 'manager@test.com', name: 'Manager User', role: 'manager' },
      { email: 'admin@test.com', name: 'Admin User', role: 'super_admin' }
    ]).returning().execute();

    const [staffUser, managerUser, adminUser] = users;

    // Create test categories
    const categories = await db.insert(categoriesTable).values([
      { name: 'Office Supplies', description: 'General office items' },
      { name: 'Electronics', description: 'Computer and electronic equipment' }
    ]).returning().execute();

    // Create test items
    const items = await db.insert(itemsTable).values([
      { 
        name: 'Laptop', 
        category_id: categories[1].id, 
        unit: 'piece', 
        estimated_price: '1000.00' 
      },
      { 
        name: 'Printer Paper', 
        category_id: categories[0].id, 
        unit: 'ream', 
        estimated_price: '5.99' 
      }
    ]).returning().execute();

    // Create requests with different statuses
    const requests = await db.insert(requestsTable).values([
      {
        staff_id: staffUser.id,
        title: 'Pending Request',
        status: 'pending'
      },
      {
        staff_id: staffUser.id,
        title: 'Approved Request',
        status: 'manager_approved',
        manager_id: managerUser.id
      },
      {
        staff_id: staffUser.id,
        title: 'Rejected Request',
        status: 'manager_rejected',
        manager_id: managerUser.id
      },
      {
        staff_id: staffUser.id,
        title: 'Completed Request',
        status: 'received',
        manager_id: managerUser.id,
        admin_id: adminUser.id,
        actual_cost: '1500.00',
        purchase_date: new Date('2024-01-15'),
        received_date: new Date('2024-01-20'),
        created_at: new Date('2024-01-15') // Set creation date to match purchase date
      },
      {
        staff_id: staffUser.id,
        title: 'Processing Request',
        status: 'admin_processing',
        manager_id: managerUser.id,
        admin_id: adminUser.id
      }
    ]).returning().execute();

    // Add request items
    await db.insert(requestItemsTable).values([
      { request_id: requests[0].id, item_id: items[0].id, quantity: 1 },
      { request_id: requests[1].id, item_id: items[1].id, quantity: 10 },
      { request_id: requests[2].id, item_id: items[0].id, quantity: 1 },
      { request_id: requests[3].id, item_id: items[0].id, quantity: 2 },
      { request_id: requests[4].id, item_id: items[1].id, quantity: 5 }
    ]).execute();

    const report = await getReports();

    expect(report.totalRequests).toEqual(5);
    expect(report.pendingRequests).toEqual(1);
    expect(report.approvedRequests).toEqual(2); // manager_approved + admin_processing
    expect(report.rejectedRequests).toEqual(1);
    expect(report.completedRequests).toEqual(1);
    expect(report.totalSpent).toEqual(1500);
    expect(report.averageProcessingTime).toEqual(5); // 5 days from creation to received
  });

  it('should calculate top categories correctly', async () => {
    // Create test users
    const users = await db.insert(usersTable).values([
      { email: 'staff@test.com', name: 'Staff User', role: 'staff' },
      { email: 'manager@test.com', name: 'Manager User', role: 'manager' },
      { email: 'admin@test.com', name: 'Admin User', role: 'super_admin' }
    ]).returning().execute();

    const [staffUser, managerUser, adminUser] = users;

    // Create test categories
    const categories = await db.insert(categoriesTable).values([
      { name: 'Office Supplies', description: 'General office items' },
      { name: 'Electronics', description: 'Computer equipment' },
      { name: 'Furniture', description: 'Office furniture' }
    ]).returning().execute();

    // Create test items
    const items = await db.insert(itemsTable).values([
      { name: 'Laptop', category_id: categories[1].id, unit: 'piece', estimated_price: '1000.00' },
      { name: 'Paper', category_id: categories[0].id, unit: 'ream', estimated_price: '5.99' },
      { name: 'Desk', category_id: categories[2].id, unit: 'piece', estimated_price: '300.00' }
    ]).returning().execute();

    // Create multiple requests for electronics category
    const requests = await db.insert(requestsTable).values([
      {
        staff_id: staffUser.id,
        title: 'Electronics Request 1',
        status: 'received',
        actual_cost: '2000.00'
      },
      {
        staff_id: staffUser.id,
        title: 'Electronics Request 2',
        status: 'received',
        actual_cost: '1500.00'
      },
      {
        staff_id: staffUser.id,
        title: 'Office Supplies Request',
        status: 'received',
        actual_cost: '100.00'
      }
    ]).returning().execute();

    // Add request items
    await db.insert(requestItemsTable).values([
      { request_id: requests[0].id, item_id: items[0].id, quantity: 2 },
      { request_id: requests[1].id, item_id: items[0].id, quantity: 1 },
      { request_id: requests[2].id, item_id: items[1].id, quantity: 10 }
    ]).execute();

    const report = await getReports();

    expect(report.topCategories).toHaveLength(2);
    
    // Electronics should be first (2 requests, $3500 total)
    expect(report.topCategories[0].categoryName).toEqual('Electronics');
    expect(report.topCategories[0].requestCount).toEqual(2);
    expect(report.topCategories[0].totalAmount).toEqual(3500);

    // Office Supplies should be second (1 request, $100 total)
    expect(report.topCategories[1].categoryName).toEqual('Office Supplies');
    expect(report.topCategories[1].requestCount).toEqual(1);
    expect(report.topCategories[1].totalAmount).toEqual(100);
  });

  it('should generate monthly trends correctly', async () => {
    // Create test user
    const users = await db.insert(usersTable).values([
      { email: 'staff@test.com', name: 'Staff User', role: 'staff' }
    ]).returning().execute();

    const staffUser = users[0];

    // Create test category and item
    const categories = await db.insert(categoriesTable).values([
      { name: 'Test Category', description: 'Test' }
    ]).returning().execute();

    const items = await db.insert(itemsTable).values([
      { name: 'Test Item', category_id: categories[0].id, unit: 'piece', estimated_price: '100.00' }
    ]).returning().execute();

    // Create requests for different months
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 15);
    const twoMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 2, 15);

    const requests = await db.insert(requestsTable).values([
      {
        staff_id: staffUser.id,
        title: 'Current Month Request',
        status: 'received',
        actual_cost: '500.00',
        created_at: currentDate
      },
      {
        staff_id: staffUser.id,
        title: 'Last Month Request',
        status: 'received',
        actual_cost: '300.00',
        created_at: lastMonth
      },
      {
        staff_id: staffUser.id,
        title: 'Two Months Ago Request',
        status: 'received',
        actual_cost: '200.00',
        created_at: twoMonthsAgo
      }
    ]).returning().execute();

    // Add request items
    await db.insert(requestItemsTable).values([
      { request_id: requests[0].id, item_id: items[0].id, quantity: 5 },
      { request_id: requests[1].id, item_id: items[0].id, quantity: 3 },
      { request_id: requests[2].id, item_id: items[0].id, quantity: 2 }
    ]).execute();

    const report = await getReports();

    expect(report.monthlyTrends.length).toBeGreaterThan(0);
    
    // Check that we have data for at least the months we created
    const monthlyData = report.monthlyTrends;
    expect(monthlyData.some(trend => trend.totalAmount > 0)).toBe(true);
    
    // Verify data structure
    monthlyData.forEach(trend => {
      expect(trend.month).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof trend.requestCount).toBe('number');
      expect(typeof trend.totalAmount).toBe('number');
    });
  });

  it('should handle requests without actual costs correctly', async () => {
    // Create test user
    const users = await db.insert(usersTable).values([
      { email: 'staff@test.com', name: 'Staff User', role: 'staff' }
    ]).returning().execute();

    const staffUser = users[0];

    // Create requests without actual costs
    await db.insert(requestsTable).values([
      {
        staff_id: staffUser.id,
        title: 'Request Without Cost',
        status: 'pending'
      },
      {
        staff_id: staffUser.id,
        title: 'Received Without Cost',
        status: 'received',
        actual_cost: null // Explicitly null
      }
    ]).execute();

    const report = await getReports();

    expect(report.totalRequests).toEqual(2);
    expect(report.totalSpent).toEqual(0); // Should be 0 when no actual costs
    expect(report.averageProcessingTime).toEqual(0); // Should be 0 when no received dates
  });
});