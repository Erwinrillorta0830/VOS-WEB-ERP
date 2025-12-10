// src/app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LoginError = string | null;

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("ajsiapno60@men2corp.com"); // demo
    const [password, setPassword] = useState("andrei123"); // demo
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<LoginError>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data?.error || "Login failed");
                return;
            }

            // Save session with expiry
            if (typeof window !== "undefined") {
                const SESSION_DURATION_MINUTES = 240; // 4 hours
                const expiresAt = Date.now() + SESSION_DURATION_MINUTES * 60 * 1000;

                const session = {
                    user: data.user,
                    expiresAt, // timestamp in ms
                };

                localStorage.setItem("vosSession", JSON.stringify(session));
            }

            router.push("/app");
        } catch (err) {
            console.error(err);
            setError("Unable to connect to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
                {/* Header row with title + Back to home */}
                <div className="flex items-center justify-between mb-1">
                    <h1 className="text-xl font-semibold">Sign in to VOS WEB</h1>
                    <Link
                        href="/"
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
                    >
                        Back to home
                    </Link>
                </div>

                <p className="text-sm text-slate-500 mb-6">
                    Use your existing Vertex account.
                </p>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium mb-1" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                    </div>

                    <div>
                        <label
                            className="block text-sm font-medium mb-1"
                            htmlFor="password"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-slate-800 text-white py-2 text-sm font-medium hover:bg-slate-900 transition disabled:opacity-60"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>
            </div>
        </main>
    );
}
