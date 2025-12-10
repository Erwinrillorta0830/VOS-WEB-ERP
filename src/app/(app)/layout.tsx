import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Simple top bar / shell for now – later we’ll put sidebar, user menu, etc. */}
            <div className="flex-1 flex flex-col">
                <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4">
                    <span className="font-semibold text-slate-800">VOS ERP</span>
                    <nav className="flex items-center gap-4 text-sm text-slate-600">
                        <a href="/app" className="hover:text-slate-900">
                            Apps
                        </a>
                        <a href="/logout" className="hover:text-slate-900">
                            Logout
                        </a>
                    </nav>
                </header>

                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
