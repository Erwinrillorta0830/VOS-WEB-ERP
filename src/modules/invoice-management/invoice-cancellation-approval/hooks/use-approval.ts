"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ApprovalParams,
  CancellationRequest,
} from "../../invoice-cancellation/types";
import { ApprovalAction } from "../types";

export function useApprovals() {
  const [allData, setAllData] = useState<CancellationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/invoice-cancellation-approval");
      if (!res.ok) throw new Error("Failed to fetch approval queue");

      const result = await res.json();
      const data = (result.data || result) as CancellationRequest[];

      setAllData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pendingRequests = allData.filter((r) => r.status === "PENDING");
  const approvedRequests = allData.filter((r) => r.status === "APPROVED");

  const handleAction = useCallback(
    async (action: ApprovalAction, paramsArray: ApprovalParams[]) => {
      if (isProcessing) return;

      setIsProcessing(true);
      try {
        // 1. GET ACTUAL SESSION DATA
        const raw = window.localStorage.getItem("vosSession");
        const parsed = raw ? JSON.parse(raw) : null;

        const activeAuditorId = parsed?.user?.user_id;

        const res = await fetch("/api/invoice-cancellation-approval", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            updates: paramsArray,
            // SUCCESS: No longer hardcoded to 101 or 1
            auditorId: activeAuditorId,
          }),
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.message);
        toast.success(
          `Request successfully ${
            action === "APPROVE" ? "approved" : "rejected"
          }!`,
        );

        await fetchRequests();
      } catch (err: any) {
        toast.error(err.message || "Action failed");
      } finally {
        setIsProcessing(false);
      }
    },
    [fetchRequests, isProcessing],
  );

  useEffect(() => {
    fetchRequests();
    window.addEventListener("focus", fetchRequests);
    return () => window.removeEventListener("focus", fetchRequests);
  }, [fetchRequests]);

  return {
    pendingRequests,
    approvedRequests,
    isLoading,
    isProcessing,
    error,
    refresh: fetchRequests,
    handleAction,
  };
}
