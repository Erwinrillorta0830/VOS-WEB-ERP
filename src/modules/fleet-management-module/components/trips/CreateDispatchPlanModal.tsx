import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import type { Vehicle, Driver, CustomerTransaction } from '@/types';
// Ensure this path matches where your component is located
import { PreDispatchSelectionModal } from './PreDispatchSelectionModal';

interface CreateDispatchPlanModalProps {
  onClose: () => void;
  onSuccess: () => void; // Added this to trigger data refresh in parent
}

export function CreateDispatchPlanModal({ onClose, onSuccess }: CreateDispatchPlanModalProps) {
  // --- State ---
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

  // --- Effects ---
  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, []);

  // --- Mock Fetchers (Replace with your real API calls) ---
  const fetchVehicles = async () => {
    try {
        const response = await fetch('/api/vehicles');
        const data = await response.json();
        setVehicles(data.data || []);
    } catch (error) { console.error('Failed to fetch vehicles', error); }
  };

  const fetchDrivers = async () => {
    try {
        const response = await fetch('/api/drivers');
        const data = await response.json();
        setDrivers(data.data || []);
    } catch (error) { console.error('Failed to fetch drivers', error); }
  };

  // --- Handlers ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

      // Perform the actual API POST
      const response = await fetch('/api/dispatch-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          vehiclePlateNo: selectedVehicle?.plateNo || '',
          driverName: selectedDriver?.name || '',
          salesmanId: 'S001', // Default or logic to generate ID
          salesmanName: formData.salesmanName || 'Unknown Salesman',
          customerTransactions,
        }),
      });

      if (response.ok) {
        alert('Dispatch plan created successfully');
        onSuccess(); // Refresh parent data
        onClose();   // Close modal
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
      <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(4px)' }}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-bold text-gray-900">Create Dispatch Plan</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* Starting Point */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Starting Point <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="startingPoint"
                value={formData.startingPoint}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., Manila Warehouse"
                required
              />
            </div>

            {/* Vehicle */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Vehicle <span className="text-red-500">*</span>
              </label>
              <select
                name="vehicleId"
                value={formData.vehicleId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
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
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Driver <span className="text-red-500">*</span>
              </label>
              <select
                name="driverId"
                value={formData.driverId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
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

            {/* Salesman Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Salesman Name
              </label>
              <input
                type="text"
                name="salesmanName"
                value={formData.salesmanName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter salesman name"
              />
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Estimated Dispatch */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Estimated Time of Dispatch <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    name="estimatedDispatch"
                    value={formData.estimatedDispatch}
                    onChange={handleChange}
                    className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>

              {/* Estimated Arrival */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Estimated Time of Arrival
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    name="estimatedArrival"
                    value={formData.estimatedArrival}
                    onChange={handleChange}
                    className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Customer Transactions Area */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Customer Transactions <span className="text-red-500">*</span>
              </label>
              
              {/* Dashed Selection Box */}
              <div 
                onClick={() => setIsPreDispatchModalOpen(true)}
                className="group border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all min-h-[100px]"
              >
                {customerTransactions.length === 0 ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
                      <Plus className="w-6 h-6 text-gray-500 group-hover:text-blue-600" />
                    </div>
                    <span className="text-gray-500 font-medium group-hover:text-blue-600">Add Customer Transactions</span>
                  </>
                ) : (
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-center w-full mb-2">
                         <span className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add More Transactions
                         </span>
                    </div>
                    {/* Compact List of added items */}
                    {customerTransactions.map((customer) => (
                      <div key={customer.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200 shadow-sm" onClick={(e) => e.stopPropagation()}>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{customer.customerName}</p>
                            <p className="text-xs text-gray-500">₱{customer.amount.toLocaleString()}</p>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => handleRemoveCustomer(customer.id)}
                            className="text-red-400 hover:text-red-600 p-1"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex gap-4 pt-6 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Plan...' : 'Create Dispatch Plan'}
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