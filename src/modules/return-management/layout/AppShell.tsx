// src/modules/layout/AppShell.tsx
"use client";

import React from "react";
import Link from "next/link"; // Import Next.js Link
import { ArrowLeft } from "lucide-react"; // Import Icon
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button"; // Import Shadcn Button
import { Separator } from "@/components/ui/separator"; // Optional: Adds a nice divider
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

            {/* ✅ NEW: Back to Apps Button (Shadcn Implementation) */}
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex h-8 gap-2 rounded-full px-3 text-xs font-medium"
              asChild
            >
              <Link href="/app">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Apps</span>
              </Link>
            </Button>

            {/* Optional: Separator to visually divide the button from the title */}
            <Separator
              orientation="vertical"
              className="mx-2 h-4 hidden md:block"
            />

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
