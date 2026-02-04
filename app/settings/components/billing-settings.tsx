"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Coins,
  Receipt,
  RefreshCcw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import { PaywallModal } from "@/app/components/subscription/paywall-modal";

type Currency = "USD" | "NGN";

type Subscription = {
  id: string;
  userId: string;
  planType: string;
  billingCycle: string | null;
  tokenAllocation: number;
  tokensRemaining: number;
  currency: Currency;
  amountPaid: number;
  paymentGateway: "paystack" | "stripe";
  gatewaySubscriptionId: string | null;
  gatewayCustomerId: string | null;
  status: "active" | "cancelled" | "expired" | "past_due";
  autoRenew: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SubscriptionApiResponse = {
  data: {
    subscription: Subscription | null;
    balance: number;
  };
};

type BillingPayment = {
  id: string;
  transactionId: string;
  paymentGateway: "paystack" | "stripe";
  amount: number;
  currency: Currency;
  tokensPurchased: number;
  paymentType: "subscription" | "one_time" | "top_up" | "renewal";
  status: "pending" | "success" | "failed" | "refunded";
  failureReason: string | null;
  createdAt: string;
};

type BillingApiResponse = {
  data: {
    subscriptions: Subscription[];
    payments: BillingPayment[];
    paymentsPagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
};

type TokenUsageRow = {
  id: string;
  user_id: string;
  subscription_id: string | null;
  project_id: string | null;
  operation_type: string;
  tokens_used: number;
  tokens_before: number;
  tokens_after: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type TokenUsageApiResponse = {
  data: {
    usage: TokenUsageRow[];
    pagination: { total: number; limit: number; offset: number; hasMore: boolean };
    stats: { totalTokensUsed: number };
  };
};

function currencySymbol(currency: Currency): string {
  return currency === "NGN" ? "₦" : "$";
}

function formatAmount(amount: number, currency: Currency): string {
  const symbol = currencySymbol(currency);
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleCasePlan(planType: string): string {
  if (!planType) return "—";
  if (planType === "one_time") return "One-time";
  return planType.charAt(0).toUpperCase() + planType.slice(1);
}

function titleCaseCycle(cycle: string | null): string {
  if (!cycle) return "—";
  return cycle.charAt(0).toUpperCase() + cycle.slice(1);
}

function statusPill(status: string) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset";
  switch (status) {
    case "active":
      return (
        <span className={cn(base, "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20")}>
          Active
        </span>
      );
    case "past_due":
      return (
        <span className={cn(base, "bg-amber-500/10 text-amber-600 ring-amber-500/20")}>
          Past due
        </span>
      );
    case "cancelled":
      return (
        <span className={cn(base, "bg-zinc-500/10 text-zinc-600 ring-zinc-500/20")}>
          Cancelled
        </span>
      );
    case "expired":
      return (
        <span className={cn(base, "bg-zinc-500/10 text-zinc-600 ring-zinc-500/20")}>
          Expired
        </span>
      );
    default:
      return (
        <span className={cn(base, "bg-muted text-muted-foreground ring-border")}>{status}</span>
      );
  }
}

export function BillingSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  const [billing, setBilling] = useState<BillingApiResponse["data"] | null>(null);
  const [paymentsLoadingMore, setPaymentsLoadingMore] = useState(false);

  const [usage, setUsage] = useState<TokenUsageApiResponse["data"] | null>(null);
  const [usageLoadingMore, setUsageLoadingMore] = useState(false);

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, billingRes, usageRes] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/billing?paymentsLimit=25&paymentsOffset=0&subscriptionsLimit=10"),
        fetch("/api/tokens/usage?limit=50&offset=0"),
      ]);

      if (!subRes.ok) throw new Error("Failed to load subscription");
      if (!billingRes.ok) throw new Error("Failed to load billing history");
      if (!usageRes.ok) throw new Error("Failed to load usage history");

      const subJson = (await subRes.json()) as SubscriptionApiResponse;
      const billingJson = (await billingRes.json()) as BillingApiResponse;
      const usageJson = (await usageRes.json()) as TokenUsageApiResponse;

      setSubscription(subJson.data.subscription);
      setTokenBalance(subJson.data.balance || 0);
      setBilling(billingJson.data);
      setUsage(usageJson.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const tokensUsed = useMemo(() => {
    if (!subscription) return 0;
    const used = subscription.tokenAllocation - subscription.tokensRemaining;
    return Number.isFinite(used) ? Math.max(0, used) : 0;
  }, [subscription]);

  const autoRenewText = useMemo(() => {
    if (!subscription) return "—";
    return subscription.autoRenew ? "Auto-renew is on" : "Auto-renew is off";
  }, [subscription]);

  const usageLoadMoreLabel = useMemo(() => {
    if (usageLoadingMore) return "Loading…";
    if (usage?.pagination.hasMore) return "Load more";
    return "All loaded";
  }, [usage?.pagination.hasMore, usageLoadingMore]);

  const paymentsLoadMoreLabel = useMemo(() => {
    if (paymentsLoadingMore) return "Loading…";
    if (billing?.paymentsPagination.hasMore) return "Load more";
    return "All loaded";
  }, [billing?.paymentsPagination.hasMore, paymentsLoadingMore]);

  const usageBreakdown = useMemo(() => {
    const rows = usage?.usage || [];
    const map: Record<string, number> = {};
    for (const r of rows) {
      map[r.operation_type] = (map[r.operation_type] || 0) + (r.tokens_used || 0);
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [usage]);

  const loadMorePayments = async () => {
    if (!billing?.paymentsPagination.hasMore) return;
    setPaymentsLoadingMore(true);
    try {
      const nextOffset = billing.paymentsPagination.offset + billing.paymentsPagination.limit;
      const res = await fetch(
        `/api/billing?paymentsLimit=${billing.paymentsPagination.limit}&paymentsOffset=${nextOffset}&subscriptionsLimit=10`
      );
      if (!res.ok) throw new Error("Failed to load more payments");
      const json = (await res.json()) as BillingApiResponse;

      setBilling((prev) => {
        if (!prev) return json.data;
        return {
          ...prev,
          payments: [...prev.payments, ...json.data.payments],
          paymentsPagination: json.data.paymentsPagination,
          subscriptions: prev.subscriptions, // keep as-is
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more payments");
    } finally {
      setPaymentsLoadingMore(false);
    }
  };

  const loadMoreUsage = async () => {
    if (!usage?.pagination.hasMore) return;
    setUsageLoadingMore(true);
    try {
      const nextOffset = usage.pagination.offset + usage.pagination.limit;
      const res = await fetch(`/api/tokens/usage?limit=${usage.pagination.limit}&offset=${nextOffset}`);
      if (!res.ok) throw new Error("Failed to load more usage");
      const json = (await res.json()) as TokenUsageApiResponse;

      setUsage((prev) => {
        if (!prev) return json.data;
        return {
          ...prev,
          usage: [...prev.usage, ...json.data.usage],
          pagination: json.data.pagination,
          stats: json.data.stats,
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more usage");
    } finally {
      setUsageLoadingMore(false);
    }
  };

  const cancelSubscription = async () => {
    if (!subscription) return;
    const ok = globalThis.confirm(
      "Cancel your subscription?\n\nYou will keep access until the end of your current billing period."
    );
    if (!ok) return;

    setCancelling(true);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to cancel subscription");
      }

      // Refresh everything to keep UI consistent with DB state
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-public-sans text-2xl font-semibold text-foreground">
            Billing & usage
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan details, payments, and token usage
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading billing details…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="font-public-sans text-2xl font-semibold text-foreground">
            Billing & usage
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View your plan, payments, and token consumption
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="rounded-xl w-full sm:w-auto"
          onClick={fetchAll}
          disabled={loading}
        >
          <RefreshCcw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-foreground">Something went wrong</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-muted shrink-0">
              <CreditCard className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-foreground">Current plan</h3>
                {subscription?.status ? statusPill(subscription.status) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {subscription
                  ? `${titleCasePlan(subscription.planType)} • ${titleCaseCycle(
                      subscription.billingCycle
                    )}`
                  : "No active subscription"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto">
            <Button
              type="button"
              className="rounded-xl w-full sm:w-auto"
              onClick={() => setPaywallOpen(true)}
            >
              Top up tokens
            </Button>
            <Link
              href="/pricing"
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground shadow-xs transition w-full sm:w-auto",
                "hover:bg-muted/50"
              )}
            >
              Change plan
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Tokens remaining</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {tokenBalance.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {subscription
                ? `of ${subscription.tokenAllocation.toLocaleString()} allocated`
                : "Get a plan to receive tokens"}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Tokens used</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {tokensUsed.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {subscription ? "This is derived from allocation − remaining" : "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Renews / ends</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {subscription?.currentPeriodEnd ? formatDateTime(subscription.currentPeriodEnd) : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{autoRenewText}</p>
          </div>
        </div>

        {subscription?.status === "active" && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Billing: {formatAmount(subscription.amountPaid, subscription.currency)} •{" "}
              {subscription.paymentGateway.toUpperCase()}
            </p>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={cancelling}
              onClick={cancelSubscription}
            >
              {cancelling ? "Cancelling…" : "Cancel subscription"}
            </Button>
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-muted shrink-0">
              <Coins className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-foreground">Usage</h3>
              <p className="text-sm text-muted-foreground">
                Recent token usage events by feature (research, chapters, chat, etc.)
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Total tracked usage: {usage?.stats.totalTokensUsed?.toLocaleString() || "0"} tokens
          </p>
        </div>

        <div className="mt-6 grid gap-4 grid-cols-1 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background p-4 md:col-span-1">
            <p className="text-xs text-muted-foreground">Top operations (loaded set)</p>
            <div className="mt-3 space-y-2">
              {usageBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No usage yet.</p>
              ) : (
                usageBreakdown.map(([op, tokens]) => (
                  <div key={op} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{op}</span>
                    <span className="text-sm font-medium text-foreground">
                      {tokens.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4 md:col-span-2">
            <p className="text-xs text-muted-foreground">Recent usage</p>
            <div className="mt-3 divide-y divide-border">
              {(usage?.usage || []).slice(0, 12).map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {row.operation_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(row.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">
                      -{row.tokens_used.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.tokens_before.toLocaleString()} → {row.tokens_after.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}

              {(usage?.usage || []).length === 0 && (
                <div className="py-4 text-sm text-muted-foreground">No usage events found.</div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {Math.min((usage?.usage || []).length, 12)} of {(usage?.pagination.total || 0).toLocaleString()}
              </p>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={!usage?.pagination.hasMore || usageLoadingMore}
                onClick={loadMoreUsage}
              >
                {usageLoadMoreLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-muted shrink-0">
              <Receipt className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-foreground">Payment history</h3>
              <p className="text-sm text-muted-foreground">
                Transactions from `payment_history` (subscriptions, renewals, and top-ups)
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {(billing?.paymentsPagination.total || 0).toLocaleString()} total
          </p>
        </div>

        {/* Desktop Table */}
        <div className="mt-6 hidden md:block overflow-hidden rounded-2xl border border-border bg-background">
          <div className="grid grid-cols-12 gap-3 border-b border-border bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">Date</div>
            <div className="col-span-3">Type</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Tokens</div>
            <div className="col-span-1 text-right">Status</div>
          </div>

          {(billing?.payments || []).map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-12 gap-3 px-4 py-3 text-sm text-foreground border-b border-border last:border-b-0"
            >
              <div className="col-span-4 min-w-0">
                <p className="truncate font-medium">{formatDateTime(p.createdAt)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.paymentGateway.toUpperCase()} • {p.transactionId}
                </p>
                {p.status === "failed" && p.failureReason ? (
                  <p className="mt-1 truncate text-xs text-amber-700">
                    {p.failureReason}
                  </p>
                ) : null}
              </div>
              <div className="col-span-3 text-sm">
                <p className="font-medium">{p.paymentType.replace("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{p.currency}</p>
              </div>
              <div className="col-span-2 font-medium">{formatAmount(p.amount, p.currency)}</div>
              <div className="col-span-2">{p.tokensPurchased.toLocaleString()}</div>
              <div className="col-span-1 flex justify-end">
                {statusPill(p.status)}
              </div>
            </div>
          ))}

          {(billing?.payments || []).length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No payments found yet.
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="mt-6 md:hidden space-y-3">
          {(billing?.payments || []).map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground">
                    {p.paymentType.replace("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(p.createdAt)}
                  </p>
                </div>
                {statusPill(p.status)}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-medium text-foreground">{formatAmount(p.amount, p.currency)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Tokens</p>
                  <p className="font-medium text-foreground">{p.tokensPurchased.toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground truncate">
                {p.paymentGateway.toUpperCase()} • {p.transactionId}
              </p>
              {p.status === "failed" && p.failureReason && (
                <p className="mt-1 text-xs text-amber-700">{p.failureReason}</p>
              )}
            </div>
          ))}

          {(billing?.payments || []).length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No payments found yet.
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(billing?.payments || []).length.toLocaleString()} of {(billing?.paymentsPagination.total || 0).toLocaleString()}
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={!billing?.paymentsPagination.hasMore || paymentsLoadingMore}
            onClick={loadMorePayments}
          >
            {paymentsLoadMoreLabel}
          </Button>
        </div>
      </div>

      <PaywallModal open={paywallOpen} onOpenChange={setPaywallOpen} defaultView="topup" />
    </div>
  );
}

