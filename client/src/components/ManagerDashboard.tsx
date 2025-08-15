import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import type { User, RequestWithDetails } from '../../../server/src/schema';

interface ManagerDashboardProps {
  user: User;
}

export function ManagerDashboard({ user }: ManagerDashboardProps) {
  const [pendingRequests, setPendingRequests] = useState<RequestWithDetails[]>([]);
  const [allRequests, setAllRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotes, setActionNotes] = useState('');
  const [processingRequest, setProcessingRequest] = useState<number | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [pending, all] = await Promise.all([
        trpc.getPendingRequestsForManager.query(),
        trpc.getRequests.query()
      ]);
      setPendingRequests(pending);
      setAllRequests(all);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleManagerAction = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      setProcessingRequest(requestId);
      await trpc.managerActionOnRequest.mutate({
        request_id: requestId,
        manager_id: user.id,
        action,
        notes: actionNotes || null
      });
      
      // Refresh data
      await loadDashboardData();
      setActionNotes('');
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
    } finally {
      setProcessingRequest(null);
    }
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

  const myApprovedRequests = allRequests.filter(r => r.manager_id === user.id && r.status !== 'pending');
  const totalApprovedValue = myApprovedRequests
    .filter(r => r.total_estimated_cost !== null)
    .reduce((sum, r) => sum + (r.total_estimated_cost || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
          Review and approve procurement requests from your team
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <span className="text-2xl">⏳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-gray-500">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myApprovedRequests.length}</div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalApprovedValue.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Approved amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Requests Awaiting Approval</CardTitle>
          <CardDescription>
            Review and approve or reject procurement requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🎉</span>
              <p className="text-gray-500">No pending requests! All caught up.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request: RequestWithDetails) => (
                <div key={request.id} className="border rounded-lg p-6 bg-yellow-50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{request.title}</h3>
                      <p className="text-gray-600">
                        Requested by {request.staff.name} on {request.created_at.toLocaleDateString()}
                      </p>
                      {request.justification && (
                        <p className="mt-2 text-sm bg-white p-3 rounded border">
                          <strong>Justification:</strong> {request.justification}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Request Items */}
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">📦 Requested Items:</h4>
                    <div className="space-y-2">
                      {request.items.map((item) => (
                        <div key={item.id} className="bg-white p-3 rounded border">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{item.item.name}</span>
                              <span className="text-gray-500 ml-2">({item.item.category.name})</span>
                            </div>
                            <div className="text-right">
                              <span className="font-medium">Qty: {item.quantity}</span>
                              {item.estimated_unit_cost && (
                                <div className="text-sm text-gray-600">
                                  ${item.estimated_unit_cost.toFixed(2)} each
                                </div>
                              )}
                            </div>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-2">Note: {item.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {request.total_estimated_cost && (
                      <div className="mt-3 text-right">
                        <span className="text-lg font-semibold">
                          Total Estimated: ${request.total_estimated_cost.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          className="bg-green-600 hover:bg-green-700"
                          disabled={processingRequest === request.id}
                        >
                          ✅ Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Request</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to approve "{request.title}"? This will forward it to the admin for processing.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="my-4">
                          <label className="block text-sm font-medium mb-2">
                            Notes (optional):
                          </label>
                          <Textarea
                            value={actionNotes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setActionNotes(e.target.value)}
                            placeholder="Add any notes about this approval..."
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleManagerAction(request.id, 'approve')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve Request
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive"
                          disabled={processingRequest === request.id}
                        >
                          ❌ Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Request</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to reject "{request.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="my-4">
                          <label className="block text-sm font-medium mb-2">
                            Rejection Reason:
                          </label>
                          <Textarea
                            value={actionNotes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setActionNotes(e.target.value)}
                            placeholder="Please provide a reason for rejection..."
                            required
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleManagerAction(request.id, 'reject')}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Reject Request
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {myApprovedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Recently Processed Requests</CardTitle>
            <CardDescription>Requests you have recently approved or rejected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myApprovedRequests.slice(0, 5).map((request: RequestWithDetails) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}