import { useState } from 'react';
import { X, CheckCircle, Truck, Package, ClipboardCheck } from 'lucide-react';
import type { DispatchPlan, CustomerTransaction } from '@/types';

interface ViewDispatchPlanModalProps {
  plan: DispatchPlan;
  onClose: () => void;
}

export function ViewDispatchPlanModal({ plan, onClose }: ViewDispatchPlanModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerStatuses, setCustomerStatuses] = useState<Record<string, string>>(
    Object.fromEntries(plan.customerTransactions.map(c => [c.id, c.status || 'Not Delivered']))
  );
  const [remarks, setRemarks] = useState(plan.remarks || '');

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/dispatch-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'For Dispatch',
          approvedBy: 'Current User', // This would come from authentication
          approvedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        alert('Dispatch plan approved successfully');
        onClose();
      } else {
        alert('Failed to approve dispatch plan');
      }
    } catch (error) {
      console.error('Error approving dispatch plan:', error);
      alert('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispatch = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/dispatch-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Inbound',
          timeOfDispatch: new Date().toISOString(),
          dispatchedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        alert('Dispatch plan dispatched successfully');
        onClose();
      } else {
        alert('Failed to dispatch');
      }
    } catch (error) {
      console.error('Error dispatching:', error);
      alert('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmArrival = async () => {
    setIsProcessing(true);
    try {
      // Update customer transaction statuses
      const updatedTransactions = plan.customerTransactions.map(ct => ({
        ...ct,
        status: customerStatuses[ct.id] as any,
      }));

      const response = await fetch(`/api/dispatch-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'For Clearance',
          timeOfArrival: new Date().toISOString(),
          arrivedAt: new Date().toISOString(),
          customerTransactions: updatedTransactions,
          remarks,
        }),
      });

      if (response.ok) {
        alert('Arrival confirmed successfully');
        onClose();
      } else {
        alert('Failed to confirm arrival');
      }
    } catch (error) {
      console.error('Error confirming arrival:', error);
      alert('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmClearance = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/dispatch-plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Completed',
          clearedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        alert('Clearance confirmed successfully');
        onClose();
      } else {
        alert('Failed to confirm clearance');
      }
    } catch (error) {
      console.error('Error confirming clearance:', error);
      alert('An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomerStatusChange = (customerId: string, status: string) => {
    setCustomerStatuses({
      ...customerStatuses,
      [customerId]: status,
    });
  };

  // Render content based on status
  const renderContent = () => {
    switch (plan.status) {
      case 'For Approval':
        return (
          <>
            <DispatchPlanSummary plan={plan} />
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {isProcessing ? 'Approving...' : 'Approve Dispatch Plan'}
              </button>
            </div>
          </>
        );

      case 'For Dispatch':
        return (
          <>
            <DispatchPlanSummary plan={plan} />
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatch}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <Truck className="w-5 h-5" />
                {isProcessing ? 'Dispatching...' : 'Dispatch Now'}
              </button>
            </div>
          </>
        );

      case 'Inbound':
        return (
          <>
            <div className="space-y-6">
              {/* Customer Transactions with Status */}
              <div>
                <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Customer Transactions
                </h3>
                <div className="space-y-3">
                  {plan.customerTransactions.map((customer) => (
                    <div key={customer.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="mb-3">
                        <p className="text-sm text-gray-900">{customer.customerName}</p>
                        <p className="text-xs text-gray-600">{customer.address}</p>
                        <p className="text-xs text-gray-500 mt-1">{customer.itemsOrdered}</p>
                        <p className="text-sm text-gray-900 mt-1">₱{customer.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 mb-2">Delivery Status</label>
                        <div className="flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`status-${customer.id}`}
                              value="Not Delivered"
                              checked={customerStatuses[customer.id] === 'Not Delivered'}
                              onChange={(e) => handleCustomerStatusChange(customer.id, e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Not Delivered</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`status-${customer.id}`}
                              value="Has Concerns"
                              checked={customerStatuses[customer.id] === 'Has Concerns'}
                              onChange={(e) => handleCustomerStatusChange(customer.id, e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Has Concerns</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`status-${customer.id}`}
                              value="Has Return"
                              checked={customerStatuses[customer.id] === 'Has Return'}
                              onChange={(e) => handleCustomerStatusChange(customer.id, e.target.value)}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">Has Return</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispatch Plan Summary */}
              <div>
                <h3 className="text-gray-900 mb-4">Dispatch Plan Summary</h3>
                <DispatchPlanSummary plan={plan} compact />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Enter any remarks or notes about the delivery..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArrival}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {isProcessing ? 'Confirming...' : 'Confirm Arrival'}
              </button>
            </div>
          </>
        );

      case 'For Clearance':
        return (
          <>
            <DispatchPlanSummary plan={plan} showCustomerStatus />
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearance}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <ClipboardCheck className="w-5 h-5" />
                {isProcessing ? 'Processing...' : 'Confirm Clearance'}
              </button>
            </div>
          </>
        );

      default:
        return <DispatchPlanSummary plan={plan} showCustomerStatus />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-gray-900">{plan.dpNumber}</h2>
            <p className="text-sm text-gray-600">Status: <span className={getStatusColor(plan.status)}>{plan.status}</span></p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// Helper component to display dispatch plan summary
function DispatchPlanSummary({ plan, compact = false, showCustomerStatus = false }: { plan: DispatchPlan; compact?: boolean; showCustomerStatus?: boolean }) {
  return (
    <div className="space-y-4">
      {!compact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">DP Number</label>
            <p className="text-sm text-gray-900">{plan.dpNumber}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <p className={`text-sm ${getStatusColor(plan.status)}`}>{plan.status}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Driver</label>
          <p className="text-sm text-gray-900">{plan.driverName}</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Salesman</label>
          <p className="text-sm text-gray-900">{plan.salesmanName}</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Vehicle</label>
          <p className="text-sm text-gray-900">{plan.vehiclePlateNo}</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Starting Point</label>
          <p className="text-sm text-gray-900">{plan.startingPoint}</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estimated Dispatch</label>
          <p className="text-sm text-gray-900">{new Date(plan.estimatedDispatch).toLocaleString()}</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Estimated Arrival</label>
          <p className="text-sm text-gray-900">{plan.estimatedArrival ? new Date(plan.estimatedArrival).toLocaleString() : 'N/A'}</p>
        </div>
        {plan.timeOfDispatch && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Actual Dispatch</label>
            <p className="text-sm text-gray-900">{new Date(plan.timeOfDispatch).toLocaleString()}</p>
          </div>
        )}
        {plan.timeOfArrival && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Actual Arrival</label>
            <p className="text-sm text-gray-900">{new Date(plan.timeOfArrival).toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Customer Transactions */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Customer Transactions ({plan.customerTransactions.length})</label>
        <div className="space-y-2">
          {plan.customerTransactions.map((customer, index) => (
            <div key={customer.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{index + 1}. {customer.customerName}</p>
                  <p className="text-xs text-gray-600">{customer.address}</p>
                  <p className="text-xs text-gray-500 mt-1">{customer.itemsOrdered}</p>
                  <p className="text-sm text-gray-900 mt-1">₱{customer.amount.toLocaleString()}</p>
                </div>
                {showCustomerStatus && (
                  <span className={`text-xs px-2 py-1 rounded-full ${getCustomerStatusColor(customer.status)}`}>
                    {customer.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            Total Amount: <span className="text-gray-900">₱{plan.customerTransactions.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</span>
          </p>
        </div>
      </div>

      {plan.remarks && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Remarks</label>
          <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded-lg border border-gray-200">{plan.remarks}</p>
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'For Approval': 'text-yellow-700',
    'For Dispatch': 'text-blue-700',
    'Inbound': 'text-purple-700',
    'For Clearance': 'text-pink-700',
    'Completed': 'text-green-700',
  };
  return colors[status] || 'text-gray-700';
}

function getCustomerStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Not Delivered': 'bg-red-100 text-red-800',
    'Has Concerns': 'bg-yellow-100 text-yellow-800',
    'Has Return': 'bg-orange-100 text-orange-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
