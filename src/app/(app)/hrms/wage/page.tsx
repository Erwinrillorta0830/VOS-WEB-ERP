// src/app/(app)/hrms/wage/page.tsx
"use client";

import { SidebarProvider } from "../../../../modules/hr-management-system/providers/SidebarProvider";
import WageModule from "../../../../modules/hr-management-system/wage/WageModule";

export default function Page() {
    return (
        <SidebarProvider>
            <WageModule />
        </SidebarProvider>
    );
}
