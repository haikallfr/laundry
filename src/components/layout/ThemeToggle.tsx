"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export function ThemeToggle({ onChange }: { onChange?: (isDark: boolean) => void }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("laundry-theme", nextDark ? "dark" : "light");
    setIsDark(nextDark);
    onChange?.(nextDark);
  }

  const Icon = isDark ? Sun : Moon;

  return (
    <Button variant="secondary" size="sm" aria-label={isDark ? "Aktifkan light mode" : "Aktifkan dark mode"} onClick={toggleTheme}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}
