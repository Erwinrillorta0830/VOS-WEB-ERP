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
        ChevronLeft,
        ChevronRight,
    } from "lucide-react";
    import { useEffect, useMemo, useState } from "react";
    import type { ComponentType } from "react";
    
    interface NavItem {
        title: string;
        href: string;
        icon: ComponentType<{ className?: string }>;
        role?: string[];
    }
    
    const navItems: NavItem[] = [
        { title: "Executive Dashboard", href: "/sales/executive", icon: LayoutDashboard, role: ["executive"] },
        { title: "Manager Dashboard", href: "/sales/manager", icon: TrendingUp, role: ["manager", "executive"] },
        { title: "Supervisor Dashboard", href: "/sales/supervisor", icon: Users, role: ["supervisor", "executive"] },
        { title: "Salesman Dashboard", href: "/sales/encoder", icon: Package, role: ["encoder", "executive"] },
    ];
    
    export function Sidebar() {
        const pathname = usePathname();
        const [collapsed, setCollapsed] = useState(false);
        const [mounted, setMounted] = useState(false);
    
        // OPTIONAL role support (only if you store it somewhere)
        const [userRole, setUserRole] = useState<string>(""); // e.g. "executive" | "manager" | etc.
        const [isCOO, setIsCOO] = useState(false);
    
        useEffect(() => {
            setMounted(true);
    
            // If you still store user info somewhere, keep this.
            // If not, userRole remains "" and we will show ALL nav items.
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
                // If no role restriction, show it
                if (!item.role || item.role.length === 0) return true;
    
                // IMPORTANT: if there is NO role (no login scenario), show everything
                if (!effectiveRole) return true;
    
                // Otherwise filter by role (case-insensitive)
                return item.role.map((r) => r.toLowerCase()).includes(effectiveRole);
            });
        }, [userRole, isCOO]);
    
        // Skeleton while mounting to avoid hydration quirks (optional)
        if (!mounted) {
            return (
                <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
                    <div className="flex h-16 items-center border-b px-4">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
                                V
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">VOS</h1>
                                <p className="text-xs text-muted-foreground">Sales Dashboard</p>
                            </div>
                        </div>
                    </div>
                </aside>
            );
        }
    
        return (
            <aside
                className={cn(
                    "fixed left-0 top-0 z-40 h-screen border-r bg-white transition-all duration-300",
                    collapsed ? "w-16" : "w-64"
                )}
            >
                {/* Logo */}
                <div className="flex h-16 items-center border-b px-4">
                    {!collapsed ? (
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold">
                                V
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">VOS</h1>
                                <p className="text-xs text-muted-foreground">
                                    {isCOO ? "Executive Access" : "Sales Dashboard"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white font-bold mx-auto">
                            V
                        </div>
                    )}
                </div>
    
                {/* Navigation */}
                <nav className="flex-1 space-y-1 p-2">
                    {filteredNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-gray-100",
                                    isActive ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700",
                                    collapsed && "justify-center"
                                )}
                                title={collapsed ? item.title : undefined}
                            >
                                <Icon className="h-5 w-5" />
                                {!collapsed && <span>{item.title}</span>}
                            </Link>
                        );
                    })}
    
                    {filteredNavItems.length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-500">
                            No navigation items available (role filter removed or role not set).
                        </div>
                    )}
                </nav>
    
                {/* Bottom Section */}
                <div className="border-t p-2 space-y-1">
                    {/* Collapse Button */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 transition-all hover:bg-gray-100",
                            collapsed && "justify-center"
                        )}
                    >
                        {collapsed ? (
                            <ChevronRight className="h-5 w-5" />
                        ) : (
                            <>
                                <ChevronLeft className="h-5 w-5" />
                                <span>Collapse</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>
        );
    }
