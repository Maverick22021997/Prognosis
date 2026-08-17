import Link from "next/link";

type Category = {
  code: string;
  name: string;
  icon: string | null;
};

type CategoryTabsProps = {
  categories: Category[];
  activeCategory?: string;
};

const categoryIcons: Record<string, string> = {
  sport: "⚽",
  economy: "₽",
  news: "▤",
  entertainment: "▶",
  world: "🌍",
};

function getCategoryHref(code: string): string {
  if (code === "all") {
    return "/";
  }

  return `/?category=${encodeURIComponent(code)}`;
}

export default function CategoryTabs({
  categories,
  activeCategory = "all",
}: CategoryTabsProps) {
  return (
    <nav
      aria-label="Категории событий"
      className="overflow-x-auto pb-2"
    >
      <div className="flex min-w-max items-center gap-3">
        <Link
          href={getCategoryHref("all")}
          aria-current={activeCategory === "all" ? "page" : undefined}
          className={[
            "focus-ring inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-medium transition",
            activeCategory === "all"
              ? "border-[rgba(184,255,90,0.38)] bg-[rgba(184,255,90,0.08)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(184,255,90,0.06)]"
              : "border-[var(--border)] bg-transparent text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:bg-white/[0.03] hover:text-[var(--foreground)]",
          ].join(" ")}
        >
          Все
        </Link>

        {categories.map((category) => {
          const isActive = activeCategory === category.code;
          const icon = categoryIcons[category.code] ?? "◈";

          return (
            <Link
              key={category.code}
              href={getCategoryHref(category.code)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium transition",
                isActive
                  ? "border-[rgba(184,255,90,0.38)] bg-[rgba(184,255,90,0.08)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(184,255,90,0.06)]"
                  : "border-[var(--border)] bg-transparent text-[var(--foreground-muted)] hover:border-[var(--border-strong)] hover:bg-white/[0.03] hover:text-[var(--foreground)]",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center text-sm"
              >
                {icon}
              </span>

              <span>{category.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}