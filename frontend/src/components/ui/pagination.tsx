"use client";

import * as React from "react";
import { MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button-1";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    data-slot="pagination"
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" className={cn("", className)} {...props} />;
}

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    data-slot="pagination-ellipsis"
    aria-hidden
    className={cn("flex h-8 w-8 items-center justify-center text-muted-foreground", className)}
    {...props}
  >
    <MoreHorizontal className="h-3.5 w-3.5" />
    <span className="sr-only">More pages</span>
  </span>
);

interface AppPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function AppPagination({ page, totalPages, onPageChange, className }: AppPaginationProps) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2.5"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </Button>
        </PaginationItem>

        {getPages().map((p, i) =>
          p === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <Button
                variant={page === p ? "outline" : "ghost"}
                size="sm"
                mode="icon"
                onClick={() => onPageChange(p)}
                className={cn(
                  "w-7 h-7 text-[11px]",
                  page === p
                    ? "border-border text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p}
              </Button>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2.5"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  AppPagination,
};
