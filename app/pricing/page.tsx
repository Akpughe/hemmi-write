"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { X, Sparkles, ArrowRight } from "lucide-react";
import Script from "next/script";

import {
  BillingToggle,
  type BillingCycle,
} from "@/app/pricing/components/billing-toggle";
import { cn } from "@/lib/utils";
import {
  type Currency,
  type PricingData,
  type PlanData,
  type PlanKey,
  fetchPricing,
  detectCurrency,
  isNGNAvailable,
  getCurrencySymbol,
  formatMoney,
  buildPlanData,
} from "@/lib/utils/pricing";
import { BreadcrumbJsonLd, WebPageJsonLd } from "@/app/components/seo/JsonLd";
import { AuthModal } from "@/app/components/auth/auth-modal";
import { getUser } from "@/lib/supabase/auth";

const billingOptions: { label: string; value: BillingCycle }[] = [
  { label: "Yearly", value: "yearly" },
  { label: "Monthly", value: "monthly" },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] =
    useState<PlanKey | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    async function checkAuth() {
      const { user } = await getUser();
      setIsAuthenticated(!!user);
    }
    checkAuth();
  }, []);

  // Fetch pricing from database
  useEffect(() => {
    async function loadPricing() {
      const data = await fetchPricing();
      setPricing(data);
      setLoading(false);
    }
    loadPricing();
  }, []);

  // Detect currency from location
  useEffect(() => {
    async function loadCurrency() {
      const detected = await detectCurrency();
      setCurrency(detected);
    }
    loadCurrency();
  }, []);

  // Auto-fallback to USD if NGN prices aren't available
  useEffect(() => {
    if (currency === "NGN" && !isNGNAvailable(pricing)) {
      setCurrency("USD");
    }
  }, [pricing, currency]);

  const currencySymbol = getCurrencySymbol(currency);

  const plans: PlanData[] = useMemo(
    () =>
      pricing
        ? [
            buildPlanData(pricing, "basic", currency, billingCycle),
            buildPlanData(pricing, "pro", currency, billingCycle),
            buildPlanData(pricing, "premium", currency, billingCycle),
          ]
        : [],
    [pricing, currency, billingCycle]
  );

  // Calculate savings percentage for yearly billing
  const yearlySavings = useMemo(() => {
    if (!pricing) return null;
    const proPlan = buildPlanData(pricing, "pro", currency, "yearly");
    const proMonthly = buildPlanData(pricing, "pro", currency, "monthly");
    const yearlyPerMonth = proPlan.perMonth;
    const monthlyPrice = proMonthly.perMonth;
    const save = Math.round((1 - yearlyPerMonth / monthlyPrice) * 100);
    return save > 0 ? save : null;
  }, [pricing, currency]);

  const handleStartCheckout = async (planType: PlanKey) => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    try {
      setCheckoutLoadingPlan(planType);
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType,
          billingCycle,
          currency,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to start checkout");
      }

      const data = await response.json();
      globalThis.location.href = data.data.checkoutUrl;
    } catch (e) {
      console.error("Checkout error:", e);
      alert(
        e instanceof Error
          ? e.message
          : "Failed to start checkout. Please try again."
      );
    } finally {
      setCheckoutLoadingPlan(null);
    }
  };

  if (loading || !pricing) {
    return (
      <main className="relative min-h-screen bg-surface-warm px-4 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-4">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded bg-muted" />
        </div>
      </main>
    );
  }

  // Generate pricing schema for structured data
  const pricingSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Hemmi AI Writing Assistant",
    description:
      "AI-powered writing assistant for research papers, essays, and academic documents.",
    offers: plans.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: plan.perMonth,
      priceCurrency: currency,
      priceValidUntil: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      availability: "https://schema.org/InStock",
    })),
  };

  return (
    <main className="relative min-h-screen bg-surface-warm px-4 py-10">
      <WebPageJsonLd
        name="Pricing Plans | Hemmi"
        description="Choose the perfect plan for your writing needs. Get AI-powered research, unlimited documents, and premium features."
        url="https://hemmi.app/pricing"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://hemmi.app" },
          { name: "Pricing", url: "https://hemmi.app/pricing" },
        ]}
      />
      <Script
        id="pricing-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
        strategy="afterInteractive"
      />

      <Link
        href="/"
        className="absolute right-6 top-6 rounded-full bg-transparent p-2 text-foreground/70 transition hover:text-foreground">
        <span className="sr-only">Close pricing</span>
        <X className="size-4" />
      </Link>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-10">
        <header className="flex w-full max-w-3xl flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg shadow-foreground/10">
              <Sparkles className="size-6" />
            </div>
            <h1 className="font-public-sans text-5xl font-semibold tracking-tight text-foreground">
              Pricing Plans
            </h1>
          </div>
          <p className="font-public-sans text-base text-foreground/70">
            Subscribe for 10x faster research + 100% human content
          </p>

          <div className="flex flex-col items-center gap-2">
            <BillingToggle
              value={billingCycle}
              onChange={setBillingCycle}
              options={billingOptions}
              saveTextByValue={
                yearlySavings ? { yearly: `-${yearlySavings}%` } : undefined
              }
            />
          </div>
        </header>

        <div className="w-full">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isRec = plan.isRecommended;
              return (
                <div
                  key={plan.key}
                  className={cn(
                    "relative rounded-2xl p-6 transition-all duration-300",
                    isRec
                      ? "bg-foreground text-background shadow-xl shadow-foreground/20 scale-[1.02]"
                      : "bg-background ring-1 ring-border hover:ring-foreground/20 hover:shadow-lg"
                  )}>
                  {isRec && (
                    <div className="absolute -top-3 left-4 rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-md">
                      Most popular
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3
                        className={cn(
                          "text-lg font-semibold tracking-tight",
                          isRec ? "text-background" : "text-foreground"
                        )}>
                        {plan.name}
                      </h3>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          isRec ? "text-background/70" : "text-foreground/60"
                        )}>
                        {plan.valueLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={cn(
                          "text-2xl font-semibold",
                          isRec ? "text-background" : "text-foreground"
                        )}>
                        {currencySymbol}
                      </span>
                      <span
                        className={cn(
                          "text-4xl font-bold tracking-tight leading-none",
                          isRec ? "text-background" : "text-foreground"
                        )}>
                        {formatMoney(plan.perMonth)}
                      </span>
                      <span
                        className={cn(
                          "text-sm ml-1",
                          isRec ? "text-background/60" : "text-foreground/50"
                        )}>
                        /mo
                      </span>
                      {plan.strikeMonthlyWhenYearly && (
                        <span
                          className={cn(
                            "text-sm line-through ml-2",
                            isRec ? "text-background/40" : "text-foreground/40"
                          )}>
                          {plan.strikeMonthlyWhenYearly}
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-xs",
                        isRec ? "text-background/60" : "text-foreground/50"
                      )}>
                      {plan.billedLine}
                    </p>
                  </div>

                  <ul
                    className={cn(
                      "mt-5 space-y-2.5 text-sm",
                      isRec ? "text-background/90" : "text-foreground/80"
                    )}>
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-0.5 inline-flex size-4 items-center justify-center rounded-full shrink-0",
                            isRec
                              ? "bg-background text-foreground"
                              : "bg-foreground text-background"
                          )}>
                          <svg
                            className="size-2.5"
                            viewBox="0 0 12 12"
                            fill="none">
                            <path
                              d="M2 6l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span className="flex-1">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className={cn(
                      "mt-6 w-full flex items-center justify-between px-5 py-3 rounded-xl font-semibold text-sm",
                      "transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                      "disabled:opacity-50 disabled:pointer-events-none",
                      "active:scale-[0.98]",
                      isRec
                        ? "bg-background text-foreground hover:bg-background/90 focus-visible:ring-background"
                        : "bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-foreground"
                    )}
                    disabled={checkoutLoadingPlan !== null}
                    onClick={() => handleStartCheckout(plan.key)}>
                    <span>
                      {checkoutLoadingPlan === plan.key
                        ? "Redirecting..."
                        : "Get started"}
                    </span>
                    <ArrowRight className="size-4" />
                  </button>

                  <p
                    className={cn(
                      "mt-3 text-center text-xs",
                      isRec ? "text-background/50" : "text-foreground/50"
                    )}>
                    Cancel anytime
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          setIsAuthenticated(true);
        }}
        nextPath="/pricing"
      />
    </main>
  );
}
