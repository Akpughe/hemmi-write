"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Session,
  SupabaseClient,
  AuthChangeEvent,
} from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { getStoredReferralCode, clearReferralCode } from "@/lib/utils/referralTracking";

type SupabaseContextType = {
  supabase: SupabaseClient;
  session: Session | null;
  isLoading: boolean;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const referralRecordedRef = useRef(false);

  // Function to record referral when user signs in
  const recordReferralIfNeeded = async (session: Session) => {
    if (referralRecordedRef.current) return;
    
    const referralCode = getStoredReferralCode();
    if (!referralCode) return;
    
    console.log("[SupabaseProvider] Found referral code, attempting to record:", referralCode);
    referralRecordedRef.current = true;
    
    try {
      const response = await fetch("/api/referral/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ referralCode }),
      });
      const result = await response.json();
      console.log("[SupabaseProvider] Referral record result:", result);
      
      if (result.data?.success || result.data?.reason === 'already_referred') {
        clearReferralCode();
      }
    } catch (e) {
      console.error("[SupabaseProvider] Failed to record referral:", e);
      referralRecordedRef.current = false; // Allow retry on error
    }
  };

  useEffect(() => {
    // Fetch initial session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      
      // Try to record referral if user is already signed in
      if (session) {
        recordReferralIfNeeded(session);
      }
    });

    // Then listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (session?.access_token !== session?.access_token) {
          router.refresh();
        }
        setSession(session);
        setIsLoading(false);
        
        // Record referral on sign in
        if (event === 'SIGNED_IN' && session) {
          console.log("[SupabaseProvider] User signed in, checking for referral code");
          recordReferralIfNeeded(session);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, session, isLoading }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};
