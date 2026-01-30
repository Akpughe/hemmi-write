"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Calendar,
  CreditCard,
  AlertCircle,
  Check,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Subscription {
  id: string;
  planType: string;
  billingCycle: string | null;
  tokenAllocation: number;
  tokensRemaining: number;
  currency: string;
  amountPaid: number;
  status: "active" | "cancelled" | "expired" | "past_due";
  autoRenew: boolean;
  currentPeriodEnd: string;
  cancelledAt: string | null;
}

interface SubscriptionStatusProps {
  className?: string;
}

export function SubscriptionStatus({ className }: SubscriptionStatusProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch("/api/subscription");
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.data.subscription);
          setBalance(data.data.balance);
        }
      } catch (error) {
        console.error("Failed to fetch subscription:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    try {
      setCancelling(true);

      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: subscription.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel subscription");
      }

      // Refresh subscription data
      const data = await response.json();
      setSubscription(data.data.subscription);

      alert("Subscription cancelled successfully. You can continue using your tokens until the end of your billing period.");
    } catch (error) {
      console.error("Cancel subscription error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription. Please try again."
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-200 rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="size-5 text-orange-500" />
            No Active Subscription
          </CardTitle>
          <CardDescription>
            Subscribe to unlock AI-powered research and writing features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/pricing">
            <Button className="w-full">
              View Plans
              <ArrowUpRight className="ml-2 size-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const statusColor = {
    active: "bg-green-500",
    cancelled: "bg-orange-500",
    expired: "bg-red-500",
    past_due: "bg-red-500",
  }[subscription.status];

  const statusLabel = {
    active: "Active",
    cancelled: "Cancelled",
    expired: "Expired",
    past_due: "Past Due",
  }[subscription.status];

  const renewalDate = new Date(subscription.currentPeriodEnd);
  const isExpiringSoon =
    subscription.status === "active" &&
    renewalDate.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000; // 7 days

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              {subscription.planType.charAt(0).toUpperCase() +
                subscription.planType.slice(1)}{" "}
              Plan
            </CardTitle>
            <CardDescription className="mt-1">
              {subscription.billingCycle &&
                `${subscription.billingCycle.charAt(0).toUpperCase() + subscription.billingCycle.slice(1)} billing`}{" "}
              • {subscription.currency}{" "}
              {subscription.amountPaid.toFixed(2)}
            </CardDescription>
          </div>
          <Badge className={cn("", statusColor)}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Token Usage */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tokens</span>
            <span className="font-semibold">
              {balance.toLocaleString()} / {subscription.tokenAllocation.toLocaleString()}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  (balance / subscription.tokenAllocation) * 100
                )}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.round((balance / subscription.tokenAllocation) * 100)}% remaining
          </p>
        </div>

        {/* Renewal Info */}
        {subscription.status === "active" && (
          <div
            className={cn(
              "rounded-lg p-3 flex items-start gap-3",
              isExpiringSoon
                ? "bg-orange-50 border border-orange-200"
                : "bg-gray-50 border"
            )}>
            <Calendar
              className={cn(
                "size-5 mt-0.5",
                isExpiringSoon ? "text-orange-600" : "text-muted-foreground"
              )}
            />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {subscription.autoRenew ? "Renews" : "Expires"} on{" "}
                {format(renewalDate, "MMMM d, yyyy")}
              </p>
              {subscription.autoRenew && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="size-3" />
                  Auto-renewal enabled
                </div>
              )}
              {!subscription.autoRenew && subscription.cancelledAt && (
                <div className="flex items-center gap-1 text-xs text-orange-600">
                  <X className="size-3" />
                  Cancelled - access until period end
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {subscription.status === "active" && subscription.autoRenew && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="flex-1" disabled={cancelling}>
                  Cancel Plan
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your subscription will be cancelled, but you can continue using
                    your remaining tokens until{" "}
                    {format(renewalDate, "MMMM d, yyyy")}. You won't be charged
                    again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Plan</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelSubscription}
                    className="bg-red-600 hover:bg-red-700">
                    Cancel Subscription
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Link href="/pricing" className="flex-1">
            <Button variant="default" className="w-full">
              {subscription.status === "active" ? "Upgrade Plan" : "Resubscribe"}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
