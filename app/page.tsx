"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PromptInput } from "@/app/components/landing/prompt-input";
import { DocumentTypeSelector } from "@/app/components/landing/document-type-selector";
import { OptionsPanel } from "@/app/components/landing/options-panel";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import type { WritingBrief } from "@/lib/types/ui";

export default function HomePage() {
  const router = useRouter();
  const [brief, setBrief] = useState<Partial<WritingBrief>>({
    documentType: "research-paper",
    academicLevel: "undergraduate",
    writingStyle: "analytical",
    citationStyle: "APA",
    includeSources: true,
  });
  const [topic, setTopic] = useState("");
  const [instructions, setInstructions] = useState("");

  const handleSubmit = () => {
    if (!topic.trim()) return;

    // Store brief in sessionStorage and navigate to workspace
    const fullBrief: WritingBrief = {
      ...brief,
      topic,
      instructions,
      documentType: brief.documentType || "research-paper",
      academicLevel: brief.academicLevel || "undergraduate",
      writingStyle: brief.writingStyle || "analytical",
      citationStyle: brief.citationStyle || "APA",
      includeSources: brief.includeSources ?? true,
      chapters: brief.chapters,
    };
    sessionStorage.setItem("writingBrief", JSON.stringify(fullBrief));
    router.push("/workspace");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Logo mark */}
      <div className="absolute top-6 left-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-bold text-sm">N</span>
          </div>
          <span className="text-foreground/80 font-medium">Write Nuton</span>
        </div>
      </div>

      {/* Theme toggle */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        {/* Hero text */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            What do you want to write?
          </h1>
          <p className="text-muted-foreground text-lg">
            Research, plan, and write with AI assistance
          </p>
        </div>

        {/* Main input area */}
        <div className="w-full">
          <PromptInput
            topic={topic}
            setTopic={setTopic}
            instructions={instructions}
            setInstructions={setInstructions}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Document type pills */}
        <DocumentTypeSelector
          selected={brief.documentType || "research-paper"}
          onSelect={(type) => setBrief({ ...brief, documentType: type })}
        />

        {/* Additional options */}
        <OptionsPanel
          brief={brief}
          onUpdate={(updates) => setBrief({ ...brief, ...updates })}
        />
      </div>
    </main>
  );
}
