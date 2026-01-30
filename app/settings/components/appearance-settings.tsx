"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { UserPreferences } from "@/lib/types/user-preferences";

interface AppearanceSettingsProps {
  preferences: UserPreferences | null | undefined;
}

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function AppearanceSettings({ preferences }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-public-sans text-2xl font-semibold text-foreground">
          Appearance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize how Hemmi looks and feels
        </p>
      </div>

      {/* Theme Selection */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Theme</label>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose your preferred color theme
            </p>
          </div>

          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="rounded-xl border-border">
              <SelectValue placeholder="Select theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`rounded-2xl border-2 p-4 text-center transition-all ${
                    isSelected
                      ? "border-foreground bg-muted"
                      : "border-border hover:border-border/80 hover:bg-muted/50"
                  }`}>
                  <Icon className="mx-auto mb-2 size-6 text-foreground" />
                  <div className="text-sm font-medium text-foreground">
                    {option.label}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            System theme follows your device's appearance settings.
          </p>
        </div>
      </div>
    </div>
  );
}
