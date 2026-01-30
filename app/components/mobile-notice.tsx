"use client";

import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

export function MobileNotice() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Check if user dismissed during this session only (not persisted across page reloads)
    const dismissed = sessionStorage.getItem("mobile-notice-dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    // Only dismiss for this session - clears on page reload
    sessionStorage.setItem("mobile-notice-dismissed", "true");
  };

  if (!isMounted || isDismissed) {
    return null;
  }

  return (
    <>
      {/* Mobile Notice - Only visible on mobile */}
      <div className="fixed inset-0 z-50 flex md:hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/95" />

        {/* Content */}
        <div className="relative w-full h-full flex flex-col items-center justify-center px-6 py-8">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Dismiss">
            <XIcon className="w-5 h-5 text-foreground/60" />
          </button>

          {/* Main content */}
          <div className="flex flex-col items-center gap-6 text-center max-w-sm">
            {/* Icon/Visual element */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent/10 blur-2xl rounded-full" />
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20">
                <svg
                  className="w-8 h-8 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 17L9 20m0 0l-.75 3M9 20H5m15.25-17L15 4m0 0l-.75-3M15 4h4M4.5 8H3m3.75 0h12m-12 4h12m-12 4h12"
                  />
                </svg>
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground font-fraunces">
                Experience Hemmi
                <br />
                <span className="text-accent">on Desktop</span>
              </h2>
            </div>

            {/* Description */}
            <p className="text-sm text-foreground/70 leading-relaxed">
              For the best experience and full access to all features, please open Hemmi on a laptop or desktop device. Mobile optimization coming soon.
            </p>

            {/* Features highlight */}
            <div className="w-full space-y-2 pt-4">
              <div className="flex items-center gap-3 text-sm text-foreground/60">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Full-featured writing workspace</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground/60">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Advanced customization options</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-foreground/60">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span>Seamless document management</span>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-6 w-full">
              <button
                onClick={handleDismiss}
                className="w-full px-6 py-3 bg-accent text-background rounded-xl font-medium text-sm transition-all hover:bg-accent/90 active:scale-[0.98]">
                Got it
              </button>
            </div>

            {/* Optional: Divider and alternative action */}
            <div className="pt-2 text-xs text-foreground/40">
              You can dismiss this message anytime
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
