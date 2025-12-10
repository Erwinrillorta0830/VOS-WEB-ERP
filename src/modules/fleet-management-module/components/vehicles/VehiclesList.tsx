import { useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { VehicleHistoryModal } from './VehicleHistoryModal';

interface Vehicle {
  id: string;
  plateNo: string;
  vehicleName: string;
  driver: string;
  status: 'Active' | 'Inactive';
}

const mockVehicles: Vehicle[] = [
  { id: '1', plateNo: 'ABC-1234', vehicleName: 'Toyota Hilux', driver: 'John Smith', status: 'Active' },
  { id: '2', plateNo: 'XYZ-5678', vehicleName: 'Isuzu D-Max', driver: 'Maria Garcia', status: 'Active' },
  { id: '3', plateNo: 'DEF-9012', vehicleName: 'Ford Ranger', driver: 'Robert Johnson', status: 'Inactive' },
  { id: '4', plateNo: 'GHI-3456', vehicleName: 'Mitsubishi L300', driver: 'Sarah Williams', status: 'Active' },
  { id: '5', plateNo: 'JKL-7890', vehicleName: 'Nissan Navara', driver: 'Michael Brown', status: 'Active' },
  { id: '6', plateNo: 'MNO-2468', vehicleName: 'Chevrolet Colorado', driver: 'Jennifer Davis', status: 'Inactive' },
  { id: '7', plateNo: 'PQR-1357', vehicleName: 'Mazda BT-50', driver: 'David Wilson', status: 'Active' },
  { id: '8', plateNo: 'STU-9753', vehicleName: 'Toyota Fortuner', driver: 'Lisa Anderson', status: 'Active' },
];

export function VehiclesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const filteredVehicles = mockVehicles.filter(vehicle =>
    vehicle.plateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.driver.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">List of Vehicles</h1>
        <p className="text-gray-600">Manage and view all vehicles in your fleet</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by plate no., vehicle name, or driver..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Plate No.</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Vehicle Name</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Driver</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{vehicle.plateNo}</td>
                  <td className="px-6 py-4 text-gray-900">{vehicle.vehicleName}</td>
                  <td className="px-6 py-4 text-gray-700">{vehicle.driver}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                      vehicle.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedVehicle(vehicle)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredVehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-gray-900">{vehicle.vehicleName}</p>
                <p className="text-sm text-gray-600">{vehicle.plateNo}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                vehicle.status === 'Active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {vehicle.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">Driver: {vehicle.driver}</p>
            <button
              onClick={() => setSelectedVehicle(vehicle)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              View History
            </button>
          </div>
        ))}
      </div>

      {/* Vehicle History Modal */}
      {selectedVehicle && (
        <VehicleHistoryModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
