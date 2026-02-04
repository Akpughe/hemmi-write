"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { storeReferralCode } from "@/lib/utils/referralTracking";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  useEffect(() => {
    if (code) {
      // Store the referral code
      console.log("[InvitePage] Storing referral code:", code);
      storeReferralCode(code);

      // Redirect to home page with ref param for consistency
      router.replace(`/?ref=${code}`);
    } else {
      router.replace("/");
    }
  }, [code, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Redirecting...</h2>
        <p className="text-muted-foreground">
          Setting up your referral link
        </p>
      </div>
    </div>
  );
}
