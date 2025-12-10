// Page Navigation Types
export type PageType =
    | 'dashboard'
    | 'vehicles-list'
    | 'vehicle-designation'
    | 'vehicle-documents'
    | 'job-orders'
    | 'maintenance-schedule'
    | 'driver-management'
    | 'trip-management'
    | 'dispatch-summary'
    | 'fuel-management'
    | 'spare-parts'
    | 'statistics-dashboard'
    | 'logistics-summary'
    | 'pending-deliveries'
    | 'vehicle-tracking'
    | 'deliveries'
    | 'violations'
    | 'user-role-management'
    | 'system-settings';

// Vehicle Types
export interface Vehicle {
    id: string;
    plateNo: string;
    model: string;
    year: number;
    type: string;
    category: string;
    status: 'Available' | 'In Use' | 'Maintenance' | 'Out of Service';
    mileage: number;
    fuelType: string;
    lastMaintenance?: string;
    nextMaintenance?: string;
}

// Driver Types
export interface Driver {
    id: string;
    name: string;
    licenseNo: string;
    licenseExpiry: string;
    phoneNo: string;
    email: string;
    status: 'Active' | 'Inactive' | 'On Leave';
    joinDate: string;
    violations?: number;
}

// Trip Types
export interface Trip {
    id: string;
    vehicleId: string;
    driverId: string;
    purpose: string;
    destination: string;
    startDate: string;
    endDate?: string;
    status: 'Pending' | 'Approved' | 'In Progress' | 'Completed' | 'Cancelled';
    requestedBy: string;
    approvedBy?: string;
    distance?: number;
    fuelUsed?: number;
}

// Maintenance Types
export interface MaintenanceRecord {
    id: string;
    vehicleId: string;
    type: 'Preventive' | 'Corrective' | 'Emergency';
    description: string;
    scheduledDate: string;
    completedDate?: string;
    status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
    cost?: number;
    mechanic?: string;
    parts?: string[];
}

// Fuel Types
export interface FuelRecord {
    id: string;
    vehicleId: string;
    driverId: string;
    date: string;
    liters: number;
    cost: number;
    odometer: number;
    fuelType: string;
    station?: string;
}

// Spare Parts Types
export interface SparePart {
    id: string;
    partName: string;
    partNumber: string;
    category: string;
    quantity: number;
    minStock: number;
    unit: string;
    unitCost: number;
    supplier?: string;
    location?: string;
}

// Delivery Types
export interface Delivery {
    id: string;
    vehicleId: string;
    driverId: string;
    destination: string;
    items: string;
    status: 'Pending' | 'In Transit' | 'Delivered' | 'Failed';
    scheduledDate: string;
    deliveredDate?: string;
    recipient?: string;
    notes?: string;
}

// User Types
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Dispatcher' | 'Driver' | 'Maintenance' | 'Viewer';
    department?: string;
    status: 'Active' | 'Inactive';
    createdAt: string;
}

// Violation Types
export interface Violation {
    id: string;
    driverId: string;
    date: string;
    type: string;
    description: string;
    severity: 'Minor' | 'Major' | 'Critical';
    status: 'Pending' | 'Resolved' | 'Under Review';
    penalty?: string;
}

// Dispatch Plan Types
export interface CustomerTransaction {
    id: string;
    customerName: string;
    address: string;
    itemsOrdered: string;
    amount: number;
    status: 'Not Delivered' | 'Has Concerns' | 'Has Return';
    remarks?: string;
}

export interface DispatchPlan {
    id: string;
    dpNumber: string;
    driverId: string;
    driverName: string;
    salesmanId: string;
    salesmanName: string;
    vehicleId: string;
    vehiclePlateNo: string;
    startingPoint: string;
    timeOfDispatch: string;
    timeOfArrival: string;
    estimatedDispatch: string;
    estimatedArrival: string;
    customerTransactions: CustomerTransaction[];
    status: 'For Approval' | 'For Dispatch' | 'Inbound' | 'For Clearance' | 'Completed';
    remarks?: string;
    approvedBy?: string;
    approvedAt?: string;
    dispatchedAt?: string;
    arrivedAt?: string;
    clearedAt?: string;
    createdAt: string;
    updatedAt: string;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}