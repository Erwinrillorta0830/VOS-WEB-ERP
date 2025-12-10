import { useState } from 'react';
import { X, Tag } from 'lucide-react';
import { Delivery } from './Deliveries';

interface TagDeliveryModalProps {
  delivery: Delivery;
  onClose: () => void;
}

const unfulfilledReasons = [
  'Traffic delay',
  'Vehicle breakdown',
  'Customer not available',
  'Weather conditions',
  'Route blockage',
];

const rejectedReasons = [
  'Wrong items delivered',
  'Damaged goods',
  'Incomplete order',
  'Late delivery',
  'Quality issues',
  'Customer refused',
];

export function TagDeliveryModal({ delivery, onClose }: TagDeliveryModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const isUnfulfilled = delivery.status === 'Unfulfilled';
  const isRejected = delivery.status === 'Rejected';
  const needsTagging = isUnfulfilled || isRejected;

  const reasons = isUnfulfilled ? unfulfilledReasons : isRejected ? rejectedReasons : [];

  const handleTag = () => {
    const tagValue = customReason.trim() || selectedReason;
    console.log('Tagging delivery:', delivery.id, 'with:', tagValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
    style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-gray-900 mb-1">Delivery Details</h2>
              <p className="text-gray-600">{delivery.invoiceNo}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Delivery Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Invoice Date</p>
              <p className="text-gray-900">{delivery.invoiceDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Document No.</p>
              <p className="text-gray-900">{delivery.documentNo}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Supplier</p>
              <p className="text-gray-900">{delivery.supplier}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Driver</p>
              <p className="text-gray-900">{delivery.driver}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Destination</p>
              <p className="text-gray-900">{delivery.cityTown}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Vehicle Plate No.</p>
              <p className="text-gray-900">{delivery.plateNo}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                delivery.status === 'Fulfilled'
                  ? 'bg-green-100 text-green-800'
                  : delivery.status === 'Unfulfilled'
                  ? 'bg-yellow-100 text-yellow-800'
                  : delivery.status === 'Approved'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {delivery.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Amount</p>
              <p className="text-gray-900">₱{delivery.amount.toLocaleString()}</p>
            </div>
          </div>

          {/* Current Tag */}
          {delivery.tag && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Current Tag</p>
              <p className="text-gray-900">{delivery.tag}</p>
            </div>
          )}

          {/* Tagging Section */}
          {needsTagging && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-gray-900 mb-4">
                Tag Delivery - {isUnfulfilled ? 'Unfulfilled' : 'Rejected'} Reason
              </h3>

              {/* Common Reasons Dropdown */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Select Common Reason</label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a reason...</option>
                  {reasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Reason Input */}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Or Type Custom Reason</label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom reason here..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Custom reason will override the selected common reason
                </p>
              </div>

              {/* Tag Button */}
              <button
                onClick={handleTag}
                disabled={!selectedReason && !customReason.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Tag className="w-5 h-5" />
                Tag Delivery
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
