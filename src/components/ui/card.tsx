import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl border border-white/80 bg-white/40 text-card-foreground backdrop-blur-2xl backdrop-saturate-200 ring-1 ring-inset ring-white/50 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] liquid-glass-surface transition-all duration-300 dark:border-white/15 dark:bg-slate-900/40 dark:ring-white/10 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] print:rounded-lg print:border-slate-300 print:bg-white print:ring-0 print:shadow-none print:backdrop-blur-none",
        interactive &&
          "liquid-glass-interactive hover:-translate-y-1 hover:bg-white/50 hover:border-white hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.12)] dark:hover:bg-slate-900/55 dark:hover:border-white/25 dark:hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.5)]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";
