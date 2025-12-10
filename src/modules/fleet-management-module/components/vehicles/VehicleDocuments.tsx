import { useState } from 'react';
import { FileText, Calendar, AlertTriangle, Eye, Plus, Search, X, Save } from 'lucide-react';

interface VehicleDocument {
  id: string;
  plateNo: string;
  vehicleName: string;
  orcrNo: string;
  orcrExpiry: string;
  insuranceProvider: string;
  insuranceNo: string;
  insuranceExpiry: string;
  registrationExpiry: string;
  status: 'Valid' | 'Expiring Soon' | 'Expired';
}

const mockDocuments: VehicleDocument[] = [
  {
    id: '1',
    plateNo: 'ABC-1234',
    vehicleName: 'Toyota Hilux',
    orcrNo: 'OR-2024-001234',
    orcrExpiry: '2025-12-15',
    insuranceProvider: 'ABC Insurance Co.',
    insuranceNo: 'INS-2024-5678',
    insuranceExpiry: '2025-11-30',
    registrationExpiry: '2025-12-15',
    status: 'Expiring Soon'
  },
  {
    id: '2',
    plateNo: 'XYZ-5678',
    vehicleName: 'Isuzu D-Max',
    orcrNo: 'OR-2024-005678',
    orcrExpiry: '2026-03-20',
    insuranceProvider: 'XYZ Insurance',
    insuranceNo: 'INS-2024-9012',
    insuranceExpiry: '2026-03-15',
    registrationExpiry: '2026-03-20',
    status: 'Valid'
  },
  {
    id: '3',
    plateNo: 'DEF-9012',
    vehicleName: 'Ford Ranger',
    orcrNo: 'OR-2023-009012',
    orcrExpiry: '2025-11-25',
    insuranceProvider: 'DEF Insurance',
    insuranceNo: 'INS-2023-3456',
    insuranceExpiry: '2025-11-20',
    registrationExpiry: '2025-11-25',
    status: 'Expired'
  },
  {
    id: '4',
    plateNo: 'GHI-3456',
    vehicleName: 'Mitsubishi L300',
    orcrNo: 'OR-2024-003456',
    orcrExpiry: '2026-01-10',
    insuranceProvider: 'GHI Insurance',
    insuranceNo: 'INS-2024-7890',
    insuranceExpiry: '2026-01-05',
    registrationExpiry: '2026-01-10',
    status: 'Valid'
  },
];

