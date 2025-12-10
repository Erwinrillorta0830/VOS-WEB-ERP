import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Vehicle, Driver, CustomerTransaction } from '@/types';
import { PreDispatchSelectionModal } from './PreDispatchSelectionModal';

interface CreateDispatchPlanModalProps {
  onClose: () => void;
}

export function CreateDispatchPlanModal({ onClose }: CreateDispatchPlanModalProps) {
  const [formData, setFormData] = useState({
    startingPoint: '',
    vehicleId: '',
    driverId: '',
    salesmanName: '',
    estimatedDispatch: '',
    estimatedArrival: '',
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([]);
  const [isPreDispatchModalOpen, setIsPreDispatchModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      setVehicles(data.data || []);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/drivers');
      const data = await response.json();
      setDrivers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddCustomers = (customers: CustomerTransaction[]) => {
    setCustomerTransactions(customers);
    setIsPreDispatchModalOpen(false);
  };

  const handleRemoveCustomer = (customerId: string) => {
    setCustomerTransactions(customerTransactions.filter(c => c.id !== customerId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicleId || !formData.driverId || !formData.startingPoint || !formData.estimatedDispatch) {
      alert('Please fill in all required fields');
      return;
    }

    if (customerTransactions.length === 0) {
      alert('Please add at least one customer transaction');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
      const selectedDriver = drivers.find(d => d.id === formData.driverId);

      const response = await fetch('/api/dispatch-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          vehiclePlateNo: selectedVehicle?.plateNo || '',
          driverName: selectedDriver?.name || '',
          salesmanId: 'S001', // This would come from a salesman selector
          salesmanName: formData.salesmanName || 'Unknown Salesman',
          customerTransactions,
        }),
      });

      if (response.ok) {
        alert('Dispatch plan created successfully');
        onClose();
      } else {
        alert('Failed to create dispatch plan');
      }
    } catch (error) {
      console.error('Error creating dispatch plan:', error);
      alert('An error occurred while creating the dispatch plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-gray-900">Create Dispatch Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Starting Point */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Starting Point <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="startingPoint"
                  value={formData.startingPoint}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Manila Warehouse"
                  required
                />
              </div>

              {/* Vehicle */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  name="vehicleId"
                  value={formData.vehicleId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plateNo} - {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Driver <span className="text-red-500">*</span>
                </label>
                <select
                  name="driverId"
                  value={formData.driverId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Driver</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salesman */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Salesman Name
                </label>
                <input
                  type="text"
                  name="salesmanName"
                  value={formData.salesmanName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter salesman name"
                />
              </div>

              {/* Date and Time Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Estimated Time of Dispatch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="estimatedDispatch"
                    value={formData.estimatedDispatch}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Estimated Time of Arrival
                  </label>
                  <input
                    type="datetime-local"
                    name="estimatedArrival"
                    value={formData.estimatedArrival}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Pre-Dispatch Plan Selection */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Customer Transactions <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsPreDispatchModalOpen(true)}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Customer Transactions
                </button>

                {/* Customer List */}
                {customerTransactions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {customerTransactions.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{customer.customerName}</p>
                          <p className="text-xs text-gray-600">{customer.address}</p>
                          <p className="text-xs text-gray-500 mt-1">{customer.itemsOrdered} - ₱{customer.amount.toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomer(customer.id)}
                          className="text-red-600 hover:text-red-700 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        Total Customers: <span className="font-medium">{customerTransactions.length}</span>
                      </p>
                      <p className="text-sm text-gray-700">
                        Total Amount: <span className="font-medium">₱{customerTransactions.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Dispatch Plan'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Pre-Dispatch Selection Modal */}
      {isPreDispatchModalOpen && (
        <PreDispatchSelectionModal
          onClose={() => setIsPreDispatchModalOpen(false)}
          onConfirm={handleAddCustomers}
          existingCustomers={customerTransactions}
        />
      )}
    </>
  );
}
