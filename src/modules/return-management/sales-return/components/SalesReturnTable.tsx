    "use client";

    import React from "react";
    // Make sure this import path matches where your provider actually is
    import { useSalesReturn } from "../../../return-management/sales-return/providers/SalesReturnProvider";
    import { Input } from "@/components/ui/input";
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
    import { Button } from "@/components/ui/button";
    import { Trash2 } from "lucide-react";
    import { FormField } from "@/components/ui/form"; 

    export function SalesReturnTable() {
    const { form, removeProductFromReturn } = useSalesReturn();
    const { register, control, watch } = form;
    
    // Watch items to render the correct number of rows
    const items = watch("items");

    return (
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="bg-blue-700 text-white uppercase text-xs">
                <tr>
                <th className="px-4 py-3 min-w-[100px]">Code</th>
                <th className="px-4 py-3 min-w-[200px]">Description</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 w-[100px]">Quantity</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3">Gross Amount</th>
                <th className="px-4 py-3 w-[120px]">Disc. Type</th>
                <th className="px-4 py-3 w-[100px]">Disc. Amt</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3 min-w-[150px]">Reason</th>
                <th className="px-4 py-3 w-[120px]">Return Type</th>
                <th className="px-4 py-3 w-[50px]"></th>
                </tr>
            </thead>
            
            <tbody className="divide-y">
                {items.length === 0 ? (
                <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                    No products added. Click "Add Product" to start.
                    </td>
                </tr>
                ) : (
                items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium">{item.productCode}</td>
                    <td className="px-4 py-2 truncate max-w-[200px]" title={item.description}>
                        {item.description}
                    </td>
                    <td className="px-4 py-2">{item.unit}</td>

                    {/* Editable Quantity */}
                    <td className="px-4 py-2">
                        <Input 
                        type="number" 
                        className="h-8 w-full" 
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })} 
                        />
                    </td>

                    <td className="px-4 py-2">₱{item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 font-medium">₱{item.grossAmount.toFixed(2)}</td>

                    {/* Discount Type Select */}
                    <td className="px-4 py-2">
                        <FormField
                        control={control}
                        name={`items.${index}.discountType`}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Percentage">%</SelectItem>
                                <SelectItem value="Fixed">Fix</SelectItem>
                            </SelectContent>
                            </Select>
                        )}
                        />
                    </td>

                    {/* Discount Amount Input */}
                    <td className="px-4 py-2">
                        <Input 
                        type="number" 
                        className="h-8" 
                        {...register(`items.${index}.discountAmount`, { valueAsNumber: true })} 
                        />
                    </td>

                    <td className="px-4 py-2 font-bold text-blue-700">
                        ₱{(item.grossAmount - (item.discountAmount || 0)).toFixed(2)}
                    </td>

                    <td className="px-4 py-2">
                        <Input 
                        className="h-8" 
                        placeholder="Reason..." 
                        {...register(`items.${index}.reason`)} 
                        />
                    </td>

                    <td className="px-4 py-2">
                        <FormField
                        control={control}
                        name={`items.${index}.returnType`}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Good">Good</SelectItem>
                                <SelectItem value="Damaged">Damaged</SelectItem>
                            </SelectContent>
                            </Select>
                        )}
                        />
                    </td>

                    <td className="px-4 py-2 text-center">
                        <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeProductFromReturn(index)}
                        >
                        <Trash2 className="w-4 h-4" />
                        </Button>
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        </div>
        </div>
    );
    }