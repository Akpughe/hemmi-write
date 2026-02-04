"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { PromptInput } from "@/app/components/landing/prompt-input";
import { DocumentTypeSelector } from "@/app/components/landing/document-type-selector";
import { OptionsPanel } from "@/app/components/landing/options-panel";
import { ProjectsSection } from "@/app/components/landing/projects-section";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { AuthModal } from "@/app/components/auth/auth-modal";
import { useSupabase } from "@/lib/context/SupabaseContext";
import type { WritingBrief } from "@/lib/types/ui";
import {
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
  FAQJsonLd,
} from "@/app/components/seo/JsonLd";

import { UserMenu } from "@/app/components/auth/user-menu";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const { session } = useSupabase();
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
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

  // Set isMounted flag for hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const handleSubmit = async () => {
    if (!topic.trim()) return;

    console.log(
      "[HomePage] Submit clicked. Session:",
      session ? "exists" : "null"
    );
    saveBrief();

    if (!session) {
      console.log("[HomePage] No session - opening auth modal");
      setAuthNextPath("/workspace");
      setIsAuthModalOpen(true);
    } else {
      console.log("[HomePage] Session exists - creating project");
      // Create project immediately and navigate with projectId
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: topic,
            topic: topic,
            instructions: instructions || null,
            documentType: brief.documentType || "research-paper",
            academicLevel: brief.academicLevel || "undergraduate",
            writingStyle: brief.writingStyle || "analytical",
            citationStyle: brief.citationStyle || "APA",
            targetWordCount: brief.wordCount || null,
          }),
        });

        console.log("[HomePage] Project creation response:", response.status);

        if (response.ok) {
          const data = await response.json();
          const projectId = data.project.id;
          console.log("[HomePage] Project created successfully:", projectId);
          // Don't clear localStorage yet - workspace page will clear it after successful load
          // This provides a fallback if the workspace page project fetch fails
          router.push(`/workspace?projectId=${projectId}`);
        } else {
          const errorData = await response.json();
          console.error("[HomePage] Project creation failed:", errorData);
          // Fallback to old behavior if project creation fails
          router.push("/workspace");
        }
      } catch (error) {
        console.error("[HomePage] Failed to create project:", error);
        // Fallback to old behavior
        router.push("/workspace");
      }
    }
  };

  const handleAuthSuccess = async () => {
    setIsAuthModalOpen(false);
    if (authNextPath === "/workspace") {
      // Create project after authentication before navigating
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: topic,
            topic: topic,
            instructions: instructions || null,
            documentType: brief.documentType || "research-paper",
            academicLevel: brief.academicLevel || "undergraduate",
            writingStyle: brief.writingStyle || "analytical",
            citationStyle: brief.citationStyle || "APA",
            targetWordCount: brief.wordCount || null,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const projectId = data.project.id;
          // Don't clear localStorage yet - workspace page will clear it after successful load
          // This provides a fallback if the workspace page project fetch fails
          router.push(`/workspace?projectId=${projectId}`);
        } else {
          // Fallback to old behavior if project creation fails
          router.push(authNextPath);
        }
      } catch (error) {
        console.error("Failed to create project:", error);
        // Fallback to old behavior
        router.push(authNextPath);
      }
    } else if (authNextPath) {
      router.push(authNextPath);
    }
  };

  const handleLoginClick = () => {
    setAuthNextPath(null); // Stay on page after login
    setIsAuthModalOpen(true);
  };

  const homepageFaqs = [
    {
      question: "What is Hemmi AI Writing Assistant?",
      answer:
        "Hemmi is an AI-powered writing assistant that helps you create research papers, essays, and academic documents faster with proper citations and academic rigor.",
    },
    {
      question: "What types of documents can I write with Hemmi?",
      answer:
        "You can write research papers, essays, reports, thesis documents, dissertations, and other academic content with various citation styles including APA, MLA, Harvard, Chicago, and IEEE.",
    },
    {
      question: "Is the content written by Hemmi plagiarism-free?",
      answer:
        "Yes, Hemmi generates 100% original, human-like content. The AI assists with research, structuring, and writing while ensuring academic integrity.",
    },
    {
      question: "What citation styles does Hemmi support?",
      answer:
        "Hemmi supports all major citation styles including APA, MLA, Harvard, Chicago, and IEEE formats for your academic writing needs.",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col">
      <OrganizationJsonLd />
      <SoftwareApplicationJsonLd />
      <FAQJsonLd faqs={homepageFaqs} />

      {/* Logo mark */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-bold text-sm">
              <img
                src={
                  isMounted && theme === "dark"
                    ? "https://ik.imagekit.io/r9a7zbqsf/4.svg"
                    : "https://ik.imagekit.io/r9a7zbqsf/2.svg"
                }
                alt="Hemmi AI"
              />
            </span>
          </div>
          <span className="text-foreground/80 font-medium hidden sm:block">
            <img
              src={
                isMounted && theme === "dark"
                  ? "https://ik.imagekit.io/r9a7zbqsf/Screenshot%202026-01-30%20at%2021.18.39.png"
                  : "https://ik.imagekit.io/r9a7zbqsf/3.png?updatedAt=1769801681737"
              }
              className="w-20"
              alt="Hemmi"
            />
          </span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1 sm:gap-2 z-10">
        <Link
          href="/pricing"
          className={cn(
            "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] text-foreground/60 transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
          )}>
          Pricing
        </Link>
        {session ? (
          <UserMenu session={session} />
        ) : (
          <button
            onClick={handleLoginClick}
            className={cn(
              "inline-flex items-center justify-center rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] text-foreground/60 transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
            )}>
            Log in
          </button>
        )}
        <ThemeToggle />
      </div>

      {/* Hero section */}
      <div className="min-h-screen sm:min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl flex flex-col items-center gap-6 sm:gap-8">
          {/* Hero text */}
          <div className="text-center space-y-2 sm:space-y-3 pt-8 sm:pt-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium font-fraunces tracking-tight text-balance leading-tight">
              What do you want to write?
            </h1>
            <p className="text-sm sm:text-base text-foreground/80 font-fraunces">
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
      </div>

      {/* Projects section - only shown when authenticated */}
      {session && <ProjectsSection />}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        nextPath={authNextPath}
      />
    </main>
  );
}
