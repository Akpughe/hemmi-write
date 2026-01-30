export type Currency = "USD" | "NGN";
export type BillingCycle = "monthly" | "quarterly" | "yearly";
export type PlanKey = "basic" | "pro" | "premium";

export interface PricingData {
  basic: {
    monthly: number;
    quarterly: number;
    yearly: number;
    tokens: number;
    priceNgn?: { monthly: number; quarterly: number; yearly: number };
  };
  pro: {
    monthly: number;
    quarterly: number;
    yearly: number;
    tokens: number;
    priceNgn?: { monthly: number; quarterly: number; yearly: number };
  };
  premium: {
    monthly: number;
    quarterly: number;
    yearly: number;
    tokens: number;
    unlimited?: boolean;
    priceNgn?: { monthly: number; quarterly: number; yearly: number };
  };
}

export interface PlanData {
  key: PlanKey;
  name: string;
  perMonth: number;
  billedLine: string;
  strikeMonthlyWhenYearly: string | null;
  valueLabel: string;
  features: string[];
  isRecommended: boolean;
}

export function getCurrencySymbol(currency: Currency): string {
  return currency === "NGN" ? "₦" : "$";
}

export function formatMoney(amount: number): string {
  const rounded = Math.round(amount);
  return rounded.toLocaleString();
}

export function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n >= 1_000_000) return `${Math.ceil(n / 100_000) / 10}M`;
  if (n >= 100_000) return `${Math.ceil(n / 1_000)}K`;
  return n.toLocaleString();
}

export function getPrice(
  pricing: PricingData,
  key: PlanKey,
  cycle: BillingCycle,
  currency: Currency
): number {
  const row = pricing[key];
  if (currency === "NGN") {
    const ngn = row.priceNgn?.[cycle];
    if (typeof ngn === "number" && ngn > 0) return ngn;
  }
  return row[cycle];
}

export function buildPlanData(
  pricing: PricingData,
  planKey: PlanKey,
  currency: Currency,
  billingCycle: BillingCycle
): PlanData {
  const currencySymbol = getCurrencySymbol(currency);
  const baseTokens = pricing.basic.tokens || 1;
  const row = pricing[planKey];
  const yearlyTotal = getPrice(pricing, planKey, "yearly", currency);
  const monthlyTotal = getPrice(pricing, planKey, "monthly", currency);
  const perMonth = billingCycle === "yearly" ? yearlyTotal / 12 : monthlyTotal;
  const tokens = row.tokens;

  const valueLabel =
    planKey === "basic"
      ? "Great for getting started"
      : planKey === "pro"
      ? `${Math.round((pricing.pro.tokens / baseTokens) * 10) / 10}× more tokens than Basic`
      : pricing.premium.unlimited
      ? "Unlimited tokens (fair use)"
      : `${Math.round((pricing.premium.tokens / baseTokens) * 10) / 10}× more tokens than Basic`;

  const features =
    planKey === "basic"
      ? [
          `${formatCompactNumber(tokens)} tokens / month`,
          "Research & structure generation",
          "Chapter writing",
          "AI chat assistant",
          "Citations + export",
          "Email support",
        ]
      : planKey === "pro"
      ? [
          `${formatCompactNumber(tokens)} tokens / month`,
          "Faster research + generation",
          "Longer chapters & higher quality output",
          "Priority models",
          "Full citation suite",
          "Priority support",
        ]
      : [
          pricing.premium.unlimited
            ? "Unlimited tokens (fair use)"
            : `${formatCompactNumber(tokens)} tokens / month`,
          "Fastest generation speed",
          "Premium models",
          "Unlimited chapter writing",
          "White-glove support",
          "API access (coming soon)",
        ];

  return {
    key: planKey,
    name: planKey === "basic" ? "Basic" : planKey === "pro" ? "Pro" : "Premium",
    perMonth,
    billedLine:
      billingCycle === "yearly"
        ? `${currencySymbol}${formatMoney(yearlyTotal)} billed yearly`
        : billingCycle === "quarterly"
        ? `${currencySymbol}${formatMoney(getPrice(pricing, planKey, "quarterly", currency))} billed quarterly`
        : `${currencySymbol}${formatMoney(monthlyTotal)} billed monthly`,
    strikeMonthlyWhenYearly:
      billingCycle === "yearly"
        ? `${currencySymbol}${formatMoney(monthlyTotal)}/mo`
        : null,
    valueLabel,
    features,
    isRecommended: planKey === "pro",
  };
}

export async function fetchPricing(): Promise<PricingData | null> {
  try {
    const response = await fetch("/api/pricing");
    if (!response.ok) {
      throw new Error("Failed to load pricing");
    }
    const data = await response.json();
    return data.data as PricingData;
  } catch (error) {
    console.error("Failed to fetch pricing:", error);
    return null;
  }
}

export async function detectCurrency(): Promise<Currency> {
  try {
    const response = await fetch("/api/location");
    if (response.ok) {
      const data = await response.json();
      return data?.currency === "NGN" ? "NGN" : "USD";
    }
  } catch {
    // Silent fail, return default
  }
  return "USD";
}

export function isNGNAvailable(pricing: PricingData | null): boolean {
  if (!pricing) return false;
  return !!(
    pricing.basic.priceNgn?.yearly &&
    pricing.pro.priceNgn?.yearly &&
    pricing.premium.priceNgn?.yearly
  );
}
