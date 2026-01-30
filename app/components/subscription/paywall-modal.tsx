"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CreditCard, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";
import {
  BillingToggle,
  type BillingCycle,
} from "@/app/pricing/components/billing-toggle";
import {
  type Currency,
  type PricingData,
  type PlanKey,
  fetchPricing,
  detectCurrency,
  isNGNAvailable,
  getCurrencySymbol,
  formatMoney,
  buildPlanData,
} from "@/lib/utils/pricing";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "insufficient_tokens" | "no_subscription";
  estimatedTokens?: number;
  defaultView?: "plans" | "topup";
}

const skeletonKeys: ReadonlyArray<PlanKey> = ["basic", "pro", "premium"];

export function PaywallModal({
  open,
  onOpenChange,
  reason = "insufficient_tokens",
  estimatedTokens,
  defaultView = "plans",
}: Readonly<PaywallModalProps>) {
  const [topUpAmount, setTopUpAmount] = useState("10");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<PlanKey | null>(
    null
  );
  const [view, setView] = useState<"plans" | "topup">(defaultView);

  const headerTitle =
    reason === "no_subscription"
      ? "Subscription Required"
      : "Keep writing without interruptions";

  const headerDescription = useMemo(() => {
    if (reason === "no_subscription") {
      return "You need an active subscription to access the workspace. Choose a plan to continue.";
    }
    if (estimatedTokens) {
      return `You need ~${estimatedTokens.toLocaleString()} tokens to continue.`;
    }
    return "Subscriptions give the best value.";
  }, [reason, estimatedTokens]);

  const renderPlansContent = () => {
    if (pricingLoading || !plans) {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          {skeletonKeys.map((k) => (
            <div key={k} className="h-[400px] rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      );
    }

    if (pricingError) {
      return (
        <div className="rounded-2xl bg-background ring-1 ring-border p-6 text-center">
          <p className="text-sm font-semibold">Couldn’t load plans</p>
          <p className="text-sm text-foreground/60 mt-1">{pricingError}</p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isRec = plan.isRecommended;
          return (
            <div
              key={plan.key}
              className={cn(
                "relative rounded-2xl p-5 transition-all duration-300",
                isRec
                  ? "bg-foreground text-background shadow-xl shadow-foreground/20 scale-[1.02]"
                  : "bg-background ring-1 ring-border hover:ring-foreground/20 hover:shadow-lg"
              )}
            >
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
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      isRec ? "text-background/70" : "text-foreground/60"
                    )}
                  >
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
                    )}
                  >
                    {currencySymbol}
                  </span>
                  <span
                    className={cn(
                      "text-4xl font-bold tracking-tight leading-none",
                      isRec ? "text-background" : "text-foreground"
                    )}
                  >
                    {formatMoney(plan.perMonth)}
                  </span>
                  <span
                    className={cn(
                      "text-sm ml-1",
                      isRec ? "text-background/60" : "text-foreground/50"
                    )}
                  >
                    /mo
                  </span>
                  {plan.strikeMonthlyWhenYearly && (
                    <span
                      className={cn(
                        "text-sm line-through ml-2",
                        isRec ? "text-background/40" : "text-foreground/40"
                      )}
                    >
                      {plan.strikeMonthlyWhenYearly}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-xs",
                    isRec ? "text-background/60" : "text-foreground/50"
                  )}
                >
                  {plan.billedLine}
                </p>
              </div>

              <ul
                className={cn(
                  "mt-5 space-y-2.5 text-sm",
                  isRec ? "text-background/90" : "text-foreground/80"
                )}
              >
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-4 items-center justify-center rounded-full shrink-0",
                        isRec ? "bg-background text-foreground" : "bg-foreground text-background"
                      )}
                    >
                      <svg className="size-2.5" viewBox="0 0 12 12" fill="none">
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
                onClick={() => handleStartCheckout(plan.key)}
              >
                <span>
                  {checkoutLoadingPlan === plan.key ? "Redirecting..." : `Choose ${plan.name}`}
                </span>
                <ArrowRight className="size-4" />
              </button>

              <p
                className={cn(
                  "mt-3 text-center text-xs",
                  isRec ? "text-background/50" : "text-foreground/50"
                )}
              >
                Cancel anytime
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // Debug logging
  useEffect(() => {
    console.log('🔥 [PaywallModal] Props changed', { open, reason, estimatedTokens });
  }, [open, reason, estimatedTokens]);

  // Reset view between modal sessions (but don't override user toggles while open)
  useEffect(() => {
    if (!open) {
      setView(defaultView);
    }
  }, [open, defaultView]);

  // Fetch pricing as soon as the paywall opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadPricing() {
      setPricingLoading(true);
      setPricingError(null);
      try {
        const data = await fetchPricing();
        if (!cancelled) {
          if (data) {
            setPricing(data);
          } else {
            throw new Error("Failed to load plans");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setPricing(null);
          setPricingError(
            e instanceof Error ? e.message : "Failed to load plans"
          );
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    }

    loadPricing();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Auto-detect currency (USD default, NGN only for NG).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadCurrency() {
      const detected = await detectCurrency();
      if (!cancelled) {
        setCurrency(detected);
      }
    }

    loadCurrency();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // If NGN isn't available (missing prices), automatically fall back to USD.
  useEffect(() => {
    if (!open) return;
    if (!pricing) return;

    if (currency === "NGN" && !isNGNAvailable(pricing)) {
      setCurrency("USD");
    }
  }, [open, pricing, currency]);

  const currencySymbol = getCurrencySymbol(currency);

  const plans = useMemo(() => {
    if (!pricing) return null;

    return [
      buildPlanData(pricing, "basic", currency, billingCycle),
      buildPlanData(pricing, "pro", currency, billingCycle),
      buildPlanData(pricing, "premium", currency, billingCycle),
    ];
  }, [pricing, currency, billingCycle]);

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
      alert(e instanceof Error ? e.message : "Failed to start checkout. Please try again.");
    } finally {
      setCheckoutLoadingPlan(null);
    }
  };

  const handleTopUp = async () => {
    try {
      setTopUpLoading(true);

      const amount = Number.parseFloat(topUpAmount);
      if (Number.isNaN(amount) || amount < (currency === "USD" ? 10 : 10000)) {
        alert(
          `Minimum top-up is ${currency === "USD" ? "$10" : "₦10,000"}`
        );
        return;
      }

      const response = await fetch("/api/subscription/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create top-up");
      }

      const data = await response.json();
      // Redirect to checkout
      globalThis.location.href = data.data.checkoutUrl;
    } catch (error) {
      console.error("Top-up error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to start top-up. Please try again."
      );
    } finally {
      setTopUpLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 overflow-hidden border-0 shadow-2xl",
        view === 'plans' ? "sm:max-w-[980px]" : "sm:max-w-[440px]"
      )}>
        {view === 'plans' ? (
        <div className="max-h-[85vh] overflow-y-auto bg-linear-to-b from-background to-muted/30">
          <DialogHeader className="px-6 pt-6 pb-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg shadow-foreground/10">
                  <Sparkles className="size-6" />
                </div>
                <div className="space-y-0.5">
                  <DialogTitle className="text-2xl font-semibold tracking-tight">
                    {headerTitle}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-foreground/60">
                    {headerDescription}
                  </DialogDescription>
                </div>
              </div>

            </div>
          </DialogHeader>

          <div className="px-6 pb-6 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <BillingToggle
                value={billingCycle}
                onChange={setBillingCycle}
                options={[
                  { label: "Yearly", value: "yearly" },
                  { label: "Monthly", value: "monthly" },
                ]}
                saveTextByValue={
                  yearlySavings ? { yearly: `-${yearlySavings}%` } : undefined
                }
                className="max-w-none sm:max-w-md"
              />
            </div>

            <div className="mt-6">
              {renderPlansContent()}
            </div>

            <div className="mt-8 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setView('topup')}
                className="text-xs font-medium text-foreground/50 hover:text-foreground transition-colors duration-200 underline-offset-4 hover:underline"
              >
                Prefer a one-time top up?
              </button>
            </div>
          </div>
        </div>
        ) : (
          <div className="p-6">
            <DialogHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold tracking-tight">One-time top up</DialogTitle>
                  <DialogDescription className="text-sm text-foreground/60">
                    Best for occasional use
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="topup-amount" className="text-sm font-medium">
                  Amount ({currencySymbol})
                </Label>
                <Input
                  id="topup-amount"
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder={currency === "USD" ? "10" : "10000"}
                  min={currency === "USD" ? "10" : "10000"}
                  step={currency === "USD" ? "5" : "5000"}
                  className="h-11 text-base"
                />
                <p className="text-xs text-foreground/50">
                  {currency === "USD"
                    ? "$10 ≈ 20,000 tokens (~15,000 words)"
                    : "₦10,000 ≈ 20,000 tokens (~15,000 words)"}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setView('plans')}
                  disabled={topUpLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleTopUp}
                  disabled={topUpLoading}
                  className="flex-1"
                >
                  {topUpLoading ? "Processing..." : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
