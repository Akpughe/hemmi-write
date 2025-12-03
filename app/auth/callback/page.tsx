"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Track processed codes to prevent double execution in Strict Mode
let processedCode: string | null = null;

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      let next = searchParams.get("next") || "/";

      if (!code) {
        router.push("/");
        return;
      }

      // Prevent double processing of the same code
      if (processedCode === code) return;
      processedCode = code;

      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        console.log("Code exchanged for session successfully");

        // Smart redirect: if localStorage has saved data, go to workspace
        const savedBrief = localStorage.getItem("writingBrief");
        if (savedBrief) {
          try {
            const parsed = JSON.parse(savedBrief);
            if (parsed.topic) {
              next = "/workspace";
            }
          } catch (e) {
            console.error("Failed to parse saved brief:", e);
          }
        }

        router.push(next);
        router.refresh();
      } else {
        console.error("Error exchanging code for session:", error);
        // Reset processed code on error to allow retry if needed (though code is likely invalid now)
        processedCode = null;
        router.push("/");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Authenticating...</h2>
        <p className="text-muted-foreground">
          Please wait while we log you in.
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
          </div>
        </div>
      }>
      <AuthCallbackContent />
    </Suspense>
  );
}
