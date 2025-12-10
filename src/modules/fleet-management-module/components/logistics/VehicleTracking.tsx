import { useState } from 'react';
import { MapPin, Navigation, Clock, Truck } from 'lucide-react';

interface VehicleLocation {
  id: string;
  plateNo: string;
  vehicleName: string;
  driver: string;
  status: 'In Transit' | 'Idle' | 'At Depot';
  location: string;
  destination: string;
  speed: number;
  lastUpdate: string;
  coordinates: { lat: number; lng: number };
}

const mockVehicleLocations: VehicleLocation[] = [
  {
    id: '1',
    plateNo: 'ABC-1234',
    vehicleName: 'Toyota Hilux',
    driver: 'John Smith',
    status: 'In Transit',
    location: 'EDSA, Quezon City',
    destination: 'Makati CBD',
    speed: 45,
    lastUpdate: '2 mins ago',
    coordinates: { lat: 14.6488, lng: 121.0509 }
  },
  {
    id: '2',
    plateNo: 'XYZ-5678',
    vehicleName: 'Isuzu D-Max',
    driver: 'Maria Garcia',
    status: 'In Transit',
    location: 'C5 Road, Pasig',
    destination: 'BGC, Taguig',
    speed: 38,
    lastUpdate: '1 min ago',
    coordinates: { lat: 14.5764, lng: 121.0851 }
  },
  {
    id: '3',
    plateNo: 'DEF-9012',
    vehicleName: 'Ford Ranger',
    driver: 'Robert Johnson',
    status: 'At Depot',
    location: 'Main Depot, Manila',
    destination: '-',
    speed: 0,
    lastUpdate: '5 mins ago',
    coordinates: { lat: 14.5995, lng: 120.9842 }
  },
  {
    id: '4',
    plateNo: 'GHI-3456',
    vehicleName: 'Mitsubishi L300',
    driver: 'Sarah Williams',
    status: 'Idle',
    location: 'Alabang, Muntinlupa',
    destination: 'Laguna',
    speed: 0,
    lastUpdate: '3 mins ago',
    coordinates: { lat: 14.4294, lng: 121.0419 }
  },
  {
    id: '5',
    plateNo: 'JKL-7890',
    vehicleName: 'Nissan Navara',
    driver: 'Michael Brown',
    status: 'In Transit',
    location: 'South Luzon Expressway',
    destination: 'Batangas',
    speed: 80,
    lastUpdate: '1 min ago',
    coordinates: { lat: 14.1583, lng: 121.2444 }
  },
];

export function VehicleTracking() {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);

  const getStatusColor = (status: VehicleLocation['status']) => {
    switch (status) {
      case 'In Transit':
        return 'bg-green-100 text-green-800';
      case 'Idle':
        return 'bg-yellow-100 text-yellow-800';
      case 'At Depot':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Vehicle Location Tracking</h1>
        <p className="text-gray-600">Real-time tracking of fleet vehicles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-gray-900">Live Map View</h3>
          </div>
          <div className="relative bg-gray-100 h-[400px] lg:h-[600px] flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Map integration with Sino tracking device
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Real-time GPS tracking visualization
              </p>
            </div>
            
            {/* Simulated map markers */}
            <div className="absolute inset-0 pointer-events-none">
              {mockVehicleLocations.map((vehicle, index) => (
                <div
                  key={vehicle.id}
                  className="absolute"
                  style={{
                    left: `${20 + index * 15}%`,
                    top: `${30 + (index % 3) * 20}%`,
                  }}
                >
                  <div className="pointer-events-auto">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${
                      vehicle.status === 'In Transit'
                        ? 'bg-green-500'
                        : vehicle.status === 'Idle'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                    }`}>
                      <Truck className="w-4 h-4 text-white" />
                    </div>
                    {selectedVehicle?.id === vehicle.id && (
                      <div className="absolute left-10 top-0 bg-white p-2 rounded shadow-lg whitespace-nowrap text-xs z-10">
                        <p className="text-gray-900">{vehicle.plateNo}</p>
                        <p className="text-gray-600">{vehicle.driver}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-gray-900">Active Vehicles</h3>
            <p className="text-sm text-gray-500 mt-1">{mockVehicleLocations.length} vehicles tracked</p>
          </div>
          <div className="overflow-y-auto max-h-[400px] lg:max-h-[600px]">
            {mockVehicleLocations.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => setSelectedVehicle(vehicle)}
                className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                  selectedVehicle?.id === vehicle.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-900">{vehicle.plateNo}</p>
                    <p className="text-sm text-gray-600">{vehicle.vehicleName}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getStatusColor(vehicle.status)}`}>
                    {vehicle.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Truck className="w-4 h-4" />
                    <span>{vehicle.driver}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{vehicle.location}</span>
                  </div>
                  
                  {vehicle.destination !== '-' && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Navigation className="w-4 h-4" />
                      <span className="truncate">{vehicle.destination}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{vehicle.lastUpdate}</span>
                    </div>
                    {vehicle.status === 'In Transit' && (
                      <span className="text-gray-900">{vehicle.speed} km/h</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">In Transit</p>
              <p className="text-gray-900">
                {mockVehicleLocations.filter(v => v.status === 'In Transit').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">Idle</p>
              <p className="text-gray-900">
                {mockVehicleLocations.filter(v => v.status === 'Idle').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1">At Depot</p>
              <p className="text-gray-900">
                {mockVehicleLocations.filter(v => v.status === 'At Depot').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
