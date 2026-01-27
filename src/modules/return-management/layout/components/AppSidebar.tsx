// src/modules/layout/components/AppSidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FileText, ClipboardCheck, PackageCheck } from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
    /*
    {
        title: "Sales Return",
        href: "/returns/sales-return",
        icon: FileText,
    },
    {
        title: "Inventory Reports",
        href: "/returns/inventory-reports",
        icon: ClipboardCheck,
    },
    {
        title: "Return To Supplier",
        href: "/returns/return-to-supplier",
        icon: PackageCheck,
    },
    */

        {
        title: "Sales Return Summary",
        href: "/returns/sales-return-summary",
        icon: PackageCheck,
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const { state } = useSidebar(); // "expanded" | "collapsed"
    const isCollapsed = state === "collapsed";

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b">
                <div className="flex items-center justify-center px-3 py-4">
                    {/* Expanded: show banner */}
                    {!isCollapsed && (
                        <div className="relative h-16 w-full overflow-hidden rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 shadow-sm">
                            <Image
                                src="/vos-erp-logo.png"
                                alt="VOS ERP"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    )}

                    {/* Collapsed: show square logo */}
                    {isCollapsed && (
                        <div className="relative h-10 w-10 rounded-xl bg-white shadow-sm">
                            <Image
                                src="/vos-erp-logo.png"
                                alt="VOS ERP"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;

                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton asChild isActive={isActive}>
                                            <Link href={item.href}>
                                                <Icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <div className="px-2 py-2 text-[11px] text-muted-foreground">
                    VOS-WEB · Sales
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}