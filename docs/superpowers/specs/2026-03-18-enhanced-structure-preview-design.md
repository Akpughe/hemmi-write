# Design: Enhanced Structure Preview

**Date**: 2026-03-18
**Status**: Approved

---

## Overview

Replace the flat "Blueprint ready" card in the editor panel with a rich, expandable, editable structure preview that shows subsections, mapped references with rationale, and word counts per chapter. Follow the same Framer Motion animation patterns used in `research-stream-view.tsx`.

---

## UI Design

### Visual Style (match research-stream-view.tsx)

- **Animations**: Framer Motion — `motion.div` with `initial={{ opacity: 0 }}`, staggered delays per section
- **Backgrounds**: `foreground/[0.02]` for subtle highlights
- **Borders**: `foreground/5` ultra-light dividers, `border-border` for section cards
- **Active state**: Blue accents (`blue-500`)
- **Complete state**: Emerald (`emerald-500`)
- **Typography**: `foreground/70` primary, `foreground/40` secondary
- **Cards**: Rounded corners (`rounded-xl`), hover effects with `transition-all duration-300`

### Component Structure

```
StructurePreview
├── Header: "Blueprint ready" + section count badge
├── Title (editable inline)
├── SectionCard[] (expandable, animated entry)
│   ├── Section header: number, title (editable), word count, reference count badge
│   ├── Description text
│   └── Expanded content (animated height):
│       ├── SubsectionList: numbered subsection titles (editable)
│       └── ReferenceList: mapped references with "Why" rationale
└── Action buttons: "Update Structure" | "Start Writing"
```

### Interaction Model

1. **Expand/Collapse**: Click section header to toggle. First section expanded by default.
2. **Inline editing**: Click heading text to make it editable (`contentEditable`). Editing any field enables the "Update Structure" button.
3. **Update Structure**: Sends edited structure back to `/api/write/structure` with `userFeedback` describing changes. Shows loading shimmer, then renders updated preview.
4. **Start Writing**: Same as current — calls `onStepChange("writing")`.

---

## Data Flow

### What the component needs

1. **Structure data** (already available as `plan` in editor-panel):
   - `sections[].heading`, `sections[].description`, `sections[].keyPoints`, `sections[].estimatedWordCount`

2. **Source analysis + section mappings** (fetched from DB):
   - `sourceAnalysis.sources[]` — with `keyClaims`, `bestUsedFor` per source
   - `sectionMappings[]` — with `relevantSourceIds`, `sectionThesis` per section
   - Research sources metadata — `title`, `author`, `publishedDate` for display

### Fetching source intelligence

Add a `GET` handler to `/api/write/analyze-sources/route.ts` that returns:
```json
{
  "sourceAnalysis": { ... },
  "sectionMappings": [ ... ],
  "researchSources": [ { "id": "...", "title": "...", "author": "...", "url": "..." } ]
}
```

The `StructurePreview` component calls this on mount when `projectId` is available.

---

## Files

### Create
- `app/components/workspace/structure-preview.tsx` — New rich preview component

### Modify
- `app/components/workspace/editor-panel.tsx` — Replace flat list (lines ~1170-1315) with `<StructurePreview>`
- `app/api/write/analyze-sources/route.ts` — Add GET handler to fetch analysis + mappings + sources

---

## "Update Structure" Flow

1. User edits heading/subsection titles inline
2. Component tracks `hasEdits` state
3. "Update Structure" button becomes primary (highlighted) when `hasEdits === true`
4. On click: collects all current headings/keyPoints, sends to structure API with `userFeedback`:
   ```
   "User edited the structure: Chapter 1 renamed to '...', subsection 1.2 changed to '...'"
   ```
5. Shows ThinkingShimmer during regeneration
6. Replaces preview with updated structure
7. Source-to-section mapping re-runs automatically after structure updates

---

## Props Interface

```typescript
interface StructurePreviewProps {
  plan: DocumentPlan;
  projectId: string;
  onStepChange: (step: string) => void;
  onStructureUpdate: (updatedPlan: DocumentPlan) => void;
  isRegenerating?: boolean;
}
```
