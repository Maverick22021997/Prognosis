"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function WinnersPage() {
  const [
    seasons,
    setSeasons,
  ] =
    useState<FinishedSeason[]>(
      []
    );

  const [
    winnersBySeason,
    setWinnersBySeason,
  ] =
    useState<
      Record<
        number,
        SeasonWinner[]
      >
    >({});

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

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
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
          "Finished seasons error:",
          seasonsError
        );

        setError(
          "Не удалось загрузить архив сезонов."
        );

        return;
      }

      const loadedSeasons =
        (
          seasonsData ??
          []
        ) as FinishedSeason[];

      setSeasons(
        loadedSeasons
      );

      // =====================================================
      // WINNERS FOR EACH SEASON
      // =====================================================

      const result:
        Record<
          number,
          SeasonWinner[]
        > = {};

      for (
        const season
        of loadedSeasons
      ) {
        const {
          data:
            winnersData,
          error:
            winnersError,
        } =
          await supabase.rpc(
            "get_season_winners",
            {
              p_season_id:
                season.season_id,
            }
          );

        if (
          winnersError
        ) {
          console.error(
            `Season winners ${season.season_id}:`,
            winnersError
          );

          result[
            season.season_id
          ] = [];

          continue;
        }

        result[
          season.season_id
        ] =
          (
            winnersData ??
            []
          ) as SeasonWinner[];
      }

      setWinnersBySeason(
        result
      );
    } catch (
      unexpectedError
    ) {
      console.error(
        "Winners page error:",
        unexpectedError
      );

      setError(
        "Не удалось загрузить победителей."
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
        <p className="text-sm text-white/40">
          Загрузка результатов...
        </p>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="relative min-h-[calc(100vh-72px)]">
      <div
        className="pointer-events-none absolute left-1/2 top-[-420px] h-[850px] w-[1000px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.06] blur-[170px]"
        aria-hidden="true"
      />

      <div className="container-page relative py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">

          {/* HEADER */}

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8f9aff]">
              prognosis.io
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
              Победители
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/40 sm:text-base">
              Итоговые результаты завершённых сезонов и участники,
              занявшие призовые места.
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-8 rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
              {
                error
              }
            </div>
          )}

          {/* EMPTY */}

          {seasons.length ===
          0 ? (
            <div className="mt-10 rounded-3xl border border-white/[0.08] bg-[#0d0f15] px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-white">
                Завершённых сезонов пока нет
              </h2>

              <p className="mt-3 text-sm text-white/35">
                Здесь появятся финальные результаты после окончания первого сезона.
              </p>

              <Link
                href="/leaders"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 text-sm font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              >
                Текущий рейтинг
              </Link>
            </div>
          ) : (
            <div className="mt-10 space-y-7">

              {/* SEASONS */}

              {seasons.map(
                (
                  season
                ) => {
                  const winners =
                    winnersBySeason[
                      season.season_id
                    ] ??
                    [];

                  return (
                    <section
                      key={
                        season.season_id
                      }
                      className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0f15]"
                    >

                      {/* SEASON HEADER */}

                      <div className="border-b border-white/[0.06] p-6 sm:p-8">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9aff]">
                              Завершённый сезон
                            </p>

                            <Link
                              href={`/winners/${season.slug}`}
                              className="mt-3 block"
                            >
                              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white transition hover:text-[#aeb7ff]">
                                {
                                  season.title
                                }
                              </h2>
                            </Link>

                            {season.description && (
                              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/35">
                                {
                                  season.description
                                }
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-sm text-white/30 sm:text-right">
                            <p>
                              {formatDate(
                                season.start_at
                              )}
                              {" — "}
                              {formatDate(
                                season.end_at
                              )}
                            </p>

                            {season.closed_at && (
                              <p className="mt-1 text-xs text-white/20">
                                Итоги зафиксированы{" "}
                                {formatDate(
                                  season.closed_at
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* WINNERS */}

                      {winners.length >
                      0 ? (
                        <div className="grid gap-px bg-white/[0.05] lg:grid-cols-3">
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
                        <div className="px-6 py-10 text-center text-sm text-white/30">
                          В этом сезоне не было участников, выполнивших критерий для призового места.
                        </div>
                      )}

                      {/* FULL RATING LINK */}

                      <div className="border-t border-white/[0.06] px-6 py-4 sm:px-8">
                        <Link
                          href={`/winners/${season.slug}`}
                          className="inline-flex items-center text-sm font-medium text-white/40 transition hover:text-white/70"
                        >
                          Посмотреть полный рейтинг →
                        </Link>
                      </div>
                    </section>
                  );
                }
              )}
            </div>
          )}
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
    <div className="bg-[#0d0f15] p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#6577ff]/15 bg-[#6577ff]/[0.06] font-mono text-sm font-bold text-[#aeb7ff]">
          #
          {
            winner.place
          }
        </div>

        <span className="text-xs text-white/25">
          {
            winner.predictions_count
          }{" "}
          событий
        </span>
      </div>

      <h3 className="mt-6 truncate text-lg font-semibold text-white">
        {
          winner.username
        }
      </h3>

      <p className="mt-2 font-mono text-2xl font-bold tracking-[-0.03em] text-white">
        {winner.final_gp.toLocaleString(
          "ru-RU"
        )}{" "}
        GP
      </p>

      <p className="mt-2 text-xs text-white/30">
        Точность:{" "}
        {formatAccuracy(
          winner.accuracy
        )}
      </p>

      {/* PRIZE */}

      {winner.prize_title && (
        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/25">
            Приз
          </p>

          <p className="mt-2 text-sm font-medium text-white/70">
            {
              winner.prize_title
            }
          </p>

          {winner.prize_description && (
            <p className="mt-2 text-xs leading-5 text-white/30">
              {
                winner.prize_description
              }
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================================
// HELPERS
// ===========================================================

function formatAccuracy(
  value:
    number
) {
  const numericValue =
    Number(
      value
    );

  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return "0.00%";
  }

  return `${numericValue.toFixed(
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
    }
  ).format(
    new Date(
      value
    )
  );
}