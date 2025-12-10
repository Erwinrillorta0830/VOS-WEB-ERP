import { useState } from 'react';
import { Calendar, Plus, AlertCircle, CheckCircle, Clock, X, Save } from 'lucide-react';

interface MaintenanceSchedule {
  id: string;
  plateNo: string;
  vehicleName: string;
  maintenanceType: 'Preventive' | 'Corrective';
  serviceType: string;
  scheduledDate: string;
  lastService: string;
  mileage: number;
  status: 'Scheduled' | 'Due' | 'Overdue' | 'Completed';
  estimatedCost: number;
}

const mockSchedules: MaintenanceSchedule[] = [
  {
    id: '1',
    plateNo: 'ABC-1234',
    vehicleName: 'Toyota Hilux',
    maintenanceType: 'Preventive',
    serviceType: 'Oil Change',
    scheduledDate: '2025-12-05',
    lastService: '2025-09-05',
    mileage: 45000,
    status: 'Due',
    estimatedCost: 3500
  },
  {
    id: '2',
    plateNo: 'XYZ-5678',
    vehicleName: 'Isuzu D-Max',
    maintenanceType: 'Preventive',
    serviceType: 'Brake Inspection',
    scheduledDate: '2025-12-08',
    lastService: '2025-06-08',
    mileage: 52000,
    status: 'Scheduled',
    estimatedCost: 4500
  },
  {
    id: '3',
    plateNo: 'DEF-9012',
    vehicleName: 'Ford Ranger',
    maintenanceType: 'Corrective',
    serviceType: 'Engine Repair',
    scheduledDate: '2025-11-28',
    lastService: '2025-05-15',
    mileage: 68000,
    status: 'Overdue',
    estimatedCost: 15000
  },
  {
    id: '4',
    plateNo: 'GHI-3456',
    vehicleName: 'Mitsubishi L300',
    maintenanceType: 'Preventive',
    serviceType: 'General Service',
    scheduledDate: '2025-11-20',
    lastService: '2025-08-20',
    mileage: 38000,
    status: 'Completed',
    estimatedCost: 5500
  },
  {
    id: '5',
    plateNo: 'JKL-7890',
    vehicleName: 'Nissan Navara',
    maintenanceType: 'Preventive',
    serviceType: 'Tire Rotation',
    scheduledDate: '2025-12-10',
    lastService: '2025-09-10',
    mileage: 41000,
    status: 'Scheduled',
    estimatedCost: 2000
  },
];

export function MaintenanceSchedule() {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    vehicle: '',
    maintenanceType: 'Preventive' as 'Preventive' | 'Corrective',
    serviceType: '',
    scheduledDate: '',
    estimatedCost: 0,
  });

  const filteredSchedules = selectedType === 'all' 
    ? mockSchedules 
    : mockSchedules.filter(s => s.maintenanceType === selectedType);

  const dueCount = mockSchedules.filter(s => s.status === 'Due' || s.status === 'Overdue').length;

  const getStatusColor = (status: MaintenanceSchedule['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'Due':
        return 'bg-yellow-100 text-yellow-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: MaintenanceSchedule['status']) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'Scheduled':
        return <Clock className="w-4 h-4" />;
      case 'Due':
      case 'Overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Maintenance Schedule</h1>
        <p className="text-gray-600">Manage preventive and corrective maintenance schedules</p>
      </div>

      {/* Alert Banner */}
      {dueCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-yellow-900">Maintenance Due</p>
            <p className="text-sm text-yellow-700">
              {dueCount} vehicle(s) have maintenance that is due or overdue
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Total Scheduled</p>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-gray-900">{mockSchedules.length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Preventive</p>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-gray-900">{mockSchedules.filter(s => s.maintenanceType === 'Preventive').length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Corrective</p>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-gray-900">{mockSchedules.filter(s => s.maintenanceType === 'Corrective').length}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Due/Overdue</p>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-gray-900">{dueCount}</p>
        </div>
      </div>

      {/* Filter and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedType('Preventive')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedType === 'Preventive'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Preventive
          </button>
          <button
            onClick={() => setSelectedType('Corrective')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              selectedType === 'Corrective'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Corrective
          </button>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap sm:ml-auto"
        >
          <Plus className="w-5 h-5" />
          Schedule Maintenance
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Service</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Scheduled Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Last Service</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Mileage</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Est. Cost</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSchedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-gray-900">{schedule.vehicleName}</p>
                      <p className="text-sm text-gray-600">{schedule.plateNo}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                      schedule.maintenanceType === 'Preventive'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {schedule.maintenanceType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{schedule.serviceType}</td>
                  <td className="px-6 py-4 text-gray-700">{schedule.scheduledDate}</td>
                  <td className="px-6 py-4 text-gray-700">{schedule.lastService}</td>
                  <td className="px-6 py-4 text-gray-700">{schedule.mileage.toLocaleString()} km</td>
                  <td className="px-6 py-4 text-gray-900">₱{schedule.estimatedCost.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(schedule.status)}`}>
                      {getStatusIcon(schedule.status)}
                      {schedule.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {filteredSchedules.map((schedule) => (
          <div key={schedule.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-gray-900">{schedule.vehicleName}</p>
                <p className="text-sm text-gray-600">{schedule.plateNo}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(schedule.status)}`}>
                {getStatusIcon(schedule.status)}
                {schedule.status}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Type:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                  schedule.maintenanceType === 'Preventive'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {schedule.maintenanceType}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Service:</span>
                <span className="text-gray-900">{schedule.serviceType}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Scheduled:</span>
                <span className="text-gray-900">{schedule.scheduledDate}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Mileage:</span>
                <span className="text-gray-900">{schedule.mileage.toLocaleString()} km</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Est. Cost:</span>
                <span className="text-gray-900">₱{schedule.estimatedCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Schedule Maintenance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Schedule Maintenance</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-gray-700 mb-2">Vehicle</label>
                <select
                  value={newSchedule.vehicle}
                  onChange={(e) => setNewSchedule({ ...newSchedule, vehicle: e.target.value })}
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

              <div>
                <label className="block text-gray-700 mb-2">Maintenance Type</label>
                <select
                  value={newSchedule.maintenanceType}
                  onChange={(e) => setNewSchedule({ ...newSchedule, maintenanceType: e.target.value as 'Preventive' | 'Corrective' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="Preventive">Preventive</option>
                  <option value="Corrective">Corrective</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Service Type</label>
                <select
                  value={newSchedule.serviceType}
                  onChange={(e) => setNewSchedule({ ...newSchedule, serviceType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select service type</option>
                  <option value="Oil Change">Oil Change</option>
                  <option value="Brake Inspection">Brake Inspection</option>
                  <option value="Tire Rotation">Tire Rotation</option>
                  <option value="General Service">General Service</option>
                  <option value="Engine Repair">Engine Repair</option>
                  <option value="Transmission Service">Transmission Service</option>
                  <option value="Battery Replacement">Battery Replacement</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Scheduled Date</label>
                  <input
                    type="date"
                    value={newSchedule.scheduledDate}
                    onChange={(e) => setNewSchedule({ ...newSchedule, scheduledDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Estimated Cost (₱)</label>
                  <input
                    type="number"
                    value={newSchedule.estimatedCost}
                    onChange={(e) => setNewSchedule({ ...newSchedule, estimatedCost: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
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
                  Schedule Maintenance
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
