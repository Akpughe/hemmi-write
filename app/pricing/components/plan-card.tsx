"use client";

import { Check, Info } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BillingCycle } from "./billing-toggle";

export type PricingPlan = {
  name: "Basic" | "Plus" | "Pro";
  monthly: number;
  quarterly: number;
  yearly: number;
  features: string[];
  highlight?: boolean;
};

const tooltipCopy: Record<string, string> = {
  credits:
    "Credits are used when running research and writing actions. Larger tasks consume more credits.",
  humanize:
    "Humanize words are used when generating human-like content designed to read naturally.",
};

function formatMoney(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const isInt = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  return isInt ? String(Math.round(rounded)) : String(rounded);
}

function computePerMonth(plan: PricingPlan, cycle: BillingCycle) {
  if (cycle === "monthly") return plan.monthly;
  if (cycle === "quarterly") return plan.quarterly / 3;
  return plan.yearly / 12;
}

function computeBilled(plan: PricingPlan, cycle: BillingCycle) {
  if (cycle === "monthly") return `Billed monthly`;
  if (cycle === "quarterly")
    return `Billed quarterly: $${formatMoney(plan.quarterly)}`;
  return `Billed yearly: $${formatMoney(plan.yearly)}`;
}

function computeSavePercent(plan: PricingPlan, cycle: BillingCycle) {
  if (cycle === "monthly") return null;
  const perMonth = computePerMonth(plan, cycle);
  const save = 1 - perMonth / plan.monthly;
  if (!isFinite(save)) return null;
  return Math.max(0, Math.round(save * 100));
}

function FeatureRow({ text }: { text: string }) {
  const lower = text.toLowerCase();
  const showInfo =
    lower.includes("credit") ||
    lower.includes("humanize") ||
    lower.includes("humanise");
  const tooltipKey = lower.includes("credit")
    ? "credits"
    : lower.includes("humanize") || lower.includes("humanise")
    ? "humanize"
    : null;

  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-background">
        <Check className="size-3.5" />
      </span>
      <span className="flex-1">{text}</span>
      {showInfo && tooltipKey && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              aria-label="More info">
              <Info className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent sideOffset={8}>
            {tooltipCopy[tooltipKey]}
          </TooltipContent>
        </Tooltip>
      )}
    </li>
  );
}

export function PlanCard({
  plan,
  billingCycle,
  className,
}: {
  plan: PricingPlan;
  billingCycle: BillingCycle;
  className?: string;
}) {
  const perMonth = computePerMonth(plan, billingCycle);
  const savePercent = computeSavePercent(plan, billingCycle);
  const billedLine = computeBilled(plan, billingCycle);

  const ctaVariant = plan.name === "Plus" ? "default" : "default";
  const isPlus = plan.name === "Plus";

  const cardInner = (
    <section
      className={cn(
        "relative flex flex-col rounded-[28px] bg-white px-8 pb-8 pt-7 shadow-[0_18px_60px_rgba(15,23,42,0.10)]",
        // make highlighted card a bit taller than the side cards; ensure side cards (Basic & Pro) match
        plan.highlight
          ? "min-h-[680px] md:min-h-fit"
          : "min-h-[600px] md:min-h-fit",
        className
      )}>
      {plan.highlight && (
        <div className="absolute inset-x-0 top-0 rounded-t-[28px] bg-black py-3 text-center">
          <span className="font-public-sans text-sm font-semibold text-white">
            Popular
          </span>
        </div>
      )}

      <div className={cn("flex flex-col gap-4", plan.highlight && "pt-10")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted">
              {/* simple mark similar to competitor */}
              <span className="text-lg leading-none">✳︎</span>
            </span>
            <h2 className="font-public-sans text-xl font-semibold">
              {plan.name}
            </h2>
          </div>
          {isPlus &&
            savePercent &&
            savePercent > 0 &&
            billingCycle !== "monthly" && (
              <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-3 py-1 text-xs font-semibold text-white">
                SAVE {savePercent}%
              </span>
            )}
        </div>

        <div className="space-y-1">
          <div className="font-public-sans flex items-end gap-2">
            <span className="text-2xl font-semibold">$</span>
            <span className="text-5xl font-semibold leading-none">
              {formatMoney(perMonth)}
            </span>
            <span className="pb-1 text-lg text-foreground/70">/ month</span>
            {billingCycle !== "monthly" && (
              <span className="pb-1 text-lg text-muted-foreground line-through">
                ${formatMoney(plan.monthly)}
              </span>
            )}
          </div>
          <p className="font-public-sans text-sm text-muted-foreground">
            {billedLine}
          </p>
        </div>

        <ul className="mt-2 flex-1 flex flex-col gap-3 font-public-sans text-[15px] text-foreground/80">
          {plan.features.map((f) => (
            <FeatureRow key={f} text={f} />
          ))}
        </ul>

        <Button
          size="lg"
          variant={ctaVariant}
          className={cn(
            "font-public-sans h-12 w-full rounded-xl text-base font-semibold mt-4",
            isPlus
              ? "bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-400 text-white hover:opacity-90"
              : "bg-black text-white hover:bg-black/90"
          )}>
          Get Started
        </Button>
      </div>
    </section>
  );

  if (!plan.highlight) return cardInner;

  return (
    <div className="rounded-[30px] bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 p-[2px]">
      {cardInner}
    </div>
  );
}
