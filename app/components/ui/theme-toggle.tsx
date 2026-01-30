"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center rounded-xl h-9 w-9 text-muted-foreground border border-muted/20 transition-all duration-200 hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}>
          <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="p-1.5 min-w-[120px] rounded-xl border-muted/20">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors focus:bg-muted/50 focus:text-foreground cursor-pointer">
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors focus:bg-muted/50 focus:text-foreground cursor-pointer">
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors focus:bg-muted/50 focus:text-foreground cursor-pointer">
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
