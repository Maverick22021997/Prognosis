"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  User,
} from "@supabase/supabase-js";

import {
  createClient,
} from "@/lib/supabase-browser";

type Season = {
  id: number;
  title: string;
  slug: string;
  start_at: string;
  end_at: string;
  minimum_predictions_for_prize: number;
};

type LeaderboardEntry = {
  rank: number;
  season_id: number;
  user_id: string;
  username: string | null;
  balance_gp: number;
  accuracy: number;
  resolved_events_count: number;
  successful_events_count: number;
};

export default function LeadersPage() {
  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    season,
    setSeason,
  ] =
    useState<Season | null>(
      null
    );

  const [
    leaderboard,
    setLeaderboard,
  ] =
    useState<
      LeaderboardEntry[]
    >([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    const supabase =
      createClient();

    let cancelled =
      false;

    async function load() {
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
            user:
              currentUser,
          },
        } =
          await supabase.auth.getUser();

        if (
          cancelled
        ) {
          return;
        }

        setUser(
          currentUser
        );

        // ===================================================
        // ACTIVE SEASON
        // ===================================================

        const {
          data:
            seasonData,
          error:
            seasonError,
        } =
          await supabase
            .from(
              "v_active_season"
            )
            .select(
              `
                id,
                title,
                slug,
                start_at,
                end_at,
                minimum_predictions_for_prize
              `
            )
            .maybeSingle();

        if (
          cancelled
        ) {
          return;
        }

        if (
          seasonError
        ) {
          console.error(
            "Active season loading error:",
            seasonError
          );

          setError(
            "Не удалось загрузить текущий сезон."
          );

          return;
        }

        if (
          !seasonData
        ) {
          setError(
            "Сейчас нет активного сезона."
          );

          return;
        }

        setSeason(
          seasonData as Season
        );

        // ===================================================
        // LEADERBOARD
        // ===================================================

        const {
          data:
            leaderboardData,
          error:
            leaderboardError,
        } =
          await supabase.rpc(
            "get_season_leaderboard",
            {
              p_season_id:
                seasonData.id,

              p_limit:
                100,
            }
          );

        if (
          cancelled
        ) {
          return;
        }

        if (
          leaderboardError
        ) {
          console.error(
            "Leaderboard loading error:",
            leaderboardError
          );

          setError(
            "Не удалось загрузить рейтинг."
          );

          return;
        }

        const rows =
          (
            leaderboardData ??
            []
          ).map(
            (
              row:
                LeaderboardEntry
            ) => ({
              ...row,

              rank:
                Number(
                  row.rank
                ),

              season_id:
                Number(
                  row.season_id
                ),

              balance_gp:
                Number(
                  row.balance_gp
                ),

              accuracy:
                Number(
                  row.accuracy
                ),

              resolved_events_count:
                Number(
                  row.resolved_events_count
                ),

              successful_events_count:
                Number(
                  row.successful_events_count
                ),
            })
          );

        setLeaderboard(
          rows
        );
      } catch (
        unexpectedError
      ) {
        console.error(
          "Leaderboard unexpected error:",
          unexpectedError
        );

        if (
          !cancelled
        ) {
          setError(
            "Не удалось загрузить рейтинг."
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setIsLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled =
        true;
    };
  }, []);

  // =========================================================
  // CURRENT USER
  // =========================================================

  const currentUserEntry =
    useMemo(
      () =>
        user
          ? leaderboard.find(
              (
                entry
              ) =>
                entry.user_id ===
                user.id
            ) ??
            null
          : null,
      [
        leaderboard,
        user,
      ]
    );

  // =========================================================
  // LOADING
  // =========================================================

  if (
    isLoading
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-white/40">
            Загрузка рейтинга...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (
    error ||
    !season
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-5">
            <p className="text-sm text-red-300">
              {error ||
                "Рейтинг недоступен."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden">
      {/* BACKGROUND */}

      <div
        className="pointer-events-none absolute left-1/2 top-[-380px] h-[800px] w-[1000px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.07] blur-[160px]"
        aria-hidden="true"
      />

      <div className="container-page relative py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8f9aff]">
              Лидеры
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-white sm:text-5xl">
              Рейтинг сезона
            </h1>

            <p className="mt-4 text-base leading-7 text-white/45">
              Участники располагаются по текущему количеству GP.
              При равенстве GP выше находится участник с большей
              точностью.
            </p>
          </div>

          {/* ================================================= */}
          {/* SEASON */}
          {/* ================================================= */}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#6577ff]/20 bg-[#6577ff]/[0.07] px-4 py-2 text-sm font-medium text-[#aeb7ff]">
              {season.title}
            </span>

            <span className="text-sm text-white/35">
              до{" "}
              {formatSeasonDate(
                season.end_at
              )}
            </span>
          </div>

          {/* ================================================= */}
          {/* CURRENT USER */}
          {/* ================================================= */}

          {currentUserEntry && (
            <section className="mt-8 overflow-hidden rounded-3xl border border-[#6577ff]/25 bg-[#6577ff]/[0.055] p-5 sm:p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9aff]">
                    Ваше место
                  </p>

                  <div className="mt-3 flex items-baseline gap-3">
                    <p className="font-mono text-3xl font-semibold tracking-[-0.04em] text-white">
                      #
                      {
                        currentUserEntry.rank
                      }
                    </p>

                    <p className="text-sm font-medium text-white/50">
                      @
                      {currentUserEntry.username ??
                        "user"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 sm:gap-10">
                  <MiniMetric
                    label="GP"
                    value={formatGp(
                      currentUserEntry.balance_gp
                    )}
                  />

                  <MiniMetric
                    label="Точность"
                    value={formatAccuracy(
                      currentUserEntry
                    )}
                  />

                  <MiniMetric
                    label="Событий"
                    value={String(
                      currentUserEntry.resolved_events_count
                    )}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ================================================= */}
          {/* TOP 100 */}
          {/* ================================================= */}

          <section className="mt-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90">

            {/* TITLE */}

            <div className="border-b border-white/[0.07] px-5 py-6 sm:px-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-[-0.03em] text-white">
                    TOP 100
                  </h2>

                  <p className="mt-1 text-sm text-white/35">
                    Текущий рейтинг участников сезона
                  </p>
                </div>

                <span className="text-xs text-white/25">
                  {leaderboard.length} участников
                </span>
              </div>
            </div>

            {/* COLUMN LABELS */}

            <div className="border-b border-white/[0.06] bg-white/[0.012] px-5 py-3 sm:px-7">
              <div className="flex items-center gap-4">
                <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-white/20">
                  №
                </span>

                <span className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/20">
                  Участник
                </span>

                <span className="w-[110px] shrink-0 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-white/20">
                  GP
                </span>

                <span className="hidden w-[100px] shrink-0 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-white/20 sm:block">
                  Точность
                </span>

                <span className="hidden w-[80px] shrink-0 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-white/20 sm:block">
                  События
                </span>
              </div>
            </div>

            {/* ROWS */}

            {leaderboard.length >
            0 ? (
              <div>
                {leaderboard.map(
                  (
                    entry
                  ) => (
                    <LeaderboardRow
                      key={
                        `${entry.season_id}-${entry.user_id}`
                      }
                      entry={
                        entry
                      }
                      isCurrentUser={
                        entry.user_id ===
                        user?.id
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div className="px-6 py-16 text-center">
                <p className="font-medium text-white">
                  Пока нет участников
                </p>

                <p className="mt-2 text-sm text-white/35">
                  Рейтинг появится после регистрации участников сезона.
                </p>
              </div>
            )}
          </section>

          {/* ================================================= */}
          {/* RULES */}
          {/* ================================================= */}

          <section className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6">
            <p className="text-sm font-medium text-white/70">
              Как определяется место
            </p>

            <p className="mt-2 text-sm leading-6 text-white/35">
              Основной показатель — количество GP. При равенстве
              учитывается точность, затем количество уникальных
              завершённых событий. Аннулированные события в статистику
              не входят.
            </p>

            <p className="mt-3 text-xs leading-5 text-white/25">
              Для участия в распределении призов необходимо иметь
              прогнозы минимум в{" "}
              {
                season.minimum_predictions_for_prize
              }{" "}
              разных завершённых событиях сезона.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

// ===========================================================
// LEADERBOARD ROW
// ===========================================================

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry:
    LeaderboardEntry;

  isCurrentUser:
    boolean;
}) {
  const isTopThree =
    entry.rank <=
    3;

  return (
    <div
      className={[
        "border-b border-white/[0.055] px-5 py-4 last:border-b-0 sm:px-7",

        isCurrentUser
          ? "bg-[#6577ff]/[0.065]"
          : isTopThree
            ? "bg-white/[0.018]"
            : "transition-colors hover:bg-white/[0.018]",
      ].join(
        " "
      )}
    >
      <div className="flex items-center gap-4">

        {/* RANK */}

        <div className="w-14 shrink-0">
          <RankBadge
            rank={
              entry.rank
            }
          />
        </div>

        {/* USER */}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={[
                "truncate",

                isTopThree
                  ? "text-base font-semibold text-white"
                  : "text-sm font-medium text-white/80",
              ].join(
                " "
              )}
            >
              @
              {entry.username ??
                "user"}
            </span>

            {isCurrentUser && (
              <span className="shrink-0 rounded-full border border-[#6577ff]/20 bg-[#6577ff]/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#aeb7ff]">
                Вы
              </span>
            )}
          </div>

          {/* MOBILE STATS */}

          <div className="mt-1 flex flex-wrap gap-3 text-[11px] sm:hidden">
            <span className="text-white/25">
              Точность{" "}
              <strong className="font-mono font-medium text-white/50">
                {formatAccuracy(
                  entry
                )}
              </strong>
            </span>

            <span className="text-white/25">
              Событий{" "}
              <strong className="font-mono font-medium text-white/50">
                {
                  entry.resolved_events_count
                }
              </strong>
            </span>
          </div>
        </div>

        {/* GP */}

        <div className="w-[110px] shrink-0 text-right">
          <span
            className={[
              "font-mono font-semibold",

              isTopThree
                ? "text-base text-white"
                : "text-sm text-[#c5caff]",
            ].join(
              " "
            )}
          >
            {formatGp(
              entry.balance_gp
            )}
          </span>
        </div>

        {/* ACCURACY */}

        <div className="hidden w-[100px] shrink-0 text-right sm:block">
          <span className="font-mono text-sm text-white/60">
            {formatAccuracy(
              entry
            )}
          </span>
        </div>

        {/* EVENTS */}

        <div className="hidden w-[80px] shrink-0 text-right sm:block">
          <span className="font-mono text-sm text-white/45">
            {
              entry.resolved_events_count
            }
          </span>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
// RANK BADGE
// ===========================================================

function RankBadge({
  rank,
}: {
  rank:
    number;
}) {
  if (
    rank ===
    1
  ) {
    return (
      <span className="inline-flex min-w-10 items-center justify-center rounded-xl border border-[#8f9aff]/30 bg-[#6577ff]/[0.10] px-2.5 py-2 font-mono text-sm font-bold text-[#c4c9ff]">
        #1
      </span>
    );
  }

  if (
    rank ===
    2
  ) {
    return (
      <span className="inline-flex min-w-10 items-center justify-center rounded-xl border border-white/[0.13] bg-white/[0.045] px-2.5 py-2 font-mono text-sm font-semibold text-white/75">
        #2
      </span>
    );
  }

  if (
    rank ===
    3
  ) {
    return (
      <span className="inline-flex min-w-10 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.03] px-2.5 py-2 font-mono text-sm font-semibold text-white/55">
        #3
      </span>
    );
  }

  return (
    <span className="font-mono text-sm font-semibold text-white/35">
      #
      {rank}
    </span>
  );
}

// ===========================================================
// MINI METRIC
// ===========================================================

function MiniMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div>
      <p className="text-[11px] text-white/25">
        {label}
      </p>

      <p className="mt-1 font-mono text-sm font-medium text-white/70">
        {value}
      </p>
    </div>
  );
}

// ===========================================================
// FORMAT GP
// ===========================================================

function formatGp(
  value:
    number
) {
  return `${Number(
    value
  ).toLocaleString(
    "ru-RU"
  )} GP`;
}

// ===========================================================
// FORMAT ACCURACY
// ===========================================================

function formatAccuracy(
  entry:
    LeaderboardEntry
) {
  if (
    Number(
      entry.resolved_events_count
    ) ===
    0
  ) {
    return "—";
  }

  return `${Number(
    entry.accuracy
  ).toLocaleString(
    "ru-RU",
    {
      maximumFractionDigits:
        1,
    }
  )}%`;
}

// ===========================================================
// FORMAT DATE
// ===========================================================

function formatSeasonDate(
  value:
    string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day:
        "numeric",

      month:
        "long",

      year:
        "numeric",
    }
  ).format(
    new Date(
      value
    )
  );
}