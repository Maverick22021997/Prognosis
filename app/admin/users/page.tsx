"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase-browser";

type AdminUser = {
  user_id: string;
  username: string;
  registered_at: string;
  age_confirmed: boolean;

  staff_role: string | null;

  season_id: number | null;
  season_title: string | null;

  balance_gp: number | null;
  predictions_count: number;
  emergency_refill_used: boolean;

  accuracy: number;
  resolved_events_count: number;
  successful_events_count: number;

  total_count: number;
};

const PAGE_SIZE =
  50;

export default function AdminUsersPage() {
  const router =
    useRouter();

  const [
    users,
    setUsers,
  ] =
    useState<AdminUser[]>(
      []
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] =
    useState("");

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    totalCount,
    setTotalCount,
  ] =
    useState(0);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isAdmin,
    setIsAdmin,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  // =========================================================
  // INITIAL ACCESS CHECK
  // =========================================================

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    const supabase =
      createClient();

    setIsLoading(
      true
    );

    setError("");

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      router.replace(
        "/login"
      );

      return;
    }

    const {
      data:
        staff,
      error:
        staffError,
    } =
      await supabase
        .from(
          "staff_users"
        )
        .select(
          "role"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (
      staffError
    ) {
      console.error(
        "Admin users access:",
        staffError
      );

      setError(
        staffError.message
      );

      setIsLoading(
        false
      );

      return;
    }

    if (
      staff?.role !==
      "admin"
    ) {
      setIsAdmin(
        false
      );

      setIsLoading(
        false
      );

      return;
    }

    setIsAdmin(
      true
    );

    await loadUsers(
      "",
      1
    );
  }

  // =========================================================
  // LOAD USERS
  // =========================================================

  async function loadUsers(
    query:
      string,
    nextPage:
      number
  ) {
    const supabase =
      createClient();

    setIsLoading(
      true
    );

    setError("");

    try {
      const offset =
        (
          nextPage -
          1
        ) *
        PAGE_SIZE;

      const {
        data,
        error:
          usersError,
      } =
        await supabase.rpc(
          "admin_get_users",
          {
            p_search:
              query.trim() ||
              null,

            p_limit:
              PAGE_SIZE,

            p_offset:
              offset,
          }
        );

      if (
        usersError
      ) {
        console.error(
          "Admin users load:",
          usersError
        );

        setError(
          formatRpcError(
            usersError
          )
        );

        return;
      }

      const rows =
        (
          data ??
          []
        ) as AdminUser[];

      setUsers(
        rows
      );

      setTotalCount(
        rows.length >
          0
          ? Number(
              rows[
                0
              ].total_count
            )
          : 0
      );

      setAppliedSearch(
        query
      );

      setPage(
        nextPage
      );
    } finally {
      setIsLoading(
        false
      );
    }
  }

  // =========================================================
  // SEARCH
  // =========================================================

  async function handleSearch(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await loadUsers(
      search,
      1
    );
  }

  async function handleClearSearch() {
    setSearch("");

    await loadUsers(
      "",
      1
    );
  }

  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalCount /
          PAGE_SIZE
      )
    );

  async function goToPage(
    nextPage:
      number
  ) {
    if (
      nextPage <
        1 ||
      nextPage >
        totalPages ||
      nextPage ===
        page
    ) {
      return;
    }

    await loadUsers(
      appliedSearch,
      nextPage
    );

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (
    isLoading &&
    !isAdmin
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <p className="text-sm text-white/40">
          Загрузка пользователей...
        </p>
      </main>
    );
  }

  // =========================================================
  // ACCESS DENIED
  // =========================================================

  if (
    !isAdmin
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-8 text-center">
          <h1 className="text-xl font-semibold text-white">
            Доступ ограничен
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/40">
            Управление пользователями доступно только администратору.
          </p>

          <Link
            href="/admin"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            Вернуться
          </Link>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="relative min-h-[calc(100vh-72px)]">
      <div
        className="pointer-events-none absolute left-1/2 top-[-430px] h-[900px] w-[1050px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.06] blur-[180px]"
        aria-hidden="true"
      />

      <div className="container-page relative py-10 sm:py-14">
        <div className="mx-auto max-w-7xl">

          {/* BACK */}

          <Link
            href="/admin"
            className="text-sm text-white/35 transition hover:text-white/70"
          >
            ← Админ-панель
          </Link>

          {/* HEADER */}

          <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8f9aff]">
                Admin
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
                Пользователи
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
                Пользователи prognosis.io и их показатели в текущем сезоне.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-white/25">
                Всего найдено
              </p>

              <p className="mt-1 font-mono text-2xl font-semibold text-white">
                {totalCount.toLocaleString(
                  "ru-RU"
                )}
              </p>
            </div>
          </div>

          {/* SEARCH */}

          <form
            onSubmit={
              handleSearch
            }
            className="mt-8 flex flex-col gap-3 rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-5 sm:flex-row"
          >
            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Поиск по username..."
              className="min-h-11 flex-1 rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#6577ff]/55"
            />

            <button
              type="submit"
              disabled={
                isLoading
              }
              className="min-h-11 rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white transition hover:bg-[#7383ff] disabled:opacity-40"
            >
              Найти
            </button>

            {appliedSearch && (
              <button
                type="button"
                disabled={
                  isLoading
                }
                onClick={
                  handleClearSearch
                }
                className="min-h-11 rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 text-sm font-medium text-white/60 transition hover:bg-white/[0.06] hover:text-white"
              >
                Сбросить
              </button>
            )}
          </form>

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* TABLE */}

          <section className="mt-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0f15]">

            {/* DESKTOP HEADER */}

            <div className="hidden grid-cols-[minmax(160px,1.4fr)_120px_150px_110px_110px_110px_120px] gap-4 border-b border-white/[0.07] px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/25 xl:grid">
              <div>
                Пользователь
              </div>

              <div>
                Роль
              </div>

              <div>
                Регистрация
              </div>

              <div className="text-right">
                Баланс
              </div>

              <div className="text-right">
                Прогнозы
              </div>

              <div className="text-right">
                События
              </div>

              <div className="text-right">
                Точность
              </div>
            </div>

            {users.length >
            0 ? (
              users.map(
                (
                  item
                ) => (
                  <UserRow
                    key={
                      item.user_id
                    }
                    user={
                      item
                    }
                  />
                )
              )
            ) : (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-white/35">
                  Пользователи не найдены.
                </p>
              </div>
            )}
          </section>

          {/* PAGINATION */}

          {totalPages >
            1 && (
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                disabled={
                  page <=
                    1 ||
                  isLoading
                }
                onClick={() =>
                  void goToPage(
                    page -
                      1
                  )
                }
                className="min-h-10 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Назад
              </button>

              <p className="text-sm text-white/35">
                Страница{" "}
                <span className="font-mono text-white/60">
                  {page}
                </span>
                {" / "}
                <span className="font-mono text-white/60">
                  {totalPages}
                </span>
              </p>

              <button
                type="button"
                disabled={
                  page >=
                    totalPages ||
                  isLoading
                }
                onClick={() =>
                  void goToPage(
                    page +
                      1
                  )
                }
                className="min-h-10 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                Далее →
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ===========================================================
// USER ROW
// ===========================================================

function UserRow({
  user,
}: {
  user:
    AdminUser;
}) {
  return (
    <div className="border-b border-white/[0.055] px-5 py-5 last:border-b-0 sm:px-6">

      {/* DESKTOP */}

      <div className="hidden grid-cols-[minmax(160px,1.4fr)_120px_150px_110px_110px_110px_120px] items-center gap-4 xl:grid">
        <div className="min-w-0">
          <Link
  href={`/admin/users/${user.user_id}`}
  className="block truncate text-sm font-medium text-white/80 transition hover:text-[#aeb7ff]"
>
  {user.username}
</Link>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/20">
              {shortId(
                user.user_id
              )}
            </span>

            {!user.age_confirmed && (
              <span className="text-[10px] text-amber-200/60">
                возраст не подтверждён
              </span>
            )}

            {user.emergency_refill_used && (
              <span className="text-[10px] text-[#8f9aff]/65">
                emergency GP использован
              </span>
            )}
          </div>
        </div>

        <div>
          <StaffBadge
            role={
              user.staff_role
            }
          />
        </div>

        <div className="text-xs text-white/40">
          {formatDate(
            user.registered_at
          )}
        </div>

        <div className="text-right font-mono text-sm text-white/75">
          {user.balance_gp !==
          null
            ? `${user.balance_gp.toLocaleString(
                "ru-RU"
              )} GP`
            : "—"}
        </div>

        <div className="text-right font-mono text-sm text-white/45">
          {user.predictions_count}
        </div>

        <div className="text-right font-mono text-sm text-white/45">
          {user.resolved_events_count}
        </div>

        <div className="text-right text-sm text-white/55">
          {formatAccuracy(
            user.accuracy
          )}
        </div>
      </div>

      {/* MOBILE / TABLET */}

      <div className="xl:hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
  href={`/admin/users/${user.user_id}`}
  className="block truncate text-sm font-semibold text-white/80 transition hover:text-[#aeb7ff]"
>
  {user.username}
</Link>

            <p className="mt-1 text-[11px] text-white/20">
              {shortId(
                user.user_id
              )}
            </p>
          </div>

          <StaffBadge
            role={
              user.staff_role
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            label="Баланс"
            value={
              user.balance_gp !==
              null
                ? `${user.balance_gp.toLocaleString(
                    "ru-RU"
                  )} GP`
                : "—"
            }
          />

          <Metric
            label="Прогнозы"
            value={String(
              user.predictions_count
            )}
          />

          <Metric
            label="События"
            value={String(
              user.resolved_events_count
            )}
          />

          <Metric
            label="Точность"
            value={formatAccuracy(
              user.accuracy
            )}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-white/25">
          <span>
            Регистрация:{" "}
            {formatDate(
              user.registered_at
            )}
          </span>

          {!user.age_confirmed && (
            <span className="text-amber-200/60">
              Возраст не подтверждён
            </span>
          )}

          {user.emergency_refill_used && (
            <span className="text-[#8f9aff]/65">
              Emergency GP использован
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================
// STAFF BADGE
// ===========================================================

function StaffBadge({
  role,
}: {
  role:
    string | null;
}) {
  if (
    role ===
    "admin"
  ) {
    return (
      <span className="inline-flex rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-amber-200/75">
        Admin
      </span>
    );
  }

  if (
    role ===
    "moderator"
  ) {
    return (
      <span className="inline-flex rounded-full border border-[#6577ff]/15 bg-[#6577ff]/[0.05] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#aeb7ff]/75">
        Moderator
      </span>
    );
  }

  return (
    <span className="text-xs text-white/20">
      Пользователь
    </span>
  );
}

// ===========================================================
// METRIC
// ===========================================================

function Metric({
  label,
  value,
}: {
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
      <p className="text-[10px] text-white/25">
        {label}
      </p>

      <p className="mt-1 truncate font-mono text-sm text-white/65">
        {value}
      </p>
    </div>
  );
}

// ===========================================================
// HELPERS
// ===========================================================

function shortId(
  value:
    string
) {
  return `${value.slice(
    0,
    8
  )}…`;
}

function formatAccuracy(
  value:
    number
) {
  const numeric =
    Number(
      value
    );

  if (
    Number.isNaN(
      numeric
    )
  ) {
    return "0.00%";
  }

  return `${numeric.toFixed(
    2
  )}%`;
}

function formatDate(
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

function formatRpcError(
  error: {
    message?:
      string | null;
    details?:
      string | null;
    hint?:
      string | null;
    code?:
      string | null;
  }
) {
  const translations:
    Record<
      string,
      string
    > = {
    AUTHENTICATION_REQUIRED:
      "Необходимо войти в аккаунт.",

    ADMIN_ACCESS_REQUIRED:
      "Этот раздел доступен только администратору.",
  };

  if (
    error.message &&
    translations[
      error.message
    ]
  ) {
    return translations[
      error.message
    ];
  }

  return [
    error.message,
    error.details,
    error.hint,
    error.code
      ? `Код: ${error.code}`
      : null,
  ]
    .filter(
      Boolean
    )
    .join(
      " — "
    );
}