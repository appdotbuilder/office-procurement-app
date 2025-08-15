import { db } from '../db';
import { requestsTable, requestItemsTable, itemsTable, categoriesTable } from '../db/schema';
import { sql, eq, and, isNotNull } from 'drizzle-orm';

export interface ProcurementReport {
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    completedRequests: number;
    totalSpent: number;
    averageProcessingTime: number; // in days
    topCategories: Array<{
        categoryName: string;
        requestCount: number;
        totalAmount: number;
    }>;
    monthlyTrends: Array<{
        month: string;
        requestCount: number;
        totalAmount: number;
    }>;
}

export async function getReports(): Promise<ProcurementReport> {
    try {
        // Get basic request counts by status
        const statusCounts = await db
            .select({
                status: requestsTable.status,
                count: sql<number>`count(*)::int`
            })
            .from(requestsTable)
            .groupBy(requestsTable.status)
            .execute();

        // Initialize counts
        let totalRequests = 0;
        let pendingRequests = 0;
        let approvedRequests = 0;
        let rejectedRequests = 0;
        let completedRequests = 0;

        statusCounts.forEach(row => {
            totalRequests += row.count;
            
            switch (row.status) {
                case 'pending':
                    pendingRequests = row.count;
                    break;
                case 'manager_approved':
                case 'admin_processing':
                case 'purchased':
                    approvedRequests += row.count;
                    break;
                case 'manager_rejected':
                case 'cancelled':
                    rejectedRequests += row.count;
                    break;
                case 'received':
                    completedRequests = row.count;
                    break;
            }
        });

        // Calculate total spent (sum of actual costs for received requests)
        const totalSpentResult = await db
            .select({
                totalSpent: sql<string>`coalesce(sum(${requestsTable.actual_cost}), 0)`
            })
            .from(requestsTable)
            .where(and(
                eq(requestsTable.status, 'received'),
                isNotNull(requestsTable.actual_cost)
            ))
            .execute();

        const totalSpent = parseFloat(totalSpentResult[0].totalSpent);

        // Calculate average processing time for completed requests
        const processingTimeResult = await db
            .select({
                avgProcessingDays: sql<string>`coalesce(avg(extract(epoch from (${requestsTable.received_date} - ${requestsTable.created_at})) / 86400), 0)`
            })
            .from(requestsTable)
            .where(and(
                eq(requestsTable.status, 'received'),
                isNotNull(requestsTable.received_date)
            ))
            .execute();

        const averageProcessingTime = parseFloat(processingTimeResult[0].avgProcessingDays);

        // Get top categories by request count and total amount
        const topCategoriesResult = await db
            .select({
                categoryName: categoriesTable.name,
                requestCount: sql<number>`count(distinct ${requestsTable.id})::int`,
                totalAmount: sql<string>`coalesce(sum(${requestsTable.actual_cost}), 0)`
            })
            .from(requestsTable)
            .innerJoin(requestItemsTable, eq(requestsTable.id, requestItemsTable.request_id))
            .innerJoin(itemsTable, eq(requestItemsTable.item_id, itemsTable.id))
            .innerJoin(categoriesTable, eq(itemsTable.category_id, categoriesTable.id))
            .groupBy(categoriesTable.id, categoriesTable.name)
            .orderBy(sql`count(distinct ${requestsTable.id}) desc`)
            .limit(5)
            .execute();

        const topCategories = topCategoriesResult.map(row => ({
            categoryName: row.categoryName,
            requestCount: row.requestCount,
            totalAmount: parseFloat(row.totalAmount)
        }));

        // Get monthly trends for the last 12 months
        const monthlyTrendsResult = await db
            .select({
                month: sql<string>`to_char(${requestsTable.created_at}, 'YYYY-MM')`,
                requestCount: sql<number>`count(*)::int`,
                totalAmount: sql<string>`coalesce(sum(${requestsTable.actual_cost}), 0)`
            })
            .from(requestsTable)
            .where(sql`${requestsTable.created_at} >= now() - interval '12 months'`)
            .groupBy(sql`to_char(${requestsTable.created_at}, 'YYYY-MM')`)
            .orderBy(sql`to_char(${requestsTable.created_at}, 'YYYY-MM') desc`)
            .execute();

        const monthlyTrends = monthlyTrendsResult.map(row => ({
            month: row.month,
            requestCount: row.requestCount,
            totalAmount: parseFloat(row.totalAmount)
        }));

        return {
            totalRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            completedRequests,
            totalSpent,
            averageProcessingTime,
            topCategories,
            monthlyTrends
        };
    } catch (error) {
        console.error('Report generation failed:', error);
        throw error;
    }
}