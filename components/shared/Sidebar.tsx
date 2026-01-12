// src/components/shared/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../src/lib/utils";
import {
    LayoutDashboard,
    Users,
    TrendingUp,
    Package,
    PanelLeft,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useTheme } from "next-themes";

interface NavItem {
    title: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    role?: string[];
}

const navItems: NavItem[] = [
    {
        title: "Executive Dashboard",
        href: "/sales/executive",
        icon: LayoutDashboard,
        role: ["executive"],
    },
    {
        title: "Manager Dashboard",
        href: "/sales/manager",
        icon: TrendingUp,
        role: ["manager", "executive"],
    },
    {
        title: "Supervisor Dashboard",
        href: "/sales/supervisor",
        icon: Users,
        role: ["supervisor", "executive"],
    },
    {
        title: "Salesman Dashboard",
        href: "/sales/encoder",
        icon: Package,
        role: ["encoder", "executive"],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Read theme; do NOT force setTheme here.
    useTheme();

    const [userRole, setUserRole] = useState<string>("");
    const [isCOO, setIsCOO] = useState(false);

    useEffect(() => {
        setMounted(true);

        const userStr = localStorage.getItem("user");
        if (!userStr) return;

        try {
            const user = JSON.parse(userStr);
            setUserRole(String(user.role ?? ""));
            setIsCOO(Boolean(user.isCOO));
        } catch (e) {
            console.error("Error parsing user data:", e);
        }
    }, []);

    const filteredNavItems = useMemo(() => {
        const effectiveRole = (isCOO ? "executive" : userRole).trim().toLowerCase();

        return navItems.filter((item) => {
            if (!item.role || item.role.length === 0) return true;
            if (!effectiveRole) return true; // no role => show all
            return item.role.map((r) => r.toLowerCase()).includes(effectiveRole);
        });
    }, [userRole, isCOO]);

    const sidebarWidth = collapsed ? "w-16" : "w-64";

    if (!mounted) {
        return (
            <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
                <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
                            V
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">VOS</h1>
                            <p className="text-xs text-muted-foreground">Sales Dashboard</p>
                        </div>
                    </div>

                    <div className="h-9 w-9 rounded-lg bg-sidebar-accent/40" />
                </div>
            </aside>
        );
    }

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen border-r transition-all duration-300 flex flex-col",
                "border-sidebar-border bg-sidebar text-sidebar-foreground",
                sidebarWidth
            )}
        >
            {/* HEADER: Logo + Collapse toggle (always visible) */}
            <div
                className={cn(
                    "flex h-16 items-center border-b border-sidebar-border",
                    collapsed ? "justify-center px-2" : "justify-between px-4"
                )}
            >
                {!collapsed ? (
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-600 text-white font-bold">
                            V
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold truncate">VOS</h1>
                            <p className="text-xs text-muted-foreground truncate">
                                {isCOO ? "Executive Access" : "Sales Dashboard"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
                        V
                    </div>
                )}

                <button
                    onClick={() => setCollapsed((v) => !v)}
                    className={cn(
                        "flex items-center justify-center rounded-lg p-2 transition-colors",
                        "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed && "w-full"
                    )}
                    title={collapsed ? "Expand" : "Collapse"}
                >
                    <PanelLeft className="h-5 w-5" />
                </button>
            </div>

            {/* NAVIGATION */}
            <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
                {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                isActive &&
                                "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                                collapsed && "justify-center px-2"
                            )}
                            title={collapsed ? item.title : undefined}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {!collapsed && <span className="truncate">{item.title}</span>}
                        </Link>
                    );
                })}

                {filteredNavItems.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                        No navigation items available (role filter removed or role not set).
                    </div>
                )}
            </nav>
        </aside>
    );
}
