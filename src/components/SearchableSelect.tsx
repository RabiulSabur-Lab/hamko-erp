import { useState, useRef, useEffect, useMemo, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { toBnDigit, isBengaliMode } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  usePortal?: boolean;
  minWidth?: number;
  maxHeight?: number | string;
}

const DISPLAY_LIMIT = 80;

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Type to search...",
  disabled = false,
  className = "",
  menuClassName = "",
  usePortal = true,
  minWidth = 350,
  maxHeight = 350,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const safeOptions = Array.isArray(options) ? options : [];

  const selectedOption = useMemo(
    () => safeOptions.find((opt) => opt?.value === value),
    [safeOptions, value]
  );

  // Position tracking for Portal rendering
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
    showAbove: boolean;
  }>({ top: 0, left: 0, width: 0, showAbove: false });

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const numericHeight = typeof maxHeight === "number" ? maxHeight : 350;
    const showAbove = spaceBelow < numericHeight && rect.top > numericHeight;
    const computedWidth = Math.max(rect.width, minWidth || 350);

    let left = rect.left;
    if (left + computedWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - computedWidth - 12);
    }

    const newTop = showAbove ? rect.top - 4 : rect.bottom + 4;

    setDropdownPos((prev) => {
      if (
        prev.top === newTop &&
        prev.left === left &&
        prev.width === computedWidth &&
        prev.showAbove === showAbove
      ) {
        return prev;
      }
      return {
        top: newTop,
        left,
        width: computedWidth,
        showAbove,
      };
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input & recalculate position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      updatePosition();
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        updatePosition();
      }, 20);

      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!deferredQuery.trim()) return safeOptions;
    const q = deferredQuery.trim().toLowerCase();
    const qNorm = q.replace(/[-_\s]/g, "");

    return safeOptions.filter((opt) => {
      if (!opt) return false;
      const label = (opt.label || "").toLowerCase();
      if (label.includes(q)) return true;

      const sublabel = (opt.sublabel || "").toLowerCase();
      if (sublabel && sublabel.includes(q)) return true;

      const badge = (opt.badge || "").toLowerCase();
      if (badge && badge.includes(q)) return true;

      if (Array.isArray(opt.keywords) && opt.keywords.length > 0) {
        return opt.keywords.some((k) => {
          if (!k) return false;
          const kLower = k.toLowerCase();
          return (
            kLower.includes(q) ||
            (qNorm.length > 0 && kLower.replace(/[-_\s]/g, "").includes(qNorm))
          );
        });
      }
      return false;
    });
  }, [safeOptions, deferredQuery]);

  const visibleOptions = useMemo(
    () => filteredOptions.slice(0, DISPLAY_LIMIT),
    [filteredOptions]
  );

  // Keep highlighted index in bounds
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, visibleOptions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + visibleOptions.length) % Math.max(1, visibleOptions.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (visibleOptions[highlightedIndex]) {
        onChange(visibleOptions[highlightedIndex].value);
        setIsOpen(false);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const renderMenuContent = () => (
    <div
      ref={menuRef}
      style={
        usePortal
          ? {
              position: "fixed",
              top: dropdownPos.showAbove ? undefined : `${dropdownPos.top}px`,
              bottom: dropdownPos.showAbove ? `${window.innerHeight - dropdownPos.top}px` : undefined,
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`,
              zIndex: 9999,
            }
          : undefined
      }
      className={`${
        usePortal ? "" : "absolute left-0 top-full z-[100] mt-1 w-full"
      } min-w-[350px] rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 ${menuClassName}`}
    >
      {/* Search Input Header */}
      <div className="flex items-center border-b px-3 py-2 gap-2 bg-muted/40 rounded-t-lg">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground font-medium"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Options List */}
      <div
        ref={listRef}
        style={{ maxHeight: typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight }}
        className="overflow-y-auto p-1.5 text-xs divide-y divide-border/20 scrollbar-thin"
      >
        {visibleOptions.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">No matching options</p>
        ) : (
          visibleOptions.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={opt.value}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setQuery("");
                }}
                className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-medium"
                    : isHighlighted
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-xs leading-snug">{opt.label}</p>
                  {opt.sublabel && (
                    <p
                      className={`truncate text-[11px] mt-0.5 ${
                        isSelected ? "text-primary-foreground/85" : "text-muted-foreground"
                      }`}
                    >
                      {opt.sublabel}
                    </p>
                  )}
                </div>
                {opt.badge && (
                  <span
                    className={`shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md ${
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-foreground border border-border/50"
                    }`}
                  >
                    {opt.badge}
                  </span>
                )}
                {isSelected && <Check className="h-4 w-4 shrink-0 ml-1 text-primary-foreground" />}
              </div>
            );
          })
        )}
        {filteredOptions.length > DISPLAY_LIMIT && (
          <div className="py-1.5 text-center text-[10px] text-muted-foreground border-t border-border/30">
            {isBengaliMode()
              ? `মোট ${toBnDigit(filteredOptions.length)} টি ফলাফলের মধ্যে প্রথম ${toBnDigit(DISPLAY_LIMIT)} টি দেখানো হচ্ছে। খুঁজতে টাইপ করুন।`
              : `Showing first ${DISPLAY_LIMIT} of ${filteredOptions.length} results. Type to refine.`}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative w-full ${isOpen ? "z-[100]" : "z-auto"} ${className}`}>
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setQuery("");
          }
        }}
        onKeyDown={handleKeyDown}
        className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed bg-muted" : "hover:border-primary/60"
        }`}
      >
        <div className="flex-1 truncate pr-2 text-left">
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-medium text-foreground truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-xs text-muted-foreground truncate">({selectedOption.sublabel})</span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
              }}
              className="p-0.5 hover:text-foreground rounded-xs"
              title="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Dropdown Menu (only constructed and evaluated when isOpen is true) */}
      {isOpen &&
        (typeof document !== "undefined" && usePortal
          ? createPortal(renderMenuContent(), document.body)
          : renderMenuContent())}
    </div>
  );
}
export default SearchableSelect;
