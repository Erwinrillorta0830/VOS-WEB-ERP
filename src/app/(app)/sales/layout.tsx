"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/shared/Sidebar";
import { ThemeProvider } from "../../../components/theme-provide";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <div className="flex min-h-screen w-full">
                <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

                <main
                    className={cn(
                        "flex-1 p-6 transition-all duration-300",
                        collapsed ? "ml-16" : "ml-64"
                    )}
                >
                    {children}
                </main>
            </div>
        </ThemeProvider>
    );
}
