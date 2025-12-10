import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { CustomerTransaction } from '@/types';

interface PreDispatchSelectionModalProps {
  onClose: () => void;
  onConfirm: (customers: CustomerTransaction[]) => void;
  existingCustomers: CustomerTransaction[];
}

export function PreDispatchSelectionModal({ onClose, onConfirm, existingCustomers }: PreDispatchSelectionModalProps) {
  const [customers, setCustomers] = useState<CustomerTransaction[]>(existingCustomers);
  const [newCustomer, setNewCustomer] = useState({
    customerName: '',
    address: '',
    itemsOrdered: '',
    amount: '',
  });

  const handleAddCustomer = () => {
    if (!newCustomer.customerName || !newCustomer.address || !newCustomer.itemsOrdered || !newCustomer.amount) {
      alert('Please fill in all customer fields');
      return;
    }

    const customer: CustomerTransaction = {
      id: `CT${Date.now()}`,
      customerName: newCustomer.customerName,
      address: newCustomer.address,
      itemsOrdered: newCustomer.itemsOrdered,
      amount: parseFloat(newCustomer.amount),
      status: 'Not Delivered',
    };

    setCustomers([...customers, customer]);
    setNewCustomer({
      customerName: '',
      address: '',
      itemsOrdered: '',
      amount: '',
    });
  };

  const handleRemoveCustomer = (id: string) => {
    setCustomers(customers.filter(c => c.id !== id));
  };

  const handleConfirm = () => {
    if (customers.length === 0) {
      alert('Please add at least one customer');
      return;
    }
    onConfirm(customers);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
    style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-gray-900">Select Customer Transactions</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Add Customer Form */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <h3 className="text-gray-900 mb-4">Add Customer Transaction</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={newCustomer.customerName}
                  onChange={(e) => setNewCustomer({ ...newCustomer, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter address"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Items Ordered</label>
                <input
                  type="text"
                  value={newCustomer.itemsOrdered}
                  onChange={(e) => setNewCustomer({ ...newCustomer, itemsOrdered: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 10 boxes of Product A"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCustomer.amount}
                  onChange={(e) => setNewCustomer({ ...newCustomer, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <button
              onClick={handleAddCustomer}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          </div>

          {/* Customer List */}
          <div>
            <h3 className="text-gray-900 mb-4">Selected Customers ({customers.length})</h3>
            {customers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                No customers added yet. Add your first customer above.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {customers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className="flex items-start justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                        <p className="text-sm text-gray-900">{customer.customerName}</p>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{customer.address}</p>
                      <p className="text-xs text-gray-500">{customer.itemsOrdered}</p>
                      <p className="text-sm text-gray-900 mt-2">Amount: ₱{customer.amount.toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveCustomer(customer.id)}
                      className="text-red-600 hover:text-red-700 ml-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {customers.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-gray-900">{customers.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-gray-900">
                      ₱{customers.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={customers.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Confirm ({customers.length} customer{customers.length !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    </div>
  );
}
