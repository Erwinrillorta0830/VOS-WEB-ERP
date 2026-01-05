'use client';

import { useState } from 'react';
import { Layout } from '../../../modules/fleet-management-module/components/Layout';
import { Dashboard } from '../../../modules/fleet-management-module/components/dashboard/Dashboard';
import { VehiclesList } from '../../../modules/fleet-management-module/components/vehicles/VehiclesList';
import { VehicleDesignation } from '../../../modules/fleet-management-module/components/vehicles/VehicleDesignation';
import { VehicleDocuments } from '../../../modules/fleet-management-module/components/vehicles/VehicleDocuments';
import { JobOrders } from '../../../modules/fleet-management-module/components/vehicles/JobOrders';
import { MaintenanceSchedule } from '../../../modules/fleet-management-module/components/vehicles/MaintenanceSchedule';
import { DriverManagement } from '../../../modules/fleet-management-module/components/drivers/DriverManagement';
import { TripManagement } from '../../../modules/fleet-management-module/components/trips/TripManagement';
import { DispatchSummary } from '../../../modules/fleet-management-module/components/trips/DispatchSummary';
import { FuelManagement } from '../../../modules/fleet-management-module/components/inventory/FuelManagement';
import { SpareParts } from '../../../modules/fleet-management-module/components/inventory/SpareParts';
import { StatisticsDashboard } from '../../../modules/fleet-management-module/components/logistics/StatisticsDashboard';
import { PendingDeliveries } from '../../../modules/fleet-management-module/components/logistics/PendingDeliveries';
import { VehicleTracking } from '../../../modules/fleet-management-module/components/logistics/VehicleTracking';
import { Deliveries } from '../../../modules/fleet-management-module/components/logistics/Deliveries';
import { LogisticsSummary } from '../../../modules/fleet-management-module/components/logistics/LogisticsSummary';

import { Violations } from '../../../modules/fleet-management-module/components/drivers/Violations';
import { UserRoleManagement } from '../../../modules/fleet-management-module/components/settings/UserRoleManagement';
import { SystemSettings } from '../../../modules/fleet-management-module/components/settings/SystemSettings';
import type { PageType } from '../../../modules/fleet-management-module/types';
import { CreateDispatchPlanModal } from '../../../modules/CreateDispatchPlanModal';

export default function HomePage() {
    const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

    const renderPage = () => {
        console.log('Current page:', currentPage); // Debug log

        switch (currentPage) {
            case 'logistics-summary':
                return <LogisticsSummary />;
            case 'dashboard':
                return <Dashboard />;
            case 'vehicles-list':
                return <VehiclesList />;
            case 'vehicle-designation':
                return <VehicleDesignation />;
            case 'vehicle-documents':
                return <VehicleDocuments />;
            case 'job-orders':
                return <JobOrders />;
            case 'maintenance-schedule':
                return <MaintenanceSchedule />;
            case 'driver-management':
                return <DriverManagement />;
            case 'trip-management':
                return <TripManagement />;
            case 'dispatch-summary':
                console.log('Rendering DispatchSummary component'); // Debug log
                return <DispatchSummary />;
            case 'fuel-management':
                return <FuelManagement />;
            case 'spare-parts':
                return <SpareParts />;
            case 'statistics-dashboard':
                return <StatisticsDashboard />;
            case 'pending-deliveries':
                return <PendingDeliveries />;
            case 'vehicle-tracking':
                return <VehicleTracking />;
            case 'deliveries':
                return <Deliveries />;
            case 'violations':
                return <Violations />;
            case 'user-role-management':
                return <UserRoleManagement />;
            case 'system-settings':
                return <SystemSettings />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
            {renderPage()}
        </Layout>
    );
}
