import { useState } from 'react';
import { Users, Plus, Search, Eye, AlertTriangle, FileText, Calendar, X, Save } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  licenseNo: string;
  licenseExpiry: string;
  licenseType: string;
  contactNo: string;
  email: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  assignedVehicle: string | null;
  certificateExpiry: string;
  violations: number;
}

const mockDrivers: Driver[] = [
  {
    id: '1',
    name: 'John Smith',
    licenseNo: 'LIC-2024-001',
    licenseExpiry: '2026-05-15',
    licenseType: 'Professional',
    contactNo: '+63 912 345 6789',
    email: 'john.smith@fleet.com',
    status: 'Active',
    assignedVehicle: 'ABC-1234',
    certificateExpiry: '2026-05-20',
    violations: 2
  },
  {
    id: '2',
    name: 'Maria Garcia',
    licenseNo: 'LIC-2024-002',
    licenseExpiry: '2025-12-10',
    licenseType: 'Professional',
    contactNo: '+63 923 456 7890',
    email: 'maria.garcia@fleet.com',
    status: 'Active',
    assignedVehicle: 'XYZ-5678',
    certificateExpiry: '2025-12-15',
    violations: 0
  },
  {
    id: '3',
    name: 'Robert Johnson',
    licenseNo: 'LIC-2023-003',
    licenseExpiry: '2025-11-25',
    licenseType: 'Professional',
    contactNo: '+63 934 567 8901',
    email: 'robert.johnson@fleet.com',
    status: 'Active',
    assignedVehicle: null,
    certificateExpiry: '2025-11-30',
    violations: 1
  },
  {
    id: '4',
    name: 'Sarah Williams',
    licenseNo: 'LIC-2024-004',
    licenseExpiry: '2026-08-20',
    licenseType: 'Professional',
    contactNo: '+63 945 678 9012',
    email: 'sarah.williams@fleet.com',
    status: 'On Leave',
    assignedVehicle: 'GHI-3456',
    certificateExpiry: '2026-08-25',
    violations: 0
  },
  {
    id: '5',
    name: 'Michael Brown',
    licenseNo: 'LIC-2024-005',
    licenseExpiry: '2027-03-10',
    licenseType: 'Professional',
    contactNo: '+63 956 789 0123',
    email: 'michael.brown@fleet.com',
    status: 'Active',
    assignedVehicle: 'JKL-7890',
    certificateExpiry: '2027-03-15',
    violations: 3
  },
];

export function DriverManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    licenseNo: '',
    licenseExpiry: '',
    licenseType: 'Professional',
    contactNo: '',
    email: '',
    certificateExpiry: '',
  });

  const filteredDrivers = mockDrivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.licenseNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const expiringCount = mockDrivers.filter(driver => {
    const daysUntilExpiry = getDaysUntilExpiry(driver.licenseExpiry);
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  }).length;

  function getDaysUntilExpiry(expiryDate: string) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  const getStatusColor = (status: Driver['status']) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'On Leave':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Driver Management</h1>
        <p className="text-gray-600">Manage driver profiles, licenses, and certificates</p>
      </div>

      {/* Alert Banner */}
      {expiringCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-yellow-900">License Expiry Alert</p>
            <p className="text-sm text-yellow-700">
              {expiringCount} driver license(s) are expiring within 30 days
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Total Drivers</p>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-gray-900">{mockDrivers.length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Active Drivers</p>
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-gray-900">{mockDrivers.filter(d => d.status === 'Active').length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Assigned Vehicles</p>
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-gray-900">{mockDrivers.filter(d => d.assignedVehicle).length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Expiring Soon</p>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-gray-900">{expiringCount}</p>
        </div>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or license no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Driver
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">License No.</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">License Expiry</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Contact</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Assigned Vehicle</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Violations</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDrivers.map((driver) => {
                const daysUntilExpiry = getDaysUntilExpiry(driver.licenseExpiry);
                return (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{driver.name}</td>
                    <td className="px-6 py-4 text-gray-700">{driver.licenseNo}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{driver.licenseExpiry}</p>
                        {daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
                          <p className="text-xs text-yellow-600">{daysUntilExpiry} days left</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{driver.contactNo}</td>
                    <td className="px-6 py-4 text-gray-700">{driver.assignedVehicle || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-gray-900 ${driver.violations > 0 ? 'text-red-600' : ''}`}>
                        {driver.violations}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(driver.status)}`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedDriver(driver)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredDrivers.map((driver) => {
          const daysUntilExpiry = getDaysUntilExpiry(driver.licenseExpiry);
          return (
            <div key={driver.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-gray-900">{driver.name}</p>
                  <p className="text-sm text-gray-600">{driver.licenseNo}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(driver.status)}`}>
                  {driver.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">License Expiry:</span>
                  <span className="text-gray-900">{driver.licenseExpiry}</span>
                </div>
                {daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
                  <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                    License expires in {daysUntilExpiry} days
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Contact:</span>
                  <span className="text-gray-900">{driver.contactNo}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Assigned Vehicle:</span>
                  <span className="text-gray-900">{driver.assignedVehicle || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Violations:</span>
                  <span className={`${driver.violations > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {driver.violations}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedDriver(driver)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                View Profile
              </button>
            </div>
          );
        })}
      </div>

      {/* Driver Details Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-gray-900 mb-1">Driver Profile</h2>
                  <p className="text-gray-600">{selectedDriver.name}</p>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-gray-900 mb-3">Personal Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="text-gray-900">{selectedDriver.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="text-gray-900">{selectedDriver.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contact:</span>
                      <span className="text-gray-900">{selectedDriver.contactNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(selectedDriver.status)}`}>
                        {selectedDriver.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-gray-900 mb-3">License Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">License No.:</span>
                      <span className="text-gray-900">{selectedDriver.licenseNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">License Type:</span>
                      <span className="text-gray-900">{selectedDriver.licenseType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expiry Date:</span>
                      <span className="text-gray-900">{selectedDriver.licenseExpiry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Certificate Expiry:</span>
                      <span className="text-gray-900">{selectedDriver.certificateExpiry}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-gray-900 mb-3">Assignment Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assigned Vehicle:</span>
                      <span className="text-gray-900">{selectedDriver.assignedVehicle || 'Not Assigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Violations:</span>
                      <span className={`${selectedDriver.violations > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {selectedDriver.violations}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedDriver(null)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Add New Driver</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">License Number</label>
                  <input
                    type="text"
                    value={newDriver.licenseNo}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseNo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="LIC-2025-XXX"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">License Type</label>
                  <select
                    value={newDriver.licenseType}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="Professional">Professional</option>
                    <option value="Non-Professional">Non-Professional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">License Expiry</label>
                  <input
                    type="date"
                    value={newDriver.licenseExpiry}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseExpiry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Certificate Expiry</label>
                  <input
                    type="date"
                    value={newDriver.certificateExpiry}
                    onChange={(e) => setNewDriver({ ...newDriver, certificateExpiry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Contact Number</label>
                  <input
                    type="tel"
                    value={newDriver.contactNo}
                    onChange={(e) => setNewDriver({ ...newDriver, contactNo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+63 XXX XXX XXXX"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={newDriver.email}
                    onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="driver@fleet.com"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Add Driver
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
