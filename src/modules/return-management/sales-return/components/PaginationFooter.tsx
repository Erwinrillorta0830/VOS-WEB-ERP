import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
  } from "@/components/ui/pagination"
  import { Button } from "@/components/ui/button"
  import { ChevronLeft, ChevronRight } from "lucide-react"
  
  interface PaginationFooterProps {
    totalItems: number;
    currentPage: number;
    pageSize?: number;
    onPageChange?: (page: number) => void;
  }
  
  export function PaginationFooter({ 
    totalItems, 
    currentPage, 
    pageSize = 10,
    onPageChange 
  }: PaginationFooterProps) {
    
    // Calculate showing range (e.g., "Showing 1 to 10")
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    const totalPages = Math.ceil(totalItems / pageSize);
  
    return (
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="text-sm font-medium">
            Page {currentPage} of {totalPages || 1}
          </div>
  
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }