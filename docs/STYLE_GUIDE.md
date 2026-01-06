# Write Nuton Style Guide

A comprehensive guide to colors, typography, components, and design patterns for Write Nuton.

---

## Table of Contents

1. [Color System](#color-system)
2. [Typography](#typography)
3. [Spacing & Layout](#spacing--layout)
4. [Border Radius](#border-radius)
5. [Components](#components)
6. [Design Patterns](#design-patterns)
7. [Dark Mode](#dark-mode)

---

## Color System

Write Nuton uses **OKLCH** color space for better perceptual uniformity and color manipulation. All colors are defined as CSS custom properties in `app/globals.css`.

### Semantic Color Tokens

#### Light Theme

| Token                      | OKLCH Value                 | Usage                             |
| -------------------------- | --------------------------- | --------------------------------- |
| `--background`             | `oklch(1 0 0)`              | Main page background (pure white) |
| `--foreground`             | `oklch(0.1 0 0)`            | Primary text color (near black)   |
| `--card`                   | `oklch(0.98 0 0)`           | Card/surface backgrounds          |
| `--card-foreground`        | `oklch(0.1 0 0)`            | Text on cards                     |
| `--primary`                | `oklch(0.1 0 0)`            | Primary actions, buttons          |
| `--primary-foreground`     | `oklch(0.98 0 0)`           | Text on primary elements          |
| `--secondary`              | `oklch(0.96 0 0)`           | Secondary backgrounds             |
| `--secondary-foreground`   | `oklch(0.1 0 0)`            | Text on secondary elements        |
| `--muted`                  | `oklch(0.96 0 0)`           | Muted backgrounds (inputs, etc.)  |
| `--muted-foreground`       | `oklch(0.45 0 0)`           | Muted text (placeholders, hints)  |
| `--accent`                 | `oklch(0.75 0.15 160)`      | Accent color (teal/green)         |
| `--accent-foreground`      | `oklch(0.98 0 0)`           | Text on accent elements           |
| `--destructive`            | `oklch(0.577 0.245 27.325)` | Error/destructive actions (red)   |
| `--destructive-foreground` | `oklch(0.98 0 0)`           | Text on destructive elements      |
| `--border`                 | `oklch(0.92 0 0)`           | Border color                      |
| `--input`                  | `oklch(0.96 0 0)`           | Input field backgrounds           |
| `--ring`                   | `oklch(0.75 0.15 160)`      | Focus ring color (matches accent) |

#### Dark Theme

| Token                      | OKLCH Value                 | Usage                             |
| -------------------------- | --------------------------- | --------------------------------- |
| `--background`             | `oklch(0.1 0 0)`            | Main page background (near black) |
| `--foreground`             | `oklch(0.95 0 0)`           | Primary text color (near white)   |
| `--card`                   | `oklch(0.14 0 0)`           | Card/surface backgrounds          |
| `--card-foreground`        | `oklch(0.95 0 0)`           | Text on cards                     |
| `--primary`                | `oklch(0.95 0 0)`           | Primary actions, buttons          |
| `--primary-foreground`     | `oklch(0.1 0 0)`            | Text on primary elements          |
| `--secondary`              | `oklch(0.2 0 0)`            | Secondary backgrounds             |
| `--secondary-foreground`   | `oklch(0.95 0 0)`           | Text on secondary elements        |
| `--muted`                  | `oklch(0.18 0 0)`           | Muted backgrounds                 |
| `--muted-foreground`       | `oklch(0.6 0 0)`            | Muted text                        |
| `--accent`                 | `oklch(0.75 0.15 160)`      | Accent color (same as light)      |
| `--accent-foreground`      | `oklch(0.1 0 0)`            | Text on accent elements           |
| `--destructive`            | `oklch(0.396 0.141 25.723)` | Error/destructive actions         |
| `--destructive-foreground` | `oklch(0.637 0.237 25.331)` | Text on destructive elements      |
| `--border`                 | `oklch(0.25 0 0)`           | Border color                      |
| `--input`                  | `oklch(0.18 0 0)`           | Input field backgrounds           |
| `--ring`                   | `oklch(0.75 0.15 160)`      | Focus ring color                  |

### Chart Colors

Used for data visualization:

- `--chart-1`: `oklch(0.646 0.222 41.116)` - Orange
- `--chart-2`: `oklch(0.6 0.118 184.704)` - Blue-green
- `--chart-3`: `oklch(0.398 0.07 227.392)` - Blue
- `--chart-4`: `oklch(0.828 0.189 84.429)` - Yellow
- `--chart-5`: `oklch(0.769 0.188 70.08)` - Yellow-orange

### Usage in Tailwind

Colors are accessed via Tailwind's semantic color classes:

```tsx
// Backgrounds
className = "bg-background"; // Main background
className = "bg-card"; // Card background
className = "bg-muted"; // Muted background
className = "bg-accent"; // Accent background

// Text
className = "text-foreground"; // Primary text
className = "text-muted-foreground"; // Muted text
className = "text-accent"; // Accent text

// Borders
className = "border-border"; // Standard border
className = "border-accent"; // Accent border

// Focus states
className = "focus:ring-ring"; // Focus ring
```

### Hardcoded Colors (Legacy)

Some components still use hardcoded hex colors. These should be migrated to semantic tokens:

- `#0B0B0B` - Near black text (use `text-foreground`)
- `#6B6B6B` - Muted gray (use `text-muted-foreground`)
- `#E5E5E5` - Light border (use `border-border`)

---

## Typography

### Font Families

Write Nuton uses multiple font families for different purposes:

| Font Variable        | Font Family                     | Usage                      |
| -------------------- | ------------------------------- | -------------------------- |
| `--font-sans`        | Geist, Geist Fallback           | Default UI text, body text |
| `--font-mono`        | Geist Mono, Geist Mono Fallback | Code, monospace content    |
| `--font-fraunces`    | Fraunces                        | Headings, display text     |
| `--font-public-sans` | Public Sans                     | Alternative UI font        |
| `--font-dm-sans`     | DM Sans                         | Input fields, forms        |

### Font Usage

```tsx
// Default (Geist Sans)
className = "font-sans";

// Headings (Fraunces)
className = "font-fraunces";

// Inputs (DM Sans)
className = "font-dm-sans";

// Code (Geist Mono)
className = "font-mono";
```

### Type Scale

Write Nuton uses Tailwind's default type scale with custom prose styles for the editor:

#### UI Text Sizes

- `text-xs` - 0.75rem (12px) - Small labels, captions
- `text-sm` - 0.875rem (14px) - Default UI text, buttons
- `text-base` - 1rem (16px) - Body text, inputs
- `text-lg` - 1.125rem (18px) - Large body text
- `text-xl` - 1.25rem (20px) - Small headings
- `text-2xl` - 1.5rem (24px) - Section headings
- `text-3xl` - 1.875rem (30px) - Major headings
- `text-4xl` - 2.25rem (36px) - Hero headings

#### Editor Prose Styles

The TipTap editor uses custom prose styles (defined in `globals.css`):

- **H1**: `text-4xl`, `leading-tight`, `mb-6`, `mt-8`
- **H2**: `text-3xl`, `leading-snug`, `mb-5`, `mt-8`
- **H3**: `text-2xl`, `leading-snug`, `mb-4`, `mt-6`
- **H4**: `text-xl`, `leading-normal`, `mb-3`, `mt-5`
- **H5**: `text-lg`, `leading-normal`, `mb-3`, `mt-4`
- **H6**: `text-base`, `leading-normal`, `font-semibold`, `mb-2`, `mt-4`
- **Paragraph**: `mb-5`, `leading-relaxed`

### Font Weights

- `font-normal` (400) - Default body text
- `font-medium` (500) - UI labels, buttons
- `font-semibold` (600) - Emphasized text
- `font-bold` (700) - Headings, strong emphasis

---

## Spacing & Layout

Write Nuton uses Tailwind's default spacing scale (4px base unit):

| Scale | Value          | Usage            |
| ----- | -------------- | ---------------- |
| `0`   | 0px            | No spacing       |
| `1`   | 0.25rem (4px)  | Tight spacing    |
| `2`   | 0.5rem (8px)   | Small gaps       |
| `3`   | 0.75rem (12px) | Default gaps     |
| `4`   | 1rem (16px)    | Standard spacing |
| `5`   | 1.25rem (20px) | Medium spacing   |
| `6`   | 1.5rem (24px)  | Large spacing    |
| `8`   | 2rem (32px)    | Section spacing  |
| `12`  | 3rem (48px)    | Major spacing    |

### Common Patterns

```tsx
// Padding
className = "p-4"; // All sides
className = "px-5 py-4"; // Horizontal, vertical
className = "pt-6"; // Top only

// Margins
className = "mb-5"; // Bottom margin
className = "mt-8"; // Top margin
className = "mx-auto"; // Horizontal center

// Gaps (flexbox/grid)
className = "gap-2"; // Small gap
className = "gap-4"; // Standard gap
className = "gap-8"; // Large gap
```

---

## Border Radius

Write Nuton uses a base radius of `0.75rem` (12px) with calculated variants:

| Token         | Value                              | Usage             |
| ------------- | ---------------------------------- | ----------------- |
| `--radius`    | `0.75rem` (12px)                   | Base radius       |
| `--radius-sm` | `calc(var(--radius) - 4px)` = 8px  | Small elements    |
| `--radius-md` | `calc(var(--radius) - 2px)` = 10px | Medium elements   |
| `--radius-lg` | `0.75rem` (12px)                   | Standard elements |
| `--radius-xl` | `calc(var(--radius) + 4px)` = 16px | Large elements    |

### Common Patterns

```tsx
// Standard rounded corners
className = "rounded-md"; // 8px (most UI elements)
className = "rounded-lg"; // 12px (cards, larger elements)
className = "rounded-xl"; // 16px (large cards)
className = "rounded-full"; // Fully rounded (pills, icons)
className = "rounded-3xl"; // Extra rounded (special cases)
className = "rounded-4xl"; // Very rounded (buttons, inputs)
```

---

## Components

### Button

**Variants:**

- `default` - Primary action (black/white)
- `destructive` - Delete/danger actions (red)
- `outline` - Secondary action with border
- `secondary` - Subtle secondary action
- `ghost` - Minimal, hover-only background
- `link` - Text link style

**Sizes:**

- `default` - `h-9 px-4 py-2`
- `sm` - `h-8 px-3`
- `lg` - `h-10 px-6`
- `icon` - `size-9` (square)
- `icon-sm` - `size-8`
- `icon-lg` - `size-10`

**Example:**

```tsx
<Button variant="default" size="default">
  Submit
</Button>
```

### Input / Textarea

**Styling:**

- Background: `bg-transparent` or `bg-card`
- Border: `border border-border`
- Padding: `px-5 py-4` (inputs), `px-5 py-3` (textarea)
- Focus: `focus:outline-none focus:ring-1 focus:ring-ring`
- Placeholder: `placeholder:text-muted-foreground`

**Example:**

```tsx
<input
  className="w-full bg-transparent px-5 py-4 border border-border rounded-md
             text-foreground placeholder:text-muted-foreground
             focus:outline-none focus:ring-1 focus:ring-ring"
/>
```

### Dropdown Menu

**Styling:**

- Background: `bg-white` (light) / `bg-black` (dark)
- Border: `border-[#E5E5E5]` (light) / `border-white` (dark)
- Items: `text-[#0B0B0B]` (light) / `text-white` (dark)
- Focus: `focus:bg-black focus:text-white` (light) / `focus:bg-white focus:text-black` (dark)

**Note:** Dropdown menu uses hardcoded colors. Consider migrating to semantic tokens.

### Card

**Styling:**

- Background: `bg-card`
- Border: `border border-border`
- Padding: `p-6` (standard)
- Radius: `rounded-lg` or `rounded-xl`

**Example:**

```tsx
<div className="bg-card border border-border rounded-lg p-6">Card content</div>
```

---

## Design Patterns

### Rounded Pills

Many UI elements use fully rounded pills (`rounded-full`):

```tsx
// Button pills
className = "px-4 py-2 rounded-full";

// Input pills
className = "px-5 py-4 rounded-full";
```

### Border Transitions

Interactive elements use smooth border color transitions:

```tsx
className =
  "border-border hover:border-foreground/50 transition-all duration-200";
```

### Focus States

All interactive elements should have visible focus states:

```tsx
className =
  "focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1";
```

### Hover States

Buttons and interactive elements use opacity-based hover:

```tsx
className = "hover:bg-primary/90"; // 90% opacity
className = "hover:bg-accent/80"; // 80% opacity
className = "hover:text-foreground/80"; // Text opacity
```

### Disabled States

Disabled elements use reduced opacity:

```tsx
className = "disabled:opacity-50 disabled:pointer-events-none";
```

---

## Dark Mode

Write Nuton supports dark mode via the `.dark` class on the root element. All color tokens automatically adapt.

### Implementation

Dark mode is handled by:

1. CSS custom properties that change based on `.dark` class
2. Tailwind's `dark:` variant for component-specific overrides

### Usage

```tsx
// Automatic (uses CSS variables)
className = "bg-background text-foreground";

// Manual override
className = "bg-white dark:bg-black";
className = "text-black dark:text-white";
```

### Best Practices

1. **Prefer semantic tokens** - They automatically adapt to dark mode
2. **Use `dark:` sparingly** - Only when you need component-specific overrides
3. **Test both themes** - Ensure contrast and readability in both modes
4. **Consistent patterns** - Use the same hover/focus patterns in both themes

---

## Component Variants Reference

### Button Variants

| Variant       | Light Theme                   | Dark Theme                    |
| ------------- | ----------------------------- | ----------------------------- |
| `default`     | Black bg, white text          | White bg, black text          |
| `destructive` | Red bg, white text            | Dark red bg, light red text   |
| `outline`     | White bg, black border        | Black bg, white border        |
| `secondary`   | Light gray bg                 | Dark gray bg                  |
| `ghost`       | Transparent, hover accent     | Transparent, hover accent     |
| `link`        | Primary color text, underline | Primary color text, underline |

### Input States

| State    | Styling                            |
| -------- | ---------------------------------- |
| Default  | Transparent bg, border             |
| Focus    | Ring around border                 |
| Disabled | Reduced opacity, no pointer events |
| Error    | Red border, red ring               |

---

## Quick Reference

### Common Color Classes

```tsx
// Backgrounds
bg - background; // Main background
bg - card; // Card background
bg - muted; // Muted background
bg - accent; // Accent background
bg - primary; // Primary background
bg - destructive; // Error background

// Text
text - foreground; // Primary text
text - muted - foreground; // Muted text
text - accent; // Accent text
text - destructive; // Error text

// Borders
border - border; // Standard border
border - accent; // Accent border
border - destructive; // Error border
```

### Common Spacing Patterns

```tsx
// Container padding
p-4, p-6, p-8

// Input padding
px-5 py-4

// Button padding
px-4 py-2

// Gaps
gap-2, gap-3, gap-4
```

### Common Radius Patterns

```tsx
rounded-md      // Standard (8px)
rounded-lg      // Large (12px)
rounded-full    // Pills
rounded-3xl     // Extra rounded
```

---

## Migration Notes

### Hardcoded Colors to Migrate

The following components still use hardcoded hex colors and should be migrated to semantic tokens:

1. **Dropdown Menu** (`app/components/ui/dropdown-menu.tsx`)

   - `#0B0B0B` → `text-foreground`
   - `#6B6B6B` → `text-muted-foreground`
   - `#E5E5E5` → `border-border`

2. **Options Panel** (`app/components/landing/options-panel.tsx`)
   - Some hardcoded colors in button styles

### Future Improvements

1. Create a design tokens file for easier reference
2. Migrate all hardcoded colors to semantic tokens
3. Document animation/transition patterns
4. Add component usage examples
5. Create Storybook or similar component library

---

**Last Updated:** January 2025
**Version:** 1.0.0
