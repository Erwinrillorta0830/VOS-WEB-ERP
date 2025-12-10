import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';

interface JobOrder {
  id: string;
  jobOrderNo: string;
  vehicleName: string;
  plateNo: string;
  mechanic: string;
  partsReplaced: string;
  timeFrame: string;
  status: 'Completed' | 'In Progress' | 'Pending';
}

const mockJobOrders: JobOrder[] = [
  {
    id: '1',
    jobOrderNo: 'JO-2025-001',
    vehicleName: 'Toyota Hilux',
    plateNo: 'ABC-1234',
    mechanic: 'Mechanic John',
    partsReplaced: 'Oil Filter, Engine Oil',
    timeFrame: '2025-11-10 to 2025-11-11',
    status: 'Completed'
  },
  {
    id: '2',
    jobOrderNo: 'JO-2025-002',
    vehicleName: 'Isuzu D-Max',
    plateNo: 'XYZ-5678',
    mechanic: 'Mechanic Sarah',
    partsReplaced: 'Brake Pads',
    timeFrame: '2025-10-25 to 2025-10-26',
    status: 'Completed'
  },
  {
    id: '3',
    jobOrderNo: 'JO-2025-003',
    vehicleName: 'Ford Ranger',
    plateNo: 'DEF-9012',
    mechanic: 'Mechanic Mike',
    partsReplaced: 'Air Filter, Spark Plugs',
    timeFrame: '2025-11-20 to 2025-11-22',
    status: 'In Progress'
  },
];

const mockVehicles = [
  { id: '1', plateNo: 'ABC-1234', name: 'Toyota Hilux' },
  { id: '2', plateNo: 'XYZ-5678', name: 'Isuzu D-Max' },
  { id: '3', plateNo: 'DEF-9012', name: 'Ford Ranger' },
  { id: '4', plateNo: 'GHI-3456', name: 'Mitsubishi L300' },
];

const mockMechanics = [
  'Mechanic John',
  'Mechanic Sarah',
  'Mechanic Mike',
  'Mechanic David',
];

export function JobOrders() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [mechanic, setMechanic] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const generateJobOrderNo = () => {
    const year = new Date().getFullYear();
    const nextNumber = mockJobOrders.length + 1;
    return `JO-${year}-${String(nextNumber).padStart(3, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    setShowCreateForm(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedVehicle('');
    setMechanic('');
    setPartsReplaced('');
    setStartDate('');
    setEndDate('');
  };

  const selectedVehicleData = mockVehicles.find(v => v.id === selectedVehicle);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Job Orders</h1>
          <p className="text-gray-600">Manage vehicle repair and maintenance orders</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Job Order
        </button>
      </div>

      {/* Job Orders List - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Job Order No.</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Plate No.</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Mechanic</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Parts Replaced</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Time Frame</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockJobOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{order.jobOrderNo}</td>
                  <td className="px-6 py-4 text-gray-900">{order.vehicleName}</td>
                  <td className="px-6 py-4 text-gray-700">{order.plateNo}</td>
                  <td className="px-6 py-4 text-gray-700">{order.mechanic}</td>
                  <td className="px-6 py-4 text-gray-700">{order.partsReplaced}</td>
                  <td className="px-6 py-4 text-gray-700">{order.timeFrame}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                      order.status === 'Completed'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Orders Cards - Mobile */}
      <div className="md:hidden space-y-4 mb-6">
        {mockJobOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-gray-900">{order.jobOrderNo}</p>
                <p className="text-sm text-gray-600">{order.vehicleName} - {order.plateNo}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                order.status === 'Completed'
                  ? 'bg-green-100 text-green-800'
                  : order.status === 'In Progress'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {order.status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700"><span className="text-gray-500">Mechanic:</span> {order.mechanic}</p>
              <p className="text-gray-700"><span className="text-gray-500">Parts:</span> {order.partsReplaced}</p>
              <p className="text-gray-700"><span className="text-gray-500">Time:</span> {order.timeFrame}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Create Job Order Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Create New Job Order</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              {/* Job Order No. */}
              <div>
                <label className="block text-gray-700 mb-2">Job Order No.</label>
                <input
                  type="text"
                  value={generateJobOrderNo()}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              {/* Vehicle Name */}
              <div>
                <label className="block text-gray-700 mb-2">Vehicle Name</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a vehicle</option>
                  {mockVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Plate No. */}
              <div>
                <label className="block text-gray-700 mb-2">Vehicle Plate No.</label>
                <input
                  type="text"
                  value={selectedVehicleData?.plateNo || ''}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  placeholder="Select a vehicle first"
                />
              </div>

              {/* Mechanic */}
              <div>
                <label className="block text-gray-700 mb-2">Mechanic</label>
                <select
                  value={mechanic}
                  onChange={(e) => setMechanic(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a mechanic</option>
                  {mockMechanics.map((mech) => (
                    <option key={mech} value={mech}>
                      {mech}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parts Replaced */}
              <div>
                <label className="block text-gray-700 mb-2">Parts Replaced</label>
                <textarea
                  value={partsReplaced}
                  onChange={(e) => setPartsReplaced(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter parts to be replaced (comma separated)"
                  required
                />
              </div>

              {/* Time Frame */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Create Job Order
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
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
