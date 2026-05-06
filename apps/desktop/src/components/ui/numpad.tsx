import { useEffect, useRef } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  /** Jika true, tampilkan tombol "." untuk desimal */
  decimal?: boolean;
  /** Jika true, tampilkan tombol "000" untuk rupiah */
  thousands?: boolean;
  className?: string;
}

const KEY_STYLE =
  "flex items-center justify-center rounded-xl border border-border bg-background text-2xl font-semibold active:bg-muted transition-colors select-none cursor-pointer h-16";

export function NumPad({ value, onChange, maxLength = 10, decimal = false, thousands = false, className }: NumPadProps) {
  // Keep latest value/onChange in a ref so keydown handler is always current
  const stateRef = useRef({ value, onChange });
  stateRef.current = { value, onChange };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't intercept when typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const { value: v, onChange: cb } = stateRef.current;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        const next = v + e.key;
        if (!maxLength || next.replace(".", "").length <= maxLength) cb(next);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        cb(v.slice(0, -1));
      } else if (e.key === "Escape" || e.key === "Delete") {
        e.preventDefault();
        cb("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maxLength]);

  const press = (key: string) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "C") {
      onChange("");
      return;
    }
    if (key === "000") {
      const next = value + "000";
      if (!maxLength || next.length <= maxLength) onChange(next);
      return;
    }
    if (key === "." && value.includes(".")) return;
    const next = value + key;
    if (!maxLength || next.replace(".", "").length <= maxLength) onChange(next);
  };

  const rows = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    [thousands ? "000" : decimal ? "." : "C", "0", "⌫"],
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {rows.flat().map((key) => (
        <button
          key={key}
          type="button"
          className={cn(KEY_STYLE, key === "⌫" && "text-destructive", key === "C" && "text-muted-foreground text-base")}
          onClick={() => press(key)}
        >
          {key === "⌫" ? <Delete className="h-6 w-6" /> : key}
        </button>
      ))}
    </div>
  );
}
