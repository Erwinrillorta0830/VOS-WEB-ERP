import { useState } from 'react';
import { Settings, Truck, Calendar, RouteIcon, Save, Plus, X } from 'lucide-react';

export function SystemSettings() {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '' });
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">System Settings</h1>
        <p className="text-gray-600">Configure fleet categories, vehicle types, and system rules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Categories */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="w-5 h-5 text-blue-600" />
            <h3 className="text-gray-900">Fleet Categories</h3>
          </div>
          <div className="space-y-3">
            {['Light Duty', 'Medium Duty', 'Heavy Duty', 'Passenger Vehicle'].map((category) => (
              <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900">{category}</span>
                <button className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowCategoryModal(true)}
            className="mt-4 w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            + Add Category
          </button>
        </div>

        {/* Vehicle Types */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="w-5 h-5 text-green-600" />
            <h3 className="text-gray-900">Vehicle Types</h3>
          </div>
          <div className="space-y-3">
            {['Pickup Truck', 'Van', 'Cargo Truck', 'SUV', 'Sedan'].map((type) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900">{type}</span>
                <button className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowTypeModal(true)}
            className="mt-4 w-full px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
          >
            + Add Type
          </button>
        </div>

        {/* Maintenance Rules */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-orange-600" />
            <h3 className="text-gray-900">Maintenance Rules</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Oil Change Interval (km)</label>
              <input
                type="number"
                defaultValue="5000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">General Service Interval (months)</label>
              <input
                type="number"
                defaultValue="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Tire Rotation Interval (km)</label>
              <input
                type="number"
                defaultValue="10000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <Save className="w-4 h-4" />
            Save Rules
          </button>
        </div>

        {/* Trip Purposes */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <RouteIcon className="w-5 h-5 text-purple-600" />
            <h3 className="text-gray-900">Trip Purposes</h3>
          </div>
          <div className="space-y-3">
            {['Delivery', 'Client Visit', 'Pickup Parts', 'Team Building', 'Emergency', 'Maintenance'].map((purpose) => (
              <div key={purpose} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-900">{purpose}</span>
                <button className="text-blue-600 hover:text-blue-700 text-sm">Edit</button>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowPurposeModal(true)}
            className="mt-4 w-full px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
          >
            + Add Purpose
          </button>
        </div>

        {/* System Preferences */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-gray-900">System Preferences</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-2">Currency</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="PHP">PHP - Philippine Peso</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Distance Unit</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="KM">Kilometers</option>
                <option value="MI">Miles</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Date Format</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-2">Fuel Unit</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="L">Liters</option>
                <option value="GAL">Gallons</option>
              </select>
            </div>
          </div>
          <button className="mt-6 flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      </div>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Add Fleet Category</h2>
                <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setShowCategoryModal(false); setNewItem({ name: '', description: '' }); }} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Category Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Super Heavy Duty"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Category description"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Save className="w-5 h-5" />
                  Add Category
                </button>
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Add Vehicle Type</h2>
                <button onClick={() => setShowTypeModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setShowTypeModal(false); setNewItem({ name: '', description: '' }); }} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Vehicle Type Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Flatbed Truck"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type description"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <Save className="w-5 h-5" />
                  Add Type
                </button>
                <button type="button" onClick={() => setShowTypeModal(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Purpose Modal */}
      {showPurposeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
        style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-gray-900">Add Trip Purpose</h2>
                <button onClick={() => setShowPurposeModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setShowPurposeModal(false); setNewItem({ name: '', description: '' }); }} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Purpose Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Site Inspection"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Purpose description"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  <Save className="w-5 h-5" />
                  Add Purpose
                </button>
                <button type="button" onClick={() => setShowPurposeModal(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
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
