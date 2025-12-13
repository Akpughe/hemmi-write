"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

// Color swatch component
function ColorSwatch({
  name,
  token,
  value,
}: {
  name: string;
  token: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-24 w-full rounded-lg border border-border shadow-sm"
        style={{ backgroundColor: `var(--${token})` }}
      />
      <div className="space-y-1">
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-muted-foreground font-mono">{token}</div>
        <div className="text-xs text-muted-foreground font-mono">{value}</div>
      </div>
    </div>
  );
}

// Typography example component
function TypographyExample({
  className,
  label,
  children,
}: {
  className: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground font-mono">{label}</div>
      <div className={className}>{children}</div>
    </div>
  );
}

export default function StyleGuidePage() {
  const [inputValue, setInputValue] = useState("");
  const [textareaValue, setTextareaValue] = useState("");

  const lightColors = [
    { name: "Background", token: "background", value: "oklch(1 0 0)" },
    { name: "Foreground", token: "foreground", value: "oklch(0.1 0 0)" },
    { name: "Card", token: "card", value: "oklch(0.98 0 0)" },
    { name: "Primary", token: "primary", value: "oklch(0.1 0 0)" },
    { name: "Secondary", token: "secondary", value: "oklch(0.96 0 0)" },
    { name: "Muted", token: "muted", value: "oklch(0.96 0 0)" },
    { name: "Accent", token: "accent", value: "oklch(0.5 0.05 250)" },
    {
      name: "Destructive",
      token: "destructive",
      value: "oklch(0.577 0.245 27.325)",
    },
    { name: "Border", token: "border", value: "oklch(0.92 0 0)" },
  ];

  const darkColors = [
    { name: "Background", token: "background", value: "oklch(0.1 0 0)" },
    { name: "Foreground", token: "foreground", value: "oklch(0.95 0 0)" },
    { name: "Card", token: "card", value: "oklch(0.14 0 0)" },
    { name: "Primary", token: "primary", value: "oklch(0.95 0 0)" },
    { name: "Secondary", token: "secondary", value: "oklch(0.2 0 0)" },
    { name: "Muted", token: "muted", value: "oklch(0.18 0 0)" },
    { name: "Accent", token: "accent", value: "oklch(0.5 0.05 250)" },
    {
      name: "Destructive",
      token: "destructive",
      value: "oklch(0.396 0.141 25.723)",
    },
    { name: "Border", token: "border", value: "oklch(0.25 0 0)" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-fraunces">Style Guide</h1>
            <p className="text-sm text-muted-foreground">
              Write Nuton Design System
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Colors Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-fraunces mb-2">Colors</h2>
          <p className="text-muted-foreground mb-8">
            Semantic color tokens that automatically adapt to light and dark
            themes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {lightColors.map((color) => (
              <ColorSwatch key={color.token} {...color} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Color Usage</CardTitle>
              <CardDescription>
                Use Tailwind classes to apply colors. Colors automatically adapt
                to theme.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-background border border-border rounded-lg">
                  <code className="text-sm">bg-background</code>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg">
                  <code className="text-sm">bg-card</code>
                </div>
                <div className="p-4 bg-muted border border-border rounded-lg">
                  <code className="text-sm">bg-muted</code>
                </div>
                <div className="p-4 bg-accent text-accent-foreground border border-border rounded-lg">
                  <code className="text-sm">bg-accent</code>
                </div>
                <div className="p-4 bg-destructive text-destructive-foreground border border-border rounded-lg">
                  <code className="text-sm">bg-destructive</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Typography Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-fraunces mb-2">Typography</h2>
          <p className="text-muted-foreground mb-8">
            Font families, sizes, and weights used throughout the application.
          </p>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Font Families</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <TypographyExample
                  className="font-sans text-lg"
                  label="font-sans (Geist Sans)">
                  The quick brown fox jumps over the lazy dog
                </TypographyExample>
                <TypographyExample
                  className="font-fraunces text-lg"
                  label="font-fraunces (Fraunces)">
                  The quick brown fox jumps over the lazy dog
                </TypographyExample>
                <TypographyExample
                  className="font-dm-sans text-lg"
                  label="font-dm-sans (DM Sans)">
                  The quick brown fox jumps over the lazy dog
                </TypographyExample>
                <TypographyExample
                  className="font-mono text-lg"
                  label="font-mono (Geist Mono)">
                  The quick brown fox jumps over the lazy dog
                </TypographyExample>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Type Scale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TypographyExample className="text-xs" label="text-xs (12px)">
                  Small labels and captions
                </TypographyExample>
                <TypographyExample className="text-sm" label="text-sm (14px)">
                  Default UI text and buttons
                </TypographyExample>
                <TypographyExample
                  className="text-base"
                  label="text-base (16px)">
                  Body text and inputs
                </TypographyExample>
                <TypographyExample className="text-lg" label="text-lg (18px)">
                  Large body text
                </TypographyExample>
                <TypographyExample className="text-xl" label="text-xl (20px)">
                  Small headings
                </TypographyExample>
                <TypographyExample
                  className="text-2xl font-fraunces"
                  label="text-2xl (24px)">
                  Section headings
                </TypographyExample>
                <TypographyExample
                  className="text-3xl font-fraunces"
                  label="text-3xl (30px)">
                  Major headings
                </TypographyExample>
                <TypographyExample
                  className="text-4xl font-fraunces"
                  label="text-4xl (36px)">
                  Hero headings
                </TypographyExample>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Font Weights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TypographyExample
                  className="font-normal"
                  label="font-normal (400)">
                  Normal weight text
                </TypographyExample>
                <TypographyExample
                  className="font-medium"
                  label="font-medium (500)">
                  Medium weight text
                </TypographyExample>
                <TypographyExample
                  className="font-semibold"
                  label="font-semibold (600)">
                  Semibold weight text
                </TypographyExample>
                <TypographyExample
                  className="font-bold"
                  label="font-bold (700)">
                  Bold weight text
                </TypographyExample>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Buttons Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-fraunces mb-2">Buttons</h2>
          <p className="text-muted-foreground mb-8">
            Button variants and sizes for different use cases.
          </p>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button variant="default">Default</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sizes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon">🚀</Button>
                  <Button size="icon-sm">⭐</Button>
                  <Button size="icon-lg">💫</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>States</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button>Normal</Button>
                  <Button disabled>Disabled</Button>
                  <Button className="cursor-not-allowed opacity-50">
                    Custom Disabled
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Form Elements Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-fraunces mb-2">
            Form Elements
          </h2>
          <p className="text-muted-foreground mb-8">
            Input fields, textareas, and other form components.
          </p>

          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter text..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full bg-transparent px-5 py-4 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-dm-sans"
                />
                <div className="text-xs text-muted-foreground">
                  Standard input with focus ring
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Textarea</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  placeholder="Enter multiple lines..."
                  value={textareaValue}
                  onChange={(e) => setTextareaValue(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent px-5 py-4 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none font-dm-sans"
                />
                <div className="text-xs text-muted-foreground">
                  Textarea with same styling as input
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rounded Pills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="text"
                  placeholder="Rounded pill input..."
                  className="w-full bg-transparent px-5 py-4 border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-dm-sans"
                />
                <div className="text-xs text-muted-foreground">
                  Input with rounded-full for pill style
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Border Radius Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-fraunces mb-2">
            Border Radius
          </h2>
          <p className="text-muted-foreground mb-8">
            Different border radius values for various UI elements.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: "rounded-md", value: "8px", class: "rounded-md" },
              { name: "rounded-lg", value: "12px", class: "rounded-lg" },
              { name: "rounded-xl", value: "16px", class: "rounded-xl" },
              { name: "rounded-2xl", value: "16px", class: "rounded-2xl" },
              { name: "rounded-3xl", value: "24px", class: "rounded-3xl" },
              { name: "rounded-full", value: "100%", class: "rounded-full" },
            ].map((radius) => (
              <div key={radius.name} className="space-y-2">
                <div
                  className={cn(
                    "h-20 w-full bg-accent border border-border",
                    radius.class
                  )}
                />
                <div className="text-xs font-mono">{radius.name}</div>
                <div className="text-xs text-muted-foreground">
                  {radius.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Spacing Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-fraunces mb-2">Spacing</h2>
          <p className="text-muted-foreground mb-8">
            Spacing scale based on 4px base unit.
          </p>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {[0, 1, 2, 3, 4, 5, 6, 8, 12].map((scale) => {
                  const value = scale === 0 ? "0px" : `${scale * 4}px`;
                  const rem = scale === 0 ? "0" : `${scale * 0.25}rem`;
                  return (
                    <div key={scale} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-mono">{scale}</div>
                      <div className="flex-1">
                        <div
                          className="bg-accent h-8 border border-border"
                          style={{ width: value }}
                        />
                      </div>
                      <div className="w-24 text-xs text-muted-foreground font-mono text-right">
                        {rem}
                      </div>
                      <div className="w-16 text-xs text-muted-foreground font-mono text-right">
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cards Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-fraunces mb-2">Cards</h2>
          <p className="text-muted-foreground mb-8">
            Card component examples with different content.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Standard Card</CardTitle>
                <CardDescription>
                  A standard card with header and content sections.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This is the card content area. You can put any content here.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card with Action</CardTitle>
                <CardDescription>Card with a button action.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Action Button</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accent Card</CardTitle>
                <CardDescription>Card with accent styling.</CardDescription>
              </CardHeader>
              <CardContent className="bg-accent/10 rounded-lg p-4">
                <p className="text-sm">Content with accent background.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Interactive States Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold font-fraunces mb-2">
            Interactive States
          </h2>
          <p className="text-muted-foreground mb-8">
            Hover, focus, and disabled states for interactive elements.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Hover States</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full">Hover me</Button>
                <div className="p-4 border border-border rounded-lg hover:border-foreground/50 hover:bg-muted/50 transition-all duration-200 cursor-pointer">
                  Hoverable card
                </div>
                <a
                  href="#"
                  className="text-accent hover:text-accent/80 underline inline-block">
                  Hoverable link
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Focus States</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  type="text"
                  placeholder="Focus me..."
                  className="w-full bg-transparent px-5 py-4 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-dm-sans"
                />
                <Button className="w-full">Focus me (Tab)</Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Reference */}
        <section className="mb-16">
          <Card>
            <CardHeader>
              <CardTitle>Quick Reference</CardTitle>
              <CardDescription>
                Common patterns and classes for quick lookup.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Colors</h3>
                  <div className="space-y-2 text-sm font-mono">
                    <div>bg-background</div>
                    <div>bg-card</div>
                    <div>bg-muted</div>
                    <div>bg-accent</div>
                    <div>text-foreground</div>
                    <div>text-muted-foreground</div>
                    <div>border-border</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Common Patterns</h3>
                  <div className="space-y-2 text-sm font-mono">
                    <div>rounded-full (pills)</div>
                    <div>rounded-lg (cards)</div>
                    <div>px-4 py-2 (button)</div>
                    <div>px-5 py-4 (input)</div>
                    <div>gap-4 (spacing)</div>
                    <div>transition-all duration-200</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
