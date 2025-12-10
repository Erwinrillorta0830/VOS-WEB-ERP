// src/modules/hr-management-system/modules/wage/WageModule.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { toast } from "sonner";

import type { Department, Employee, WagePayload, WageDataState } from "./types";
import * as wageApi from "./providers/wageApi";
import EmployeeTable from "./components/EmployeeTable";
import PasswordDialog from "./components/PasswordDialog";
import WageModal from "./components/WageModal";

/* -----------------------------
   Helper: get logged-in user (supports vosSession)
   ----------------------------- */
function getLoggedUserFromStorage(): any | null {
    if (typeof window === "undefined") return null;

    // 1) Primary: vosSession from /login page
    try {
        const rawSession = window.localStorage.getItem("vosSession");
        if (rawSession) {
            const session = JSON.parse(rawSession);

            // respect expiry if present
            if (session?.expiresAt && session.expiresAt < Date.now()) {
                console.warn("vosSession expired, clearing.");
                window.localStorage.removeItem("vosSession");
            } else {
                const user = session?.user ?? session;
                if (user && (user.user_id || user.id)) {
                    return user;
                }
            }
        }
    } catch (e) {
        console.warn("Failed parsing vosSession:", e);
    }

    // 2) Legacy / fallback keys
    const candidates = ["user", "authUser", "vos_user"];

    for (const key of candidates) {
        try {
            const raw =
                window.sessionStorage.getItem(key) ||
                window.localStorage.getItem(key);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            const user = parsed?.user ?? parsed;
            if (user && (user.user_id || user.id)) {
                return user;
            }
        } catch (e) {
            console.warn("Failed parsing stored user for key:", key, e);
        }
    }

    return null;
}

/**
 * Named export (so you can import { WageModule } ...)
 */
