"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner"; // Updated import
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SalesInvoice } from "../types";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  reason_code: z.string().min(1, "Please select a reason code"),
  remarks: z.string().min(5, "Remarks must be at least 5 characters"),
});

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice | null;
  onSuccess: () => void;
}

const readVosSession = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("vosSession");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Date.now() > (parsed.expiresAt || 0) ? null : parsed;
  } catch {
    return null;
  }
};

export function RequestCancellationModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: RequestModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const session = readVosSession();
    const id = session?.user?.user_id || session?.user?.id;
    if (id) setUserId(Number(id));
  }, [isOpen]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason_code: "",
      remarks: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!invoice) return;

    if (!userId) {
      toast.error("Session Expired", { description: "Please log in again." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/invoice-cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoice.invoice_id,
          sales_order_id: invoice.order_id,
          reason_code: values.reason_code,
          remarks: values.remarks,
          requested_by: userId, // Placeholder for Auth Context
        }),
      });

      if (!response.ok) throw new Error("Failed to submit request");

      // Using Sonner Success
      toast.success("Request Submitted", {
        description: `Cancellation request for ${invoice.invoice_no} is now pending approval.`,
      });

      form.reset();
      onSuccess();
      onClose();
    } catch (error) {
      // Using Sonner Error
      toast.error("Submission Error", {
        description: "Could not process the request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Request Invoice Cancellation</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel{" "}
            <span className="font-bold text-blue-700">
              {invoice?.invoice_no}
            </span>
            ? This will lock the invoice for review.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason Code</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a defect reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Wrong Price">Wrong Price</SelectItem>
                      <SelectItem value="System Error">System Error</SelectItem>
                      <SelectItem value="Printer Jam">Printer Jam</SelectItem>
                      <SelectItem value="Typographical Error">
                        Typographical Error
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter mandatory remarks here..."
                      className="resize-none min-h-25"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-700 text-white hover:bg-blue-700/90 hover:text-white text-xs"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
