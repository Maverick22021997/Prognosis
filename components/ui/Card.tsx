import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
};

export default function Card({
  children,
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "surface-card",
        interactive
          ? "transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
          : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}