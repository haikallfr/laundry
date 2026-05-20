import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn, formatRupiah } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
  money?: boolean;
  detail?: string;
  href?: string;
};

const tones = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-700"
};

export function StatCard({ label, value, icon: Icon, tone = "blue", money, detail, href }: Props) {
  const content = (
    <div className={cn("min-h-[92px] rounded-lg border border-line bg-panel p-3 shadow-subtle sm:min-h-0 sm:p-4", href && "transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md")}>
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0">
          <p className="line-clamp-2 text-[10px] font-semibold uppercase leading-snug tracking-[0.06em] text-muted sm:text-xs sm:tracking-[0.08em]">{label}</p>
          <p className="mt-1.5 whitespace-nowrap text-[clamp(1rem,4.3vw,1.35rem)] font-bold leading-tight text-ink sm:mt-2 sm:text-2xl">{money && typeof value === "number" ? formatRupiah(value) : value}</p>
          {detail ? <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted sm:text-sm">{detail}</p> : null}
        </div>
        <div className={cn("shrink-0 rounded-lg p-1.5 sm:p-2", tones[tone])}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
        {content}
      </Link>
    );
  }

  return content;
}
