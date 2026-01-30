"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form";
import { useProfile } from "@/app/settings/hooks/use-profile";
import { toast } from "sonner";
import { UserProfile } from "@/lib/types/user-preferences";

const accountSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountSettingsProps {
  profile: UserProfile | null;
}

export function AccountSettings({ profile }: AccountSettingsProps) {
  const { updateProfile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      email: profile?.email || "",
    },
  });

  const onSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true);
    const result = await updateProfile({
      full_name: data.full_name,
    } as Partial<UserProfile>);

    if (result.success) {
      toast.success("Account settings updated successfully");
    } else {
      toast.error(result.error || "Failed to update settings");
    }
    setIsSubmitting(false);
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : profile?.email?.substring(0, 2).toUpperCase() || "U";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-public-sans text-2xl font-semibold text-foreground">
          Account Information
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your profile and account details
        </p>
      </div>

      {/* Profile Picture Section */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Profile Picture</h3>
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 ring-2 ring-border">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <Button type="button" variant="outline" className="rounded-xl" disabled>
              Change Avatar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            JPG, PNG or GIF. Max 2MB.
          </p>
        </div>
      </div>

      {/* Form Section */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Field */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      className="mt-2 rounded-xl border-border bg-background"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email Field (Read-only) */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="mt-2 rounded-xl border-border bg-muted text-muted-foreground"
                      {...field}
                      disabled
                    />
                  </FormControl>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your email is used for account recovery and login. Contact support to change it.
                  </p>
                </FormItem>
              )}
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl px-6"
              size="lg">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
