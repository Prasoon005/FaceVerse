"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Static label: the theme is unknown during SSR, so a theme-dependent label would mismatch on hydration. */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {/* Both icons render; CSS picks one so there is no hydration mismatch. */}
          <Sun className="hidden dark:block" aria-hidden />
          <Moon className="block dark:hidden" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  );
}
