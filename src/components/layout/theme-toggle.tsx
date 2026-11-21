"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useThemeTransition } from "@/lib/ui/theme-transition";

export function ThemeToggle() {
  const toggleTheme = useThemeTransition();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Static label: the theme is unknown during SSR, so a theme-dependent label would mismatch on hydration. */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={(e) => toggleTheme(e)}
        >
          {/* Both icons render; CSS picks one so there is no hydration mismatch. */}
          <Sun
            className="hidden transition-transform duration-500 dark:block dark:rotate-90"
            aria-hidden
          />
          <Moon className="block transition-transform duration-500 dark:hidden" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  );
}
