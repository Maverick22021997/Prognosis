"use client";

import Link from "next/link";
import {
  useState,
} from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PredictionModal from "@/components/PredictionModal";

import {
  formatGp,
  formatNumber,
  formatOdds,
  formatTimeRemaining,
} from "@/lib/format";

import type {
  Event,
} from "@/types/event";

type EventCardProps = {
  event: Event;

  currentBalance?: number;

  onPredictionSuccess?: () => void;
};

type PredictionSide =
  | "yes"
  | "no";

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

export default function EventCard({
  event,
  currentBalance = 0,
  onPredictionSuccess,
}: EventCardProps) {
  const [
    selectedSide,
    setSelectedSide,
  ] =
    useState<PredictionSide | null>(
      null
    );

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

  function handleSuccess() {
    onPredictionSuccess?.();
  }

  return (
    <>
      <Card
        interactive
        className="overflow-hidden p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white/[0.04] text-base text-[var(--foreground-muted)]">
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
                <span className="rounded-full border border-[rgba(184,255,90,0.18)] bg-[rgba(184,255,90,0.08)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
                  Горячее
                </span>
              ) : null}
            </div>

            <Link
              href={`/events/${event.slug}`}
              className="focus-ring block rounded-md"
            >
              <h2 className="max-w-3xl text-xl font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)] transition hover:text-white sm:text-2xl">
                {
                  event.title
                }
              </h2>
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--foreground-muted)]">
          <span>
            {formatNumber(
              event.predictions_count
            )}{" "}
            прогнозов
          </span>

          <span>
            {formatGp(
              event.volume_gp
            )}
          </span>
        </div>

        {event.prediction_available ? (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-black/[0.12] p-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="yes"
                size="lg"
                fullWidth
                className="min-h-24 flex-col gap-1"
                onClick={() =>
                  setSelectedSide(
                    "yes"
                  )
                }
              >
                <span className="text-base">
                  Да
                </span>

                <span className="text-2xl font-bold">
                  {formatOdds(
                    event.yes_odds
                  )}
                </span>

                <span className="text-xs font-medium opacity-70">
                  {
                    yesPercent
                  }
                  % ·{" "}
                  {formatGp(
                    yesPool
                  )}
                </span>
              </Button>

              <Button
                variant="no"
                size="lg"
                fullWidth
                className="min-h-24 flex-col gap-1"
                onClick={() =>
                  setSelectedSide(
                    "no"
                  )
                }
              >
                <span className="text-base">
                  Нет
                </span>

                <span className="text-2xl font-bold">
                  {formatOdds(
                    event.no_odds
                  )}
                </span>

                <span className="text-xs font-medium opacity-70">
                  {
                    noPercent
                  }
                  % ·{" "}
                  {formatGp(
                    noPool
                  )}
                </span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white/[0.025] px-4 py-4 text-sm text-[var(--foreground-muted)]">
            Приём прогнозов
            закрыт
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-sm text-[var(--foreground-subtle)]">
          <span>
            {event.prediction_available
              ? `Закроется через ${formatTimeRemaining(
                  event.seconds_until_close
                )}`
              : "Событие недоступно для прогноза"}
          </span>

          <Link
            href={`/events/${event.slug}`}
            className="focus-ring rounded-md font-medium text-[var(--foreground-muted)] transition hover:text-[var(--foreground)]"
          >
            Подробнее
          </Link>
        </div>
      </Card>

      {selectedSide && (
        <PredictionModal
          eventId={
            event.id
          }
          eventTitle={
            event.title
          }
          side={
            selectedSide
          }
          currentOdds={
            selectedSide ===
            "yes"
              ? event.yes_odds
              : event.no_odds
          }
          currentBalance={
            currentBalance
          }
          onClose={() =>
            setSelectedSide(
              null
            )
          }
          onSuccess={
            handleSuccess
          }
        />
      )}
    </>
  );
}