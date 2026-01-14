//\src\app\(app)\app\page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Boxes,
    Truck,
    Users,
    Calculator,
    FileSpreadsheet,
    BarChart3,
    FileText,
    Headphones,
    Settings,
} from "lucide-react";

type AppModule = {
    key: string;
    name: string;
    href: string;
    icon: LucideIcon;
    accent: string;
    available: boolean;
};

type SessionUser = {
    user_fname?: string | null;
    user_lname?: string | null;
    user_email?: string | null;
    name?: string | null;
    // ...other fields if you need them later
};

type Session = {
    user?: SessionUser;
    expiresAt: number;
};

const MODULES: AppModule[] = [
    {
        key: "dashboard",
        name: "Dashboard",
        href: "/app/dashboard",
        icon: LayoutDashboard,
        accent: "from-sky-400 to-cyan-500",
        available: false,
    },
    {
        key: "sales",
        name: "Sales",
        href: "/app/sales",
        icon: ShoppingCart,
        accent: "from-rose-400 to-pink-500",
        available: false,
    },
    {
        key: "purchase",
        name: "Purchase",
        href: "/app/purchase",
        icon: Package,
        accent: "from-emerald-400 to-teal-500",
        available: false,
    },
    {
        key: "inventory",
        name: "Inventory",
        href: "/app/inventory",
        icon: Boxes,
        accent: "from-teal-400 to-cyan-500",
        available: false,
    },
    {
        key: "fleet-management",
        name: "Fleet Management",
        href: "/fleet-management", // or /app/fleet-management depending on your route
        icon: Truck,
        accent: "from-orange-400 to-amber-500",
        available: true,
    },
    {
        key: "hrms",
        name: "HRMS",
        href: "/hrms",
        icon: Users,
        accent: "from-purple-400 to-fuchsia-500",
        available: true,
    },
    {
        key: "accounting",
        name: "Accounting",
        href: "/app/accounting",
        icon: Calculator,
        accent: "from-indigo-400 to-sky-500",
        available: false,
    },
    {
        key: "collection-report",
        name: "Collection Report",
        href: "/bi/summary-report",
        icon: FileSpreadsheet,
        accent: "from-lime-400 to-emerald-500",
        available: true,
    },
    {
        key: "sales-bia",
        name: "Sales BIA",
        href: "/sales/executive",
        icon: BarChart3,
        accent: "from-sky-400 to-blue-500",
        available: true,
    },
    {
        key: "documents",
        name: "Documents",
        href: "/app/documents",
        icon: FileText,
        accent: "from-slate-400 to-sky-400",
        available: false,
    },
    {
        key: "helpdesk",
        name: "Helpdesk",
        href: "/app/helpdesk",
        icon: Headphones,
        accent: "from-emerald-400 to-lime-500",
        available: false,
    },
    {
        key: "settings",
        name: "Settings",
        href: "/app/settings",
        icon: Settings,
        accent: "from-zinc-400 to-slate-500",
        available: false,
    },
];

export default function AppModulesPage() {
    const router = useRouter();
    const [displayName, setDisplayName] = useState<string | null>(null);

    // Read user from session
    useEffect(() => {
        if (typeof window === "undefined") return;

        const raw = window.localStorage.getItem("vosSession");
        if (!raw) return;

        try {
            const session = JSON.parse(raw) as Session;
            const user = session.user;

            if (!user) return;

            const fullName = [user.user_fname, user.user_lname]
                .filter(Boolean)
                .join(" ")
                .trim();

            const fallbackName =
                fullName ||
                user.name ||
                user.user_email ||
                null;

            if (fallbackName) {
                setDisplayName(fallbackName);
            }
        } catch (err) {
            console.error("Failed to parse session", err);
        }
    }, []);

    const handleLogout = () => {
        if (typeof window !== "undefined") {
            window.localStorage.removeItem("vosSession");
        }
        router.replace("/login");
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#020817] via-[#021528] to-[#033560] text-slate-50">
            <div className="mx-auto flex max-w-6xl flex-col px-6 py-10">
                {/* Top bar inside the apps page */}
                <header className="mb-8 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-300">
                            VOS WEB
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold">
                            All your modules in one place
                        </h1>
                        <p className="mt-1 text-sm text-slate-300">
                            Choose a module to get started.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {displayName && (
                            <div className="flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                                    {displayName.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-50">
                    {displayName}
                  </span>
                                    <span className="text-[10px] text-slate-400">
                    Logged in
                  </span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleLogout}
                            className="rounded-full border border-red-400/60 px-4 py-1.5 text-xs font-medium text-red-100 hover:bg-red-500/10"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Apps grid */}
                <section className="rounded-3xl bg-slate-950/40 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-lg">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">
                            Apps
                        </h2>
                        <span className="text-xs text-slate-400">
              {MODULES.length} modules
            </span>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {MODULES.map((mod) => {
                            const Icon = mod.icon;
                            const isAvailable = mod.available;

                            const card = (
                                <div
                                    className={`flex h-full flex-col items-center rounded-2xl p-4 text-center shadow-md ring-1 transition-all duration-150 ${
                                        isAvailable
                                            ? "bg-white/95 ring-slate-100 group-hover:-translate-y-1 group-hover:shadow-xl"
                                            : "bg-slate-900/40 ring-slate-700/60 opacity-70 group-hover:ring-slate-300"
                                    }`}
                                >
                                    <div
                                        className={`mb-3 flex h-14 w-14 items-center justify-center rounded-xl ${
                                            isAvailable
                                                ? `bg-gradient-to-br ${mod.accent}`
                                                : "bg-slate-700"
                                        }`}
                                    >
                                        <Icon
                                            className={`h-7 w-7 ${
                                                isAvailable ? "text-white" : "text-slate-300"
                                            }`}
                                        />
                                    </div>
                                    <p
                                        className={`text-xs font-semibold ${
                                            isAvailable ? "text-slate-900" : "text-slate-200"
                                        }`}
                                    >
                                        {mod.name}
                                    </p>
                                    {!isAvailable && (
                                        <span className="mt-1 inline-flex rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-200">
                      Coming soon
                    </span>
                                    )}
                                </div>
                            );

                            if (isAvailable) {
                                return (
                                    <Link
                                        key={mod.key}
                                        href={mod.href}
                                        className="group focus-visible:outline-none"
                                    >
                                        {card}
                                    </Link>
                                );
                            }

                            // Disabled / not available yet
                            return (
                                <button
                                    key={mod.key}
                                    type="button"
                                    disabled
                                    className="group cursor-not-allowed focus-visible:outline-none"
                                    title="Module not available yet"
                                >
                                    {card}
                                </button>
                            );
                        })}
                    </div>
                </section>
            </div>
        </main>
    );
}
