import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "yes" | "no";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]",

  secondary:
    "border border-[var(--border-strong)] bg-[var(--background-soft)] text-[var(--foreground)] hover:border-[var(--border-accent)] hover:bg-[var(--background-hover)]",

  ghost:
    "bg-transparent text-[var(--foreground-muted)] hover:bg-white/[0.05] hover:text-[var(--foreground)]",

  yes:
    "border border-[rgba(89,217,142,0.34)] bg-[linear-gradient(135deg,rgba(89,217,142,0.13),rgba(89,217,142,0.06))] text-[#8be6ae] hover:border-[rgba(89,217,142,0.5)] hover:bg-[var(--yes-soft)]",

  no:
    "border border-[rgba(255,123,123,0.34)] bg-[linear-gradient(135deg,rgba(255,123,123,0.12),rgba(255,123,123,0.05))] text-[#ff9b9b] hover:border-[rgba(255,123,123,0.5)] hover:bg-[var(--no-soft)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-9 rounded-[10px] px-3 text-sm",
  md: "min-h-11 rounded-[12px] px-4 text-sm",
  lg: "min-h-13 rounded-[14px] px-5 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "focus-ring inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 active:translate-y-px",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}