import Link from "next/link";

const modules = [
    { slug: "dashboard", label: "Dashboard" },
    { slug: "sales", label: "Sales" },
    { slug: "purchase", label: "Purchase" },
    { slug: "inventory", label: "Inventory" },
    { slug: "accounting", label: "Accounting" },
    { slug: "crm", label: "CRM" },
    { slug: "hr", label: "HR" },
    { slug: "project", label: "Project" },
    { slug: "manufacturing", label: "Manufacturing" },
    { slug: "logistics", label: "Logistics" },
    { slug: "reports", label: "Reports" },
    { slug: "settings", label: "Settings" },
];

export default function AppsHome() {
    return (
        <div>
            <h1 className="text-2xl font-semibold mb-6">VOS ERP Modules</h1>

            <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {modules.map((m) => (
                    <Link
                        key={m.slug}
                        href={`/${m.slug}`}
                        className="group flex flex-col items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200 p-4 hover:shadow-md hover:-translate-y-0.5 transition"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-slate-200">
                            {/* placeholder icon: first letter */}
                            <span className="text-lg font-semibold text-slate-700">
                {m.label[0]}
              </span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">
              {m.label}
            </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
