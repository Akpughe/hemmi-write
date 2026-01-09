"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
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
import { UserPreferences, UserProfile } from "@/lib/types/user-preferences";

const writingPreferencesSchema = z.object({
  defaultCitationStyle: z
    .enum(["APA", "MLA", "CHICAGO", "HARVARD"])
    .optional(),
  defaultWritingStyle: z
    .enum(["ACADEMIC", "PROFESSIONAL", "CASUAL"])
    .optional(),
  defaultAcademicLevel: z
    .enum(["HIGH_SCHOOL", "UNDERGRADUATE", "GRADUATE", "DOCTORAL"])
    .optional(),
});

type WritingPreferencesFormData = z.infer<typeof writingPreferencesSchema>;

interface WritingPreferencesProps {
  preferences: UserPreferences | null | undefined;
}

const preferenceOptions = {
  citation: [
    { value: "APA", label: "APA", description: "American Psychological Association" },
    { value: "MLA", label: "MLA", description: "Modern Language Association" },
    { value: "CHICAGO", label: "Chicago", description: "Chicago Manual of Style" },
    { value: "HARVARD", label: "Harvard", description: "Harvard Style" },
  ],
  writing: [
    { value: "ACADEMIC", label: "Academic", description: "Formal & scholarly" },
    { value: "PROFESSIONAL", label: "Professional", description: "Business & formal" },
    { value: "CASUAL", label: "Casual", description: "Conversational" },
  ],
  level: [
    { value: "HIGH_SCHOOL", label: "High School", description: "Secondary education" },
    { value: "UNDERGRADUATE", label: "Undergraduate", description: "Bachelor's level" },
    { value: "GRADUATE", label: "Graduate", description: "Master's level" },
    { value: "DOCTORAL", label: "Doctoral", description: "PhD level" },
  ],
};

export function WritingPreferences({ preferences }: WritingPreferencesProps) {
  const { updateProfile } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<WritingPreferencesFormData>({
    resolver: zodResolver(writingPreferencesSchema),
    defaultValues: {
      defaultCitationStyle: preferences?.defaultCitationStyle || undefined,
      defaultWritingStyle: preferences?.defaultWritingStyle || undefined,
      defaultAcademicLevel: preferences?.defaultAcademicLevel || undefined,
    },
  });

  const onSubmit = async (data: WritingPreferencesFormData) => {
    setIsSubmitting(true);
    const result = await updateProfile({
      preferences: {
        ...preferences,
        ...data,
      },
    } as Partial<UserProfile>);

    if (result.success) {
      toast.success("Writing preferences updated successfully");
    } else {
      toast.error(result.error || "Failed to update preferences");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-public-sans text-2xl font-semibold text-foreground">
          Writing Defaults
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set your preferred writing style for new projects
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Citation Style */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <FormField
              control={form.control}
              name="defaultCitationStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Citation Style
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="mt-2 rounded-xl border-border">
                        <SelectValue placeholder="Select citation style" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {preferenceOptions.citation.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Applied to new projects automatically
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Writing Style */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <FormField
              control={form.control}
              name="defaultWritingStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Writing Style
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="mt-2 rounded-xl border-border">
                        <SelectValue placeholder="Select writing style" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {preferenceOptions.writing.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tone and formality level for your writing
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Academic Level */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <FormField
              control={form.control}
              name="defaultAcademicLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Academic Level
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="mt-2 rounded-xl border-border">
                        <SelectValue placeholder="Select academic level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {preferenceOptions.level.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span>{opt.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Complexity and depth of your documents
                  </p>
                  <FormMessage />
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
              {isSubmitting ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
