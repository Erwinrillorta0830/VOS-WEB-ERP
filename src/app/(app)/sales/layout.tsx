// src/app/(app)/layout.tsx
import React from "react";
import { Sidebar } from "@/components/shared/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen w-full">
            <Sidebar />
            <main className="flex-1 ml-64 p-6 transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
