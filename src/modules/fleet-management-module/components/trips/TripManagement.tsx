import { useState } from 'react';
import { RouteIcon, Plus, Search, Eye, CheckCircle, XCircle, Clock, X, Save } from 'lucide-react';

interface Trip {
  id: string;
  tripNo: string;
  requestDate: string;
  requestedBy: string;
  driver: string;
  vehicle: string;
  origin: string;
  destination: string;
  dispatchDate: string;
  returnDate: string;
  purpose: string;
  distance: number;
  fuelCost: number;
  tollFees: number;
  status: 'Pending' | 'Approved' | 'Dispatched' | 'In Progress' | 'Completed' | 'Cancelled';
}

const mockTrips: Trip[] = [
  {
    id: '1',
    tripNo: 'TRIP-2025-001',
    requestDate: '2025-11-25',
    requestedBy: 'Operations Team',
    driver: 'John Smith',
    vehicle: 'ABC-1234',
    origin: 'Manila',
    destination: 'Cebu',
    dispatchDate: '2025-11-28',
    returnDate: '2025-11-30',
    purpose: 'Delivery',
    distance: 600,
    fuelCost: 4500,
    tollFees: 800,
    status: 'Completed'
  },
  {
    id: '2',
    tripNo: 'TRIP-2025-002',
    requestDate: '2025-11-26',
    requestedBy: 'Sales Team',
    driver: 'Maria Garcia',
    vehicle: 'XYZ-5678',
    origin: 'Quezon City',
    destination: 'Davao',
    dispatchDate: '2025-11-29',
    returnDate: '2025-12-02',
    purpose: 'Client Visit',
    distance: 950,
    fuelCost: 7200,
    tollFees: 1200,
    status: 'In Progress'
  },
  {
    id: '3',
    tripNo: 'TRIP-2025-003',
    requestDate: '2025-11-27',
    requestedBy: 'Maintenance Team',
    driver: 'Robert Johnson',
    vehicle: 'DEF-9012',
    origin: 'Makati',
    destination: 'Laguna',
    dispatchDate: '2025-12-01',
    returnDate: '2025-12-01',
    purpose: 'Pickup Parts',
    distance: 120,
    fuelCost: 800,
    tollFees: 150,
    status: 'Approved'
  },
  {
    id: '4',
    tripNo: 'TRIP-2025-004',
    requestDate: '2025-11-28',
    requestedBy: 'HR Department',
    driver: 'Sarah Williams',
    vehicle: 'GHI-3456',
    origin: 'Pasig',
    destination: 'Batangas',
    dispatchDate: '2025-12-05',
    returnDate: '2025-12-05',
    purpose: 'Team Building',
    distance: 180,
    fuelCost: 1200,
    tollFees: 300,
    status: 'Pending'
  },
];

export function TripManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTrip, setNewTrip] = useState({
    requestedBy: '',
    driver: '',
    vehicle: '',
    origin: '',
    destination: '',
    dispatchDate: '',
    returnDate: '',
    purpose: '',
  });

  const filteredTrips = mockTrips.filter(trip => {
    const matchesSearch = 
      trip.tripNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Approved':
      case 'Dispatched':
        return 'bg-purple-100 text-purple-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Trip['status']) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'In Progress':
      case 'Approved':
      case 'Dispatched':
        return <Clock className="w-4 h-4" />;
      case 'Cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Trip Management</h1>
        <p className="text-gray-600">Create, approve, and monitor trip requests and dispatches</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Total Trips</p>
            <RouteIcon className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-gray-900">{mockTrips.length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">In Progress</p>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-gray-900">{mockTrips.filter(t => t.status === 'In Progress').length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Pending Approval</p>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-gray-900">{mockTrips.filter(t => t.status === 'Pending').length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Completed</p>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-gray-900">{mockTrips.filter(t => t.status === 'Completed').length}</p>
        </div>
      </div>

      {/* Search, Filter and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by trip no., driver, or vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Create Trip Request
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Trip No.</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Driver</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Route</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Dispatch Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Purpose</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Total Cost</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTrips.map((trip) => {
                const totalCost = trip.fuelCost + trip.tollFees;
                return (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{trip.tripNo}</td>
                    <td className="px-6 py-4 text-gray-700">{trip.driver}</td>
                    <td className="px-6 py-4 text-gray-700">{trip.vehicle}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{trip.origin}</p>
                        <p className="text-gray-600">→ {trip.destination}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{trip.dispatchDate}</td>
                    <td className="px-6 py-4 text-gray-700">{trip.purpose}</td>
                    <td className="px-6 py-4 text-gray-900">₱{totalCost.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(trip.status)}`}>
                        {getStatusIcon(trip.status)}
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedTrip(trip)}
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
        {filteredTrips.map((trip) => {
          const totalCost = trip.fuelCost + trip.tollFees;
          return (
            <div key={trip.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-gray-900">{trip.tripNo}</p>
                  <p className="text-sm text-gray-600">{trip.driver}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(trip.status)}`}>
                  {getStatusIcon(trip.status)}
                  {trip.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Vehicle:</span>
                  <span className="text-gray-900">{trip.vehicle}</span>
                </div>
                <div className="text-sm">
                  <p className="text-gray-500">Route:</p>
                  <p className="text-gray-900">{trip.origin} → {trip.destination}</p>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Dispatch:</span>
                  <span className="text-gray-900">{trip.dispatchDate}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Purpose:</span>
                  <span className="text-gray-900">{trip.purpose}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total Cost:</span>
                  <span className="text-gray-900">₱{totalCost.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTrip(trip)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
            </div>
          );
        })}
      </div>

      {/* Create Trip Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Create Trip Request</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowCreateModal(false); }} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-gray-700 mb-2">Requested By</label>
                <input
                  type="text"
                  value={newTrip.requestedBy}
                  onChange={(e) => setNewTrip({ ...newTrip, requestedBy: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Department or Team"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Driver</label>
                  <select
                    value={newTrip.driver}
                    onChange={(e) => setNewTrip({ ...newTrip, driver: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select driver</option>
                    <option value="John Smith">John Smith</option>
                    <option value="Maria Garcia">Maria Garcia</option>
                    <option value="Robert Johnson">Robert Johnson</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Vehicle</label>
                  <select
                    value={newTrip.vehicle}
                    onChange={(e) => setNewTrip({ ...newTrip, vehicle: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select vehicle</option>
                    <option value="ABC-1234">ABC-1234 - Toyota Hilux</option>
                    <option value="XYZ-5678">XYZ-5678 - Isuzu D-Max</option>
                    <option value="DEF-9012">DEF-9012 - Ford Ranger</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Origin</label>
                  <input
                    type="text"
                    value={newTrip.origin}
                    onChange={(e) => setNewTrip({ ...newTrip, origin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Starting location"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Destination</label>
                  <input
                    type="text"
                    value={newTrip.destination}
                    onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="End location"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Dispatch Date</label>
                  <input
                    type="date"
                    value={newTrip.dispatchDate}
                    onChange={(e) => setNewTrip({ ...newTrip, dispatchDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Return Date</label>
                  <input
                    type="date"
                    value={newTrip.returnDate}
                    onChange={(e) => setNewTrip({ ...newTrip, returnDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Trip Purpose</label>
                <select
                  value={newTrip.purpose}
                  onChange={(e) => setNewTrip({ ...newTrip, purpose: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select purpose</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Client Visit">Client Visit</option>
                  <option value="Pickup Parts">Pickup Parts</option>
                  <option value="Team Building">Team Building</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Create Trip Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
