"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.removeItem("vosSession");
        }
        router.replace("/login");
    }, [router]);

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-100">
            <div className="bg-white rounded-2xl shadow p-8 text-center">
                <h1 className="text-xl font-semibold mb-2">Signing you out…</h1>
                <p className="text-sm text-slate-600">
                    Redirecting back to the login page.
                </p>
            </div>
        </main>
    );
}
