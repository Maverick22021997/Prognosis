import CategoryTabs from "@/components/CategoryTabs";
import Hero from "@/components/Hero";
import HomeEventsList from "@/components/HomeEventsList";
import SeasonBar from "@/components/SeasonBar";
import SupportProjectCard from "@/components/SupportProjectCard";

import { supabase } from "@/lib/supabase";

import type { Event } from "@/types/event";

type HomePageProps = {
  searchParams?:
    | {
        category?: string | string[];
      }
    | Promise<{
        category?: string | string[];
      }>;
};

export default async function HomePage({
  searchParams,
}: HomePageProps) {
  const resolvedSearchParams =
    await searchParams;

  const categoryParameter =
    resolvedSearchParams?.category;

  const requestedCategory =
    typeof categoryParameter === "string"
      ? categoryParameter
      : "all";

  // =========================================================
  // CATEGORIES
  // =========================================================

  const {
    data: categories,
    error: categoriesError,
  } = await supabase
    .from("event_categories")
    .select("code, name, icon")
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true,
    });

  if (categoriesError) {
    console.error(
      "Ошибка загрузки категорий:",
      categoriesError
    );
  }

  const availableCategories =
    categories ?? [];

  const categoryExists =
    availableCategories.some(
      (category) =>
        category.code ===
        requestedCategory
    );

  const activeCategory =
    requestedCategory === "all" ||
    categoryExists
      ? requestedCategory
      : "all";

  // =========================================================
  // EVENTS
  // =========================================================

  let eventsQuery = supabase
    .from("v_events")
    .select("*")
    .eq("status", "active")
    .order("is_featured", {
      ascending: false,
    })
    .order(
      "prediction_close_at",
      {
        ascending: true,
      }
    );

  if (
    activeCategory !== "all"
  ) {
    eventsQuery =
      eventsQuery.eq(
        "category_code",
        activeCategory
      );
  }

  const {
    data: events,
    error: eventsError,
  } = await eventsQuery;

  if (eventsError) {
    console.error(
      "Ошибка загрузки событий:",
      eventsError
    );
  }

  const typedEvents =
    (events ?? []) as Event[];

  const activeCategoryName =
    activeCategory === "all"
      ? null
      : availableCategories.find(
          (category) =>
            category.code ===
            activeCategory
        )?.name ?? null;

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <>
      <Hero />

      <SeasonBar />

      {/* ================================================ */}
      {/* SIDE SUPPORT — VERY WIDE DESKTOP */}
      {/* ================================================ */}

      <aside className="fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 min-[1720px]:block">
        <SupportProjectCard />
      </aside>

      <aside className="fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 min-[1720px]:block">
        <SupportProjectCard />
      </aside>

      {/* ================================================ */}
      {/* EVENTS */}
      {/* ================================================ */}

      <main
        id="events"
        className="container-page scroll-mt-24 py-14 sm:py-16 lg:py-20"
      >
        <CategoryTabs
          categories={
            availableCategories
          }
          activeCategory={
            activeCategory
          }
        />

        <section className="mt-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)] sm:text-3xl">
                {activeCategoryName ??
                  "Все события"}
              </h1>

              <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                Выберите исход и
                проверьте точность
                своего прогноза
              </p>
            </div>

            <span className="text-sm text-[var(--foreground-subtle)]">
              {typedEvents.length}{" "}
              {getEventsLabel(
                typedEvents.length
              )}
            </span>
          </div>

          {typedEvents.length >
          0 ? (
            <HomeEventsList
              events={
                typedEvents
              }
            />
          ) : (
            <div className="surface-card px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-white/[0.03] text-xl">
                ◈
              </div>

              <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                В этой категории
                пока нет событий
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--foreground-muted)]">
                Новые события
                появятся здесь после
                публикации. Можно
                выбрать другую
                категорию или
                вернуться ко всем
                событиям.
              </p>
            </div>
          )}
        </section>

        {/* ================================================ */}
        {/* COMPACT SUPPORT */}
        {/* ================================================ */}

        <div className="mt-10 min-[1720px]:hidden">
          <SupportProjectCard
            compact
          />
        </div>
      </main>
    </>
  );
}

function getEventsLabel(
  count: number
): string {
  const lastTwoDigits =
    count % 100;

  const lastDigit =
    count % 10;

  if (
    lastTwoDigits >= 11 &&
    lastTwoDigits <= 14
  ) {
    return "событий";
  }

  if (lastDigit === 1) {
    return "событие";
  }

  if (
    lastDigit >= 2 &&
    lastDigit <= 4
  ) {
    return "события";
  }

  return "событий";
}