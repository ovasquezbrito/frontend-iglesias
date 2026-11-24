import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
  {
    variants: {
      variant: {
        default: "border-indigo-400/30 bg-indigo-500/20 text-indigo-200",
        emerald: "border-emerald-400/30 bg-emerald-500/20 text-emerald-200",
        amber: "border-amber-400/30 bg-amber-500/20 text-amber-200",
        rose: "border-rose-400/30 bg-rose-500/20 text-rose-200",
        red: "border-red-400/30 bg-red-500/20 text-red-200",
        slate: "border-white/15 bg-white/5 text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
