import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, ...props }, ref) => (
    <div
      className={cn(
        "relative w-full max-w-full overflow-auto max-h-[calc(100vh-260px)] min-h-0 print:max-h-none print:overflow-visible",
        containerClassName,
      )}
    >
      <table ref={ref} className={cn("w-full caption-bottom text-[13px]", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        "sticky top-0 z-20 bg-white/85 dark:bg-slate-900/90 backdrop-blur-md shadow-[inset_0_-1px_0_0_rgba(148,163,184,0.3)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.12)] [&_tr]:border-b [&_tr]:border-slate-200/60 dark:[&_tr]:border-white/10 [&_tr]:bg-transparent [&_tr]:hover:bg-transparent [&_tr]:backdrop-blur-none [&_th]:bg-white/85 dark:[&_th]:bg-slate-900/90 [&_th]:backdrop-blur-md print:static print:bg-white print:shadow-none",
        className,
      )}
      {...props}
    />
  ),
);
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />,
);
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-white/55 dark:border-white/10 bg-white/40 hover:bg-white/60 dark:bg-slate-900/40 dark:hover:bg-slate-900/60 backdrop-blur-md transition-colors print:bg-white print:backdrop-blur-none",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("h-10 px-3 text-left align-middle text-xs font-semibold tracking-tight text-muted-foreground whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-3 py-2.5 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";
