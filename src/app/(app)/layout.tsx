"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Session = {
    user: unknown;
    expiresAt: number;
};

export default function AppLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        function checkSession() {
            if (typeof window === "undefined") return;

            const raw = window.localStorage.getItem("vosSession");
            if (!raw) {
                router.replace("/login");
                return;
            }

            let session: Session | null = null;
            try {
                session = JSON.parse(raw) as Session;
            } catch {
                window.localStorage.removeItem("vosSession");
                router.replace("/login");
                return;
            }

            const now = Date.now();
            if (!session.expiresAt || now > session.expiresAt) {
                // expired
                window.localStorage.removeItem("vosSession");
                router.replace("/login");
                return;
            }

            setReady(true);
        }

        checkSession();

        // optional: re-check every minute while user stays on page
        const intervalId = window.setInterval(checkSession, 60 * 1000);
        return () => window.clearInterval(intervalId);
    }, [router]);

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#020817] text-slate-100 text-sm">
                Checking session…
            </div>
        );
    }

    // no extra UI; each page controls its own layout
    return <>{children}</>;
}
