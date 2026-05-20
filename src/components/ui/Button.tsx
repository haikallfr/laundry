"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ className, variant = "primary", size = "md", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
        variant === "primary" && "border-brand-600 bg-brand-600 text-white hover:bg-brand-700",
        variant === "secondary" && "border-line bg-white text-ink hover:bg-slate-50",
        variant === "ghost" && "border-transparent bg-transparent text-muted hover:bg-slate-100 hover:text-ink",
        variant === "danger" && "border-red-600 bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}
