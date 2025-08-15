import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateRequestDialog } from '@/components/CreateRequestDialog';
import type { User, RequestWithDetails } from '../../../server/src/schema';

interface StaffDashboardProps {
  user: User;
}

export function StaffDashboard({ user }: StaffDashboardProps) {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await trpc.getStaffRequests.query({ staffId: user.id });
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRequestCreated = () => {
    setShowCreateDialog(false);
    loadRequests(); // Refresh the list
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'manager_approved':
        return '✅';
      case 'manager_rejected':
        return '❌';
      case 'admin_processing':
        return '🔄';
      case 'purchased':
        return '💳';
      case 'received':
        return '📦';
      case 'cancelled':
        return '🚫';
      default:
        return '❓';
    }
  };

  const statusCounts = requests.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalRequested = requests
    .filter(r => r.total_estimated_cost !== null)
    .reduce((sum, r) => sum + (r.total_estimated_cost || 0), 0);

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome back, {user.name}! 👋
          </h2>
          <p className="text-gray-600 mt-2">
            Track your procurement requests and create new ones
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <span className="text-2xl">⏳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts['pending'] || 0}</div>
            <p className="text-xs text-gray-500">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(statusCounts['manager_approved'] || 0) + 
               (statusCounts['admin_processing'] || 0) + 
               (statusCounts['purchased'] || 0) + 
               (statusCounts['received'] || 0)}
            </div>
            <p className="text-xs text-gray-500">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRequested.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Requested</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Guide for First Time Users */}
      {requests.length === 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚀 Get Started with Procurement
            </CardTitle>
            <CardDescription>
              Create your first request to get office supplies and materials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4">
                <div className="text-3xl mb-2">📝</div>
                <h3 className="font-medium">1. Create Request</h3>
                <p className="text-sm text-gray-600">Describe what you need and why</p>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl mb-2">👨‍💼</div>
                <h3 className="font-medium">2. Manager Reviews</h3>
                <p className="text-sm text-gray-600">Your manager approves or provides feedback</p>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl mb-2">📦</div>
                <h3 className="font-medium">3. Admin Processes</h3>
                <p className="text-sm text-gray-600">Items are purchased and delivered</p>
              </div>
            </div>
            <div className="text-center">
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Requests */}
      <Card>
        <CardHeader>
          <CardTitle>📋 My Requests</CardTitle>
          <CardDescription>
            Track the status of your procurement requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📝</span>
              <p className="text-gray-500">No requests yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request: RequestWithDetails) => (
                <div key={request.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getStatusIcon(request.status)}</span>
                        <h3 className="text-lg font-semibold">{request.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Created {request.created_at.toLocaleDateString()}
                      </p>
                      {request.justification && (
                        <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                          {request.justification}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Items Summary */}
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-2">Items ({request.items.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {request.items.slice(0, 3).map((item) => (
                        <span key={item.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {item.quantity}x {item.item.name}
                        </span>
                      ))}
                      {request.items.length > 3 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          +{request.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="space-y-2 text-sm">
                    {request.manager_notes && (
                      <div className="bg-blue-50 p-3 rounded">
                        <strong>Manager Notes:</strong> {request.manager_notes}
                      </div>
                    )}
                    {request.admin_notes && (
                      <div className="bg-purple-50 p-3 rounded">
                        <strong>Admin Notes:</strong> {request.admin_notes}
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t">
                      {request.total_estimated_cost && (
                        <span className="font-medium">
                          Estimated: ${request.total_estimated_cost.toFixed(2)}
                        </span>
                      )}
                      {request.actual_cost && (
                        <span className="font-medium text-green-600">
                          Actual: ${request.actual_cost.toFixed(2)}
                        </span>
                      )}
                      {request.purchase_date && (
                        <span className="text-gray-600">
                          Purchased: {request.purchase_date.toLocaleDateString()}
                        </span>
                      )}
                      {request.received_date && (
                        <span className="text-green-600">
                          Received: {request.received_date.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Request Dialog */}
      <CreateRequestDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        staffId={user.id}
        onRequestCreated={handleRequestCreated}
      />
    </div>
  );
}