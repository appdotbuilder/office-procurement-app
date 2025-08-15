import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { RequestWithDetails } from '../../../server/src/schema';

interface RequestDetailDialogProps {
  request: RequestWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestDetailDialog({ request, open, onOpenChange }: RequestDetailDialogProps) {
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

  const getProgressSteps = () => {
    const steps = [
      { key: 'pending', label: 'Submitted', icon: '📝', completed: true },
      { key: 'manager_approved', label: 'Manager Review', icon: '👨‍💼', completed: ['manager_approved', 'admin_processing', 'purchased', 'received'].includes(request.status) },
      { key: 'admin_processing', label: 'Admin Processing', icon: '🔄', completed: ['admin_processing', 'purchased', 'received'].includes(request.status) },
      { key: 'purchased', label: 'Purchased', icon: '💳', completed: ['purchased', 'received'].includes(request.status) },
      { key: 'received', label: 'Received', icon: '📦', completed: request.status === 'received' }
    ];

    // Handle rejected/cancelled states
    if (request.status === 'manager_rejected') {
      steps[1] = { ...steps[1], completed: false, icon: '❌', label: 'Rejected by Manager' };
      return steps.slice(0, 2);
    }
    if (request.status === 'cancelled') {
      return [...steps.slice(0, 3), { key: 'cancelled', label: 'Cancelled', icon: '🚫', completed: true }];
    }

    return steps;
  };

  const progressSteps = getProgressSteps();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getStatusIcon(request.status)}</span>
            <div>
              <DialogTitle className="text-xl">{request.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                Request #{request.id} • 
                <Badge className={getStatusColor(request.status)}>
                  {request.status.replace('_', ' ')}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Timeline */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">📈 Request Progress</h3>
            <div className="flex items-center space-x-2">
              {progressSteps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm ${
                    step.completed 
                      ? request.status === 'manager_rejected' && step.key === 'manager_approved'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    <span className="text-lg">{step.icon}</span>
                  </div>
                  <div className="ml-2 text-xs">
                    <div className={`font-medium ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.label}
                    </div>
                  </div>
                  {index < progressSteps.length - 1 && (
                    <div className={`h-1 w-8 mx-2 ${
                      step.completed && progressSteps[index + 1].completed 
                        ? 'bg-green-300' 
                        : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">👤 Request Information</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Requested by:</strong> {request.staff.name}</div>
                <div><strong>Email:</strong> {request.staff.email}</div>
                <div><strong>Created:</strong> {request.created_at.toLocaleString()}</div>
                <div><strong>Last Updated:</strong> {request.updated_at.toLocaleString()}</div>
                {request.manager && (
                  <div><strong>Manager:</strong> {request.manager.name}</div>
                )}
                {request.admin && (
                  <div><strong>Admin:</strong> {request.admin.name}</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">💰 Cost Information</h3>
              <div className="space-y-2 text-sm">
                {request.total_estimated_cost && (
                  <div>
                    <strong>Estimated Cost:</strong> 
                    <span className="ml-2 text-blue-600 font-medium">
                      ${request.total_estimated_cost.toFixed(2)}
                    </span>
                  </div>
                )}
                {request.actual_cost && (
                  <div>
                    <strong>Actual Cost:</strong> 
                    <span className="ml-2 text-green-600 font-medium">
                      ${request.actual_cost.toFixed(2)}
                    </span>
                  </div>
                )}
                {request.purchase_date && (
                  <div><strong>Purchase Date:</strong> {request.purchase_date.toLocaleDateString()}</div>
                )}
                {request.received_date && (
                  <div><strong>Received Date:</strong> {request.received_date.toLocaleDateString()}</div>
                )}
              </div>
            </div>
          </div>

          {/* Justification */}
          {request.justification && (
            <div>
              <h3 className="font-semibold mb-3">📝 Justification</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm">{request.justification}</p>
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <h3 className="font-semibold mb-3">📦 Requested Items ({request.items.length})</h3>
            <div className="space-y-3">
              {request.items.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-lg">{item.item.name}</h4>
                      <p className="text-sm text-gray-600">
                        Category: {item.item.category.name} • Unit: {item.item.unit}
                      </p>
                      {item.item.description && (
                        <p className="text-sm text-gray-500 mt-1">{item.item.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">Qty: {item.quantity}</div>
                      <div className="text-sm text-gray-600">
                        {item.estimated_unit_cost && (
                          <div>Est: ${item.estimated_unit_cost.toFixed(2)} each</div>
                        )}
                        {item.actual_unit_cost && (
                          <div className="text-green-600">Actual: ${item.actual_unit_cost.toFixed(2)} each</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {item.notes && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-300">
                      <p className="text-sm"><strong>Notes:</strong> {item.notes}</p>
                    </div>
                  )}

                  {/* Item total */}
                  <div className="mt-3 pt-2 border-t flex justify-between items-center">
                    <span className="text-sm text-gray-600">Item Total:</span>
                    <div className="text-right">
                      {item.estimated_unit_cost && (
                        <div className="text-blue-600 font-medium">
                          Est: ${(item.estimated_unit_cost * item.quantity).toFixed(2)}
                        </div>
                      )}
                      {item.actual_unit_cost && (
                        <div className="text-green-600 font-medium">
                          Actual: ${(item.actual_unit_cost * item.quantity).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes and Comments */}
          {(request.manager_notes || request.admin_notes) && (
            <div>
              <h3 className="font-semibold mb-3">💬 Notes & Comments</h3>
              <div className="space-y-3">
                {request.manager_notes && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-300">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">👨‍💼</span>
                      <strong className="text-blue-800">Manager Notes</strong>
                      {request.manager && (
                        <span className="text-sm text-blue-600">({request.manager.name})</span>
                      )}
                    </div>
                    <p className="text-sm">{request.manager_notes}</p>
                  </div>
                )}
                
                {request.admin_notes && (
                  <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-300">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">👑</span>
                      <strong className="text-purple-800">Admin Notes</strong>
                      {request.admin && (
                        <span className="text-sm text-purple-600">({request.admin.name})</span>
                      )}
                    </div>
                    <p className="text-sm">{request.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          <Separator />
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">📊 Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div><strong>Total Items:</strong> {request.items.length}</div>
                <div><strong>Total Quantity:</strong> {request.items.reduce((sum, item) => sum + item.quantity, 0)}</div>
                <div><strong>Current Status:</strong> 
                  <Badge className={`ml-2 ${getStatusColor(request.status)}`}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                {request.total_estimated_cost && (
                  <div><strong>Estimated Total:</strong> 
                    <span className="text-blue-600 font-semibold ml-2">
                      ${request.total_estimated_cost.toFixed(2)}
                    </span>
                  </div>
                )}
                {request.actual_cost && (
                  <div><strong>Actual Total:</strong> 
                    <span className="text-green-600 font-semibold ml-2">
                      ${request.actual_cost.toFixed(2)}
                    </span>
                  </div>
                )}
                {request.actual_cost && request.total_estimated_cost && (
                  <div className="text-xs text-gray-600 mt-1">
                    Difference: {request.actual_cost > request.total_estimated_cost ? '+' : ''}
                    ${(request.actual_cost - request.total_estimated_cost).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}