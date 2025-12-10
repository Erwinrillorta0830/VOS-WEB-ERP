import { useState } from 'react';
import { AlertTriangle, Plus, Search, Eye, X, Save } from 'lucide-react';

interface Violation {
  id: string;
  driverName: string;
  violationType: string;
  description: string;
  date: string;
  location: string;
  penalty: number;
  status: 'Pending' | 'Paid' | 'Appealed';
}

const mockViolations: Violation[] = [
  {
    id: '1',
    driverName: 'John Smith',
    violationType: 'Speeding',
    description: 'Exceeded speed limit by 20 km/h',
    date: '2025-11-15',
    location: 'EDSA, Quezon City',
    penalty: 1500,
    status: 'Paid'
  },
  {
    id: '2',
    driverName: 'Michael Brown',
    violationType: 'Illegal Parking',
    description: 'Parked in no-parking zone',
    date: '2025-11-20',
    location: 'Makati CBD',
    penalty: 500,
    status: 'Pending'
  },
  {
    id: '3',
    driverName: 'Robert Johnson',
    violationType: 'Reckless Driving',
    description: 'Unsafe lane change without signal',
    date: '2025-11-22',
    location: 'C5 Road, Pasig',
    penalty: 2000,
    status: 'Appealed'
  },
  {
    id: '4',
    driverName: 'John Smith',
    violationType: 'Red Light Violation',
    description: 'Ran red light at intersection',
    date: '2025-11-25',
    location: 'Ortigas, Pasig',
    penalty: 1000,
    status: 'Pending'
  },
  {
    id: '5',
    driverName: 'Michael Brown',
    violationType: 'No Seatbelt',
    description: 'Driver not wearing seatbelt',
    date: '2025-11-26',
    location: 'Manila',
    penalty: 1000,
    status: 'Pending'
  },
];

export function Violations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newViolation, setNewViolation] = useState({
    driverName: '',
    violationType: '',
    description: '',
    date: '',
    location: '',
    penalty: 0,
  });

  const filteredViolations = mockViolations.filter(violation =>
    violation.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    violation.violationType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPenalties = mockViolations.reduce((sum, v) => sum + v.penalty, 0);
  const pendingPenalties = mockViolations
    .filter(v => v.status === 'Pending')
    .reduce((sum, v) => sum + v.penalty, 0);

  const getStatusColor = (status: Violation['status']) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Appealed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Driver Violations & Penalties</h1>
        <p className="text-gray-600">Track and manage driver violations and penalty payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Total Violations</p>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-gray-900">{mockViolations.length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Pending</p>
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-gray-900">{mockViolations.filter(v => v.status === 'Pending').length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Total Penalties</p>
          </div>
          <p className="text-gray-900">₱{totalPenalties.toLocaleString()}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Pending Penalties</p>
          </div>
          <p className="text-gray-900">₱{pendingPenalties.toLocaleString()}</p>
        </div>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by driver name or violation type..."
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
          Add Violation
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Driver Name</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Violation Type</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Description</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Location</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Penalty</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredViolations.map((violation) => (
                <tr key={violation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{violation.driverName}</td>
                  <td className="px-6 py-4 text-gray-900">{violation.violationType}</td>
                  <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{violation.description}</td>
                  <td className="px-6 py-4 text-gray-700">{violation.date}</td>
                  <td className="px-6 py-4 text-gray-700">{violation.location}</td>
                  <td className="px-6 py-4 text-gray-900">₱{violation.penalty.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(violation.status)}`}>
                      {violation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedViolation(violation)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredViolations.map((violation) => (
          <div key={violation.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-gray-900">{violation.driverName}</p>
                <p className="text-sm text-gray-600">{violation.violationType}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(violation.status)}`}>
                {violation.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-700">{violation.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Date:</span>
                <span className="text-gray-900">{violation.date}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Location:</span>
                <span className="text-gray-900">{violation.location}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Penalty:</span>
                <span className="text-gray-900">₱{violation.penalty.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedViolation(violation)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Add Violation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Add Violation</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-gray-700 mb-2">Driver Name</label>
                <select
                  value={newViolation.driverName}
                  onChange={(e) => setNewViolation({ ...newViolation, driverName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select driver</option>
                  <option value="John Smith">John Smith</option>
                  <option value="Maria Garcia">Maria Garcia</option>
                  <option value="Robert Johnson">Robert Johnson</option>
                  <option value="Sarah Williams">Sarah Williams</option>
                  <option value="Michael Brown">Michael Brown</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Violation Type</label>
                <select
                  value={newViolation.violationType}
                  onChange={(e) => setNewViolation({ ...newViolation, violationType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select violation type</option>
                  <option value="Speeding">Speeding</option>
                  <option value="Illegal Parking">Illegal Parking</option>
                  <option value="Reckless Driving">Reckless Driving</option>
                  <option value="Red Light Violation">Red Light Violation</option>
                  <option value="No Seatbelt">No Seatbelt</option>
                  <option value="Invalid License">Invalid License</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={newViolation.description}
                  onChange={(e) => setNewViolation({ ...newViolation, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the violation"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={newViolation.date}
                    onChange={(e) => setNewViolation({ ...newViolation, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Penalty Amount (₱)</label>
                  <input
                    type="number"
                    value={newViolation.penalty}
                    onChange={(e) => setNewViolation({ ...newViolation, penalty: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={newViolation.location}
                  onChange={(e) => setNewViolation({ ...newViolation, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Where the violation occurred"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Add Violation
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
