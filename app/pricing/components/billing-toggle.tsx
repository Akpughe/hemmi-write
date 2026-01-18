"use client";

import { cn } from "@/lib/utils";
import { type BillingCycle as BillingCycleType } from "@/lib/utils/pricing";

export type BillingCycle = BillingCycleType;

type BillingOption = { label: string; value: BillingCycle };

export function BillingToggle({
  value,
  onChange,
  options,
  saveTextByValue,
  className,
}: {
  value: BillingCycle;
  onChange: (next: BillingCycle) => void;
  options: BillingOption[];
  saveTextByValue?: Partial<Record<BillingCycle, string>>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full max-w-md items-center gap-1 rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-border/60",
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const saveText = saveTextByValue?.[option.value];

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "font-public-sans relative flex-1 rounded-full px-4 py-2 text-sm font-semibold transition",
              isActive
                ? "bg-foreground text-background shadow"
                : "text-foreground/70 hover:text-foreground"
            )}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {option.label}
              {saveText && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    isActive
                      ? "bg-background/15 text-background"
                      : "bg-foreground text-background"
                  )}
                >
                  {saveText}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}




