"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { createClient } from "@/lib/supabase-browser";

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

export default function FinishedSeasonPage() {
  const params =
    useParams();

  const slug =
    typeof params.slug === "string"
      ? params.slug
      : "";

  const [
    season,
    setSeason,
  ] =
    useState<FinishedSeason | null>(
      null
    );

  const [
    winners,
    setWinners,
  ] =
    useState<SeasonWinner[]>(
      []
    );

  const [
    leaderboard,
    setLeaderboard,
  ] =
    useState<LeaderboardRow[]>(
      []
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    notFound,
    setNotFound,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    if (!slug) {
      return;
    }

    void loadSeason();
  }, [slug]);

  async function loadSeason() {
    const supabase =
      createClient();

    setIsLoading(
      true
    );

    setNotFound(
      false
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
          "Finished seasons error:",
          seasonsError
        );

        setError(
          "Не удалось загрузить сезон."
        );

        return;
      }

      const seasons =
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

      const foundSeason =
        seasons.find(
          (
            item
          ) =>
            item.slug ===
            slug
        );

      if (
        !foundSeason
      ) {
        setNotFound(
          true
        );

        return;
      }

      setSeason(
        foundSeason
      );

      // =====================================================
      // WINNERS + FINAL LEADERBOARD
      // =====================================================

      const [
        winnersResponse,
        leaderboardResponse,
      ] =
        await Promise.all([
          supabase.rpc(
            "get_season_winners",
            {
              p_season_id:
                foundSeason.season_id,
            }
          ),

          supabase.rpc(
            "get_finished_season_leaderboard",
            {
              p_season_id:
                foundSeason.season_id,
            }
          ),
        ]);

      if (
        winnersResponse.error
      ) {
        console.error(
          "Season winners error:",
          winnersResponse.error
        );

        setError(
          "Не удалось загрузить победителей сезона."
        );

        return;
      }

      if (
        leaderboardResponse.error
      ) {
        console.error(
          "Finished leaderboard error:",
          leaderboardResponse.error
        );

        setError(
          "Не удалось загрузить итоговый рейтинг."
        );

        return;
      }

      const winnerRows =
        (
          winnersResponse.data ??
          []
        ).map(
          (
            row:
              SeasonWinner
          ) => ({
            ...row,

            season_id:
              Number(
                row.season_id
              ),

            place:
              Number(
                row.place
              ),

            final_gp:
              Number(
                row.final_gp
              ),

            accuracy:
              Number(
                row.accuracy
              ),

            predictions_count:
              Number(
                row.predictions_count
              ),
          })
        );

      const leaderboardRows =
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

      setWinners(
        winnerRows
      );

      setLeaderboard(
        leaderboardRows
      );
    } catch (
      unexpectedError
    ) {
      console.error(
        "Finished season page:",
        unexpectedError
      );

      setError(
        "Не удалось загрузить результаты сезона."
      );
    } finally {
      setIsLoading(
        false
      );
    }
  }

  // =========================================================
  // WINNER MAP
  // =========================================================

  const winnerMap =
    useMemo(
      () =>
        new Map(
          winners.map(
            (
              winner
            ) => [
              winner.user_id,
              winner,
            ]
          )
        ),
      [
        winners,
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
        <p className="text-sm text-white/40">
          Загрузка результатов...
        </p>
      </main>
    );
  }

  // =========================================================
  // NOT FOUND
  // =========================================================

  if (
    notFound ||
    !season
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-8 text-center">
          <h1 className="text-xl font-semibold text-white">
            Сезон не найден
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/35">
            Возможно, сезон ещё не завершён или ссылка устарела.
          </p>

          <Link
            href="/winners"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          >
            К победителям
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
        className="pointer-events-none absolute left-1/2 top-[-430px] h-[900px] w-[1050px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.065] blur-[180px]"
        aria-hidden="true"
      />

      <div className="container-page relative py-10 sm:py-16">
        <div className="mx-auto max-w-6xl">

          {/* BACK */}

          <Link
            href="/winners"
            className="text-sm text-white/35 transition hover:text-white/70"
          >
            ← Победители
          </Link>

          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <section className="mt-8">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8f9aff]">
              Итоги сезона
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-white sm:text-5xl">
              {season.title}
            </h1>

            {season.description && (
              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/40 sm:text-base">
                {season.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/30">
              <span>
                {formatDate(
                  season.start_at
                )}
                {" — "}
                {formatDate(
                  season.end_at
                )}
              </span>

              {season.closed_at && (
                <span>
                  Итоги зафиксированы{" "}
                  {formatDate(
                    season.closed_at
                  )}
                </span>
              )}
            </div>
          </section>

          {/* ERROR */}

          {error && (
            <div className="mt-8 rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* ================================================= */}
          {/* WINNERS */}
          {/* ================================================= */}

          <section className="mt-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9aff]">
                Победители
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                TOP-3 сезона
              </h2>

              <p className="mt-2 text-sm text-white/35">
                Участники, выполнившие критерий допуска к призовым местам.
              </p>
            </div>

            {winners.length >
            0 ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {winners.map(
                  (
                    winner
                  ) => (
                    <WinnerCard
                      key={
                        winner.user_id
                      }
                      winner={
                        winner
                      }
                    />
                  )
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-white/[0.08] bg-[#0d0f15] px-6 py-12 text-center">
                <p className="text-sm text-white/35">
                  В этом сезоне не было участников, выполнивших критерий для призового места.
                </p>
              </div>
            )}
          </section>

          {/* ================================================= */}
          {/* FULL LEADERBOARD */}
          {/* ================================================= */}

          <section className="mt-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9aff]">
                Финальный рейтинг
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                Все участники
              </h2>

              <p className="mt-2 text-sm text-white/35">
                Рейтинг зафиксирован на момент завершения сезона и больше не изменяется.
              </p>
            </div>

            {leaderboard.length >
            0 ? (
              <div className="mt-6 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0f15]">

                {/* COLUMN LABELS */}

                <div className="border-b border-white/[0.07] bg-white/[0.012] px-5 py-3 sm:px-6">
                  <div className="flex items-center gap-4">
                    <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-white/20">
                      №
                    </span>

                    <span className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white/20">
                      Участник
                    </span>

                    <span className="w-[120px] shrink-0 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-white/20">
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

                {leaderboard.map(
                  (
                    row
                  ) => {
                    const winner =
                      winnerMap.get(
                        row.user_id
                      );

                    return (
                      <LeaderboardRowView
                        key={
                          row.user_id
                        }
                        row={
                          row
                        }
                        winner={
                          winner ??
                          null
                        }
                      />
                    );
                  }
                )}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-white/[0.08] bg-[#0d0f15] px-6 py-12 text-center">
                <p className="text-sm text-white/35">
                  Итоговый рейтинг этого сезона пуст.
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
// WINNER CARD
// ===========================================================

function WinnerCard({
  winner,
}: {
  winner:
    SeasonWinner;
}) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-[#6577ff]/15 bg-[#0d0f15] p-6 sm:p-7">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#6577ff]/[0.07] blur-[70px]"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#6577ff]/20 bg-[#6577ff]/[0.08] font-mono text-sm font-bold text-[#aeb7ff]">
            #{winner.place}
          </div>

          <p className="text-xs text-white/25">
            {winner.predictions_count} событий
          </p>
        </div>

        <h3 className="mt-7 truncate text-lg font-semibold text-white">
          {winner.username}
        </h3>

        <p className="mt-2 font-mono text-2xl font-bold tracking-[-0.03em] text-white">
          {winner.final_gp.toLocaleString(
            "ru-RU"
          )}{" "}
          GP
        </p>

        <div className="mt-4 flex items-center gap-5 text-xs text-white/30">
          <span>
            Точность{" "}
            <strong className="font-medium text-white/55">
              {formatAccuracy(
                winner.accuracy,
                winner.predictions_count
              )}
            </strong>
          </span>
        </div>

        {winner.prize_title && (
          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-white/25">
              Приз
            </p>

            <p className="mt-2 text-sm font-medium text-white/75">
              {winner.prize_title}
            </p>

            {winner.prize_description && (
              <p className="mt-2 text-xs leading-5 text-white/35">
                {winner.prize_description}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ===========================================================
// LEADERBOARD ROW
// ===========================================================

function LeaderboardRowView({
  row,
  winner,
}: {
  row:
    LeaderboardRow;

  winner:
    SeasonWinner | null;
}) {
  return (
    <div
      className={[
        "border-b border-white/[0.055] px-5 py-4 last:border-b-0 sm:px-6",

        winner
          ? "bg-[#6577ff]/[0.03]"
          : row.rank <=
              3
            ? "bg-white/[0.012]"
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
              row.rank
            }
            isPrizeWinner={
              Boolean(
                winner
              )
            }
          />
        </div>

        {/* USER */}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p
              className={[
                "truncate",

                row.rank <=
                3
                  ? "text-base font-semibold text-white"
                  : "text-sm font-medium text-white/75",
              ].join(
                " "
              )}
            >
              {row.username}
            </p>

            {winner && (
              <span className="shrink-0 rounded-full border border-[#6577ff]/20 bg-[#6577ff]/[0.07] px-2 py-0.5 text-[10px] font-medium text-[#aeb7ff]">
                Призовое место #{winner.place}
              </span>
            )}
          </div>

          {/* MOBILE DETAILS */}

          <div className="mt-1 flex flex-wrap gap-3 text-[11px] sm:hidden">
            <span className="text-white/25">
              Точность{" "}
              <strong className="font-mono font-medium text-white/50">
                {formatAccuracy(
                  row.accuracy,
                  row.resolved_events_count
                )}
              </strong>
            </span>

            <span className="text-white/25">
              Событий{" "}
              <strong className="font-mono font-medium text-white/50">
                {
                  row.resolved_events_count
                }
              </strong>
            </span>
          </div>
        </div>

        {/* GP */}

        <div className="w-[120px] shrink-0 text-right">
          <p
            className={[
              "font-mono font-semibold",

              row.rank <=
              3
                ? "text-base text-white"
                : "text-sm text-[#c5caff]",
            ].join(
              " "
            )}
          >
            {row.final_gp.toLocaleString(
              "ru-RU"
            )}{" "}
            GP
          </p>
        </div>

        {/* ACCURACY */}

        <div className="hidden w-[100px] shrink-0 text-right sm:block">
          <p className="font-mono text-sm text-white/55">
            {formatAccuracy(
              row.accuracy,
              row.resolved_events_count
            )}
          </p>
        </div>

        {/* EVENTS */}

        <div className="hidden w-[80px] shrink-0 text-right sm:block">
          <p className="font-mono text-sm text-white/40">
            {
              row.resolved_events_count
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
// RANK
// ===========================================================

function RankBadge({
  rank,
  isPrizeWinner,
}: {
  rank:
    number;

  isPrizeWinner:
    boolean;
}) {
  if (
    rank ===
    1
  ) {
    return (
      <div className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-[#6577ff]/30 bg-[#6577ff]/[0.10] px-2 font-mono text-sm font-bold text-[#c4c9ff]">
        #1
      </div>
    );
  }

  if (
    rank ===
    2
  ) {
    return (
      <div className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-white/[0.13] bg-white/[0.045] px-2 font-mono text-sm font-semibold text-white/75">
        #2
      </div>
    );
  }

  if (
    rank ===
    3
  ) {
    return (
      <div className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.03] px-2 font-mono text-sm font-semibold text-white/55">
        #3
      </div>
    );
  }

  return (
    <div
      className={[
        "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-2 font-mono text-sm font-semibold",

        isPrizeWinner
          ? "border-[#6577ff]/20 bg-[#6577ff]/[0.07] text-[#aeb7ff]"
          : "border-white/[0.07] bg-white/[0.025] text-white/40",
      ].join(
        " "
      )}
    >
      #{rank}
    </div>
  );
}

// ===========================================================
// HELPERS
// ===========================================================

function formatAccuracy(
  value:
    number,
  resolvedEventsCount:
    number
) {
  if (
    Number(
      resolvedEventsCount
    ) ===
    0
  ) {
    return "—";
  }

  const numericValue =
    Number(
      value
    );

  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return "—";
  }

  return `${numericValue.toLocaleString(
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