"use client";

import * as React from "react";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    ChartNoAxesCombined,
    CircleCheckBig,
    FileXCorner,
    GalleryVerticalEnd,
} from "lucide-react";

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";

import { NavMain } from "./nav-main";
import { TeamSwitcher } from "./nav-header";

type VosSession = {
    user?: {
        user_department?: number | string | null;
        isAdmin?: boolean | number | string | null;
    };
    expiresAt?: number;
};

// What NavMain is currently expecting from you (based on your earlier code)
type NavItem = {
    title: string;
    icon: any;
    to: string; // ✅ must always be a string
};

function readVosSession(): VosSession | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.localStorage.getItem("vosSession");
        if (!raw) return null;

        const parsed = JSON.parse(raw) as VosSession;

        if (typeof parsed?.expiresAt === "number" && Date.now() > parsed.expiresAt) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

function normalizePath(path: string) {
    return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function toNumberOrNull(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

// ✅ strict boolean parsing (prevents "false" => true)
function toBoolStrict(v: unknown): boolean {
    if (v === true) return true;
    if (v === false) return false;
    if (v === 1) return true;
    if (v === 0) return false;

    if (typeof v === "string") {
        const s = v.trim().toLowerCase();
        if (s === "true" || s === "1" || s === "yes") return true;
        if (s === "false" || s === "0" || s === "no" || s === "") return false;
    }

    return false;
}

/**
 * ✅ Sidebar visibility rules (strict allow-list)
 */
function canSeeNavItem(args: {
    route: string;
    userDepartment: number;
    isAdmin: boolean;
}): boolean {
    const route = normalizePath(args.route);
    const { userDepartment, isAdmin } = args;

    if (route === "/invoice-management/invoice-cancellation") {
        return userDepartment === 7;
    }

    if (route === "/invoice-management/invoice-summary-report") {
        return userDepartment === 11;
    }

    if (route === "/invoice-management/invoice-cancellation-approval") {
        return userDepartment === 11 && isAdmin === true;
    }

    // default hidden
    return false;
}

/**
 * ✅ Path access rules for redirect guard (allows nested pages)
 */
function canAccessPath(args: {
    pathname: string;
    userDepartment: number;
    isAdmin: boolean;
}): boolean {
    const p = normalizePath(args.pathname);

    if (p.startsWith("/invoice-management/invoice-cancellation")) {
        return args.userDepartment === 7;
    }

    if (p.startsWith("/invoice-management/invoice-summary-report")) {
        return args.userDepartment === 11;
    }

    if (p.startsWith("/invoice-management/invoice-cancellation-approval")) {
        return args.userDepartment === 11 && args.isAdmin === true;
    }

    return true;
}

function getInvoiceFallback(userDepartment: number, isAdmin: boolean): string {
    if (userDepartment === 7) return "/invoice-management/invoice-cancellation";
    if (userDepartment === 11 && isAdmin)
        return "/invoice-management/invoice-cancellation-approval";
    if (userDepartment === 11) return "/invoice-management/invoice-summary-report";
    return "/app";
}

const BASE_NAV: NavItem[] = [
    {
        title: "Invoice Summary",
        icon: ChartNoAxesCombined,
        to: "/invoice-management/invoice-summary-report",
    },
    {
        title: "Invoice Cancellation",
        icon: FileXCorner,
        to: "/invoice-management/invoice-cancellation",
    },
    {
        title: "Invoice Approval",
        icon: CircleCheckBig,
        to: "/invoice-management/invoice-cancellation-approval",
    },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const router = useRouter();
    const pathnameRaw = usePathname();

    const [session, setSession] = React.useState<VosSession | null>(null);

    React.useEffect(() => {
        setSession(readVosSession());
    }, []);

    const userDepartment = toNumberOrNull(session?.user?.user_department);
    const isAdmin = toBoolStrict(session?.user?.isAdmin);

    const teams = useMemo(
        () => [
            {
                name: "Invoice Manager",
                logo: GalleryVerticalEnd,
                type: "Vertex System Operations",
            },
        ],
        []
    );

    // ✅ Never pass items with missing route; NavMain will always have item.to
    const navMain = useMemo(() => {
        if (userDepartment === null) return [];

        return BASE_NAV.filter((item) =>
            canSeeNavItem({
                route: item.to,
                userDepartment,
                isAdmin,
            })
        );
    }, [userDepartment, isAdmin]);

    React.useEffect(() => {
        if (!pathnameRaw) return;

        const pathname = normalizePath(pathnameRaw);
        const isInvoiceRoute = pathname.startsWith("/invoice-management/");
        if (!isInvoiceRoute) return;

        if (userDepartment === null) return;

        const allowed = canAccessPath({
            pathname,
            userDepartment,
            isAdmin,
        });

        if (!allowed) {
            router.replace(getInvoiceFallback(userDepartment, isAdmin));
        }
    }, [pathnameRaw, userDepartment, isAdmin, router]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={teams} />
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={navMain} />
            </SidebarContent>

            <SidebarRail />
        </Sidebar>
    );
}
