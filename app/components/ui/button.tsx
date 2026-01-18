import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button component with Apple/Airbnb-inspired design principles:
 * - Confident, solid colors (not washed out with opacity)
 * - Purposeful transitions (cubic-bezier for natural feel)
 * - Clear hierarchy between variants
 * - Tactile feedback (subtle scale on active)
 * - WCAG AA+ contrast in all states
 */
const buttonVariants = cva(
  [
    // Layout
    "inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0",
    // Typography
    "text-sm font-semibold",
    // Shape
    "rounded-xl",
    // Transitions - Apple-like cubic-bezier
    "transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
    // Tactile feedback
    "active:scale-[0.98]",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-50",
    // SVG handling
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    // Focus state - clean, accessible
    "outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    // Invalid state
    "aria-invalid:ring-destructive/30 aria-invalid:ring-2",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary - confident, inverted colors
        default:
          "bg-foreground text-background shadow-sm shadow-foreground/10 hover:bg-foreground/90",
        // Destructive - clear warning, accessible red
        destructive:
          "bg-destructive text-white shadow-sm shadow-destructive/20 hover:bg-destructive/90 focus-visible:ring-destructive/30",
        // Outline - subtle but clear border
        outline:
          "border border-border bg-background text-foreground hover:bg-muted hover:border-foreground/20",
        // Secondary - muted background, solid
        secondary:
          "bg-muted text-foreground hover:bg-muted/80",
        // Ghost - transparent, reveals on hover
        ghost:
          "text-foreground/70 hover:bg-muted hover:text-foreground",
        // Link - underline style
        link: "text-foreground underline-offset-4 hover:underline active:scale-100",
        // Soft - lighter version of default for secondary actions
        soft:
          "bg-foreground/10 text-foreground hover:bg-foreground/15",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-8 px-3.5 py-2 text-xs gap-1.5",
        lg: "h-12 px-6 py-3 text-base",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
