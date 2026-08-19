"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase-browser";

type FinishedSeason = {
  season_id: number;
  title: string;
  slug: string;
  description: string | null;
  start_at: string;
  end_at: string;
  closed_at: string | null;
};

type SeasonWinner = {
  season_id: number;
  place: number;
  user_id: string;
  username: string;
  final_gp: number;
  accuracy: number;
  predictions_count: number;
  prize_title: string | null;
  prize_description: string | null;
};

type LeaderboardRow = {
  rank: number;
  user_id: string;
  username: string;
  final_gp: number;
  accuracy: number;
  resolved_events_count: number;
  successful_events_count: number;
};

type ArchiveSeason = FinishedSeason & {
  winner:
    SeasonWinner | null;

  participants_count:
    number;
};

export default function ArchivePage() {
  const [
    seasons,
    setSeasons,
  ] =
    useState<ArchiveSeason[]>(
      []
    );

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
    void loadArchive();
  }, []);

  async function loadArchive() {
    const supabase =
      createClient();

    setIsLoading(
      true
    );

    setError("");

    try {
      // =====================================================
      // FINISHED SEASONS
      // =====================================================

      const {
        data:
          seasonsData,
        error:
          seasonsError,
      } =
        await supabase.rpc(
          "get_finished_seasons"
        );

      if (
        seasonsError
      ) {
        console.error(
          "Archive seasons error:",
          seasonsError
        );

        setError(
          "Не удалось загрузить архив сезонов."
        );

        return;
      }

      const finishedSeasons =
        (
          seasonsData ??
          []
        ).map(
          (
            item:
              FinishedSeason
          ) => ({
            ...item,

            season_id:
              Number(
                item.season_id
              ),
          })
        );

      // =====================================================
      // LOAD SUMMARY FOR EVERY SEASON
      // =====================================================

      const archiveRows =
        await Promise.all(
          finishedSeasons.map(
  async (
    season: FinishedSeason
  ) => {
              const [
                winnersResponse,
                leaderboardResponse,
              ] =
                await Promise.all([
                  supabase.rpc(
                    "get_season_winners",
                    {
                      p_season_id:
                        season.season_id,
                    }
                  ),

                  supabase.rpc(
                    "get_finished_season_leaderboard",
                    {
                      p_season_id:
                        season.season_id,
                    }
                  ),
                ]);

              if (
                winnersResponse.error
              ) {
                console.error(
                  `Archive winners error for season ${season.season_id}:`,
                  winnersResponse.error
                );
              }

              if (
                leaderboardResponse.error
              ) {
                console.error(
                  `Archive leaderboard error for season ${season.season_id}:`,
                  leaderboardResponse.error
                );
              }

              const winners =
                (
                  winnersResponse.data ??
                  []
                ).map(
                  (
                    winner:
                      SeasonWinner
                  ) => ({
                    ...winner,

                    season_id:
                      Number(
                        winner.season_id
                      ),

                    place:
                      Number(
                        winner.place
                      ),

                    final_gp:
                      Number(
                        winner.final_gp
                      ),

                    accuracy:
                      Number(
                        winner.accuracy
                      ),

                    predictions_count:
                      Number(
                        winner.predictions_count
                      ),
                  })
                );

              const leaderboard =
                (
                  leaderboardResponse.data ??
                  []
                ).map(
                  (
                    row:
                      LeaderboardRow
                  ) => ({
                    ...row,

                    rank:
                      Number(
                        row.rank
                      ),

                    final_gp:
                      Number(
                        row.final_gp
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

              const winner =
  winners.find(
    (
      item: SeasonWinner
    ) =>
      item.place ===
      1
  ) ??
  null;

              return {
                ...season,

                winner,

                participants_count:
                  leaderboard.length,
              };
            }
          )
        );

      setSeasons(
        archiveRows
      );
    } catch (
      unexpectedError
    ) {
      console.error(
        "Archive page unexpected error:",
        unexpectedError
      );

      setError(
        "Не удалось загрузить архив."
      );
    } finally {
      setIsLoading(
        false
      );
    }
  }

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
            Загрузка архива...
          </p>
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
        className="pointer-events-none absolute left-1/2 top-[-420px] h-[900px] w-[1050px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.06] blur-[180px]"
        aria-hidden="true"
      />

      <div className="container-page relative py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <section className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#8f9aff]">
              Архив
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-[-0.045em] text-white sm:text-5xl">
              История сезонов
            </h1>

            <p className="mt-4 text-base leading-7 text-white/40">
              Завершённые сезоны prognosis.io, их победители и
              зафиксированные итоговые рейтинги.
            </p>
          </section>

          {/* ERROR */}

          {error && (
            <div className="mt-8 rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* ================================================= */}
          {/* SEASONS */}
          {/* ================================================= */}

          {seasons.length >
          0 ? (
            <section className="mt-10 grid gap-5">
              {seasons.map(
                (
                  season
                ) => (
                  <ArchiveSeasonCard
                    key={
                      season.season_id
                    }
                    season={
                      season
                    }
                  />
                )
              )}
            </section>
          ) : (
            <section className="mt-10 rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.025] text-xl text-white/30">
                ◷
              </div>

              <h2 className="mt-5 text-lg font-semibold text-white">
                Архив пока пуст
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
                Здесь появятся завершённые сезоны после фиксации их
                результатов.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

// ===========================================================
// ARCHIVE SEASON CARD
// ===========================================================

function ArchiveSeasonCard({
  season,
}: {
  season:
    ArchiveSeason;
}) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-[#6577ff]/[0.045] blur-[90px]"
        aria-hidden="true"
      />

      <div className="relative">

        {/* TOP */}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#6577ff]/20 bg-[#6577ff]/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#aeb7ff]">
                Завершён
              </span>

              {season.closed_at && (
                <span className="text-xs text-white/25">
                  Итоги зафиксированы{" "}
                  {formatDate(
                    season.closed_at
                  )}
                </span>
              )}
            </div>

            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
              {season.title}
            </h2>

            <p className="mt-3 text-sm text-white/35">
              {formatDate(
                season.start_at
              )}
              {" — "}
              {formatDate(
                season.end_at
              )}
            </p>

            {season.description && (
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/35">
                {season.description}
              </p>
            )}
          </div>

          <Link
            href={`/winners/${season.slug}`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 text-sm font-medium text-white/70 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white"
          >
            Итоги сезона →
          </Link>
        </div>

        {/* STATS */}

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ArchiveMetric
            label="Участников"
            value={
              season.participants_count.toLocaleString(
                "ru-RU"
              )
            }
          />

          <ArchiveMetric
            label="Победитель"
            value={
              season.winner
                ? `@${season.winner.username}`
                : "—"
            }
          />

          <ArchiveMetric
            label="Итог победителя"
            value={
              season.winner
                ? `${season.winner.final_gp.toLocaleString(
                    "ru-RU"
                  )} GP`
                : "—"
            }
          />

          <ArchiveMetric
            label="Точность победителя"
            value={
              season.winner
                ? formatWinnerAccuracy(
                    season.winner
                  )
                : "—"
            }
          />
        </div>

        {/* NO ELIGIBLE WINNER */}

        {!season.winner && (
          <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-5 text-white/30">
            В сезоне не было участников, выполнивших минимальный
            критерий допуска к призовым местам.
          </div>
        )}
      </div>
    </article>
  );
}

// ===========================================================
// METRIC
// ===========================================================

function ArchiveMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.065] bg-white/[0.02] px-4 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/20">
        {label}
      </p>

      <p className="mt-2 truncate font-mono text-sm font-semibold text-white/70">
        {value}
      </p>
    </div>
  );
}

// ===========================================================
// HELPERS
// ===========================================================

function formatWinnerAccuracy(
  winner:
    SeasonWinner
) {
  if (
    winner.predictions_count ===
    0
  ) {
    return "—";
  }

  return `${Number(
    winner.accuracy
  ).toLocaleString(
    "ru-RU",
    {
      maximumFractionDigits:
        2,
    }
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
    }
  ).format(
    new Date(
      value
    )
  );
}