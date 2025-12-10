import { X, Calendar, Package, Users, UserCircle, Wrench } from 'lucide-react';
import { useState } from 'react';

interface Vehicle {
  id: string;
  plateNo: string;
  vehicleName: string;
  driver: string;
  status: 'Active' | 'Inactive';
}

interface VehicleHistoryModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

type HistoryTab = 'trips' | 'parts' | 'drivers' | 'custodian' | 'jobOrders';

export function VehicleHistoryModal({ vehicle, onClose }: VehicleHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('trips');

  const mockTrips = [
    { id: '1', date: '2025-11-25', route: 'Manila to Cebu', distance: '600 km', duration: '12 hrs' },
    { id: '2', date: '2025-11-20', route: 'Cebu to Davao', distance: '450 km', duration: '10 hrs' },
    { id: '3', date: '2025-11-15', route: 'Davao to Manila', distance: '800 km', duration: '15 hrs' },
  ];

  const mockParts = [
    { id: '1', date: '2025-11-10', partName: 'Oil Filter', quantity: 1, usedBy: 'Mechanic John' },
    { id: '2', date: '2025-10-25', partName: 'Brake Pads', quantity: 4, usedBy: 'Mechanic Sarah' },
    { id: '3', date: '2025-10-15', partName: 'Engine Oil', quantity: 5, usedBy: 'Mechanic John' },
  ];

  const mockDrivers = [
    { id: '1', driver: 'John Smith', period: 'Jan 2025 - Present', totalTrips: 45 },
    { id: '2', driver: 'Michael Brown', period: 'Jun 2024 - Dec 2024', totalTrips: 89 },
  ];

  const mockCustodians = [
    { id: '1', custodian: 'John Smith', assignedDate: '2025-01-15', status: 'Current' },
    { id: '2', custodian: 'Michael Brown', assignedDate: '2024-06-01', status: 'Previous' },
  ];

  const mockJobOrders = [
    {
      id: '1',
      jobOrderNo: 'JO-2025-001',
      vehicleName: vehicle.vehicleName,
      plateNo: vehicle.plateNo,
      mechanic: 'Mechanic John',
      partsReplaced: 'Oil Filter, Engine Oil',
      timeFrame: '2025-11-10 to 2025-11-11',
      description: 'Regular maintenance and oil change'
    },
    {
      id: '2',
      jobOrderNo: 'JO-2025-002',
      vehicleName: vehicle.vehicleName,
      plateNo: vehicle.plateNo,
      mechanic: 'Mechanic Sarah',
      partsReplaced: 'Brake Pads',
      timeFrame: '2025-10-25 to 2025-10-26',
      description: 'Brake system repair and replacement'
    },
  ];

  const tabs = [
    { id: 'trips' as HistoryTab, label: 'Trips', icon: Calendar },
    { id: 'parts' as HistoryTab, label: 'Parts', icon: Package },
    { id: 'drivers' as HistoryTab, label: 'Drivers', icon: Users },
    { id: 'custodian' as HistoryTab, label: 'Custodian', icon: UserCircle },
    { id: 'jobOrders' as HistoryTab, label: 'Job Orders', icon: Wrench },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
    style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-gray-900 mb-1">Vehicle History</h2>
              <p className="text-gray-600">{vehicle.vehicleName} - {vehicle.plateNo}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-2 sm:px-6">
          <div className="flex gap-2 sm:gap-4 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'trips' && (
            <div className="space-y-4">
              {mockTrips.map((trip) => (
                <div key={trip.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm sm:text-base text-gray-900">{trip.date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Route</p>
                      <p className="text-sm sm:text-base text-gray-900">{trip.route}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Distance</p>
                      <p className="text-sm sm:text-base text-gray-900">{trip.distance}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="text-sm sm:text-base text-gray-900">{trip.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'parts' && (
            <div className="space-y-4">
              {mockParts.map((part) => (
                <div key={part.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-gray-900">{part.date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Part Name</p>
                      <p className="text-gray-900">{part.partName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="text-gray-900">{part.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Used By</p>
                      <p className="text-gray-900">{part.usedBy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-4">
              {mockDrivers.map((driver) => (
                <div key={driver.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Driver</p>
                      <p className="text-gray-900">{driver.driver}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Period</p>
                      <p className="text-gray-900">{driver.period}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Trips</p>
                      <p className="text-gray-900">{driver.totalTrips}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'custodian' && (
            <div className="space-y-4">
              {mockCustodians.map((custodian) => (
                <div key={custodian.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Custodian</p>
                      <p className="text-gray-900">{custodian.custodian}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Assigned Date</p>
                      <p className="text-gray-900">{custodian.assignedDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                        custodian.status === 'Current'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {custodian.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'jobOrders' && (
            <div className="space-y-4">
              {mockJobOrders.map((jobOrder) => (
                <div key={jobOrder.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <p className="text-gray-900">{jobOrder.jobOrderNo}</p>
                    <p className="text-sm text-gray-600">{jobOrder.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Vehicle</p>
                      <p className="text-sm text-gray-900">{jobOrder.vehicleName} - {jobOrder.plateNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Mechanic</p>
                      <p className="text-sm text-gray-900">{jobOrder.mechanic}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Parts Replaced</p>
                      <p className="text-sm text-gray-900">{jobOrder.partsReplaced}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Time Frame</p>
                      <p className="text-sm text-gray-900">{jobOrder.timeFrame}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
