"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  createClient,
} from "@/lib/supabase-browser";

import {
  formatGp,
  formatOdds,
} from "@/lib/format";

type PredictionSide =
  | "yes"
  | "no";

type PredictionQuote = {
  odds: number;
  potential_payout: number;
  yes_pool_after: number;
  no_pool_after: number;
  total_pool_after: number;
};

type PredictionModalProps = {
  eventId: number;
  eventTitle: string;

  side: PredictionSide;

  currentOdds: number;
  currentBalance: number;

  onClose: () => void;
  onSuccess: () => void;
};

export default function PredictionModal({
  eventId,
  eventTitle,
  side,
  currentOdds,
  currentBalance,
  onClose,
  onSuccess,
}: PredictionModalProps) {
  const [
    mounted,
    setMounted,
  ] =
    useState(false);

  const [
    stake,
    setStake,
  ] =
    useState("");

  const [
    quote,
    setQuote,
  ] =
    useState<PredictionQuote | null>(
      null
    );

  const [
    isQuoteLoading,
    setIsQuoteLoading,
  ] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /*
   * Используем счётчик запросов,
   * чтобы старый ответ quote RPC
   * не мог перезаписать более новый.
   */
  const quoteRequestId =
    useRef(0);

  // =========================================================
  // MOUNT / BODY SCROLL
  // =========================================================

  useEffect(() => {
    setMounted(true);

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  // =========================================================
  // ESCAPE
  // =========================================================

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape" &&
        !isSubmitting
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    isSubmitting,
    onClose,
  ]);

  // =========================================================
  // STAKE
  // =========================================================

  const stakeNumber =
    Number(stake);

  const hasValidStake =
    Number.isInteger(
      stakeNumber
    ) &&
    stakeNumber > 0;

  // =========================================================
  // SERVER QUOTE
  // =========================================================

  useEffect(() => {
    /*
     * При пустом или некорректном
     * значении сервер не вызываем.
     */
    if (
      !hasValidStake ||
      stakeNumber >
        currentBalance
    ) {
      setQuote(null);
      setIsQuoteLoading(false);

      return;
    }

    const requestId =
      ++quoteRequestId.current;

    /*
     * Небольшой debounce:
     * RPC вызывается не после каждой
     * введённой цифры мгновенно.
     */
    const timeout =
      window.setTimeout(
        async () => {
          setIsQuoteLoading(
            true
          );

          try {
            const supabase =
              createClient();

            const {
              data,
              error:
                quoteError,
            } =
              await supabase.rpc(
                "quote_prediction",
                {
                  p_event_id:
                    eventId,

                  p_prediction_side:
                    side,

                  p_stake_amount:
                    stakeNumber,
                }
              );

            /*
             * Пока запрос выполнялся,
             * пользователь мог уже
             * изменить сумму.
             */
            if (
              requestId !==
              quoteRequestId.current
            ) {
              return;
            }

            if (quoteError) {
              console.error(
                "quote_prediction error:",
                quoteError
              );

              setQuote(
                null
              );

              return;
            }

            const quoteRow =
              Array.isArray(
                data
              )
                ? data[0]
                : data;

            if (!quoteRow) {
              setQuote(
                null
              );

              return;
            }

            setQuote({
              odds:
                Number(
                  quoteRow.odds
                ),

              potential_payout:
                Number(
                  quoteRow.potential_payout
                ),

              yes_pool_after:
                Number(
                  quoteRow.yes_pool_after
                ),

              no_pool_after:
                Number(
                  quoteRow.no_pool_after
                ),

              total_pool_after:
                Number(
                  quoteRow.total_pool_after
                ),
            });
          } catch (
            quoteRequestError
          ) {
            if (
              requestId !==
              quoteRequestId.current
            ) {
              return;
            }

            console.error(
              "Prediction quote request error:",
              quoteRequestError
            );

            setQuote(
              null
            );
          } finally {
            if (
              requestId ===
              quoteRequestId.current
            ) {
              setIsQuoteLoading(
                false
              );
            }
          }
        },
        250
      );

    return () => {
      window.clearTimeout(
        timeout
      );

      /*
       * Инвалидируем запрос,
       * если сумма изменилась.
       */
      quoteRequestId.current +=
        1;
    };
  }, [
    eventId,
    side,
    stakeNumber,
    hasValidStake,
    currentBalance,
  ]);

  // =========================================================
  // DISPLAY VALUES
  // =========================================================

  const displayedOdds =
    quote?.odds ??
    currentOdds;

  const potentialPayout =
    quote?.potential_payout ??
    0;

  const sideLabel =
    side === "yes"
      ? "Да"
      : "Нет";

  // =========================================================
  // SUBMIT
  // =========================================================

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (
      !Number.isInteger(
        stakeNumber
      ) ||
      stakeNumber <= 0
    ) {
      setError(
        "Введите корректное количество GP."
      );

      return;
    }

    if (
      stakeNumber >
      currentBalance
    ) {
      setError(
        "Недостаточно GP на балансе."
      );

      return;
    }

    /*
     * Если серверный предпросмотр ещё
     * не получен, не подтверждаем
     * прогноз вслепую.
     */
    if (
      !quote ||
      isQuoteLoading
    ) {
      setError(
        "Подождите завершения расчёта коэффициента."
      );

      return;
    }

    setIsSubmitting(
      true
    );

    try {
      const supabase =
        createClient();

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session) {
        setError(
          "Для прогноза необходимо войти в аккаунт."
        );

        return;
      }

      const idempotencyKey =
        `prediction:${eventId}:${crypto.randomUUID()}`;

      const {
        error:
          predictionError,
      } =
        await supabase.rpc(
          "place_prediction",
          {
            p_event_id:
              eventId,

            p_prediction_side:
              side,

            p_stake_amount:
              stakeNumber,

            p_idempotency_key:
              idempotencyKey,
          }
        );

      if (
        predictionError
      ) {
        console.error(
          "place_prediction error:",
          predictionError
        );

        const message =
          predictionError.message ??
          "";

        if (
          message.includes(
            "INSUFFICIENT_GP_BALANCE"
          )
        ) {
          setError(
            "Недостаточно GP на балансе."
          );
        } else if (
          message.includes(
            "PREDICTION_PERIOD_CLOSED"
          )
        ) {
          setError(
            "Приём прогнозов на это событие уже закрыт."
          );
        } else if (
          message.includes(
            "EVENT_NOT_ACTIVE"
          )
        ) {
          setError(
            "Событие сейчас недоступно для прогнозов."
          );
        } else if (
          message.includes(
            "MINIMUM_STAKE"
          )
        ) {
          setError(
            "Сумма прогноза меньше минимально допустимой."
          );
        } else if (
          message.includes(
            "USER_BANNED"
          )
        ) {
          setError(
            "Для этого аккаунта размещение прогнозов недоступно."
          );
        } else {
          setError(
            "Не удалось разместить прогноз."
          );
        }

        return;
      }

      /*
       * onSuccess обновляет:
       *
       * - баланс;
       * - статистику;
       * - прогнозы пользователя;
       * - пулы;
       * - коэффициенты;
       * - график.
       */
      await onSuccess();

      onClose();
    } catch (
      requestError
    ) {
      console.error(
        "Prediction request error:",
        requestError
      );

      setError(
        "Не удалось разместить прогноз."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  // =========================================================
  // PORTAL
  // =========================================================

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Сделать прогноз"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !isSubmitting
        ) {
          onClose();
        }
      }}
      style={{
        position:
          "fixed",

        top: 0,
        right: 0,
        bottom: 0,
        left: 0,

        zIndex:
          2147483647,

        display:
          "flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        padding:
          "20px",

        background:
          "rgba(3, 5, 12, 0.82)",

        backdropFilter:
          "blur(8px)",

        WebkitBackdropFilter:
          "blur(8px)",

        overflowY:
          "auto",
      }}
    >
      <div
        style={{
          position:
            "relative",

          width:
            "calc(100vw - 40px)",

          maxWidth:
            "520px",

          maxHeight:
            "calc(100vh - 40px)",

          overflowY:
            "auto",

          flexShrink:
            0,

          boxSizing:
            "border-box",

          border:
            "1px solid rgba(255,255,255,0.11)",

          borderRadius:
            "24px",

          background:
            "#0d0f15",

          boxShadow:
            "0 35px 120px rgba(0,0,0,0.85)",
        }}
        className="p-5 sm:p-7"
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9aff]">
              Сделать прогноз
            </p>

            <h2 className="mt-3 text-xl font-semibold leading-snug text-white">
              {
                eventTitle
              }
            </h2>
          </div>

          <button
            type="button"
            aria-label="Закрыть"
            onClick={
              onClose
            }
            disabled={
              isSubmitting
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-xl text-white/50 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
          >
            ×
          </button>
        </div>

        {/* ================================================= */}
        {/* SIDE + ODDS */}
        {/* ================================================= */}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="text-xs text-white/40">
              Ваш выбор
            </p>

            <p
              className={
                side === "yes"
                  ? "mt-2 text-xl font-semibold text-emerald-300"
                  : "mt-2 text-xl font-semibold text-red-300"
              }
            >
              {
                sideLabel
              }
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <p className="text-xs text-white/40">
              Расчётный коэффициент
            </p>

            <p className="mt-2 text-xl font-semibold text-white">
              {isQuoteLoading
                ? "..."
                : formatOdds(
                    displayedOdds
                  )}
            </p>
          </div>
        </div>

        {/* ================================================= */}
        {/* BALANCE */}
        {/* ================================================= */}

        <div className="mt-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-white/45">
              Доступно
            </span>

            <span className="font-mono text-sm font-semibold text-[#aeb7ff]">
              {formatGp(
                currentBalance
              )}
            </span>
          </div>
        </div>

        {/* ================================================= */}
        {/* FORM */}
        {/* ================================================= */}

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-6"
        >
          <label
            htmlFor="prediction-stake"
            className="text-sm font-medium text-white/70"
          >
            Сколько GP
            использовать
          </label>

          <input
            id="prediction-stake"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            autoFocus
            value={
              stake
            }
            onChange={(
              event
            ) => {
              setStake(
                event.target.value
              );

              setError(
                ""
              );
            }}
            placeholder="Например, 500"
            disabled={
              isSubmitting
            }
            className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 font-mono text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#6577ff]/60 disabled:opacity-50"
          />

          {/* =============================================== */}
          {/* QUICK AMOUNTS */}
          {/* =============================================== */}

          <div className="mt-3 flex flex-wrap gap-2">
            {[
              100,
              500,
              1000,
            ].map(
              (
                amount
              ) => (
                <button
                  key={
                    amount
                  }
                  type="button"
                  onClick={() => {
                    setStake(
                      String(
                        Math.min(
                          amount,
                          currentBalance
                        )
                      )
                    );

                    setError(
                      ""
                    );
                  }}
                  disabled={
                    isSubmitting ||
                    currentBalance <=
                      0
                  }
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/55 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
                >
                  {formatGp(
                    Math.min(
                      amount,
                      currentBalance
                    )
                  )}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => {
                setStake(
                  String(
                    currentBalance
                  )
                );

                setError(
                  ""
                );
              }}
              disabled={
                isSubmitting ||
                currentBalance <=
                  0
              }
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/55 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
            >
              Всё
            </button>
          </div>

          {/* =============================================== */}
          {/* PAYOUT */}
          {/* =============================================== */}

          <div className="mt-5 rounded-2xl border border-[#6577ff]/15 bg-[#6577ff]/[0.055] p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-white/45">
                Потенциальная
                выплата
              </span>

              <span className="font-mono text-base font-semibold text-[#aeb7ff]">
                {isQuoteLoading
                  ? "..."
                  : formatGp(
                      potentialPayout
                    )}
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-white/30">
              Коэффициент
              рассчитывается с
              учётом выбранной суммы
              и фиксируется сервером
              при размещении
              прогноза.
            </p>
          </div>

          {/* =============================================== */}
          {/* BALANCE ERROR */}
          {/* =============================================== */}

          {hasValidStake &&
          stakeNumber >
            currentBalance ? (
            <div className="mt-5 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-300">
              Недостаточно GP на
              балансе.
            </div>
          ) : null}

          {/* =============================================== */}
          {/* ERROR */}
          {/* =============================================== */}

          {error ? (
            <div className="mt-5 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-300">
              {
                error
              }
            </div>
          ) : null}

          {/* =============================================== */}
          {/* CONFIRM */}
          {/* =============================================== */}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              isQuoteLoading ||
              !quote ||
              currentBalance <=
                0 ||
              stakeNumber >
                currentBalance
            }
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white transition hover:bg-[#7383ff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Подтверждаем..."
              : isQuoteLoading
                ? "Рассчитываем..."
                : `Подтвердить прогноз «${sideLabel}»`}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}