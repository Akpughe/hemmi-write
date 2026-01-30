"use client";

import { useEffect, useState } from "react";
import { Zap, AlertCircle } from "lucide-react";
import { Progress } from "@/app/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TokenBalance {
  tokens: number;
  subscription: {
    id: string;
    planType: string;
    tokenAllocation: number;
    status: string;
    currentPeriodEnd: string;
  } | null;
}

interface TokenBalanceProps {
  variant?: "compact" | "full";
  className?: string;
  onLowBalance?: () => void;
}

export function TokenBalance({
  variant = "compact",
  className,
  onLowBalance,
}: TokenBalanceProps) {
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const response = await fetch("/api/tokens");
        if (response.ok) {
          const data = await response.json();
          setBalance(data.data);

          // Hard paywall when tokens < 5% of allocation
          if (
            data.data.subscription &&
            data.data.tokens < data.data.subscription.tokenAllocation * 0.05
          ) {
            onLowBalance?.();
          }
        }
      } catch (error) {
        console.error("Failed to fetch token balance:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [onLowBalance]);

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 animate-pulse", className)}>
        <div className="h-4 w-20 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!balance || !balance.subscription) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 cursor-pointer hover:opacity-80",
              className,
            )}>
            <Zap className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No plan</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Subscribe to get tokens for AI generation</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const percentage = Math.round(
    (balance.tokens / balance.subscription.tokenAllocation) * 100,
  );
  const isLow = percentage < 20;
  const isCritical = percentage < 10;

  const formattedTokens = balance.tokens.toLocaleString();
  const formattedAllocation =
    balance.subscription.tokenAllocation.toLocaleString();

  if (variant === "compact") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-2 cursor-pointer hover:opacity-80",
              className,
            )}>
            <Zap
              className={cn(
                "size-4",
                isCritical
                  ? "text-red-500"
                  : isLow
                    ? "text-orange-500"
                    : "text-yellow-500",
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                isCritical
                  ? "text-red-600"
                  : isLow
                    ? "text-orange-600"
                    : "text-foreground",
              )}>
              {formattedTokens}
            </span>
            {isCritical && (
              <AlertCircle className="size-4 text-red-500 animate-pulse" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">
              {formattedTokens} / {formattedAllocation} tokens
            </p>
            <Progress value={percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {balance.subscription.planType.charAt(0).toUpperCase() +
                balance.subscription.planType.slice(1)}{" "}
              plan
            </p>
            {isLow && (
              <p className="text-xs text-orange-600">
                Running low! Consider topping up.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full variant
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap
            className={cn(
              "size-5",
              isCritical
                ? "text-red-500"
                : isLow
                  ? "text-orange-500"
                  : "text-yellow-500",
            )}
          />
          <h3 className="font-semibold text-sm">Token Balance</h3>
        </div>
        {isCritical && (
          <AlertCircle className="size-5 text-red-500 animate-pulse" />
        )}
      </div>

      <div>
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-2xl font-bold">{formattedTokens}</p>
            <p className="text-xs text-muted-foreground">
              of {formattedAllocation} tokens
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{percentage}%</p>
            <p className="text-xs text-muted-foreground">remaining</p>
          </div>
        </div>

        <Progress
          value={percentage}
          className={cn(
            "h-2",
            isCritical
              ? "[&>div]:bg-red-500"
              : isLow
                ? "[&>div]:bg-orange-500"
                : "",
          )}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {balance.subscription.planType.charAt(0).toUpperCase() +
            balance.subscription.planType.slice(1)}{" "}
          Plan
        </span>
        {isLow && (
          <span className="text-orange-600 font-medium">
            {isCritical ? "Critical - Refill now!" : "Running low"}
          </span>
        )}
      </div>
    </div>
  );
}
