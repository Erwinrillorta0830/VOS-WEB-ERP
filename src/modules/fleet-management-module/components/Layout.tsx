import { useState } from "react";
import Link from "next/link";
import {
    Truck,
    Package,
    MapPin,
    LayoutDashboard,
    Fuel,
    Wrench,
    UserCheck,
    ClipboardList,
    BarChart3,
    Menu,
    X,
    Users,
    Route,
    AlertTriangle,
    FileText,
    Settings,
    Shield,
    Calendar,
    ClipboardCheck,
    PackageCheck,
    ArrowLeft,
} from "lucide-react";
import type { PageType } from "../types";

interface LayoutProps {
    currentPage: PageType;
    onNavigate: (page: PageType) => void;
    children: React.ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        // {
        //     category: "Dashboard",
        //     items: [
        //         { id: "dashboard" as PageType, label: "Fleet Dashboard", icon: LayoutDashboard },
        //     ],
        // },
        // {
        //     category: "Vehicles Management",
        //     items: [
        //         { id: "vehicles-list" as PageType, label: "Vehicle List", icon: Truck },
        //         { id: "vehicle-documents" as PageType, label: "Info & Registration", icon: FileText },
        //         { id: "vehicle-designation" as PageType, label: "Vehicle Designation", icon: UserCheck },
        //         { id: "maintenance-schedule" as PageType, label: "Maintenance Schedule", icon: Calendar },
        //         { id: "job-orders" as PageType, label: "Job Orders and Repairs", icon: Wrench },
        //     ],
        // },
        // {
        //     category: "Driver Management",
        //     items: [
        //         { id: "driver-management" as PageType, label: "Driver Profiles", icon: Users },
        //         { id: "violations" as PageType, label: "Violations and Penalties", icon: AlertTriangle },
        //     ],
        // },
        {
            category: "Trip Management",
            items: [
                //{ id: "trip-management" as PageType, label: "Requests & Dispatch", icon: Route },
                { id: "dispatch-summary" as PageType, label: "Dispatch Summary", icon: ClipboardCheck },
                //{ id: "vehicle-tracking" as PageType, label: "Vehicle Tracking", icon: MapPin },
            ],
        },
        {
            category: "Logistics",
            items: [
                //{ id: "deliveries" as PageType, label: "Deliveries", icon: Package },
                { id: "statistics-dashboard" as PageType, label: "Delivery Statistics", icon: BarChart3 },
                { id: "logistics-summary" as PageType, label: "Logistics Summary", icon: FileText },
                { id: "pending-deliveries" as PageType, label: "Pending Deliveries", icon: PackageCheck },
                { id: "pending-invoices" as PageType, label: "Pending Invoices", icon: FileText },
            ],
        },
        // {
        //     category: "Inventory Management",
        //     items: [
        //         { id: "fuel-management" as PageType, label: "Fuel Management", icon: Fuel },
        //         { id: "spare-parts" as PageType, label: "Spare Parts", icon: ClipboardList },
        //     ],
        // },
        // {
        //     category: "System",
        //     items: [
        //         { id: "user-role-management" as PageType, label: "Users and Roles", icon: Shield },
        //         { id: "system-settings" as PageType, label: "System Settings", icon: Settings },
        //     ],
        // },
    ];

    const handleNavigate = (page: PageType) => {
        onNavigate(page);
        setIsMobileMenuOpen(false);
    };

    return (
        <div
            className="flex h-screen bg-gray-50"
            style={{ backdropFilter: "blur(4px)" }}
        >
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-opacity-10 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 lg:transform-none ${
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                }`}
            >
                <div className="p-4 lg:p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <LayoutDashboard className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-gray-900">Fleet Manager</h1>
                                <p className="text-xs text-gray-500">Management System</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="lg:hidden text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                    {menuItems.map((section) => (
                        <div key={section.category} className="mb-6">
                            <h3 className="text-xs uppercase text-gray-500 px-3 mb-2">
                                {section.category}
                            </h3>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = currentPage === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavigate(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                                isActive
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="text-sm">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full">
                {/* Mobile Header */}
                <div className="lg:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-30">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="text-gray-600 hover:text-gray-900"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <LayoutDashboard className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-gray-900">Fleet Manager</span>
                        </div>
                        <div className="w-6" /> {/* Spacer for centering */}
                    </div>
                </div>

                {/* Back to Apps bar */}
                <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
                    <Link
                        href="/app"
                        className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Apps</span>
                    </Link>
                </div>

                {children}
            </main>
        </div>
    );
}
