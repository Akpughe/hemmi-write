# Academic Datasets Integration for AI Detection

## Overview

This document outlines the available academic datasets that can enhance our AI detection capabilities by providing research-backed linguistic markers, word frequency analysis, and detection patterns.

---

## Recommended Datasets for Integration

### 1. **AI-Generated Scientific Text Dataset (AIGTxt)** - HIGH PRIORITY ⭐⭐⭐
**Source:** [Mendeley Data](https://data.mendeley.com/datasets/y9bj7734vf/1)  
**Records:** 10,821  
**Classes:** Human-written, ChatGPT-generated, Mixed  
**Coverage:** 10 domains (Computer Science, Medical, Social Sciences, etc.)

**Why We Should Use This:**
- Directly addresses academic writing (our target domain)
- Contains ChatGPT-specific patterns
- Provides mixed authorship detection (partial AI content)
- Structured with human/AI/mixed labels

**Integration Plan:**
```
lib/datasets/aigtxt/
├── phrases.json          # Extract ChatGPT signatures from this dataset
├── domain-markers.json   # Domain-specific AI patterns
└── frequency-analysis.json # Word frequency by class
```

---

### 2. **LLMTrace - Large-Scale Bilingual AI Detection Corpus** - HIGH PRIORITY ⭐⭐⭐
**Source:** [arXiv](https://arxiv.org/abs/2509.21269)  
**Records:** Large-scale bilingual (English/Russian)  
**Features:** Character-level annotations, multiple LLM sources  

**Why We Should Use This:**
- Bilingual support (English + Russian)
- Multi-LLM coverage (not just ChatGPT)
- Character-level granularity for fine-grained detection
- Recent academic research (2024)

**Integration Plan:**
```
lib/datasets/llmtrace/
├── english-markers.json      # English-specific phrases
├── llm-signatures.json       # Signatures from different LLMs
└── fine-grained-patterns.json # Character/sentence level patterns
```

---

### 3. **Comprehensive Dataset: 58K Human vs AI Text** - HIGH PRIORITY ⭐⭐⭐
**Source:** [arXiv](https://arxiv.org/abs/2510.22874)  
**Records:** 58,000+ samples  
**LLMs Covered:** GPT-4o, Mistral, Qwen, LLaMA, Gemma, Yi-Large  
**Source:** New York Times articles + AI-generated variations

**Why We Should Use This:**
- Largest dataset (58K samples)
- Multiple state-of-the-art LLMs
- Real-world journalistic content
- Most recent (2024)

**Integration Plan:**
```
lib/datasets/nyt-comprehensive/
├── ai-signatures-multi-model.json  # Cross-LLM patterns
├── writing-style-markers.json      # NYT vs AI differences
└── llm-attribution-patterns.json   # Which LLM generated what
```

---

### 4. **RU-AI Multimodal Dataset** - MEDIUM PRIORITY ⭐⭐
**Source:** [arXiv](https://arxiv.org/abs/2406.04906)  
**Records:** 1,475,370 instances  
**Modalities:** Text, Image, Voice  

**Why We Should Use This:**
- Multimodal approach (future-proofing)
- Largest dataset by volume
- Robustness testing with noise variants
- Diverse content types

**Integration Plan:**
```
lib/datasets/ru-ai/
├── text-patterns.json         # Text detection markers
└── multi-modal-indicators.json # Cross-modal patterns
```

---

### 5. **Academic AI Detection Dataset (1,103 records)** - LOW PRIORITY ⭐
**Source:** [OpenDataBay](https://www.opendatabay.com/data/dataset/1c8c177e-076c-40bd-becf-40a83e0f8690)  
**Records:** 1,103 (50% AI, 50% Student)  
**Format:** CSV with binary classification  

**Why We Should Use This:**
- Academic context (homework/student writing)
- Simple binary classification
- Educational focus

---

## Implementation Strategy

### Phase 1: Structured Data Integration (Weeks 1-2)

**Add new types to `lib/types/document.ts`:**
```typescript
export interface DatasetSource {
  name: string;
  source: string;
  recordCount: number;
  coverage: string[];
  aiModels?: string[];
  lastUpdated: string;
}

export interface AIDMarker {
  phrase: string;
  frequency: number;
  category: string;
  confidence: number;
  sources: string[];
  alternatives: string[];
}

export interface DatasetAnalysis {
  datasetName: string;
  humanWritingPatterns: AIDMarker[];
  aiPatterns: AIDMarker[];
  markers: {
    commonPhrases: string[];
    sentenceStructure: string;
    wordFrequency: Record<string, number>;
    linguisticFeatures: string[];
  };
}
```

### Phase 2: Create Dataset Configuration (Weeks 2-3)

**Create `lib/config/datasets.ts`:**
```typescript
export const DATASET_SOURCES = {
  AIGTXT: {
    name: "AI-Generated Scientific Text Dataset",
    recordCount: 10821,
    domains: [
      "computer_science",
      "medical_research",
      "social_sciences",
      // ... 7 more
    ],
    aiMarkers: [/* extracted from dataset */]
  },
  LLM_TRACE: {
    name: "LLMTrace",
    recordCount: "large-scale",
    languages: ["english", "russian"],
    llmModels: ["gpt", "mistral", "llama", "gemma", "others"],
    patterns: [/* fine-grained markers */]
  },
  NYT_COMPREHENSIVE: {
    name: "58K Human vs AI Dataset",
    recordCount: 58000,
    llmModels: ["gpt-4o", "mistral-7b", "qwen-72b", "llama-8b", "yi-large", "gemma-2-9b"],
    writingStyleMarkers: [/* extracted */]
  }
};

export function mergeDatasetMarkers(): AIDMarker[] {
  // Combine and deduplicate markers from all datasets
}

export function getAIDMarkersByDataset(datasetName: string): AIDMarker[] {
  // Return markers specific to a dataset
}

export function getAIDMarkersByLLM(llmName: string): AIDMarker[] {
  // Return markers specific to an LLM model
}
```

### Phase 3: Enhance AI Phrase Detection (Weeks 3-4)

**Update `lib/config/humanization.ts`:**
```typescript
// Add to BANNED_PHRASES:
export const BANNED_PHRASES = {
  // ... existing phrases ...
  datasetAIGTXT: [
    // Extracted from scientific AI text dataset
  ],
  datasetLLMTrace: [
    // Extracted from LLMTrace corpus
  ],
  datasetNYTComprehensive: [
    // Extracted from 58K dataset
  ],
  llmSpecific: {
    gpt4: ["gpt-4 specific patterns"],
    mistral: ["mistral specific patterns"],
    // ... more LLMs
  }
};

// Add frequency analysis
export const PHRASE_FREQUENCY_ANALYSIS = {
  byLLM: Record<string, Record<string, number>>,
  byDomain: Record<string, Record<string, number>>,
  byDocumentType: Record<string, Record<string, number>>
};
```

### Phase 4: Enhanced Validation (Weeks 4-5)

**Expand `lib/utils/emDashValidator.ts`:**
```typescript
export function detectLLMFingerprint(text: string): {
  likelyLLM: string;
  confidence: number;
  markers: Array<{phrase: string, source: string}>;
} {
  // Identify which LLM likely generated this
}

export function analyzeLinguisticFeatures(text: string): {
  sentenceLengthVariance: number;
  wordFrequency: Record<string, number>;
  passiveVoicePercentage: number;
  emDashCount: number;
  transitionWordsRatio: number;
  // ... more features from datasets
} {
  // Analyze text against dataset patterns
}

export function detectDomainSpecificAIPatterns(text: string, domain: string): {
  isAILikely: boolean;
  confidence: number;
  reasonsForFlag: string[];
} {
  // Use domain-specific markers from AIGTXT dataset
}
```

---

## Data Files to Create

```
lib/datasets/
├── README.md                          # Dataset integration guide
├── aigtxt/
│   ├── ai-phrases.json               # 500+ extracted AI phrases
│   ├── human-phrases.json            # 500+ human phrases
│   ├── domain-markers.json           # Domain-specific patterns
│   └── transition-analysis.json      # Transition word frequency
├── llmtrace/
│   ├── multilingual-markers.json     # English + Russian patterns
│   ├── character-patterns.json       # Fine-grained patterns
│   └── llm-comparison.json           # LLM-specific signatures
├── nyt-comprehensive/
│   ├── llm-signatures.json           # GPT-4o, Mistral, Qwen, LLaMA patterns
│   ├── style-analysis.json           # NYT human vs AI analysis
│   ├── word-frequency.json           # Term frequency analysis
│   └── sentence-structure.json       # Syntactic patterns
└── frequency-merged.json             # Consolidated analysis

config/
├── datasets.ts                        # Dataset configurations
└── dataset-markers.ts                # Merged marker lists
```

---

## Quick Start Integration

### Immediate (This Week)
1. Create dataset directory structure
2. Add dataset documentation
3. Start with AIGTXT phrases (most relevant to academia)

### Short-term (Next 2 Weeks)
4. Add LLMTrace patterns for multilingual support
5. Create phrase frequency analysis
6. Integrate into `detectChatGPTFingerprint()`

### Medium-term (Weeks 3-4)
7. Add LLM-specific detection (which model generated this?)
8. Domain-specific pattern detection
9. Enhanced linguistic feature analysis

---

## Code Examples

### Using Dataset Markers in Detection

```typescript
// In humanizationPrompt.ts
export function buildEnhancedHumanizationGuidance(
  academicLevel: AcademicLevel,
  domain?: string
): string {
  const baseGuidance = buildHumanizationSystemInstructions(academicLevel);
  
  // Add dataset-specific markers
  const datasetMarkers = mergeDatasetMarkers();
  const domainSpecific = domain 
    ? getAIDMarkersByDomain(domain)
    : [];
  
  const allMarkers = [...datasetMarkers, ...domainSpecific];
  
  return `
${baseGuidance}

ADDITIONAL MARKERS FROM ACADEMIC RESEARCH:
${allMarkers.map(m => `- "${m.phrase}" (confidence: ${m.confidence})`).join('\n')}
`;
}
```

### LLM Fingerprinting

```typescript
// In emDashValidator.ts
export function detectLLMFingerprint(text: string) {
  const nytMarkers = getAIDMarkersByDataset('NYT_COMPREHENSIVE');
  const llmScores: Record<string, number> = {};
  
  // Score text against each LLM's known patterns
  for (const model of ['gpt-4o', 'mistral', 'qwen', 'llama']) {
    const modelMarkers = getAIDMarkersByLLM(model);
    llmScores[model] = modelMarkers.reduce((score, marker) => {
      return score + (text.includes(marker.phrase) ? marker.confidence : 0);
    }, 0);
  }
  
  const likelyLLM = Object.entries(llmScores).sort(([,a], [,b]) => b - a)[0];
  return { likelyLLM: likelyLLM[0], confidence: likelyLLM[1] / 100 };
}
```

---

## References

1. **Comprehensive NYT Dataset**: https://arxiv.org/abs/2510.22874
2. **AIGTxt Scientific**: https://data.mendeley.com/datasets/y9bj7734vf/1
3. **LLMTrace**: https://arxiv.org/abs/2509.21269
4. **RU-AI Multimodal**: https://arxiv.org/abs/2406.04906
5. **Academic Binary Classification**: https://www.opendatabay.com/data/dataset/1c8c177e-076c-40bd-becf-40a83e0f8690

---

## Notes

- All datasets are research-backed and peer-reviewed
- Integration focuses on linguistic markers, not ML model training
- Can scale from 150+ current phrases to 500+ from datasets
- Enables LLM-specific detection (which model generated this?)
- Provides domain-specific markers for different writing contexts

