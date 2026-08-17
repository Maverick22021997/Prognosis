"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase-browser";

import AdminSelect from "@/components/AdminSelect";

type EventStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "closed"
  | "resolving"
  | "resolved"
  | "cancelled"
  | "void";

type EventCategory = {
  id: number;
  code: string;
  name: string;
  icon: string | null;
};

type StaffRole =
  | "admin"
  | "moderator";

type StaffUser = {
  user_id: string;
  role: StaffRole;
};

type AdminEvent = {
  id: number;
  season_id: number;
  category_id: number;

  title: string;
  slug: string;

  description: string | null;

  source_name: string | null;
  source_url: string | null;

  resolution_rule: string;

  publish_at: string;
  prediction_close_at: string;
  expected_resolution_at: string | null;

  resolved_at: string | null;

  status: EventStatus;

  result:
    | "yes"
    | "no"
    | null;

  cancel_reason:
    string | null;

  is_featured: boolean;

  predictions_count: number;
  volume_gp: number;

  created_at: string;
  updated_at: string;
};

type StatusFilter =
  | "all"
  | EventStatus;

export default function AdminPage() {
  const router =
    useRouter();

  const [
    events,
    setEvents,
  ] =
    useState<AdminEvent[]>(
      []
    );

  const [
    categories,
    setCategories,
  ] =
    useState<
      EventCategory[]
    >([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    staffRole,
    setStaffRole,
  ] =
    useState<StaffRole | null>(
      null
    );

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "all"
    );

  // =========================================================
  // LOAD ADMIN
  // =========================================================

  useEffect(() => {
    let cancelled =
      false;

    const supabase =
      createClient();

    async function loadAdmin() {
      setIsLoading(
        true
      );

      setError("");

      try {
        // ===================================================
        // USER
        // ===================================================

        const {
          data: {
            user,
          },
          error:
            userError,
        } =
          await supabase.auth.getUser();

        if (
          cancelled
        ) {
          return;
        }

        if (
          userError ||
          !user
        ) {
          router.replace(
            "/login"
          );

          return;
        }

        // ===================================================
        // STAFF CHECK
        // ===================================================

        const {
          data:
            staffData,
          error:
            staffError,
        } =
          await supabase
            .from(
              "staff_users"
            )
            .select(
              `
                user_id,
                role
              `
            )
            .eq(
              "user_id",
              user.id
            )
            .maybeSingle();

        if (
          cancelled
        ) {
          return;
        }

        if (
          staffError
        ) {
          console.error(
            "ADMIN: staff check error",
            staffError
          );

          setError(
            `Не удалось проверить права администратора: ${staffError.message}`
          );

          setIsLoading(
            false
          );

          return;
        }

        const staffRow =
          staffData as
            | StaffUser
            | null;

        if (
          !staffRow ||
          ![
            "admin",
            "moderator",
          ].includes(
            staffRow.role
          )
        ) {
          setStaffRole(
            null
          );

          setIsLoading(
            false
          );

          return;
        }

        setStaffRole(
          staffRow.role
        );

        // ===================================================
        // CATEGORIES
        // ===================================================

        const {
          data:
            categoriesData,
          error:
            categoriesError,
        } =
          await supabase
            .from(
              "event_categories"
            )
            .select(
              `
                id,
                code,
                name,
                icon
              `
            )
            .order(
              "sort_order",
              {
                ascending:
                  true,
              }
            );

        if (
          cancelled
        ) {
          return;
        }

        if (
          categoriesError
        ) {
          console.error(
            "ADMIN: categories loading error",
            categoriesError
          );

          setCategories(
            []
          );
        } else {
          setCategories(
            (
              categoriesData ??
              []
            ) as EventCategory[]
          );
        }

        // ===================================================
        // EVENTS
        // ===================================================

        const {
          data:
            eventsData,
          error:
            eventsError,
        } =
          await supabase
            .from(
              "events"
            )
            .select(
              `
                id,
                season_id,
                category_id,
                title,
                slug,
                description,
                source_name,
                source_url,
                resolution_rule,
                publish_at,
                prediction_close_at,
                expected_resolution_at,
                resolved_at,
                status,
                result,
                cancel_reason,
                is_featured,
                predictions_count,
                volume_gp,
                created_at,
                updated_at
              `
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            );

        if (
          cancelled
        ) {
          return;
        }

        if (
          eventsError
        ) {
          console.error(
            "ADMIN: events loading error",
            eventsError
          );

          setError(
            `Не удалось загрузить события: ${eventsError.message}`
          );

          setIsLoading(
            false
          );

          return;
        }

        setEvents(
          (
            eventsData ??
            []
          ) as AdminEvent[]
        );

        setIsLoading(
          false
        );
      } catch (
        unexpectedError
      ) {
        console.error(
          "ADMIN: unexpected error",
          unexpectedError
        );

        if (
          cancelled
        ) {
          return;
        }

        setError(
          "Произошла ошибка при загрузке панели управления."
        );

        setIsLoading(
          false
        );
      }
    }

    void loadAdmin();

    return () => {
      cancelled =
        true;
    };
  }, [
    router,
  ]);

  // =========================================================
  // PERMISSIONS
  // =========================================================

  const isStaff =
    staffRole ===
      "admin" ||
    staffRole ===
      "moderator";

  const isAdmin =
    staffRole ===
    "admin";

  // =========================================================
  // CATEGORY MAP
  // =========================================================

  const categoryMap =
    useMemo(
      () =>
        new Map(
          categories.map(
            (
              category
            ) => [
              category.id,
              category,
            ]
          )
        ),
      [
        categories,
      ]
    );

  // =========================================================
  // FILTER
  // =========================================================

  const filteredEvents =
    useMemo(
      () => {
        const normalizedSearch =
          search
            .trim()
            .toLowerCase();

        return events.filter(
          (
            event
          ) => {
            if (
              statusFilter !==
                "all" &&
              event.status !==
                statusFilter
            ) {
              return false;
            }

            if (
              !normalizedSearch
            ) {
              return true;
            }

            const category =
              categoryMap.get(
                event.category_id
              );

            return (
              event.title
                .toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              event.slug
                .toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              category?.name
                .toLowerCase()
                .includes(
                  normalizedSearch
                ) === true
            );
          }
        );
      },
      [
        events,
        search,
        statusFilter,
        categoryMap,
      ]
    );

  // =========================================================
  // COUNTERS
  // =========================================================

  const draftCount =
    events.filter(
      (
        event
      ) =>
        event.status ===
        "draft"
    ).length;

  const activeCount =
    events.filter(
      (
        event
      ) =>
        event.status ===
          "active" ||
        event.status ===
          "scheduled"
    ).length;

  const waitingResolutionCount =
    events.filter(
      (
        event
      ) =>
        event.status ===
        "closed"
    ).length;

  // =========================================================
  // LOADING
  // =========================================================

  if (
    isLoading
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-white/40">
            Загрузка панели управления...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // NOT STAFF
  // =========================================================

  if (
    !isStaff
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-xl text-white/40">
              ⛔
            </div>

            <h1 className="mt-5 text-xl font-semibold text-white">
              Доступ ограничен
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/40">
              Эта страница доступна только сотрудникам prognosis.io.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
            >
              На главную
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-visible">
      <div
        className="pointer-events-none absolute left-1/2 top-[-420px] h-[850px] w-[1000px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.06] blur-[170px]"
        aria-hidden="true"
      />

      <div className="container-page relative py-10 sm:py-14">
        <div className="mx-auto max-w-7xl">

          {/* HEADER */}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8f9aff]">
                  Admin
                </p>

                <StaffRoleBadge
                  role={
                    staffRole
                  }
                />
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
                Управление событиями
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
                Создание, публикация, закрытие и определение результатов событий prognosis.io.
              </p>
            </div>

            {/* ADMIN NAVIGATION */}

            <div className="flex flex-wrap gap-3">

              {/* USERS — ADMIN ONLY */}

              {isAdmin && (
                <Link
                  href="/admin/users"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Пользователи
                </Link>
              )}

              {/* SEASONS — ADMIN ONLY */}

              {isAdmin && (
                <Link
                  href="/admin/seasons"
                  className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Сезоны
                </Link>
              )}

              {/* CREATE EVENT — ADMIN + MODERATOR */}

              <Link
                href="/admin/events/new"
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#7383ff]"
              >
                + Создать событие
              </Link>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
              {
                error
              }
            </div>
          )}

          {/* STATS */}

          <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Всего событий"
              value={
                events.length
              }
            />

            <StatCard
              label="Черновики"
              value={
                draftCount
              }
            />

            <StatCard
              label="Активные"
              value={
                activeCount
              }
            />

            <StatCard
              label="Ждут результата"
              value={
                waitingResolutionCount
              }
            />
          </section>

          {/* FILTERS */}

          <section className="relative z-20 mt-6 overflow-visible rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Поиск по названию, slug или категории..."
                className="min-h-12 flex-1 rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#6577ff]/50"
              />

              <div className="lg:w-[260px]">
                <AdminSelect
                  value={
                    statusFilter
                  }
                  onChange={(
                    value
                  ) =>
                    setStatusFilter(
                      value as StatusFilter
                    )
                  }
                  options={[
                    {
                      value:
                        "all",
                      label:
                        "Все статусы",
                    },
                    {
                      value:
                        "draft",
                      label:
                        "Черновик",
                    },
                    {
                      value:
                        "scheduled",
                      label:
                        "Запланировано",
                    },
                    {
                      value:
                        "active",
                      label:
                        "Активно",
                    },
                    {
                      value:
                        "closed",
                      label:
                        "Закрыто",
                    },
                    {
                      value:
                        "resolving",
                      label:
                        "Определяется",
                    },
                    {
                      value:
                        "resolved",
                      label:
                        "Завершено",
                    },
                    {
                      value:
                        "cancelled",
                      label:
                        "Отменено",
                    },
                    {
                      value:
                        "void",
                      label:
                        "Аннулировано",
                    },
                  ]}
                />
              </div>
            </div>
          </section>

          {/* EVENTS */}

          <section className="relative z-10 mt-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  События
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  Показано{" "}
                  {
                    filteredEvents.length
                  }{" "}
                  из{" "}
                  {
                    events.length
                  }
                </p>
              </div>
            </div>

            {filteredEvents.length >
            0 ? (
              <div>
                {filteredEvents.map(
                  (
                    event
                  ) => (
                    <AdminEventRow
                      key={
                        event.id
                      }
                      event={
                        event
                      }
                      category={
                        categoryMap.get(
                          event.category_id
                        ) ??
                        null
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div className="px-6 py-16 text-center">
                <p className="font-medium text-white">
                  События не найдены
                </p>

                <p className="mt-2 text-sm text-white/35">
                  Измени фильтр или создай новое событие.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

// ===========================================================
// ADMIN EVENT ROW
// ===========================================================

function AdminEventRow({
  event,
  category,
}: {
  event:
    AdminEvent;

  category:
    EventCategory | null;
}) {
  return (
    <div className="border-b border-white/[0.055] p-5 last:border-b-0 sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={
                event.status
              }
            />

            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[11px] text-white/40">
              {category?.name ??
                `Категория #${event.category_id}`}
            </span>

            {event.is_featured && (
              <span className="rounded-full border border-[#6577ff]/20 bg-[#6577ff]/[0.07] px-2.5 py-1 text-[11px] font-medium text-[#aeb7ff]">
                Featured
              </span>
            )}

            <span className="text-[11px] text-white/20">
              ID #
              {
                event.id
              }
            </span>
          </div>

          <p className="mt-3 max-w-4xl text-base font-semibold leading-6 text-white">
            {
              event.title
            }
          </p>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/30">
            <span>
              Публикация:{" "}
              <strong className="font-medium text-white/45">
                {formatDateTime(
                  event.publish_at
                )}
              </strong>
            </span>

            <span>
              Закрытие:{" "}
              <strong className="font-medium text-white/45">
                {formatDateTime(
                  event.prediction_close_at
                )}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-6 xl:justify-end">
          <AdminMetric
            label="Прогнозов"
            value={
              event.predictions_count.toLocaleString(
                "ru-RU"
              )
            }
          />

          <AdminMetric
            label="Объём"
            value={`${event.volume_gp.toLocaleString(
              "ru-RU"
            )} GP`}
          />

          {event.result && (
            <AdminMetric
              label="Результат"
              value={
                event.result ===
                  "yes"
                  ? "Да"
                  : "Нет"
              }
            />
          )}

          <Link
            href={`/admin/events/${event.id}`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.035] px-4 text-sm font-medium text-white/70 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
          >
            Управление
          </Link>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
// STAFF ROLE BADGE
// ===========================================================

function StaffRoleBadge({
  role,
}: {
  role:
    StaffRole | null;
}) {
  if (
    role ===
    "admin"
  ) {
    return (
      <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200/70">
        Administrator
      </span>
    );
  }

  if (
    role ===
    "moderator"
  ) {
    return (
      <span className="rounded-full border border-[#6577ff]/15 bg-[#6577ff]/[0.05] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aeb7ff]/70">
        Moderator
      </span>
    );
  }

  return null;
}

// ===========================================================
// STATUS BADGE
// ===========================================================

function StatusBadge({
  status,
}: {
  status:
    EventStatus;
}) {
  const config:
    Record<
      EventStatus,
      {
        label: string;
        className: string;
      }
    > = {
    draft: {
      label:
        "Черновик",

      className:
        "border-white/[0.08] bg-white/[0.03] text-white/45",
    },

    scheduled: {
      label:
        "Запланировано",

      className:
        "border-blue-400/15 bg-blue-400/[0.06] text-blue-300",
    },

    active: {
      label:
        "Активно",

      className:
        "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300",
    },

    closed: {
      label:
        "Закрыто",

      className:
        "border-amber-300/15 bg-amber-300/[0.05] text-amber-200",
    },

    resolving: {
      label:
        "Определяется",

      className:
        "border-purple-400/15 bg-purple-400/[0.06] text-purple-300",
    },

    resolved: {
      label:
        "Завершено",

      className:
        "border-[#6577ff]/20 bg-[#6577ff]/[0.07] text-[#aeb7ff]",
    },

    cancelled: {
      label:
        "Отменено",

      className:
        "border-red-400/15 bg-red-400/[0.05] text-red-300",
    },

    void: {
      label:
        "Аннулировано",

      className:
        "border-red-400/15 bg-red-400/[0.05] text-red-300",
    },
  };

  const item =
    config[
      status
    ];

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${item.className}`}
    >
      {
        item.label
      }
    </span>
  );
}

// ===========================================================
// STAT CARD
// ===========================================================

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0f15]/80 p-5">
      <p className="text-xs text-white/30">
        {
          label
        }
      </p>

      <p className="mt-2 font-mono text-2xl font-semibold text-white">
        {
          value
        }
      </p>
    </div>
  );
}

// ===========================================================
// ADMIN METRIC
// ===========================================================

function AdminMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-white/25">
        {
          label
        }
      </p>

      <p className="mt-1 font-mono text-sm font-medium text-white/65">
        {
          value
        }
      </p>
    </div>
  );
}

// ===========================================================
// DATE
// ===========================================================

function formatDateTime(
  value:
    string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}