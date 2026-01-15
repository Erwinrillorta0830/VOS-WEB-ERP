"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { useForm, UseFormReturn, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SalesReturnFormValues, SalesReturnItem } from "../types"; // Import from your types file

// 1. Define the Zod Schema
const salesReturnSchema = z.object({
  salesmanId: z.string().min(1, "Salesman is required"),
  customerId: z.string().min(1, "Customer is required"),
  returnDate: z.date(),
  isThirdParty: z.boolean().default(false),
  
  // Validation for the items array
  items: z.array(z.object({
    productId: z.string(),
    productCode: z.string(),
    description: z.string(),
    unit: z.string(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    grossAmount: z.number(),
    discountType: z.enum(['Percentage', 'Fixed']),
    discountAmount: z.number(),
    totalAmount: z.number(),
    reason: z.string(), // e.g., "Expired", "Wrong Item"
    returnType: z.enum(['Good', 'Damaged']),
  })).min(1, "At least one product is required"),

  orderNo: z.string().optional(),
  invoiceNo: z.string().optional(),
  remarks: z.string().optional(),
  
  // Financials
  totalGrossAmount: z.number(),
  totalDiscountAmount: z.number(),
  netAmount: z.number(),
});

// 2. Define Context Type
interface SalesReturnContextType {
  form: UseFormReturn<SalesReturnFormValues>;
  addProductToReturn: (product: any, quantity: number, unitIndex: number) => void;
  removeProductFromReturn: (index: number) => void;
}

const SalesReturnContext = createContext<SalesReturnContextType | undefined>(undefined);

// 3. Create the Provider Component
export function SalesReturnProvider({ children }: { children: ReactNode }) {
  const form = useForm<SalesReturnFormValues>({
    resolver: zodResolver(salesReturnSchema),
    defaultValues: {
      returnDate: new Date(),
      isThirdParty: false,
      items: [],
      totalGrossAmount: 0,
      totalDiscountAmount: 0,
      netAmount: 0,
    },
  });

  const { control, setValue, watch } = form;
  
  // Use Field Array for easy list manipulation
  const { append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Helper to add a product (mapping raw product data to our schema)
  const addProductToReturn = (product: any, quantity: number, unitIndex: number) => {
    const selectedUnit = product.units[unitIndex];
    const gross = selectedUnit.price * quantity;
    
    const newItem: SalesReturnItem = {
      productId: product.id,
      productCode: product.code,
      description: product.name,
      unit: selectedUnit.unit,
      quantity: quantity,
      unitPrice: selectedUnit.price,
      grossAmount: gross,
      discountType: 'Fixed',
      discountAmount: 0,
      totalAmount: gross, // Default total (gross - 0 discount)
      reason: '',
      returnType: 'Good',
    };

    append(newItem);
  };

  const removeProductFromReturn = (index: number) => {
    remove(index);
  };

  // 4. Auto-calculate Financial Totals whenever 'items' changes
  const items = watch("items");

  useEffect(() => {
    const totalGross = items.reduce((sum, item) => sum + (item.grossAmount || 0), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    const net = totalGross - totalDiscount;

    // Update form values without triggering re-renders loops
    if (form.getValues("totalGrossAmount") !== totalGross) setValue("totalGrossAmount", totalGross);
    if (form.getValues("totalDiscountAmount") !== totalDiscount) setValue("totalDiscountAmount", totalDiscount);
    if (form.getValues("netAmount") !== net) setValue("netAmount", net);

  }, [items, setValue, form]);

  return (
    <SalesReturnContext.Provider value={{ form, addProductToReturn, removeProductFromReturn }}>
      {children}
    </SalesReturnContext.Provider>
  );
}

// 5. Custom Hook for easy consumption
export const useSalesReturn = () => {
  const context = useContext(SalesReturnContext);
  if (!context) {
    throw new Error("useSalesReturn must be used within a SalesReturnProvider");
  }
  return context;
};