"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  Gift,
  Copy,
  Check,
  Coins,
  TrendingUp,
  Loader2,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

type ReferralStats = {
  totalReferrals: number;
  signedUpCount: number;
  convertedCount: number;
  totalPointsEarned: number;
  currentBalance: number;
};

type ReferralConfig = {
  signupPoints: number;
  conversionPointsUsd: number;
  conversionPointsNgn: number;
  pointsPer10000Tokens: number;
  pointsPer5DollarDiscount: number;
  minRedemptionPoints: number;
};

type Referral = {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: "signed_up" | "converted";
  signedUpAt: string;
  convertedAt: string | null;
  referredEmail?: string;
};

type PointsHistoryItem = {
  id: string;
  userId: string;
  referralId: string | null;
  points: number;
  type: "signup_bonus" | "conversion_bonus" | "redemption";
  currencyContext: "USD" | "NGN" | null;
  description: string | null;
  createdAt: string;
};

type ReferralApiResponse = {
  data: {
    referralCode: string;
    stats: ReferralStats;
    config: ReferralConfig;
  };
};

type StatsApiResponse = {
  data: {
    referrals: Referral[];
    referralsPagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    pointsHistory: PointsHistoryItem[];
    pointsPagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function maskEmail(email: string | undefined): string {
  if (!email) return "User";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked = local.length > 2 ? local[0] + "***" + local[local.length - 1] : "***";
  return `${masked}@${domain}`;
}

function statusPill(status: string) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset";
  switch (status) {
    case "converted":
      return (
        <span className={cn(base, "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20")}>
          Paid
        </span>
      );
    case "signed_up":
      return (
        <span className={cn(base, "bg-blue-500/10 text-blue-600 ring-blue-500/20")}>
          Signed up
        </span>
      );
    default:
      return (
        <span className={cn(base, "bg-muted text-muted-foreground ring-border")}>{status}</span>
      );
  }
}

export function ReferralSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [config, setConfig] = useState<ReferralConfig | null>(null);

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryItem[]>([]);

  const [redeemAmount, setRedeemAmount] = useState<string>("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  const inviteLink = useMemo(() => {
    if (!referralCode) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/?ref=${referralCode}`;
    }
    return `https://hemmi.ai/?ref=${referralCode}`;
  }, [referralCode]);

  const tokensForPoints = useMemo(() => {
    if (!config) return 0;
    const points = parseInt(redeemAmount, 10);
    if (isNaN(points) || points <= 0) return 0;
    return Math.floor((points / config.pointsPer10000Tokens) * 10000);
  }, [redeemAmount, config]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mainRes, statsRes] = await Promise.all([
        fetch("/api/referral"),
        fetch("/api/referral/stats?referralsLimit=20&pointsLimit=20"),
      ]);

      if (!mainRes.ok) throw new Error("Failed to load referral data");
      if (!statsRes.ok) throw new Error("Failed to load referral stats");

      const mainJson = (await mainRes.json()) as ReferralApiResponse;
      const statsJson = (await statsRes.json()) as StatsApiResponse;

      setReferralCode(mainJson.data.referralCode);
      setStats(mainJson.data.stats);
      setConfig(mainJson.data.config);
      setReferrals(statsJson.data.referrals);
      setPointsHistory(statsJson.data.pointsHistory);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load referral information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const handleRedeem = async () => {
    const points = parseInt(redeemAmount, 10);
    if (isNaN(points) || points <= 0) return;
    if (!stats || points > stats.currentBalance) return;
    if (!config || points < config.minRedemptionPoints) return;

    setRedeeming(true);
    setRedeemSuccess(null);
    setError(null);

    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeem_tokens", points }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Redemption failed");
      }

      setRedeemSuccess(
        `Successfully redeemed ${points} points for ${json.data.tokensAwarded.toLocaleString()} tokens!`
      );
      setRedeemAmount("");
      await fetchAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Redemption failed");
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-public-sans text-2xl font-semibold text-foreground">Referrals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite friends and earn rewards
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading referral data...</span>
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
          <h2 className="font-public-sans text-2xl font-semibold text-foreground">Referrals</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite friends and earn points for tokens
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

      {redeemSuccess && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Check className="mt-0.5 size-5 text-emerald-600" />
            <p className="text-sm text-emerald-700">{redeemSuccess}</p>
          </div>
        </div>
      )}

      {/* Invite Link Card */}
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-muted shrink-0">
            <Gift className="size-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">Your invite link</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Share this link with friends. When they sign up, you both benefit!
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 rounded-xl border border-border bg-background px-4 py-3">
            <code className="text-sm text-foreground break-all">{inviteLink}</code>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl shrink-0 w-full sm:w-auto"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <Check className="mr-2 size-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="mr-2 size-4" />
                Copy
              </>
            )}
          </Button>
        </div>

        {config && (
          <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">How it works:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>
                - Earn <strong>{config.signupPoints} points</strong> when someone signs up
              </li>
              <li>
                - Earn <strong>{config.conversionPointsUsd} points</strong> when they make a USD
                payment
              </li>
              <li>
                - Earn <strong>{config.conversionPointsNgn} points</strong> when they make a NGN
                payment
              </li>
              <li>
                - Redeem <strong>{config.pointsPer10000Tokens} points</strong> for 10,000 tokens
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4" />
            <span className="text-xs">Total referred</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {stats?.totalReferrals || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="size-4" />
            <span className="text-xs">Converted (paid)</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {stats?.convertedCount || 0}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="size-4" />
            <span className="text-xs">Total earned</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {stats?.totalPointsEarned || 0} pts
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-emerald-600">
            <Gift className="size-4" />
            <span className="text-xs">Available to redeem</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {stats?.currentBalance || 0} pts
          </p>
        </div>
      </div>

      {/* Redeem Section */}
      {stats && stats.currentBalance > 0 && config && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-muted">
              <Coins className="size-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">Redeem points for tokens</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Convert your points into tokens. Minimum: {config.minRedemptionPoints} points
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Points to redeem</label>
              <input
                type="number"
                min={config.minRedemptionPoints}
                max={stats.currentBalance}
                value={redeemAmount}
                onChange={(e) => setRedeemAmount(e.target.value)}
                placeholder={`${config.minRedemptionPoints} - ${stats.currentBalance}`}
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex-1 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
              <p className="text-xs text-muted-foreground">You will receive</p>
              <p className="text-lg font-semibold text-foreground">
                {tokensForPoints.toLocaleString()} tokens
              </p>
            </div>
            <Button
              type="button"
              className="rounded-xl"
              disabled={
                redeeming ||
                !redeemAmount ||
                parseInt(redeemAmount, 10) < config.minRedemptionPoints ||
                parseInt(redeemAmount, 10) > stats.currentBalance
              }
              onClick={handleRedeem}
            >
              {redeeming ? "Redeeming..." : "Redeem"}
            </Button>
          </div>
        </div>
      )}

      {/* Referrals Table */}
      <div className="rounded-3xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-6">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-muted shrink-0">
            <Users className="size-5" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Your referrals</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              People who signed up using your link
            </p>
          </div>
        </div>

        {referrals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
            <Users className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No referrals yet. Share your invite link to get started!
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-border bg-background">
              <div className="grid grid-cols-12 gap-3 border-b border-border bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
                <div className="col-span-5">User</div>
                <div className="col-span-3">Signed up</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Points</div>
              </div>

              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="grid grid-cols-12 gap-3 px-4 py-3 text-sm text-foreground border-b border-border last:border-b-0"
                >
                  <div className="col-span-5 truncate">{maskEmail(ref.referredEmail)}</div>
                  <div className="col-span-3 text-muted-foreground">
                    {formatDateTime(ref.signedUpAt)}
                  </div>
                  <div className="col-span-2">{statusPill(ref.status)}</div>
                  <div className="col-span-2 text-right font-medium">
                    {ref.status === "converted"
                      ? `+${(config?.signupPoints || 10) + (config?.conversionPointsUsd || 50)}`
                      : `+${config?.signupPoints || 10}`}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">
                        {maskEmail(ref.referredEmail)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(ref.signedUpAt)}
                      </p>
                    </div>
                    {statusPill(ref.status)}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Points earned</span>
                    <span className="font-medium text-foreground">
                      {ref.status === "converted"
                        ? `+${(config?.signupPoints || 10) + (config?.conversionPointsUsd || 50)}`
                        : `+${config?.signupPoints || 10}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Points History */}
      {pointsHistory.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-6">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-muted">
              <Coins className="size-5" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Points history</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                All your point transactions
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {pointsHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.type === "signup_bonus" && "Signup bonus"}
                    {item.type === "conversion_bonus" &&
                      `Conversion bonus (${item.currencyContext || "USD"})`}
                    {item.type === "redemption" && "Points redeemed"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    item.points > 0 ? "text-emerald-600" : "text-foreground"
                  )}
                >
                  {item.points > 0 ? "+" : ""}
                  {item.points} pts
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
