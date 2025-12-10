import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Fuel, TrendingDown, Droplet } from 'lucide-react';

const fuelConsumptionData = [
  { month: 'Jun', consumption: 450, cost: 22500 },
  { month: 'Jul', consumption: 520, cost: 26000 },
  { month: 'Aug', consumption: 480, cost: 24000 },
  { month: 'Sep', consumption: 510, cost: 25500 },
  { month: 'Oct', consumption: 495, cost: 24750 },
  { month: 'Nov', consumption: 530, cost: 26500 },
];

const mockVehicleFuel = [
  { id: '1', plateNo: 'ABC-1234', vehicleName: 'Toyota Hilux', fuelLevel: 85, lastRefuel: '2025-11-25', consumption: '12 L/100km' },
  { id: '2', plateNo: 'XYZ-5678', vehicleName: 'Isuzu D-Max', fuelLevel: 45, lastRefuel: '2025-11-20', consumption: '11 L/100km' },
  { id: '3', plateNo: 'DEF-9012', vehicleName: 'Ford Ranger', fuelLevel: 92, lastRefuel: '2025-11-27', consumption: '13 L/100km' },
  { id: '4', plateNo: 'GHI-3456', vehicleName: 'Mitsubishi L300', fuelLevel: 30, lastRefuel: '2025-11-18', consumption: '10 L/100km' },
  { id: '5', plateNo: 'JKL-7890', vehicleName: 'Nissan Navara', fuelLevel: 68, lastRefuel: '2025-11-23', consumption: '11.5 L/100km' },
];

export function FuelManagement() {
  const totalFuelInventory = 5500; // liters
  const monthlyConsumption = 530; // liters
  const averageCost = 50; // per liter

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Fuel Management</h1>
        <p className="text-gray-600">Monitor fuel consumption and inventory levels</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Droplet className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-1">Total Fuel Inventory</p>
          <p className="text-gray-900">{totalFuelInventory.toLocaleString()} Liters</p>
          <p className="text-xs text-gray-500 mt-1">Available in storage</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Fuel className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-1">Monthly Consumption</p>
          <p className="text-gray-900">{monthlyConsumption} Liters</p>
          <p className="text-xs text-gray-500 mt-1">Current month usage</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-1">Average Cost</p>
          <p className="text-gray-900">₱{averageCost}/Liter</p>
          <p className="text-xs text-gray-500 mt-1">Monthly avg: ₱{(monthlyConsumption * averageCost).toLocaleString()}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Fuel Consumption Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-900 mb-4">Fuel Consumption Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={fuelConsumptionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="consumption" stroke="#3b82f6" strokeWidth={2} name="Consumption (L)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Fuel Cost Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-900 mb-4">Monthly Fuel Cost</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fuelConsumptionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="cost" fill="#10b981" name="Cost (₱)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vehicle Fuel Levels - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-gray-900">Vehicle Fuel Levels</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Plate No.</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Vehicle Name</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Fuel Level</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Last Refuel</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Avg Consumption</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockVehicleFuel.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{vehicle.plateNo}</td>
                  <td className="px-6 py-4 text-gray-900">{vehicle.vehicleName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                        <div
                          className={`h-2 rounded-full ${
                            vehicle.fuelLevel > 70
                              ? 'bg-green-500'
                              : vehicle.fuelLevel > 30
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${vehicle.fuelLevel}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">{vehicle.fuelLevel}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{vehicle.lastRefuel}</td>
                  <td className="px-6 py-4 text-gray-700">{vehicle.consumption}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Fuel Levels - Mobile */}
      <div className="md:hidden space-y-4">
        {mockVehicleFuel.map((vehicle) => (
          <div key={vehicle.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-gray-900">{vehicle.vehicleName}</p>
                <p className="text-sm text-gray-600">{vehicle.plateNo}</p>
              </div>
              <span className={`text-sm ${
                vehicle.fuelLevel > 70
                  ? 'text-green-600'
                  : vehicle.fuelLevel > 30
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`}>
                {vehicle.fuelLevel}%
              </span>
            </div>
            <div className="bg-gray-200 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full ${
                  vehicle.fuelLevel > 70
                    ? 'bg-green-500'
                    : vehicle.fuelLevel > 30
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${vehicle.fuelLevel}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">Last Refuel</p>
                <p className="text-gray-900">{vehicle.lastRefuel}</p>
              </div>
              <div>
                <p className="text-gray-500">Consumption</p>
                <p className="text-gray-900">{vehicle.consumption}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
