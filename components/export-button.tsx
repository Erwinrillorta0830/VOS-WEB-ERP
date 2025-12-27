// src/components/shared/export/export-button.tsx
"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export type ExportFormat = "csv" | "excel" | "pdf";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: {
    key: string;
    label: string;
    format?: (value: any) => string;
  }[];
  disabled?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
}

export function ExportButton({
  data,
  filename,
  columns,
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false);

  const formatValue = (value: any, format?: (value: any) => string): string => {
    if (value === null || value === undefined) return "";
    if (format) return format(value);
    if (typeof value === "number") {
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return String(value);
  };

  const exportToCSV = () => {
    try {
      setIsExporting(true);
      onExportStart?.();

      if (!data || data.length === 0) {
        throw new Error("No data to export");
      }

      // Use provided columns or extract from first data object
      const exportColumns: {
        key: string;
        label: string;
        format?: (value: any) => string;
      }[] =
        columns ||
        Object.keys(data[0]).map((key) => ({
          key,
          label: key.replace(/_/g, " ").toUpperCase(),
        }));

      // Create CSV header
      const headers = exportColumns.map((col) => col.label).join(",");

      // Create CSV rows
      const rows = data.map((row) =>
        exportColumns
          .map((col) => {
            const value = formatValue(row[col.key], col.format);
            // Escape quotes and wrap in quotes if contains comma
            return value.includes(",")
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(",")
      );

      // Combine headers and rows
      const csv = [headers, ...rows].join("\n");

      // Create blob and download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      link.click();

      toast.success("Export Successful", {
        description: `${data.length} records exported to CSV`,
      });

      onExportComplete?.();
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export Failed", {
        description:
          error instanceof Error ? error.message : "Failed to export data",
      });
      onExportError?.(
        error instanceof Error ? error : new Error("Export failed")
      );
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    try {
      setIsExporting(true);
      onExportStart?.();

      if (!data || data.length === 0) {
        throw new Error("No data to export");
      }

      // Use provided columns or extract from first data object
      const exportColumns: typeof columns =
        columns ||
        Object.keys(data[0]).map((key) => ({
          key,
          label: key.replace(/_/g, " ").toUpperCase(),
        }));

      // Create Excel XML format
      let xml = '<?xml version="1.0"?>\n';
      xml += '<?mso-application progid="Excel.Sheet"?>\n';
      xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
      xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
      xml += ' <Worksheet ss:Name="Sheet1">\n';
      xml += "  <Table>\n";

      // Add header row
      xml += "   <Row>\n";
      exportColumns.forEach((col) => {
        xml += `    <Cell><Data ss:Type="String">${col.label}</Data></Cell>\n`;
      });
      xml += "   </Row>\n";

      // Add data rows
      data.forEach((row) => {
        xml += "   <Row>\n";
        exportColumns.forEach((col) => {
          const value = formatValue(row[col.key], col.format);
          const rawValue = row[col.key];
          const type = typeof rawValue === "number" ? "Number" : "String";
          xml += `    <Cell><Data ss:Type="${type}">${value}</Data></Cell>\n`;
        });
        xml += "   </Row>\n";
      });

      xml += "  </Table>\n";
      xml += " </Worksheet>\n";
      xml += "</Workbook>\n";

      // Create blob and download
      const blob = new Blob([xml], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${
        new Date().toISOString().split("T")[0]
      }.xls`;
      link.click();

      toast.success("Export Successful", {
        description: `${data.length} records exported to Excel`,
      });

      onExportComplete?.();
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export Failed", {
        description:
          error instanceof Error ? error.message : "Failed to export data",
      });
      onExportError?.(
        error instanceof Error ? error : new Error("Export failed")
      );
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    toast.info("PDF Export", {
      description: "PDF export will be available in a future update",
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || isExporting || !data || data.length === 0}
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToCSV} disabled={isExporting}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} disabled={isExporting}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} disabled>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
