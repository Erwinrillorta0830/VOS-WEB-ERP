// src/modules/layout/AppShell.tsx
"use client";

import React from "react";
import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    return (
        <SidebarProvider>
            <AppSidebar />

            <SidebarInset>
                <div className="flex min-h-screen flex-col bg-background text-foreground">
                    <header className="flex h-14 items-center gap-2 border-b px-4">
                        <SidebarTrigger className="mr-2" />
                        <div className="flex flex-col">
              <span className="text-sm font-semibold">
                Sales Return Workflow
              </span>
                            <span className="text-xs text-muted-foreground">
                Sales Return · Inventory Reports · Return to Supplier
              </span>
                        </div>
                    </header>

                    <main className="flex-1 p-4">{children}</main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
