import { useEffect, useMemo, useState } from "react";
import { Moon, Sun, Laptop } from "lucide-react@0.487.0";
import { useTheme } from "next-themes@0.4.6";

import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const THEME_OPTIONS = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Laptop },
] as const;

type ThemeKey = (typeof THEME_OPTIONS)[number]["key"];

export function ModeToggle() {
  const { setTheme, theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = useMemo<ThemeKey>(() => {
    if (!mounted) return "system";
    const current = theme === "system" ? systemTheme : theme;
    if (current === "light" || current === "dark") {
      return current;
    }
    return "system";
  }, [mounted, theme, systemTheme]);

  const ActiveIcon = useMemo(() => {
    switch (activeTheme) {
      case "light":
        return Sun;
      case "dark":
        return Moon;
      default:
        return Laptop;
    }
  }, [activeTheme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Toggle theme"
          className="rounded-xl"
        >
          <ActiveIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="right" sideOffset={8} className="min-w-[8rem]">
        {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
          <DropdownMenuItem
            key={key}
            onClick={() => setTheme(key)}
            className={key === activeTheme ? "bg-accent/60" : undefined}
          >
            <Icon className="h-4 w-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
