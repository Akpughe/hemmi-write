"use client";

import { useState, useEffect, useCallback } from "react";
import { ResearchStreamView } from "./research-stream-view";
import { Button } from "@/app/components/ui/button";
import { Play, RotateCcw } from "lucide-react";
import type {
  PartialDeepResearchPaper,
  ResearchPhase,
} from "@/lib/types/deepResearch";

// Sample papers for simulation
const MOCK_PAPERS: PartialDeepResearchPaper[] = [
  {
    id: "paper-1",
    title: "Photonic Neural Networks: A Compact Review",
    authors: "Smith, J., Johnson, M., Williams, K.",
    year: 2023,
    journalName: "Nature Photonics",
    url: "https://example.com/paper1",
    doi: "10.1234/example1",
  },
  {
    id: "paper-2",
    title:
      "Photonics for Neuromorphic Computing: Fundamentals, Devices, and Applications",
    authors: "Chen, L., Garcia, R.",
    year: 2024,
    journalName: "Science",
    url: "https://example.com/paper2",
  },
  {
    id: "paper-3",
    title: "Photonic Neural Networks and Optics-informed Deep Learning",
    authors: "Anderson, P., Lee, S., Kim, H.",
    year: 2023,
    journalName: "Physical Review Letters",
    url: "https://example.com/paper3",
  },
  {
    id: "paper-4",
    title: "A review of emerging trends in photonic deep learning accelerators",
    authors: "Brown, T., Davis, M.",
    year: 2024,
    journalName: "Frontiers in Physics",
    url: "https://example.com/paper4",
  },
  {
    id: "paper-5",
    title: "Grand challenges in neuromorphic photonics and photonic computing",
    authors: "Wilson, E., Taylor, A., Martinez, C.",
    year: 2023,
    journalName: "Frontiers in Neuroscience",
    url: "https://example.com/paper5",
  },
  {
    id: "paper-6",
    title:
      "All-Photonic Artificial Neural Network Processor Via Non-linear Optics",
    authors: "Thompson, R.",
    year: 2022,
    journalName: "Optics Express",
    url: "https://example.com/paper6",
  },
  {
    id: "paper-7",
    title:
      "Analog Photonics Computing for Information Processing, Inference, and Optimization",
    authors: "White, J., Harris, L., Clark, N.",
    year: 2024,
    journalName: "IEEE Photonics Journal",
    url: "https://example.com/paper7",
  },
  {
    id: "paper-8",
    title:
      "Photonic neural networks with spatiotemporal chaos in multimode fibers",
    authors: "Robinson, D., Lewis, K.",
    year: 2023,
    journalName: "Nature Communications",
    url: "https://example.com/paper8",
  },
  {
    id: "paper-9",
    title:
      "Large-Scale Optical Neural Networks based on Photoelectric Multiplication",
    authors: "Walker, S., Hall, P., Allen, R.",
    year: 2024,
    journalName: "Advanced Photonics",
    url: "https://example.com/paper9",
  },
  {
    id: "paper-10",
    title:
      "Photonic neural networks based on integrated silicon microresonators",
    authors: "Young, M., King, T.",
    year: 2023,
    journalName: "Photonics Research",
    url: "https://example.com/paper10",
  },
];

const ENRICHMENT_FIELDS = [
  "abstract",
  "citations",
  "methodology",
  "authors",
  "references",
];

const PHASE_MESSAGES: Record<ResearchPhase, string[]> = {
  idle: ["Ready to start research..."],
  searching: [
    "Searching academic databases...",
    "Querying Semantic Scholar...",
    "Fetching results from arXiv...",
    "Scanning PubMed for relevant papers...",
  ],
  found: ["Found 20 candidates"],
  enriching: [
    "Analyzing paper metadata...",
    "Extracting citation information...",
    "Verifying source quality...",
    "Enriching paper details...",
  ],
  validating: ["Validating paper completeness..."],
  complete: ["Research complete! Found high-quality sources."],
  error: ["Research interrupted"],
};

