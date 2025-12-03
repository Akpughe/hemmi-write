"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PromptInput } from "@/app/components/landing/prompt-input";
import { DocumentTypeSelector } from "@/app/components/landing/document-type-selector";
import { OptionsPanel } from "@/app/components/landing/options-panel";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { Button } from "@/app/components/ui/button";
import { AuthModal } from "@/app/components/auth/auth-modal";
import { useSupabase } from "@/lib/context/SupabaseContext";
import type { WritingBrief } from "@/lib/types/ui";

import { UserMenu } from "@/app/components/auth/user-menu";

export default function HomePage() {
  const router = useRouter();
  const { session } = useSupabase();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authNextPath, setAuthNextPath] = useState<string | null>(null);
  const [brief, setBrief] = useState<Partial<WritingBrief>>({
    documentType: "research-paper",
    academicLevel: "undergraduate",
    writingStyle: "analytical",
    citationStyle: "APA",
    includeSources: true,
  });
  const [topic, setTopic] = useState("");
  const [instructions, setInstructions] = useState("");
  const hasRestoredRef = useRef(false);

  // Restore saved data when component mounts (for display purposes only)
  // Navigation is handled by auth callback or handleSubmit
  useEffect(() => {
    // Only run once on mount
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const savedBrief = localStorage.getItem("writingBrief");
    if (savedBrief) {
      try {
        const parsedBrief: WritingBrief = JSON.parse(savedBrief);
        setBrief({
          documentType: parsedBrief.documentType,
          academicLevel: parsedBrief.academicLevel,
          writingStyle: parsedBrief.writingStyle,
          citationStyle: parsedBrief.citationStyle,
          includeSources: parsedBrief.includeSources,
          chapters: parsedBrief.chapters,
        });
        setTopic(parsedBrief.topic || "");
        setInstructions(parsedBrief.instructions || "");
      } catch (error) {
        console.error("Failed to restore saved brief:", error);
      }
    }
  }, []);

  const saveBrief = () => {
    // Store brief in localStorage (survives OAuth redirects)
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
    localStorage.setItem("writingBrief", JSON.stringify(fullBrief));
  };

  const handleSubmit = () => {
    if (!topic.trim()) return;

    saveBrief();

    if (!session) {
      setAuthNextPath("/workspace");
      setIsAuthModalOpen(true);
    } else {
      router.push("/workspace");
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    if (authNextPath) {
      router.push(authNextPath);
    }
  };

  const handleLoginClick = () => {
    setAuthNextPath(null); // Stay on page after login
    setIsAuthModalOpen(true);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative">
      {/* Logo mark */}
      <div className="absolute top-6 left-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-bold text-sm">N</span>
          </div>
          <span className="text-foreground/80 font-medium">Write Nuton</span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="absolute top-6 right-6 flex items-center gap-4">
        {session ? (
          <UserMenu session={session} />
        ) : (
          <Button variant="ghost" onClick={handleLoginClick}>
            Log in
          </Button>
        )}
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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        nextPath={authNextPath}
      />
    </main>
  );
}
