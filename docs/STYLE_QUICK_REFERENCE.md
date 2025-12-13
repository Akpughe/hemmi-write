# Style Guide Quick Reference

Quick lookup for common styling patterns in Write Nuton.

## Colors

### Backgrounds

```tsx
bg - background; // Main page background
bg - card; // Card/surface background
bg - muted; // Muted background (inputs, etc.)
bg - accent; // Accent color background
bg - primary; // Primary action background
bg - destructive; // Error/destructive background
```

### Text

```tsx
text - foreground; // Primary text color
text - muted - foreground; // Muted text (placeholders, hints)
text - accent; // Accent text color
text - destructive; // Error text
```

### Borders

```tsx
border - border; // Standard border
border - accent; // Accent border
border - destructive; // Error border
```

## Typography

### Fonts

```tsx
font - sans; // Geist Sans (default UI)
font - fraunces; // Fraunces (headings)
font - dm - sans; // DM Sans (inputs, forms)
font - mono; // Geist Mono (code)
```

### Sizes

```tsx
text-xs              // 12px - Small labels
text-sm              // 14px - Default UI text
text-base            // 16px - Body text
text-lg              // 18px - Large body
text-xl              // 20px - Small headings
text-2xl             // 24px - Section headings
text-3xl             // 30px - Major headings
text-4xl             // 36px - Hero headings
```

### Weights

```tsx
font - normal; // 400 - Default
font - medium; // 500 - UI labels, buttons
font - semibold; // 600 - Emphasized
font - bold; // 700 - Headings
```

## Spacing

### Padding

```tsx
p-4                  // 16px all sides
px-5 py-4            // Horizontal 20px, vertical 16px
px-4 py-2            // Button padding
```

### Margin

```tsx
mb - 5; // Bottom margin 20px
mt - 8; // Top margin 32px
mx - auto; // Horizontal center
```

### Gaps

```tsx
gap - 2; // 8px gap
gap - 3; // 12px gap
gap - 4; // 16px gap
```

## Border Radius

```tsx
rounded-md           // 8px - Standard
rounded-lg           // 12px - Cards
rounded-xl           // 16px - Large cards
rounded-full         // Pills, icons
rounded-3xl          // Extra rounded
rounded-4xl          // Very rounded (inputs)
```

## Components

### Button

```tsx
<Button variant="default" size="default">
  Click me
</Button>

// Variants: default, destructive, outline, secondary, ghost, link
// Sizes: default, sm, lg, icon, icon-sm, icon-lg
```

### Input

```tsx
<input
  className="w-full bg-transparent px-5 py-4 border border-border 
             rounded-md text-foreground placeholder:text-muted-foreground
             focus:outline-none focus:ring-1 focus:ring-ring"
/>
```

### Card

```tsx
<div className="bg-card border border-border rounded-lg p-6">Content</div>
```

## Common Patterns

### Rounded Pills

```tsx
className = "px-4 py-2 rounded-full";
```

### Hover States

```tsx
className = "hover:bg-primary/90";
className = "hover:text-foreground/80";
className = "hover:border-foreground/50";
```

### Focus States

```tsx
className =
  "focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1";
```

### Transitions

```tsx
className = "transition-all duration-200";
```

### Disabled States

```tsx
className = "disabled:opacity-50 disabled:pointer-events-none";
```

## Dark Mode

Colors automatically adapt via CSS variables. Use `dark:` only for specific overrides:

```tsx
className = "bg-white dark:bg-black";
className = "text-black dark:text-white";
```

---

For full documentation, see [STYLE_GUIDE.md](./STYLE_GUIDE.md)