export function WageModule() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDept, setSelectedDept] = useState<number | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
        null
    );
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    const [wageData, setWageData] = useState<WageDataState>({
        id: null,
        dailyWage: 0,
        dailyWageInput: "",
        vacationLeave: 0,
        sickLeave: 0,
        isPaidHoliday: false,
        sss: "0.00",
        pagibig: "0.00",
        philhealth: "0.00",
        lastUpdatedBy: "",
        lastUpdateDate: "",
    });

    // sorting & pagination state
    const [sortField, setSortField] = useState<keyof Employee>("user_id");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    useEffect(() => {
        setLoading(true);
        Promise.all([wageApi.fetchDepartments(), wageApi.fetchEmployees()])
            .then(([depts, emps]) => {
                setDepartments(depts);
                setEmployees(emps);
            })
            .catch((err) => {
                console.error(err);
                toast.error("Failed to load initial data.");
            })
            .finally(() => setLoading(false));
    }, []);

    // Filtering + sorting
    const filteredEmployees = useMemo(() => {
        const term = searchTerm.toLowerCase();
        const filtered = employees.filter((emp) => {
            const deptMatch = selectedDept ? emp.user_department === selectedDept : true;
            const searchMatch =
                emp.user_id.toString().includes(term) ||
                emp.user_fname.toLowerCase().includes(term) ||
                emp.user_lname.toLowerCase().includes(term);
            return deptMatch && searchMatch;
        });

        const sorted = [...filtered].sort((a, b) => {
            const aValue = a[sortField] as any;
            const bValue = b[sortField] as any;

            if (aValue === null || bValue === null) {
                if (aValue === bValue) return 0;
                return sortOrder === "asc"
                    ? aValue === null
                        ? -1
                        : 1
                    : aValue === null
                        ? 1
                        : -1;
            }

            if (typeof aValue === "string" && typeof bValue === "string") {
                return sortOrder === "asc"
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else if (typeof aValue === "number" && typeof bValue === "number") {
                return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
            }
            return 0;
        });

        return sorted;
    }, [employees, selectedDept, searchTerm, sortField, sortOrder]);

    // Pagination helpers
    const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage) || 1;
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const getPageButtons = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            let start = Math.max(currentPage - 2, 1);
            let end = start + 4;
            if (end > totalPages) {
                end = totalPages;
                start = end - 4;
            }
            for (let i = start; i <= end; i++) pages.push(i);
            if (start > 1) pages.unshift("...");
            if (end < totalPages) pages.push("...");
        }
        return pages;
    };

    const handleSort = (field: keyof Employee) => {
        if (sortField === field) {
            setSortOrder((s) => (s === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    };

    const openPasswordDialog = (emp: Employee) => {
        setSelectedEmployee(emp);
        setPasswordDialogOpen(true);
    };

    // ✅ Use actual logged-in user from storage at the moment of submit
    const handlePasswordSubmit = async (passwordInput: string) => {
        try {
            const logged = getLoggedUserFromStorage();
            if (!logged) return alert("User not logged in.");

            const loggedUserId = logged.user_id ?? logged.id;
            if (!loggedUserId) return alert("Invalid logged-in user information.");

            const apiUser = await wageApi.fetchUserById(loggedUserId);
            if (!apiUser) return alert("User record not found.");

            // NOTE: original logic compares plain user_password
            if (passwordInput !== apiUser.user_password)
                return alert("Incorrect password.");
            if (!selectedEmployee) return alert("No employee selected.");

            const ts = new Date().toISOString();
            const remarks = `Opened wage modal for ${selectedEmployee.user_fname} ${selectedEmployee.user_lname} at ${ts}`;
            await wageApi.logWageAccess(
                loggedUserId,
                selectedEmployee.user_id,
                remarks
            );

            await loadWageData(selectedEmployee.user_id);
            setPasswordDialogOpen(false);
            setModalOpen(true);
        } catch (e) {
            console.error(e);
            alert("Error verifying password. Try again.");
        }
    };

    const getUserFullName = async (userId: number | null) => {
        if (!userId && userId !== 0) return "Unknown";
        try {
            const u = await wageApi.fetchUserById(Number(userId));
            if (!u) return "Unknown";
            return `${u.user_fname} ${u.user_lname}`;
        } catch (e) {
            console.error("getUserFullName error:", e);
            return "Unknown";
        }
    };

    const loadWageData = async (userId: number) => {
        try {
            const record = await wageApi.fetchWageByUser(userId);
            if (!record) {
                setWageData({
                    id: null,
                    dailyWage: 0,
                    dailyWageInput: "0.00",
                    vacationLeave: 0,
                    sickLeave: 0,
                    isPaidHoliday: false,
                    sss: "0.00",
                    pagibig: "0.00",
                    philhealth: "0.00",
                    lastUpdatedBy: "",
                    lastUpdateDate: "",
                });
                return;
            }

            const responsibleUserId = record.updated_by ?? record.created_by ?? null;
            const fullName = responsibleUserId
                ? await getUserFullName(responsibleUserId)
                : "";
            const lastDate =
                record.updated_date?.substring(0, 10) ||
                record.created_date?.substring(0, 10) ||
                "";

            setWageData({
                id: record.id ?? null,
                dailyWage: Number(record.daily_wage) || 0,
                dailyWageInput: (Number(record.daily_wage) || 0).toString(),
                vacationLeave: Number(record.vacation_leave_per_year) || 0,
                sickLeave: Number(record.sick_leave_per_year) || 0,
                isPaidHoliday: record.paid_holiday === 1,
                sss: record.sss_contribution_monthly ?? "0.00",
                pagibig: record.pagibig_contribution_monthly ?? "0.00",
                philhealth: record.philhealth_contribution_monthly ?? "0.00",
                lastUpdatedBy: fullName || "",
                lastUpdateDate: lastDate.toString(),
            });
        } catch (e) {
            console.error("loadWageData error:", e);
            toast.error("Failed to load wage data.");
        }
    };

    // ✅ Use logged-in user for updated_by
    const saveWageData = async () => {
        const logged = getLoggedUserFromStorage();
        if (!logged) return alert("User session missing.");
        const loggedUserId = logged.user_id ?? logged.id;
        if (!loggedUserId) return alert("Invalid logged-in user information.");

        if (!selectedEmployee) return alert("No employee selected.");
        if (
            !window.confirm(
                `Save wage settings for ${selectedEmployee.user_fname} ${selectedEmployee.user_lname}?`
            )
        )
            return;

        const payload: WagePayload = {
            user_id: selectedEmployee.user_id,
            daily_wage: Number(wageData.dailyWage) || 0,
            vacation_leave_per_year: Number(wageData.vacationLeave) || 0,
            sick_leave_per_year: Number(wageData.sickLeave) || 0,
            paid_holiday: wageData.isPaidHoliday ? 1 : 0,
            updated_by: loggedUserId,
            sss_contribution_monthly: wageData.sss,
            pagibig_contribution_monthly: wageData.pagibig,
            philhealth_contribution_monthly: wageData.philhealth,
        };

        try {
            if (wageData.id) {
                await wageApi.patchWage(wageData.id, payload);
            } else {
                await wageApi.createWage(payload);
            }
            toast.success("Wage information saved successfully.");
            await loadWageData(selectedEmployee.user_id);
            setModalOpen(false);
        } catch (e) {
            console.error("saveWageData error:", e);
            toast.error("Failed to save wage data.");
        }
    };

    const updateWageData = (upd: Partial<WageDataState>) => {
        setWageData((prev) => ({ ...prev, ...upd }));
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Wage Management</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <EmployeeTable
                            departments={departments}
                            employees={paginatedEmployees}
                            loading={loading}
                            selectedDept={selectedDept}
                            setSelectedDept={setSelectedDept}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            onOpenPassword={openPasswordDialog}
                            handleSort={handleSort}
                            rowsPerPage={rowsPerPage}
                            setRowsPerPage={setRowsPerPage}
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            totalPages={totalPages}
                            pageButtons={getPageButtons()}
                        />
                    </CardContent>
                </Card>
            </div>

            <PasswordDialog
                open={passwordDialogOpen}
                onOpenChange={setPasswordDialogOpen}
                onSubmit={handlePasswordSubmit}
            />

            <WageModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                selectedEmployee={selectedEmployee}
                wageData={wageData}
                setWageData={updateWageData}
                onSave={saveWageData}
            />
        </DashboardLayout>
    );
}

export default WageModule;