export function VehicleDocuments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleDocument | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDocument, setNewDocument] = useState({
    vehicle: '',
    orcrNo: '',
    orcrExpiry: '',
    insuranceProvider: '',
    insuranceNo: '',
    insuranceExpiry: '',
    registrationExpiry: '',
  });

  const filteredDocuments = mockDocuments.filter(doc =>
    doc.plateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.vehicleName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const expiringCount = mockDocuments.filter(doc => doc.status === 'Expiring Soon' || doc.status === 'Expired').length;

  const getStatusColor = (status: VehicleDocument['status']) => {
    switch (status) {
      case 'Valid':
        return 'bg-green-100 text-green-800';
      case 'Expiring Soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'Expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Vehicle Documents & Registration</h1>
        <p className="text-gray-600">Manage OR/CR, insurance, and registration documents</p>
      </div>

      {/* Alert Banner */}
      {expiringCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-yellow-900">Document Expiry Alert</p>
            <p className="text-sm text-yellow-700">
              {expiringCount} vehicle(s) have documents that are expiring soon or expired
            </p>
          </div>
        </div>
      )}

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by plate no. or vehicle name..."
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
          Add Documents
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">OR/CR No.</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">OR/CR Expiry</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Insurance Provider</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Insurance Expiry</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Registration Expiry</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDocuments.map((doc) => {
                const daysUntilExpiry = getDaysUntilExpiry(doc.registrationExpiry);
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{doc.vehicleName}</p>
                        <p className="text-sm text-gray-600">{doc.plateNo}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{doc.orcrNo}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{doc.orcrExpiry}</p>
                        {getDaysUntilExpiry(doc.orcrExpiry) <= 30 && (
                          <p className="text-xs text-yellow-600">{getDaysUntilExpiry(doc.orcrExpiry)} days left</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{doc.insuranceProvider}</p>
                        <p className="text-sm text-gray-600">{doc.insuranceNo}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{doc.insuranceExpiry}</p>
                        {getDaysUntilExpiry(doc.insuranceExpiry) <= 30 && (
                          <p className="text-xs text-yellow-600">{getDaysUntilExpiry(doc.insuranceExpiry)} days left</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{doc.registrationExpiry}</p>
                        {daysUntilExpiry <= 30 && (
                          <p className="text-xs text-yellow-600">{daysUntilExpiry} days left</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(doc.status)}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedVehicle(doc)}
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
        {filteredDocuments.map((doc) => {
          const daysUntilExpiry = getDaysUntilExpiry(doc.registrationExpiry);
          return (
            <div key={doc.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-gray-900">{doc.vehicleName}</p>
                  <p className="text-sm text-gray-600">{doc.plateNo}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(doc.status)}`}>
                  {doc.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">OR/CR:</span>
                  <span className="text-gray-900">{doc.orcrNo}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Expiry:</span>
                  <span className="text-gray-900">{doc.orcrExpiry}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Insurance:</span>
                  <span className="text-gray-900">{doc.insuranceProvider}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Insurance Expiry:</span>
                  <span className="text-gray-900">{doc.insuranceExpiry}</span>
                </div>
                {daysUntilExpiry <= 30 && (
                  <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                    Registration expires in {daysUntilExpiry} days
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedVehicle(doc)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
            </div>
          );
        })}
      </div>

      {/* Document Details Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-gray-900 mb-1">Document Details</h2>
                  <p className="text-gray-600">{selectedVehicle.vehicleName} - {selectedVehicle.plateNo}</p>
                </div>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    OR/CR Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">OR/CR Number:</span>
                      <span className="text-gray-900">{selectedVehicle.orcrNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expiry Date:</span>
                      <span className="text-gray-900">{selectedVehicle.orcrExpiry}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Insurance Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Provider:</span>
                      <span className="text-gray-900">{selectedVehicle.insuranceProvider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Policy Number:</span>
                      <span className="text-gray-900">{selectedVehicle.insuranceNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expiry Date:</span>
                      <span className="text-gray-900">{selectedVehicle.insuranceExpiry}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Registration Information
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Registration Expiry:</span>
                      <span className="text-gray-900">{selectedVehicle.registrationExpiry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(selectedVehicle.status)}`}>
                        {selectedVehicle.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedVehicle(null)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Documents Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Add Vehicle Documents</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-gray-700 mb-2">Vehicle</label>
                <select
                  value={newDocument.vehicle}
                  onChange={(e) => setNewDocument({ ...newDocument, vehicle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select vehicle</option>
                  <option value="ABC-1234">ABC-1234 - Toyota Hilux</option>
                  <option value="XYZ-5678">XYZ-5678 - Isuzu D-Max</option>
                  <option value="DEF-9012">DEF-9012 - Ford Ranger</option>
                  <option value="GHI-3456">GHI-3456 - Mitsubishi L300</option>
                </select>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-gray-900 mb-3">OR/CR Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">OR/CR Number</label>
                    <input
                      type="text"
                      value={newDocument.orcrNo}
                      onChange={(e) => setNewDocument({ ...newDocument, orcrNo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="OR-2025-XXXXX"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">OR/CR Expiry Date</label>
                    <input
                      type="date"
                      value={newDocument.orcrExpiry}
                      onChange={(e) => setNewDocument({ ...newDocument, orcrExpiry: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-gray-900 mb-3">Insurance Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-gray-700 mb-2">Insurance Provider</label>
                    <input
                      type="text"
                      value={newDocument.insuranceProvider}
                      onChange={(e) => setNewDocument({ ...newDocument, insuranceProvider: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Insurance Company Name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Policy Number</label>
                    <input
                      type="text"
                      value={newDocument.insuranceNo}
                      onChange={(e) => setNewDocument({ ...newDocument, insuranceNo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="INS-2025-XXXXX"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Insurance Expiry Date</label>
                    <input
                      type="date"
                      value={newDocument.insuranceExpiry}
                      onChange={(e) => setNewDocument({ ...newDocument, insuranceExpiry: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-gray-900 mb-3">Registration Information</h3>
                <div>
                  <label className="block text-gray-700 mb-2">Registration Expiry Date</label>
                  <input
                    type="date"
                    value={newDocument.registrationExpiry}
                    onChange={(e) => setNewDocument({ ...newDocument, registrationExpiry: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  Add Documents
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
