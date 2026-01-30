/**
 * Billing API
 * GET: Fetch user's subscriptions + payment history (paginated)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, createServerSupabaseClient } from "@/lib/supabase/server";
import { subscriptionService } from "@/lib/services/subscriptionService";

type PaymentGateway = "paystack" | "stripe";
type Currency = "USD" | "NGN";

export interface BillingPayment {
  id: string;
  transactionId: string;
  paymentGateway: PaymentGateway;
  amount: number;
  currency: Currency;
  tokensPurchased: number;
  paymentType: "subscription" | "one_time" | "top_up" | "renewal";
  status: "pending" | "success" | "failed" | "refunded";
  failureReason: string | null;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const paymentsLimit = Number.parseInt(searchParams.get("paymentsLimit") || "25");
    const paymentsOffset = Number.parseInt(searchParams.get("paymentsOffset") || "0");
    const subscriptionsLimit = Number.parseInt(
      searchParams.get("subscriptionsLimit") || "10"
    );

    const supabase = await createServerSupabaseClient();

    const [subscriptions, paymentsResult] = await Promise.all([
      subscriptionService.getUserSubscriptions(user.id),
      supabase
        .from("payment_history")
        .select(
          "id, transaction_id, payment_gateway, amount, currency, tokens_purchased, payment_type, status, failure_reason, created_at",
          { count: "exact" }
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(paymentsOffset, paymentsOffset + paymentsLimit - 1),
    ]);

    // Limit subscriptions in memory (service returns all)
    const limitedSubscriptions = subscriptions.slice(0, Math.max(0, subscriptionsLimit));

    const { data: payments, error: paymentsError, count } = paymentsResult;

    if (paymentsError) {
      console.error("[Billing API] payment_history error:", paymentsError);
      throw paymentsError;
    }

    const mappedPayments: BillingPayment[] = (payments || []).map((p) => ({
      id: p.id,
      transactionId: p.transaction_id,
      paymentGateway: p.payment_gateway as PaymentGateway,
      amount: typeof p.amount === "string" ? Number.parseFloat(p.amount) : p.amount,
      currency: p.currency as Currency,
      tokensPurchased: p.tokens_purchased,
      paymentType: p.payment_type as BillingPayment["paymentType"],
      status: p.status as BillingPayment["status"],
      failureReason: p.failure_reason ?? null,
      createdAt: p.created_at,
    }));

    return NextResponse.json(
      {
        data: {
          subscriptions: limitedSubscriptions,
          payments: mappedPayments,
          paymentsPagination: {
            total: count || 0,
            limit: paymentsLimit,
            offset: paymentsOffset,
            hasMore: (count || 0) > paymentsOffset + paymentsLimit,
          },
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("[Billing API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch billing info" }, { status: 500 });
  }
}

