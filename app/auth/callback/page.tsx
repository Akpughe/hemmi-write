"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/";

      if (code) {
        const supabase = createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
          router.push(next);
          router.refresh();
        } else {
          console.error("Error exchanging code for session:", error);
          router.push("/auth/login");
        }
      } else {
        router.push("/auth/login");
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
