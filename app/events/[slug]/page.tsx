import Link from "next/link";
import { notFound } from "next/navigation";

import EventOddsChart from "@/components/EventOddsChart";
import EventPredictionPanel from "@/components/EventPredictionPanel";

import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

import {
  formatGp,
  formatNumber,
} from "@/lib/format";

import { supabase } from "@/lib/supabase";

import type { Event } from "@/types/event";
import type { OddsHistoryPoint } from "@/types/odds-history";

type EventPageProps = {
  params:
    | {
        slug: string;
      }
    | Promise<{
        slug: string;
      }>;
};

const categoryIcons: Record<
  string,
  string
> = {
  sport: "⚽",
  economy: "₽",
  news: "▤",
  entertainment: "▶",
  world: "🌍",
};

export default async function EventPage({
  params,
}: EventPageProps) {
  const resolvedParams =
    await params;

  const slug =
    resolvedParams.slug;

  // =========================================================
  // EVENT
  // =========================================================

  const {
    data,
    error,
  } = await supabase
    .from("v_events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(
      "Ошибка загрузки события:",
      error
    );
  }

  if (!data) {
    notFound();
  }

  const event =
    data as Event;

  // =========================================================
  // ODDS HISTORY
  // =========================================================

  const {
    data: oddsHistoryData,
    error:
      oddsHistoryError,
  } = await supabase
    .from(
      "event_odds_history"
    )
    .select(
      `
        recorded_at,
        yes_pool,
        no_pool,
        total_pool,
        yes_odds,
        no_odds,
        yes_probability,
        no_probability,
        predictions_count
      `
    )
    .eq(
      "event_id",
      event.id
    )
    .order(
      "recorded_at",
      {
        ascending: true,
      }
    );

  if (oddsHistoryError) {
    console.error(
      "Ошибка загрузки истории коэффициентов:",
      oddsHistoryError
    );
  }

  const oddsHistory =
    (oddsHistoryData ??
      []) as OddsHistoryPoint[];

  // =========================================================
  // POOLS
  // =========================================================

  const totalPool =
    Math.max(
      event.total_pool ?? 0,
      0
    );

  const yesPool =
    Math.max(
      event.yes_pool ?? 0,
      0
    );

  const noPool =
    Math.max(
      event.no_pool ?? 0,
      0
    );

  const yesPercent =
    totalPool > 0
      ? Math.round(
          (yesPool /
            totalPool) *
            100
        )
      : 50;

  const noPercent =
    totalPool > 0
      ? Math.round(
          (noPool /
            totalPool) *
            100
        )
      : 50;

  const categoryIcon =
    categoryIcons[
      event.category_code
    ] ?? "◈";

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="container-page py-6 sm:py-8 lg:py-10">
      <Link
        href="/"
        className="focus-ring inline-flex items-center gap-2 rounded-lg text-sm text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
      >
        <span
          aria-hidden="true"
        >
          ←
        </span>

        <span>
          Все события
        </span>
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        {/* ================================================= */}
        {/* LEFT COLUMN */}
        {/* ================================================= */}

        <div className="min-w-0 space-y-6">
          {/* =============================================== */}
          {/* EVENT INFO */}
          {/* =============================================== */}

          <Card className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white/[0.04] text-base">
                <span
                  aria-hidden="true"
                >
                  {
                    categoryIcon
                  }
                </span>
              </div>

              <span className="text-sm text-[var(--foreground-muted)]">
                {
                  event.category_name
                }
              </span>

              {event.is_featured ? (
                <Badge variant="accent">
                  Горячее
                </Badge>
              ) : null}

              {event.prediction_available ? (
                <Badge variant="success">
                  Приём открыт
                </Badge>
              ) : (
                <Badge variant="neutral">
                  Приём закрыт
                </Badge>
              )}
            </div>

            <h1 className="mt-6 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.035em] text-[var(--foreground)] sm:text-4xl">
              {event.title}
            </h1>

            {event.description ? (
              <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--foreground-muted)]">
                {
                  event.description
                }
              </p>
            ) : null}

            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-6 sm:grid-cols-4">
              <Metric
                label="Прогнозов"
                value={formatNumber(
                  event.predictions_count
                )}
              />

              <Metric
                label="Объём"
                value={formatGp(
                  event.volume_gp
                )}
              />

              <Metric
                label="Пул «Да»"
                value={formatGp(
                  yesPool
                )}
              />

              <Metric
                label="Пул «Нет»"
                value={formatGp(
                  noPool
                )}
              />
            </div>
          </Card>

          {/* =============================================== */}
          {/* ODDS CHART */}
          {/* =============================================== */}

          <Card className="overflow-hidden p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                  Динамика прогнозов
                </h2>

                <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                  Как менялось
                  распределение мнений
                  пользователей
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="inline-flex items-center gap-2 text-[#79d9a0]">
                  <span className="h-2 w-2 rounded-full bg-current" />

                  Да
                </span>

                <span className="inline-flex items-center gap-2 text-[#ed8888]">
                  <span className="h-2 w-2 rounded-full bg-current" />

                  Нет
                </span>
              </div>
            </div>

            <div className="mt-6">
              <EventOddsChart
                history={
                  oddsHistory
                }
              />
            </div>

            <p className="mt-3 text-xs leading-5 text-[var(--foreground-subtle)]">
              Проценты рассчитаны
              на основании
              распределения общего
              пула между исходами
              «Да» и «Нет».
            </p>
          </Card>

          {/* =============================================== */}
          {/* DETAILS */}
          {/* =============================================== */}

          <Card className="p-5 sm:p-7">
            <h2 className="text-xl font-semibold tracking-[-0.02em]">
              Информация о событии
            </h2>

            <div className="mt-6 space-y-6">
              <InfoSection
                title="Правило определения результата"
                content={
                  event.resolution_rule ||
                  "Правило определения результата пока не указано."
                }
              />

              <div className="border-t border-[var(--border)]" />

              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Источник
                </h3>

                {event.source_url ? (
                  <a
                    href={
                      event.source_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring mt-2 inline-flex rounded-md text-sm font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
                  >
                    {event.source_name ||
                      "Открыть источник"}{" "}
                    ↗
                  </a>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
                    Источник пока
                    не указан.
                  </p>
                )}
              </div>

              <div className="border-t border-[var(--border)]" />

              <div className="grid gap-5 sm:grid-cols-2">
                <DateInfo
                  label="Приём прогнозов до"
                  value={formatDate(
                    event.prediction_close_at
                  )}
                />

                <DateInfo
                  label="Ожидаемое подведение итогов"
                  value={
                    event.expected_resolution_at
                      ? formatDate(
                          event.expected_resolution_at
                        )
                      : "Дата пока не указана"
                  }
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ================================================= */}
        {/* RIGHT COLUMN */}
        {/* ================================================= */}

        <aside className="lg:sticky lg:top-6">
          <Card className="p-5 sm:p-6">
            <EventPredictionPanel
              eventId={
                event.id
              }
              eventTitle={
                event.title
              }
              predictionAvailable={
                event.prediction_available
              }
              secondsUntilClose={
                event.seconds_until_close
              }
              totalPool={
                totalPool
              }
              yesPool={
                yesPool
              }
              noPool={
                noPool
              }
              yesPercent={
                yesPercent
              }
              noPercent={
                noPercent
              }
              yesOdds={
                event.yes_odds
              }
              noOdds={
                event.no_odds
              }
            />
          </Card>
        </aside>
      </div>
    </main>
  );
}

// ===========================================================
// METRIC
// ===========================================================

type MetricProps = {
  label: string;
  value: string;
};

function Metric({
  label,
  value,
}: MetricProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/[0.025] p-4">
      <p className="text-xs text-[var(--foreground-subtle)]">
        {label}
      </p>

      <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

// ===========================================================
// INFO SECTION
// ===========================================================

type InfoSectionProps = {
  title: string;
  content: string;
};

function InfoSection({
  title,
  content,
}: InfoSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[var(--foreground-muted)]">
        {content}
      </p>
    </div>
  );
}

// ===========================================================
// DATE INFO
// ===========================================================

type DateInfoProps = {
  label: string;
  value: string;
};

function DateInfo({
  label,
  value,
}: DateInfoProps) {
  return (
    <div>
      <p className="text-xs text-[var(--foreground-subtle)]">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

// ===========================================================
// FORMAT DATE
// ===========================================================

function formatDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}