export function ResearchStreamDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<ResearchPhase>("idle");
  const [phaseMessage, setPhaseMessage] = useState(
    "Ready to start research...",
  );
  const [papersFound, setPapersFound] = useState<PartialDeepResearchPaper[]>(
    [],
  );
  const [papersEnriching, setPapersEnriching] = useState<
    Map<string, { paper: PartialDeepResearchPaper; field: string }>
  >(new Map());
  const [papersComplete, setPapersComplete] = useState<
    PartialDeepResearchPaper[]
  >([]);
  const [papersFailed, setPapersFailed] = useState<PartialDeepResearchPaper[]>(
    [],
  );
  const [tokensUsed, setTokensUsed] = useState(0);

  const reset = useCallback(() => {
    setIsRunning(false);
    setPhase("idle");
    setPhaseMessage("Ready to start research...");
    setPapersFound([]);
    setPapersEnriching(new Map());
    setPapersComplete([]);
    setPapersFailed([]);
    setTokensUsed(0);
  }, []);

  const runSimulation = useCallback(async () => {
    reset();
    setIsRunning(true);

    // Helper to wait
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Phase 1: Searching
    setPhase("searching");
    for (const msg of PHASE_MESSAGES.searching) {
      setPhaseMessage(msg);
      await wait(800);
    }

    // Phase 2: Found - add papers one by one
    setPhase("found");
    setPhaseMessage("Found 20 candidates");

    for (let i = 0; i < MOCK_PAPERS.length; i++) {
      setPapersFound((prev) => [...prev, MOCK_PAPERS[i]]);
      setTokensUsed((prev) => prev + Math.floor(Math.random() * 500) + 200);
      await wait(150);
    }

    await wait(500);

    // Phase 3: Enriching - process papers
    setPhase("enriching");

    for (let i = 0; i < MOCK_PAPERS.length; i++) {
      const paper = MOCK_PAPERS[i];
      const field = ENRICHMENT_FIELDS[i % ENRICHMENT_FIELDS.length];

      setPhaseMessage(`Analyzing: ${paper.title.slice(0, 40)}...`);

      // Add to enriching
      setPapersEnriching((prev) => {
        const next = new Map(prev);
        next.set(paper.id, { paper, field });
        return next;
      });

      await wait(600 + Math.random() * 400);

      // Move from enriching to complete (or fail randomly)
      setPapersEnriching((prev) => {
        const next = new Map(prev);
        next.delete(paper.id);
        return next;
      });

      // 10% chance of failure
      if (Math.random() < 0.1) {
        setPapersFailed((prev) => [...prev, paper]);
      } else {
        setPapersComplete((prev) => [...prev, paper]);
      }

      setTokensUsed((prev) => prev + Math.floor(Math.random() * 1000) + 500);
    }

    // Phase 4: Complete
    setPhase("complete");
    setPhaseMessage("Research complete! Found high-quality sources.");
    setIsRunning(false);
  }, [reset]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Research</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={isRunning}
            className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={runSimulation}
            disabled={isRunning}
            className="gap-2">
            <Play className="w-4 h-4" />
            Run Simulation
          </Button>
        </div>
      </div>

      <div className="border rounded-2xl p-6 bg-background">
        <ResearchStreamView
          phase={phase}
          phaseMessage={phaseMessage}
          papersFound={papersFound}
          papersEnriching={papersEnriching}
          papersComplete={papersComplete}
          papersFailed={papersFailed}
          targetCount={10}
          completedCount={papersComplete.length}
          savedCount={papersComplete.length}
          tokensUsed={tokensUsed}
          tokensRemaining={50000 - tokensUsed}
          tokenWarning={tokensUsed > 40000}
          tokenExhausted={false}
          topic="Photonic neural networks for deep learning acceleration"
          onCancel={isRunning ? reset : undefined}
        />
      </div>
    </div>
  );
}

export default ResearchStreamDemo;
