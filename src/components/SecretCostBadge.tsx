import React, { useState } from "react";
import { Lock } from "lucide-react";
import { formatBDT } from "@/lib/utils";

interface SecretCostBadgeProps {
  cost: number;
  productName?: string;
  className?: string;
}

export function SecretCostBadge({ cost, productName, className = "" }: SecretCostBadgeProps) {
  const [revealed, setRevealed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  if (!cost || cost <= 0) return null;

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setRevealed((prev) => !prev);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => {
          setShowTooltip(false);
          setRevealed(false);
        }}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-all cursor-pointer select-none ${
          revealed || showTooltip
            ? "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 shadow-xs"
            : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
        }`}
        title="Hover or click to reveal secret purchase cost / break-even"
      >
        <Lock className="h-2.5 w-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="font-semibold">Cost</span>
        {revealed ? (
          <span className="font-bold text-amber-700 dark:text-amber-300 ml-0.5">
            {formatBDT(cost)}
          </span>
        ) : (
          <span className="tracking-widest text-[9px] opacity-70">••••</span>
        )}
      </button>

      {/* Secret Floating Popover / Tooltip */}
      {(showTooltip || revealed) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-[100] whitespace-nowrap rounded-md bg-slate-900 text-white px-2.5 py-1.5 text-[11px] shadow-2xl border border-slate-700 pointer-events-none animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <Lock className="h-3.5 w-3.5" />
            <span>Min Cost / Break-even:</span>
            <span className="font-mono text-white text-xs">{formatBDT(cost)}</span>
          </div>
          <p className="text-[10px] text-slate-300 mt-0.5 font-normal">
            Confidential supplier purchase rate. Selling below this creates a loss.
          </p>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}

export default SecretCostBadge;
