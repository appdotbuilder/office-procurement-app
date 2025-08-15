import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { User, RequestWithDetails } from '../../../server/src/schema';

interface SuperAdminDashboardProps {
  user: User;
}

export function SuperAdminDashboard({ user }: SuperAdminDashboardProps) {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [requestsData, usersData] = await Promise.all([
        trpc.getRequests.query(),
        trpc.getUsers.query()
      ]);
      setRequests(requestsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'manager_approved':
        return 'bg-blue-100 text-blue-800';
      case 'manager_rejected':
        return 'bg-red-100 text-red-800';
      case 'admin_processing':
        return 'bg-purple-100 text-purple-800';
      case 'purchased':
        return 'bg-indigo-100 text-indigo-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statusStats = requests.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pendingApprovals = requests.filter(r => r.status === 'manager_approved').length;
  const totalValue = requests
    .filter(r => r.actual_cost !== null)
    .reduce((sum, r) => sum + (r.actual_cost || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
          Welcome back, {user.name}! 👋
        </h2>
        <p className="text-gray-600 mt-2">
          Here's an overview of your procurement system
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <span className="text-2xl">📋</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
            <p className="text-xs text-gray-500">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Processing</CardTitle>
            <span className="text-2xl">⏳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals}</div>
            <p className="text-xs text-gray-500">Awaiting your action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.is_active).length}</div>
            <p className="text-xs text-gray-500">Out of {users.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Completed purchases</p>
          </CardContent>
        </Card>
      </div>

      {/* Request Status Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>📊 Request Status Distribution</CardTitle>
            <CardDescription>Current status of all requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(statusStats).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(status)}>
                    {status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{count}</span>
                  <Progress
                    value={(count / requests.length) * 100}
                    className="w-20"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🚀 Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium">👥 Manage Users</p>
                  <p className="text-sm text-gray-600">Add, edit, or deactivate users</p>
                </div>
                <Badge variant="secondary">{users.length} users</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium">🏷️ Manage Categories</p>
                  <p className="text-sm text-gray-600">Organize procurement items</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="font-medium">📦 Manage Items</p>
                  <p className="text-sm text-gray-600">Update item catalog</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests */}
      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Recent Requests</CardTitle>
            <CardDescription>Latest procurement requests requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.slice(0, 5).map((request: RequestWithDetails) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{request.title}</h4>
                    <p className="text-sm text-gray-600">
                      by {request.staff.name} • {request.created_at.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {request.total_estimated_cost && (
                      <span className="text-sm font-medium">
                        ${request.total_estimated_cost.toFixed(2)}
                      </span>
                    )}
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No requests found. Users will see their requests here once they start creating them.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}