import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Eye } from 'lucide-react';
import { CreateRequestDialog } from '@/components/CreateRequestDialog';
import { RequestDetailDialog } from '@/components/RequestDetailDialog';
import type { User, RequestWithDetails, RequestFilter, RequestStatus } from '../../../server/src/schema';

interface RequestManagementProps {
  user: User;
}

export function RequestManagement({ user }: RequestManagementProps) {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingAction, setProcessingAction] = useState<number | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  // Admin processing state
  const [adminAction, setAdminAction] = useState<'start_processing' | 'mark_purchased' | 'mark_received' | 'cancel'>('start_processing');
  const [actualCost, setActualCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [receivedDate, setReceivedDate] = useState('');

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      let requestsData: RequestWithDetails[];
      
      if (user.role === 'staff') {
        requestsData = await trpc.getStaffRequests.query({ staffId: user.id });
      } else {
        const filter: RequestFilter = {};
        if (statusFilter !== 'all') {
          filter.status = statusFilter as RequestStatus;
        }
        requestsData = await trpc.getRequests.query(filter);
      }
      
      setRequests(requestsData);
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role, statusFilter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRequestCreated = () => {
    setShowCreateDialog(false);
    loadRequests();
  };

  const handleManagerAction = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      setProcessingAction(requestId);
      await trpc.managerActionOnRequest.mutate({
        request_id: requestId,
        manager_id: user.id,
        action,
        notes: actionNotes || null
      });
      
      await loadRequests();
      setActionNotes('');
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleAdminAction = async (requestId: number) => {
    try {
      setProcessingAction(requestId);
      await trpc.adminProcessRequest.mutate({
        request_id: requestId,
        admin_id: user.id,
        action: adminAction,
        notes: actionNotes || null,
        actual_cost: actualCost ? parseFloat(actualCost) : null,
        purchase_date: purchaseDate ? new Date(purchaseDate) : null,
        received_date: receivedDate ? new Date(receivedDate) : null
      });
      
      await loadRequests();
      setActionNotes('');
      setActualCost('');
      setPurchaseDate('');
      setReceivedDate('');
    } catch (error) {
      console.error('Failed to process request:', error);
    } finally {
      setProcessingAction(null);
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

  const canTakeAction = (request: RequestWithDetails) => {
    if (user.role === 'manager' && request.status === 'pending') {
      return true;
    }
    if (user.role === 'super_admin' && ['manager_approved', 'admin_processing', 'purchased'].includes(request.status)) {
      return true;
    }
    return false;
  };

  const filteredRequests = requests.filter((request: RequestWithDetails) => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.staff.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📋 Request Management</CardTitle>
          <CardDescription>Loading requests...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>📋 Request Management</CardTitle>
              <CardDescription>
                {user.role === 'staff' 
                  ? 'View and track your procurement requests' 
                  : 'Manage procurement requests based on your role'
                }
              </CardDescription>
            </div>
            {user.role === 'staff' && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {user.role !== 'staff' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="manager_approved">Manager Approved</SelectItem>
                  <SelectItem value="manager_rejected">Manager Rejected</SelectItem>
                  <SelectItem value="admin_processing">Admin Processing</SelectItem>
                  <SelectItem value="purchased">Purchased</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📋</span>
              <p className="text-gray-500 mb-4">
                {requests.length === 0 
                  ? user.role === 'staff'
                    ? "No requests yet. Create your first one above!"
                    : "No requests found in the system."
                  : "No requests match your search criteria."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request: RequestWithDetails) => (
                <div key={request.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  canTakeAction(request) ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{getStatusIcon(request.status)}</span>
                        <h3 className="text-lg font-semibold">{request.title}</h3>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Requested by: <strong>{request.staff.name}</strong></p>
                        <p>Created: {request.created_at.toLocaleDateString()}</p>
                        {request.manager && (
                          <p>Manager: <strong>{request.manager.name}</strong></p>
                        )}
                        {request.admin && (
                          <p>Admin: <strong>{request.admin.name}</strong></p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {request.total_estimated_cost && (
                        <span className="text-sm font-medium text-blue-600">
                          Est: ${request.total_estimated_cost.toFixed(2)}
                        </span>
                      )}
                      {request.actual_cost && (
                        <span className="text-sm font-medium text-green-600">
                          Actual: ${request.actual_cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {request.items.slice(0, 3).map((item) => (
                        <Badge key={item.id} variant="outline" className="text-xs">
                          {item.quantity}x {item.item.name}
                        </Badge>
                      ))}
                      {request.items.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{request.items.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>

                    {canTakeAction(request) && (
                      <div className="flex space-x-2">
                        {user.role === 'manager' && request.status === 'pending' && (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled={processingAction === request.id}
                                >
                                  ✅ Approve
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Approve Request</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Approve "{request.title}" and forward to admin for processing.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="my-4">
                                  <Textarea
                                    value={actionNotes}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setActionNotes(e.target.value)}
                                    placeholder="Add approval notes (optional)..."
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
                                  size="sm"
                                  variant="destructive"
                                  disabled={processingAction === request.id}
                                >
                                  ❌ Reject
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reject Request</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Reject "{request.title}". Please provide a reason.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="my-4">
                                  <Textarea
                                    value={actionNotes}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setActionNotes(e.target.value)}
                                    placeholder="Reason for rejection (required)..."
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
                          </>
                        )}

                        {user.role === 'super_admin' && ['manager_approved', 'admin_processing', 'purchased'].includes(request.status) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                                disabled={processingAction === request.id}
                              >
                                🔄 Process
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Process Request</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Update the status and details for "{request.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="space-y-4 my-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Action</label>
                                  <Select value={adminAction} onValueChange={(value: any) => setAdminAction(value)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="start_processing">Start Processing</SelectItem>
                                      <SelectItem value="mark_purchased">Mark as Purchased</SelectItem>
                                      <SelectItem value="mark_received">Mark as Received</SelectItem>
                                      <SelectItem value="cancel">Cancel Request</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {(adminAction === 'mark_purchased' || adminAction === 'mark_received') && (
                                  <div>
                                    <label className="block text-sm font-medium mb-2">Actual Cost</label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={actualCost}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActualCost(e.target.value)}
                                      placeholder="Total actual cost"
                                    />
                                  </div>
                                )}

                                {adminAction === 'mark_purchased' && (
                                  <div>
                                    <label className="block text-sm font-medium mb-2">Purchase Date</label>
                                    <Input
                                      type="date"
                                      value={purchaseDate}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPurchaseDate(e.target.value)}
                                    />
                                  </div>
                                )}

                                {adminAction === 'mark_received' && (
                                  <div>
                                    <label className="block text-sm font-medium mb-2">Received Date</label>
                                    <Input
                                      type="date"
                                      value={receivedDate}
                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReceivedDate(e.target.value)}
                                    />
                                  </div>
                                )}

                                <div>
                                  <label className="block text-sm font-medium mb-2">Notes</label>
                                  <Textarea
                                    value={actionNotes}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setActionNotes(e.target.value)}
                                    placeholder="Add processing notes..."
                                  />
                                </div>
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleAdminAction(request.id)}
                                  className="bg-purple-600 hover:bg-purple-700"
                                >
                                  Process Request
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Request Dialog */}
      {user.role === 'staff' && (
        <CreateRequestDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          staffId={user.id}
          onRequestCreated={handleRequestCreated}
        />
      )}

      {/* Request Detail Dialog */}
      {selectedRequest && (
        <RequestDetailDialog
          request={selectedRequest}
          open={selectedRequest !== null}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
        />
      )}
    </div>
  );
}