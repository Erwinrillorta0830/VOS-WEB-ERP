import { useState } from 'react';
import { X, Plus, Trash2, ArrowRight, Check } from 'lucide-react';

interface CreateDeliveryModalProps {
  onClose: () => void;
}

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

const mockSuppliers = ['Metro Suppliers Inc.', 'Global Trading Co.', 'Prime Distributors', 'Central Supply Hub'];
const mockCustomers = ['ABC Corporation', 'XYZ Enterprises', 'LMN Industries', 'PQR Solutions'];
const mockDrivers = ['John Smith', 'Maria Garcia', 'Robert Johnson', 'Sarah Williams', 'Michael Brown'];
const mockVehicles = [
  { plateNo: 'ABC-1234', name: 'Toyota Hilux' },
  { plateNo: 'XYZ-5678', name: 'Isuzu D-Max' },
  { plateNo: 'DEF-9012', name: 'Ford Ranger' },
  { plateNo: 'GHI-3456', name: 'Mitsubishi L300' },
];

const availableProducts = [
  { id: '1', name: 'Product A', defaultPrice: 1500 },
  { id: '2', name: 'Product B', defaultPrice: 2500 },
  { id: '3', name: 'Product C', defaultPrice: 3200 },
  { id: '4', name: 'Product D', defaultPrice: 1800 },
  { id: '5', name: 'Product E', defaultPrice: 4500 },
];

export function CreateDeliveryModal({ onClose }: CreateDeliveryModalProps) {
  const [step, setStep] = useState<'form' | 'summary'>('form');
  
  // Form state
  const [supplier, setSupplier] = useState('');
  const [customer, setCustomer] = useState('');
  const [driver, setDriver] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const generateInvoiceNo = () => {
    const year = new Date().getFullYear();
    const nextNumber = 9; // Mock next number
    return `INV-${year}-${String(nextNumber).padStart(4, '0')}`;
  };

  const addProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      price: 0,
    };
    setSelectedProducts([...selectedProducts, newProduct]);
  };

  const removeProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== id));
  };

  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('summary');
  };

  const handleCreate = () => {
    console.log('Creating delivery...');
    onClose();
  };

  const selectedVehicleData = mockVehicles.find(v => v.plateNo === vehicle);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50"
    style={{ backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-gray-900 mb-1">
                {step === 'form' ? 'Create New Delivery' : 'Delivery Summary'}
              </h2>
              <p className="text-gray-600">{generateInvoiceNo()}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Delivery Details */}
              <div>
                <h3 className="text-gray-900 mb-4">Delivery Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Supplier</label>
                    <select
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select supplier</option>
                      {mockSuppliers.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Customer</label>
                    <select
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select customer</option>
                      {mockCustomers.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Driver</label>
                    <select
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select driver</option>
                      {mockDrivers.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Vehicle</label>
                    <select
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select vehicle</option>
                      {mockVehicles.map((v) => (
                        <option key={v.plateNo} value={v.plateNo}>
                          {v.name} - {v.plateNo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Dispatch Date</label>
                    <input
                      type="date"
                      value={dispatchDate}
                      onChange={(e) => setDispatchDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Estimated Arrival</label>
                    <input
                      type="date"
                      value={estimatedArrival}
                      onChange={(e) => setEstimatedArrival(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900">Products</h3>
                  <button
                    type="button"
                    onClick={addProduct}
                    className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Product
                  </button>
                </div>

                {selectedProducts.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <p className="text-gray-500">No products added yet</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Add Product" to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedProducts.map((product, index) => (
                      <div key={product.id} className="flex gap-3 items-start p-4 border border-gray-200 rounded-lg">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Product</label>
                            <select
                              value={product.name}
                              onChange={(e) => {
                                const selectedProduct = availableProducts.find(p => p.name === e.target.value);
                                updateProduct(product.id, 'name', e.target.value);
                                if (selectedProduct) {
                                  updateProduct(product.id, 'price', selectedProduct.defaultPrice);
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              required
                            >
                              <option value="">Select product</option>
                              {availableProducts.map((p) => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.price}
                              onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              required
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProduct(product.id)}
                          className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {selectedProducts.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Total Amount:</span>
                      <span className="text-gray-900">₱{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={selectedProducts.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continue to Summary
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          ) : (
            // Summary View
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900">Please review the delivery details before creating</p>
              </div>

              <div>
                <h3 className="text-gray-900 mb-4">Delivery Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Invoice No.</p>
                    <p className="text-gray-900">{generateInvoiceNo()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Supplier</p>
                    <p className="text-gray-900">{supplier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Customer</p>
                    <p className="text-gray-900">{customer}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Driver</p>
                    <p className="text-gray-900">{driver}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Vehicle</p>
                    <p className="text-gray-900">{selectedVehicleData?.name} - {vehicle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dispatch Date</p>
                    <p className="text-gray-900">{dispatchDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estimated Arrival</p>
                    <p className="text-gray-900">{estimatedArrival}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-gray-900 mb-4">Products</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs text-gray-500">Product</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-500">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-500">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{product.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{product.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">₱{product.price.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">₱{(product.quantity * product.price).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-sm text-gray-700">Total Amount</td>
                        <td className="px-4 py-2 text-gray-900">₱{totalAmount.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Check className="w-5 h-5" />
                  Create Delivery
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
