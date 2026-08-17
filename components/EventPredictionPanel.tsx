"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import Button from "@/components/ui/Button";
import PredictionModal from "@/components/PredictionModal";

import {
  formatGp,
  formatOdds,
  formatTimeRemaining,
} from "@/lib/format";

import {
  createClient,
} from "@/lib/supabase-browser";

import {
  notifySeasonParticipantRefresh,
  useSeasonParticipant,
} from "@/hooks/useSeasonParticipant";

type PredictionSide =
  | "yes"
  | "no";

type PredictionStatus =
  | "active"
  | "won"
  | "lost"
  | "refunded"
  | "void";

type UserPrediction = {
  id: number;

  prediction_side:
    PredictionSide;

  stake_amount: number;

  odds_at_purchase:
    number;

  potential_payout:
    number;

  actual_payout:
    number | null;

  status:
    PredictionStatus;

  placed_at:
    string;
};

type EventPredictionPanelProps = {
  eventId: number;
  eventTitle: string;

  predictionAvailable: boolean;

  secondsUntilClose: number;

  totalPool: number;

  yesPool: number;
  noPool: number;

  yesPercent: number;
  noPercent: number;

  yesOdds: number;
  noOdds: number;
};

export default function EventPredictionPanel({
  eventId,
  eventTitle,

  predictionAvailable,

  secondsUntilClose,

  totalPool,

  yesPool,
  noPool,

  yesPercent,
  noPercent,

  yesOdds,
  noOdds,
}: EventPredictionPanelProps) {
  const router =
    useRouter();

  const [
    selectedSide,
    setSelectedSide,
  ] =
    useState<PredictionSide | null>(
      null
    );

  const [
    userPredictions,
    setUserPredictions,
  ] =
    useState<UserPrediction[]>(
      []
    );

  const [
    isPredictionsLoading,
    setIsPredictionsLoading,
  ] =
    useState(false);

  const {
    user,
    balanceGp,
    isLoading,
    refresh,
  } =
    useSeasonParticipant();

  // =========================================================
  // LOAD USER PREDICTIONS
  // =========================================================

  const loadUserPredictions =
    useCallback(
      async () => {
        if (!user) {
          setUserPredictions(
            []
          );

          return;
        }

        setIsPredictionsLoading(
          true
        );

        try {
          const supabase =
            createClient();

          const {
            data,
            error,
          } =
            await supabase
              .from(
                "predictions"
              )
              .select(
                `
                  id,
                  prediction_side,
                  stake_amount,
                  odds_at_purchase,
                  potential_payout,
                  actual_payout,
                  status,
                  placed_at
                `
              )
              .eq(
                "user_id",
                user.id
              )
              .eq(
                "event_id",
                eventId
              )
              .order(
                "placed_at",
                {
                  ascending:
                    false,
                }
              );

          if (error) {
            console.error(
              "User event predictions loading error:",
              error
            );

            return;
          }

          setUserPredictions(
            (
              data ?? []
            ) as UserPrediction[]
          );
        } finally {
          setIsPredictionsLoading(
            false
          );
        }
      },
      [
        user,
        eventId,
      ]
    );

  useEffect(() => {
    void loadUserPredictions();
  }, [
    loadUserPredictions,
  ]);

  // =========================================================
  // PREDICTION SUCCESS
  // =========================================================

  async function handleSuccess() {
    /*
     * Обновляем баланс и статистику
     * текущего экземпляра hook.
     */
    await refresh();

    /*
     * Обновляем Header / SeasonBar
     * и другие экземпляры hook.
     */
    notifySeasonParticipantRefresh();

    /*
     * Перечитываем прогнозы именно
     * этого пользователя по событию.
     */
    await loadUserPredictions();

    /*
     * Обновляем серверную часть
     * страницы:
     *
     * - текущие коэффициенты;
     * - пулы;
     * - объём;
     * - количество прогнозов;
     * - event_odds_history;
     * - график.
     */
    router.refresh();
  }

  return (
    <>
      {/* =================================================== */}
      {/* PREDICTION FORM */}
      {/* =================================================== */}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--foreground-muted)]">
            Сделать прогноз
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            Выберите исход
          </h2>
        </div>

        <span className="text-sm font-medium text-[var(--foreground-subtle)]">
          {formatGp(
            totalPool
          )}
        </span>
      </div>

      {predictionAvailable ? (
        <>
          <div className="mt-6 space-y-3">
            {/* YES */}

            <Button
              variant="yes"
              size="lg"
              fullWidth
              className="min-h-28 justify-between px-5"
              onClick={() =>
                setSelectedSide(
                  "yes"
                )
              }
            >
              <span className="text-left">
                <span className="block text-base font-semibold">
                  Да
                </span>

                <span className="mt-1 block text-xs font-medium opacity-70">
                  {yesPercent}% ·{" "}
                  {formatGp(
                    yesPool
                  )}
                </span>
              </span>

              <span className="text-2xl font-bold">
                {formatOdds(
                  yesOdds
                )}
              </span>
            </Button>

            {/* NO */}

            <Button
              variant="no"
              size="lg"
              fullWidth
              className="min-h-28 justify-between px-5"
              onClick={() =>
                setSelectedSide(
                  "no"
                )
              }
            >
              <span className="text-left">
                <span className="block text-base font-semibold">
                  Нет
                </span>

                <span className="mt-1 block text-xs font-medium opacity-70">
                  {noPercent}% ·{" "}
                  {formatGp(
                    noPool
                  )}
                </span>
              </span>

              <span className="text-2xl font-bold">
                {formatOdds(
                  noOdds
                )}
              </span>
            </Button>
          </div>

          {/* =============================================== */}
          {/* CLOSE / BALANCE */}
          {/* =============================================== */}

          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white/[0.025] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--foreground-subtle)]">
                  До закрытия
                </p>

                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  {formatTimeRemaining(
                    secondsUntilClose
                  )}
                </p>
              </div>

              {user ? (
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--foreground-subtle)]">
                    Баланс
                  </p>

                  <p className="mt-1 font-mono text-sm font-semibold text-[#aeb7ff]">
                    {isLoading
                      ? "..."
                      : formatGp(
                          balanceGp
                        )}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {!user &&
          !isLoading ? (
            <p className="mt-4 text-xs leading-5 text-[var(--foreground-subtle)]">
              Для размещения
              прогноза необходимо
              войти в аккаунт.
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-white/[0.025] px-5 py-8 text-center">
          <p className="font-semibold text-[var(--foreground)]">
            Приём прогнозов
            закрыт
          </p>

          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Для этого события
            больше нельзя выбрать
            исход.
          </p>
        </div>
      )}

      {/* =================================================== */}
      {/* USER PREDICTIONS */}
      {/* =================================================== */}

      {user ? (
        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--foreground-subtle)]">
                Ваша позиция
              </p>

              <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">
                Ваши прогнозы
              </h3>
            </div>

            {!isPredictionsLoading ? (
              <span className="text-xs font-medium text-[var(--foreground-subtle)]">
                {
                  userPredictions.length
                }
              </span>
            ) : null}
          </div>

          {isPredictionsLoading ? (
            <p className="mt-4 text-sm text-[var(--foreground-subtle)]">
              Загрузка...
            </p>
          ) : userPredictions.length >
            0 ? (
            <div className="mt-4 space-y-3">
              {userPredictions.map(
                (
                  prediction
                ) => (
                  <UserPredictionCard
                    key={
                      prediction.id
                    }
                    prediction={
                      prediction
                    }
                  />
                )
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-white/[0.015] px-4 py-5">
              <p className="text-sm font-medium text-[var(--foreground-muted)]">
                Вы ещё не делали
                прогноз на это
                событие.
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--foreground-subtle)]">
                Можно сделать
                несколько прогнозов,
                в том числе на разные
                исходы.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* =================================================== */}
      {/* MODAL */}
      {/* =================================================== */}

      {selectedSide && (
        <PredictionModal
          eventId={
            eventId
          }
          eventTitle={
            eventTitle
          }
          side={
            selectedSide
          }
          currentOdds={
            selectedSide ===
            "yes"
              ? yesOdds
              : noOdds
          }
          currentBalance={
            balanceGp
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

// ===========================================================
// USER PREDICTION CARD
// ===========================================================

function UserPredictionCard({
  prediction,
}: {
  prediction:
    UserPrediction;
}) {
  const isYes =
    prediction.prediction_side ===
    "yes";

  const status =
    getPredictionStatus(
      prediction.status
    );

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/[0.02] p-4">
      {/* TOP */}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              isYes
                ? "rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-xs font-semibold text-emerald-300"
                : "rounded-full border border-red-400/15 bg-red-400/[0.06] px-2.5 py-1 text-xs font-semibold text-red-300"
            }
          >
            {isYes
              ? "Да"
              : "Нет"}
          </span>

          <span
            className={
              status.className
            }
          >
            {
              status.label
            }
          </span>
        </div>

        <span className="shrink-0 font-mono text-sm font-semibold text-[var(--foreground)]">
          {formatGp(
            prediction.stake_amount
          )}
        </span>
      </div>

      {/* METRICS */}

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border)] pt-4">
        <PredictionMetric
          label="Коэффициент"
          value={formatOdds(
            prediction.odds_at_purchase
          )}
        />

        <PredictionMetric
          label="Потенциально"
          value={formatGp(
            prediction.potential_payout
          )}
        />

        <PredictionMetric
          label="Выплата"
          value={
            prediction.actual_payout ===
            null
              ? "—"
              : formatGp(
                  prediction.actual_payout
                )
          }
        />

        <PredictionMetric
          label="Дата"
          value={formatPredictionDate(
            prediction.placed_at
          )}
        />
      </div>
    </div>
  );
}

// ===========================================================
// METRIC
// ===========================================================

function PredictionMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] text-[var(--foreground-subtle)]">
        {label}
      </p>

      <p className="mt-1 font-mono text-xs font-medium text-[var(--foreground-muted)]">
        {value}
      </p>
    </div>
  );
}

// ===========================================================
// STATUS
// ===========================================================

function getPredictionStatus(
  status:
    PredictionStatus
) {
  switch (status) {
    case "won":
      return {
        label:
          "Точный",

        className:
          "rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[11px] font-medium text-emerald-300",
      };

    case "lost":
      return {
        label:
          "Не сбылся",

        className:
          "rounded-full border border-red-400/15 bg-red-400/[0.06] px-2.5 py-1 text-[11px] font-medium text-red-300",
      };

    case "refunded":
    case "void":
      return {
        label:
          "Возврат",

        className:
          "rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-2.5 py-1 text-[11px] font-medium text-amber-200",
      };

    default:
      return {
        label:
          "Активен",

        className:
          "rounded-full border border-[#8f9aff]/20 bg-[#6577ff]/[0.07] px-2.5 py-1 text-[11px] font-medium text-[#aeb7ff]",
      };
  }
}

// ===========================================================
// DATE
// ===========================================================

function formatPredictionDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}