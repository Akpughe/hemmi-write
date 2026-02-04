"use client";

import { useEffect } from "react";
import { checkAndStoreReferralFromUrl, getStoredReferralCode } from "@/lib/utils/referralTracking";

/**
 * Client component that captures referral codes from URL params
 * Include this in the root layout to track referrals on any page
 */
export function ReferralTracker() {
  useEffect(() => {
    // Check URL for referral code and store it
    const urlCode = checkAndStoreReferralFromUrl();
    if (urlCode) {
      console.log("[ReferralTracker] Stored referral code from URL:", urlCode);
    }
    
    // Also log if there's an existing stored code
    const storedCode = getStoredReferralCode();
    if (storedCode) {
      console.log("[ReferralTracker] Found stored referral code:", storedCode);
    }
  }, []);

  return null;
}
