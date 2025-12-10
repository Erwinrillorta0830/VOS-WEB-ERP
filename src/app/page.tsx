// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";


export default function LandingPage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            {/* HEADER */}
            <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/vos-logo.png"   // <- your logo in /public
                            alt="VOS ERP"
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-md"
                            priority
                        />
                        <span className="text-lg font-semibold tracking-tight text-blue-400">
    VOS WEB
  </span>
                    </Link>

                    {/* Nav – Apps / Industries / Help */}
                    <nav className="hidden items-center gap-6 text-sm text-slate-700 md:flex">
                        <a href="#apps" className="hover:text-slate-900">
                            Apps
                        </a>
                        <a href="#industries" className="hover:text-slate-900">
                            Industries
                        </a>
                        <a href="#help" className="hover:text-slate-900">
                            Help
                        </a>
                    </nav>

                    {/* Right actions */}
                    <div className="flex items-center gap-3 text-sm">
                        <Link
                            href="/login"
                            className="text-slate-700 hover:text-slate-900"
                        >
                            Log in
                        </Link>

                    </div>
                </div>
            </header>

            {/* HERO */}
            <section className="border-b border-slate-100 bg-slate-50">
                <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row lg:items-center">
                    {/* Left text */}
                    <div className="flex-1">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            VOS ERP PLATFORM
                        </p>

                        <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
                            All your business on{" "}
                            <span className="relative inline-block">
                <span className="relative z-10">one platform.</span>
                <span className="absolute -bottom-1 left-0 right-0 h-3 rounded-md bg-blue-400" />
              </span>
                        </h1>

                        <p className="mt-6 text-xl font-semibold text-slate-900">
                            Simple, proficient, yet{" "}
                            <span className="relative inline-block">
                <span className="relative z-10 text-sky-700">managable.</span>
                <span className="absolute -bottom-1 left-0 right-0 h-2 rounded-md bg-sky-200/80" />
              </span>
                        </p>

                        <p className="mt-4 max-w-xl text-sm text-slate-600">
                            Centralize <strong>Sales</strong>, <strong>Purchase</strong>,{" "}
                            <strong>Inventory</strong>, <strong>Fleet Management</strong>,{" "}
                            <strong>HRMS</strong>, <strong>Collection Reports</strong> and{" "}
                            <strong>Sales BIA</strong> in one modern, Next.js–powered ERP
                            tailored for your operations.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <Link
                                href="/login"
                                className="rounded-full bg-blue-400 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-500 transition"
                            >
                               Login
                            </Link>
                            <button
                                type="button"
                                className="rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-800 hover:border-slate-400 hover:bg-slate-50 transition"
                            >
                                Meet an advisor
                            </button>
                        </div>

                        <p className="mt-3 text-xs text-slate-500">
                            Launch only the modules you need. Grow into Fleet, HRMS, and
                            analytics when you&apos;re ready.
                        </p>
                    </div>

                    {/* Right PREVIEW card */}
                    <div className="flex-1">
                        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Preview
                            </div>
                            <div className="mb-4 grid grid-cols-3 gap-3 text-[11px]">
                                {["Sales", "Purchase", "Inventory", "Fleet", "HRMS", "Accounting"].map(
                                    (name) => (
                                        <div
                                            key={name}
                                            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                                        >
                                            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-500 to-sky-400" />
                                            <span className="text-[11px] font-medium text-slate-800">
                        {name}
                      </span>
                                        </div>
                                    )
                                )}
                            </div>
                            <p className="text-xs text-slate-500">
                                Launch modules on demand and keep everything synchronized across
                                your company—from one unified Vertex-powered ERP.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* APPS SECTION */}
            <section
                id="apps"
                className="mx-auto max-w-6xl px-6 py-12 border-b border-slate-100"
            >
                <h2 className="text-lg font-semibold mb-2">Apps</h2>
                <p className="text-sm text-slate-600 mb-6">
                    VOS ERP is organized into focused apps so each team sees exactly what
                    they need.
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-semibold mb-2">
                            Operations &amp; Logistics
                        </h3>
                        <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
                            <li>Sales – quotations, orders, invoicing, collections.</li>
                            <li>Purchase – requisitions, supplier POs, receiving.</li>
                            <li>Inventory – stock on hand, movements, warehouses.</li>
                            <li>
                                Fleet Management – vehicles, trips, drivers, fuel &amp;
                                maintenance.
                            </li>
                        </ul>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-semibold mb-2">
                            People, Finance &amp; Analytics
                        </h3>
                        <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
                            <li>HRMS – employees, wages, attendance, leaves.</li>
                            <li>Accounting – payables, receivables and ledgers.</li>
                            <li>
                                Collection Reports – route collections, remittances and
                                dashboards.
                            </li>
                            <li>
                                Sales BIA – sales BI &amp; analytics for management decisions.
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* INDUSTRIES SECTION */}
            <section
                id="industries"
                className="mx-auto max-w-6xl px-6 py-12 border-b border-slate-100"
            >
                <h2 className="text-lg font-semibold mb-2">Industries</h2>
                <p className="text-sm text-slate-600 mb-6">
                    Designed around real deployments you&apos;re already building.
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-semibold mb-1">
                            Distribution &amp; Wholesale
                        </h3>
                        <p className="text-xs text-slate-600">
                            Route selling, van sales, purchase flow, inventory control, and
                            collection reports for field teams.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-semibold mb-1">Pharmaceutical</h3>
                        <p className="text-xs text-slate-600">
                            Drug master, dosage forms, expiry tracking and regulatory
                            reporting on top of core ERP modules.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-semibold mb-1">
                            Service &amp; Fleet-Based
                        </h3>
                        <p className="text-xs text-slate-600">
                            Job orders, dispatch, GPS tracking, fleet maintenance and fuel
                            monitoring integrated with finance.
                        </p>
                    </div>
                </div>
            </section>

            {/* HELP SECTION */}
            <section id="help" className="mx-auto max-w-6xl px-6 py-12">
                <h2 className="text-lg font-semibold mb-2">Help &amp; Support</h2>
                <p className="text-sm text-slate-600 mb-4">
                    Get your team productive quickly with guided onboarding and clear
                    documentation.
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-semibold mb-1">Implementation Guide</h3>
                        <p className="text-xs text-slate-600">
                            Step-by-step rollout plan: from branch encoding, master data
                            migration, up to go-live and support.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-semibold mb-1">Knowledge Base</h3>
                        <p className="text-xs text-slate-600">
                            Module-specific guides for Sales, Purchase, Inventory, HRMS,
                            Fleet, and finance workflows.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-semibold mb-1">Direct Support</h3>
                        <p className="text-xs text-slate-600">
                            Dedicated Vertex team for critical issues, feature requests, and
                            training sessions.
                        </p>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
                © {new Date().getFullYear()} VOS ERP. All rights reserved.
            </footer>
        </main>
    );
}
