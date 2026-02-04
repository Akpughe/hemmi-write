"use client";

import Link from "next/link";
import { X, User, Sparkles, Palette, CreditCard, Gift } from "lucide-react";
import { useState } from "react";
import { AccountSettings } from "@/app/settings/components/account-settings";
import { WritingPreferences } from "@/app/settings/components/writing-preferences";
import { AppearanceSettings } from "@/app/settings/components/appearance-settings";
import { BillingSettings } from "@/app/settings/components/billing-settings";
import { ReferralSettings } from "@/app/settings/components/referral-settings";
import { cn } from "@/lib/utils";
import { useProfile } from "@/app/settings/hooks/use-profile";

type SettingTab = "account" | "writing" | "appearance" | "billing" | "referrals";

const tabs: { id: SettingTab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "account",
    label: "Account",
    icon: <User className="size-5" />,
    description: "Profile information",
  },
  {
    id: "billing",
    label: "Billing & usage",
    icon: <CreditCard className="size-5" />,
    description: "Plan, payments & tokens",
  },
  {
    id: "referrals",
    label: "Referrals",
    icon: <Gift className="size-5" />,
    description: "Invite friends & earn",
  },
  {
    id: "writing",
    label: "Writing",
    icon: <Sparkles className="size-5" />,
    description: "Default preferences",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: <Palette className="size-5" />,
    description: "Theme & display",
  },
];

export default function SettingsPage() {
  const { profile, isLoading } = useProfile();
  const [activeTab, setActiveTab] = useState<SettingTab>("account");

  if (isLoading) {
    return (
      <main className="relative min-h-screen bg-background px-4 py-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-center min-h-[500px]">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-public-sans text-3xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your account and preferences
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-muted p-2 text-foreground/70 transition hover:bg-muted hover:text-foreground">
            <span className="sr-only">Close settings</span>
            <X className="size-5" />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-8">
        {/* Sidebar Navigation */}
        <aside className="w-56 shrink-0">
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full rounded-2xl px-4 py-3 text-left transition-all",
                  "flex items-center gap-3",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}>
                <span className="shrink-0">{tab.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm leading-none">{tab.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{tab.description}</div>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "account" && <AccountSettings profile={profile} />}
          {activeTab === "billing" && <BillingSettings />}
          {activeTab === "referrals" && <ReferralSettings />}
          {activeTab === "writing" && <WritingPreferences preferences={profile?.preferences} />}
          {activeTab === "appearance" && <AppearanceSettings preferences={profile?.preferences} />}
        </div>
      </div>
    </main>
  );
}
