import { Truck, Users, AlertCircle, Calendar, Fuel, Wrench, CheckCircle, XCircle, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const monthlyTripsData = [
  { month: 'Jun', trips: 145, distance: 12500 },
  { month: 'Jul', trips: 158, distance: 13200 },
  { month: 'Aug', trips: 142, distance: 11800 },
  { month: 'Sep', trips: 167, distance: 14100 },
  { month: 'Oct', trips: 153, distance: 12900 },
  { month: 'Nov', trips: 171, distance: 14500 },
];

const upcomingMaintenance = [
  { id: '1', vehicle: 'Toyota Hilux - ABC-1234', type: 'Oil Change', dueDate: '2025-12-05', days: 6 },
  { id: '2', vehicle: 'Isuzu D-Max - XYZ-5678', type: 'Brake Inspection', dueDate: '2025-12-08', days: 9 },
  { id: '3', vehicle: 'Ford Ranger - DEF-9012', type: 'Tire Rotation', dueDate: '2025-12-10', days: 11 },
  { id: '4', vehicle: 'Nissan Navara - JKL-7890', type: 'General Service', dueDate: '2025-12-12', days: 13 },
];

const recentTrips = [
  { id: '1', vehicle: 'ABC-1234', driver: 'John Smith', destination: 'Cebu', status: 'Completed', date: '2025-11-28' },
  { id: '2', vehicle: 'XYZ-5678', driver: 'Maria Garcia', destination: 'Davao', status: 'In Progress', date: '2025-11-29' },
  { id: '3', vehicle: 'DEF-9012', driver: 'Robert Johnson', destination: 'Manila', status: 'Pending', date: '2025-11-29' },
];

export function Dashboard() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Fleet Dashboard</h1>
        <p className="text-gray-600">Overview of your fleet operations and key metrics</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-1">Total Vehicles</p>
          <p className="text-gray-900">48</p>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> 42 Active
            </span>
            <span className="text-gray-500 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> 6 Inactive
            </span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-1">Active Drivers</p>
          <p className="text-gray-900">35</p>
          <p className="text-xs text-gray-500 mt-2">3 licenses expiring soon</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-1">Trips This Month</p>
          <p className="text-gray-900">171</p>
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12% from last month
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-1">Maintenance Due</p>
          <p className="text-gray-900">4</p>
          <p className="text-xs text-gray-500 mt-2">Next due in 6 days</p>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-2">
            <Fuel className="w-5 h-5 text-blue-600" />
            <p className="text-gray-600">Fuel Consumption</p>
          </div>
          <p className="text-gray-900">530 Liters</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-5 h-5 text-orange-600" />
            <p className="text-gray-600">Maintenance Cost</p>
          </div>
          <p className="text-gray-900">₱125,450</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <p className="text-gray-600">Total Distance</p>
          </div>
          <p className="text-gray-900">14,500 km</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-gray-600">Driver Violations</p>
          </div>
          <p className="text-gray-900">7</p>
          <p className="text-xs text-gray-500 mt-1">This month</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-gray-900 mb-4">Monthly Trips Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyTripsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="trips" stroke="#3b82f6" strokeWidth={2} name="Trips" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-gray-900 mb-4">Distance Covered (km)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyTripsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="distance" fill="#10b981" name="Distance (km)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Reminders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-gray-900">Upcoming Maintenance</h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {upcomingMaintenance.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{item.vehicle}</p>
                    <p className="text-xs text-gray-600">{item.type}</p>
                    <p className="text-xs text-gray-500 mt-1">Due: {item.dueDate}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                    item.days <= 7 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.days} days
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Trips */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-gray-900">Recent Trips</h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              {recentTrips.map((trip) => (
                <div key={trip.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{trip.vehicle} - {trip.driver}</p>
                    <p className="text-xs text-gray-600">To: {trip.destination}</p>
                    <p className="text-xs text-gray-500 mt-1">{trip.date}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                    trip.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : trip.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {trip.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
