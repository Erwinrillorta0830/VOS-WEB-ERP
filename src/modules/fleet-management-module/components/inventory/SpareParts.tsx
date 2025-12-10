import { useState } from 'react';
import { Package, AlertTriangle, Plus, Search, X, Save } from 'lucide-react';

interface SparePart {
  id: string;
  partName: string;
  partCode: string;
  quantity: number;
  minStock: number;
  usedIn: string[];
  lastUsed: string;
  supplier: string;
}

const mockSpareParts: SparePart[] = [
  {
    id: '1',
    partName: 'Engine Oil',
    partCode: 'EO-001',
    quantity: 45,
    minStock: 20,
    usedIn: ['ABC-1234', 'XYZ-5678'],
    lastUsed: '2025-11-25',
    supplier: 'AutoParts Co.'
  },
  {
    id: '2',
    partName: 'Oil Filter',
    partCode: 'OF-002',
    quantity: 15,
    minStock: 10,
    usedIn: ['ABC-1234', 'DEF-9012'],
    lastUsed: '2025-11-20',
    supplier: 'AutoParts Co.'
  },
  {
    id: '3',
    partName: 'Brake Pads',
    partCode: 'BP-003',
    quantity: 8,
    minStock: 12,
    usedIn: ['XYZ-5678'],
    lastUsed: '2025-11-18',
    supplier: 'Brake Solutions Inc.'
  },
  {
    id: '4',
    partName: 'Air Filter',
    partCode: 'AF-004',
    quantity: 22,
    minStock: 15,
    usedIn: ['DEF-9012', 'GHI-3456'],
    lastUsed: '2025-11-15',
    supplier: 'AutoParts Co.'
  },
  {
    id: '5',
    partName: 'Spark Plugs',
    partCode: 'SP-005',
    quantity: 5,
    minStock: 20,
    usedIn: ['DEF-9012'],
    lastUsed: '2025-11-10',
    supplier: 'Engine Parts Ltd.'
  },
  {
    id: '6',
    partName: 'Battery',
    partCode: 'BT-006',
    quantity: 12,
    minStock: 8,
    usedIn: ['GHI-3456', 'JKL-7890'],
    lastUsed: '2025-11-05',
    supplier: 'Power Solutions'
  },
  {
    id: '7',
    partName: 'Transmission Fluid',
    partCode: 'TF-007',
    quantity: 30,
    minStock: 15,
    usedIn: ['ABC-1234', 'XYZ-5678', 'DEF-9012'],
    lastUsed: '2025-11-01',
    supplier: 'AutoParts Co.'
  },
  {
    id: '8',
    partName: 'Wiper Blades',
    partCode: 'WB-008',
    quantity: 3,
    minStock: 10,
    usedIn: ['MNO-2468'],
    lastUsed: '2025-10-28',
    supplier: 'Vehicle Accessories'
  },
];

export function SpareParts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPart, setNewPart] = useState({
    partName: '',
    partCode: '',
    quantity: 0,
    minStock: 0,
    supplier: '',
  });

  const filteredParts = mockSpareParts.filter(part =>
    part.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.partCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockParts = mockSpareParts.filter(part => part.quantity < part.minStock);
  const totalParts = mockSpareParts.reduce((sum, part) => sum + part.quantity, 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Spare Parts Inventory</h1>
        <p className="text-gray-600">Track and manage spare parts for vehicle maintenance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-1">Total Parts</p>
          <p className="text-gray-900">{totalParts}</p>
          <p className="text-xs text-gray-500 mt-1">Across {mockSpareParts.length} categories</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-1">In Stock</p>
          <p className="text-gray-900">{mockSpareParts.filter(p => p.quantity >= p.minStock).length}</p>
          <p className="text-xs text-gray-500 mt-1">Parts above minimum stock</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-gray-600 mb-1">Low Stock</p>
          <p className="text-gray-900">{lowStockParts.length}</p>
          <p className="text-xs text-gray-500 mt-1">Parts below minimum stock</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockParts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-900">Low Stock Alert</p>
              <p className="text-sm text-red-700">
                {lowStockParts.length} part(s) are below minimum stock level and need reordering
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Add Button */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by part name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Add Part
        </button>
      </div>

      {/* Parts Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Part Code</th>
              <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Part Name</th>
              <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Quantity</th>
              <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Min Stock</th>
              <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Supplier</th>
              <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Last Used</th>
              <th className="px-6 py-3 text-left text-xs uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredParts.map((part) => {
              const isLowStock = part.quantity < part.minStock;
              return (
                <tr key={part.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">{part.partCode}</td>
                  <td className="px-6 py-4 text-gray-900">{part.partName}</td>
                  <td className="px-6 py-4">
                    <span className={isLowStock ? 'text-red-600' : 'text-gray-900'}>
                      {part.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{part.minStock}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                      isLowStock
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-700">{part.supplier}</td>
                  <td className="px-6 py-4 text-gray-700">{part.lastUsed}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedPart(part)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      View Usage
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Parts Cards - Mobile */}
      <div className="lg:hidden space-y-4">
        {filteredParts.map((part) => {
          const isLowStock = part.quantity < part.minStock;
          return (
            <div key={part.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-gray-900">{part.partName}</p>
                  <p className="text-sm text-gray-600">{part.partCode}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${
                  isLowStock
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {isLowStock ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                  <p className="text-gray-500">Quantity</p>
                  <p className={isLowStock ? 'text-red-600' : 'text-gray-900'}>{part.quantity}</p>
                </div>
                <div>
                  <p className="text-gray-500">Min Stock</p>
                  <p className="text-gray-900">{part.minStock}</p>
                </div>
                <div>
                  <p className="text-gray-500">Supplier</p>
                  <p className="text-gray-900">{part.supplier}</p>
                </div>
                <div>
                  <p className="text-gray-500">Last Used</p>
                  <p className="text-gray-900">{part.lastUsed}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPart(part)}
                className="w-full text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition-colors text-sm"
              >
                View Usage
              </button>
            </div>
          );
        })}
      </div>

      {/* Part Usage Modal */}
      {selectedPart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-gray-900 mb-1">{selectedPart.partName}</h3>
                  <p className="text-sm text-gray-600">Part Code: {selectedPart.partCode}</p>
                </div>
                <button
                  onClick={() => setSelectedPart(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Current Stock</p>
                <p className="text-gray-900">{selectedPart.quantity} units</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Used in Vehicles</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPart.usedIn.map((plateNo) => (
                    <span
                      key={plateNo}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {plateNo}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Supplier</p>
                <p className="text-gray-900">{selectedPart.supplier}</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedPart(null)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Add New Spare Part</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Part Name</label>
                <input
                  type="text"
                  value={newPart.partName}
                  onChange={(e) => setNewPart({ ...newPart, partName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter part name"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Part Code</label>
                <input
                  type="text"
                  value={newPart.partCode}
                  onChange={(e) => setNewPart({ ...newPart, partCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., BP-009"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">Min Stock</label>
                  <input
                    type="number"
                    value={newPart.minStock}
                    onChange={(e) => setNewPart({ ...newPart, minStock: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Supplier</label>
                <input
                  type="text"
                  value={newPart.supplier}
                  onChange={(e) => setNewPart({ ...newPart, supplier: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Supplier name"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Add Part
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
