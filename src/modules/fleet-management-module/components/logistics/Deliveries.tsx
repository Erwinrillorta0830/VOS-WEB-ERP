import { useState } from 'react';
import { Plus, Eye, Search, Filter } from 'lucide-react';
import { TagDeliveryModal } from './TagDeliveryModal';
import { CreateDeliveryModal } from './CreateDeliveryModal';

export interface Delivery {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  documentNo: string;
  supplier: string;
  driver: string;
  cityTown: string;
  plateNo: string;
  status: 'Fulfilled' | 'Unfulfilled' | 'Approved' | 'Rejected';
  amount: number;
  tag?: string;
}

const mockDeliveries: Delivery[] = [
  {
    id: '1',
    invoiceNo: 'INV-2025-0001',
    invoiceDate: '2025-11-25',
    documentNo: 'DOC-001',
    supplier: 'Metro Suppliers Inc.',
    driver: 'John Smith',
    cityTown: 'Makati City',
    plateNo: 'ABC-1234',
    status: 'Fulfilled',
    amount: 125000,
  },
  {
    id: '2',
    invoiceNo: 'INV-2025-0002',
    invoiceDate: '2025-11-24',
    documentNo: 'DOC-002',
    supplier: 'Global Trading Co.',
    driver: 'Maria Garcia',
    cityTown: 'Quezon City',
    plateNo: 'XYZ-5678',
    status: 'Unfulfilled',
    amount: 89500,
    tag: 'Traffic delay',
  },
  {
    id: '3',
    invoiceNo: 'INV-2025-0003',
    invoiceDate: '2025-11-23',
    documentNo: 'DOC-003',
    supplier: 'Prime Distributors',
    driver: 'Robert Johnson',
    cityTown: 'Manila',
    plateNo: 'DEF-9012',
    status: 'Rejected',
    amount: 156000,
    tag: 'Wrong items delivered',
  },
  {
    id: '4',
    invoiceNo: 'INV-2025-0004',
    invoiceDate: '2025-11-22',
    documentNo: 'DOC-004',
    supplier: 'Central Supply Hub',
    driver: 'Sarah Williams',
    cityTown: 'Pasig City',
    plateNo: 'GHI-3456',
    status: 'Approved',
    amount: 98000,
  },
  {
    id: '5',
    invoiceNo: 'INV-2025-0005',
    invoiceDate: '2025-11-21',
    documentNo: 'DOC-005',
    supplier: 'Metro Suppliers Inc.',
    driver: 'Michael Brown',
    cityTown: 'Taguig City',
    plateNo: 'JKL-7890',
    status: 'Fulfilled',
    amount: 210000,
  },
  {
    id: '6',
    invoiceNo: 'INV-2025-0006',
    invoiceDate: '2025-11-20',
    documentNo: 'DOC-006',
    supplier: 'Global Trading Co.',
    driver: 'Jennifer Davis',
    cityTown: 'Muntinlupa',
    plateNo: 'MNO-2468',
    status: 'Unfulfilled',
    amount: 73500,
    tag: 'Customer not available',
  },
  {
    id: '7',
    invoiceNo: 'INV-2025-0007',
    invoiceDate: '2025-11-19',
    documentNo: 'DOC-007',
    supplier: 'Prime Distributors',
    driver: 'David Wilson',
    cityTown: 'Parañaque',
    plateNo: 'PQR-1357',
    status: 'Fulfilled',
    amount: 142000,
  },
  {
    id: '8',
    invoiceNo: 'INV-2025-0008',
    invoiceDate: '2025-11-18',
    documentNo: 'DOC-008',
    supplier: 'Central Supply Hub',
    driver: 'Lisa Anderson',
    cityTown: 'Las Piñas',
    plateNo: 'STU-9753',
    status: 'Rejected',
    amount: 67000,
    tag: 'Damaged goods',
  },
];

export function Deliveries() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredDeliveries = mockDeliveries.filter(delivery => {
    const matchesSearch = 
      delivery.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.plateNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Delivery['status']) => {
    switch (status) {
      case 'Fulfilled':
        return 'bg-green-100 text-green-800';
      case 'Unfulfilled':
        return 'bg-yellow-100 text-yellow-800';
      case 'Approved':
        return 'bg-blue-100 text-blue-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Deliveries</h1>
          <p className="text-gray-600">Manage and track all delivery operations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Delivery
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice no., supplier, driver, or plate no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="Fulfilled">Fulfilled</option>
            <option value="Unfulfilled">Unfulfilled</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Deliveries Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Invoice No.</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Invoice Date</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Document No.</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Supplier</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Driver</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">City/Town</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Plate No.</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Tag</th>
                <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDeliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{delivery.invoiceNo}</td>
                  <td className="px-6 py-4 text-gray-700">{delivery.invoiceDate}</td>
                  <td className="px-6 py-4 text-gray-700">{delivery.documentNo}</td>
                  <td className="px-6 py-4 text-gray-900">{delivery.supplier}</td>
                  <td className="px-6 py-4 text-gray-700">{delivery.driver}</td>
                  <td className="px-6 py-4 text-gray-700">{delivery.cityTown}</td>
                  <td className="px-6 py-4 text-gray-700">{delivery.plateNo}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(delivery.status)}`}>
                      {delivery.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900">₱{delivery.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {delivery.tag ? (
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {delivery.tag}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedDelivery(delivery)}
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

      {/* Deliveries Cards - Mobile */}
      <div className="lg:hidden space-y-4">
        {filteredDeliveries.map((delivery) => (
          <div key={delivery.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-gray-900">{delivery.invoiceNo}</p>
                <p className="text-sm text-gray-600">{delivery.invoiceDate}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(delivery.status)}`}>
                {delivery.status}
              </span>
            </div>
            <div className="space-y-2 text-sm mb-3">
              <p className="text-gray-700"><span className="text-gray-500">Supplier:</span> {delivery.supplier}</p>
              <p className="text-gray-700"><span className="text-gray-500">Driver:</span> {delivery.driver}</p>
              <p className="text-gray-700"><span className="text-gray-500">City:</span> {delivery.cityTown}</p>
              <p className="text-gray-700"><span className="text-gray-500">Plate:</span> {delivery.plateNo}</p>
              <p className="text-gray-900"><span className="text-gray-500">Amount:</span> ₱{delivery.amount.toLocaleString()}</p>
              {delivery.tag && (
                <p className="text-gray-700">
                  <span className="text-gray-500">Tag:</span>{' '}
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{delivery.tag}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedDelivery(delivery)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
          </div>
        ))}
      </div>

      {/* Tag Delivery Modal */}
      {selectedDelivery && (
        <TagDeliveryModal
          delivery={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
        />
      )}

      {/* Create Delivery Modal */}
      {showCreateModal && (
        <CreateDeliveryModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
