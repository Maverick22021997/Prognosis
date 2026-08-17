import type { ReactNode } from "react";

type BadgeVariant =
  | "neutral"
  | "accent"
  | "success"
  | "danger"
  | "warning";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral:
    "border-[var(--border)] bg-white/[0.04] text-[var(--foreground-muted)]",

  accent:
    "border-[rgba(184,255,90,0.2)] bg-[rgba(184,255,90,0.1)] text-[var(--accent)]",

  success:
    "border-[rgba(89,217,142,0.2)] bg-[rgba(89,217,142,0.1)] text-[var(--success)]",

  danger:
    "border-[rgba(255,107,107,0.2)] bg-[rgba(255,107,107,0.1)] text-[var(--danger)]",

  warning:
    "border-[rgba(244,201,93,0.2)] bg-[rgba(244,201,93,0.1)] text-[var(--warning)]",
};

export default function Badge({
  children,
  variant = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex min-h-7 items-center rounded-full border px-2.5 text-xs font-semibold",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}