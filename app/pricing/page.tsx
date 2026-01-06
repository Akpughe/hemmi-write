"use client";

import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";

import {
  BillingToggle,
  type BillingCycle,
} from "@/app/pricing/components/billing-toggle";
import { PlanCard, type PricingPlan } from "@/app/pricing/components/plan-card";
import { cn } from "@/lib/utils";

const billingOptions: { label: string; value: BillingCycle }[] = [
  { label: "Yearly", value: "yearly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Monthly", value: "monthly" },
];

const plans: PricingPlan[] = [
  {
    name: "Basic",
    monthly: 12,
    quarterly: 30,
    yearly: 120,
    features: [
      "2,000 credits / month",
      "20,000 humanize words",
      "2 concurrent tasks",
      "500 times AI tools & more",
      "Deeper research setting",
      "Privacy mode support",
      "24/7 customer support",
    ],
  },
  {
    name: "Plus",
    monthly: 20,
    quarterly: 50,
    yearly: 196,
    highlight: true,
    features: [
      "5,000 credits / month",
      "100,000 humanize words",
      "4 concurrent tasks",
      "Unlimited AI tools & more",
      "Deeper research setting",
      "Privacy mode support",
      "24/7 customer support",
    ],
  },
  {
    name: "Pro",
    monthly: 32,
    quarterly: 88,
    yearly: 320,
    features: [
      "12,000 credits / month",
      "Unlimited humanize words",
      "10 concurrent tasks",
      "Unlimited AI tools & more",
      "Deeper research setting",
      "Privacy mode support",
      "24/7 customer support",
    ],
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");

  return (
    <main className="relative min-h-screen bg-[#F4F1EB] px-4 py-10">
      <Link
        href="/"
        className="absolute right-6 top-6 rounded-full bg-transparent p-2 text-foreground/70 transition hover:text-foreground">
        <span className="sr-only">Close pricing</span>
        <X className="size-4" />
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10">
        <header className="flex w-full max-w-3xl flex-col items-center gap-3 text-center">
          <h1 className="font-public-sans text-5xl font-semibold tracking-tight text-foreground">
            Hire Your Research Partner
          </h1>
          <p className="font-public-sans text-base text-foreground/70">
            Subscribe for 10x faster research + 100% human content
          </p>

          <BillingToggle
            value={billingCycle}
            onChange={setBillingCycle}
            options={billingOptions}
            saveTextByValue={{
              yearly: (() => {
                const plus = plans.find((p) => p.name === "Plus");
                if (!plus) return undefined;
                const perMonth = plus.yearly / 12;
                const save = Math.round((1 - perMonth / plus.monthly) * 100);
                return save > 0 ? `-${save}%` : undefined;
              })(),
            }}
          />
        </header>

        <div className="w-full">
          <div className={cn("grid gap-8", "md:grid-cols-3")}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.name}
                plan={plan}
                billingCycle={billingCycle}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
