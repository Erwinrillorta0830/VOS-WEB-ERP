import { useState } from 'react';
import { Save, CheckCircle } from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  status: 'Available' | 'Assigned';
}

const mockVehicles = [
  { id: '1', plateNo: 'ABC-1234', name: 'Toyota Hilux' },
  { id: '2', plateNo: 'XYZ-5678', name: 'Isuzu D-Max' },
  { id: '3', plateNo: 'DEF-9012', name: 'Ford Ranger' },
  { id: '4', plateNo: 'GHI-3456', name: 'Mitsubishi L300' },
];

const mockDrivers: Driver[] = [
  { id: '1', name: 'James Anderson', status: 'Available' },
  { id: '2', name: 'Patricia Thomas', status: 'Available' },
  { id: '3', name: 'Christopher Martinez', status: 'Available' },
  { id: '4', name: 'Nancy Robinson', status: 'Assigned' },
  { id: '5', name: 'Daniel Clark', status: 'Available' },
];

export function VehicleDesignation() {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSelectedVehicle('');
      setSelectedDriver('');
    }, 3000);
  };

  const selectedVehicleData = mockVehicles.find(v => v.id === selectedVehicle);
  const availableDrivers = mockDrivers.filter(d => d.status === 'Available');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Vehicle Designation</h1>
        <p className="text-gray-600">Assign vehicles to available drivers</p>
      </div>

      <div className="max-w-2xl bg-white rounded-lg shadow p-6">
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">Vehicle successfully designated to driver!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle Selection */}
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

          {/* Driver Selection */}
          <div>
            <label className="block text-gray-700 mb-2">Select Driver</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select an available driver</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500">
              {availableDrivers.length} driver(s) available
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-5 h-5" />
            Designate Vehicle
          </button>
        </form>
      </div>
    </div>
  );
}
