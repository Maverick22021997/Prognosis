"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase-browser";

type CurrentSeason = {
  season_id: number;
  season_title: string;
  season_slug: string;
  season_status: string;

  start_at: string;
  end_at: string;

  starting_balance: number;
  minimum_predictions_for_prize: number;

  participant_id: number | null;

  balance_gp: number | null;

  predictions_count: number;

  emergency_refill_used: boolean;

  accuracy: number;

  resolved_events_count: number;

  successful_events_count: number;

  rank: number | null;
};

type SeasonHistoryItem = {
  season_id: number;

  title: string;
  slug: string;
  status: string;

  start_at: string;
  end_at: string;
  closed_at: string | null;

  balance_gp: number | null;

  predictions_count: number;

  emergency_refill_used: boolean;

  rank: number | null;

  accuracy: number;

  resolved_events_count: number;

  successful_events_count: number;
};

type UserDetails = {
  user_id: string;

  username: string;

  age_confirmed: boolean;

  age_confirmed_at:
    string | null;

  registered_at: string;

  updated_at: string;

  staff_role:
    string | null;

  current_season:
    CurrentSeason | null;

  season_history:
    SeasonHistoryItem[];
};

type UserPrediction = {
  prediction_id: number;

  season_id: number;
  season_title: string;

  event_id: number;
  event_title: string;
  event_slug: string;
  event_status: string;

  prediction_side: string;

  stake_amount: number;

  odds_at_purchase: number;

  potential_payout: number;

  actual_payout:
    number | null;

  prediction_status: string;

  placed_at: string;

  resolved_at:
    string | null;

  total_count: number;
};

const PAGE_SIZE =
  50;

export default function AdminUserPage() {
  const router =
    useRouter();

  const params =
    useParams();

  const userId =
    typeof params.id ===
    "string"
      ? params.id
      : "";

  const [
    details,
    setDetails,
  ] =
    useState<UserDetails | null>(
      null
    );

  const [
    predictions,
    setPredictions,
  ] =
    useState<UserPrediction[]>(
      []
    );

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    totalPredictions,
    setTotalPredictions,
  ] =
    useState(0);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    predictionsLoading,
    setPredictionsLoading,
  ] =
    useState(false);

  const [
    isRoleUpdating,
    setIsRoleUpdating,
  ] =
    useState(false);

  const [
    roleMessage,
    setRoleMessage,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    if (
      !userId
    ) {
      return;
    }

    void loadPage();
  }, [
    userId,
  ]);

  async function loadPage() {
    const supabase =
      createClient();

    setIsLoading(
      true
    );

    setError("");

    setRoleMessage("");

    try {
      // =====================================================
      // AUTH
      // =====================================================

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

      // =====================================================
      // DETAILS
      // =====================================================

      const {
        data:
          detailsData,
        error:
          detailsError,
      } =
        await supabase.rpc(
          "admin_get_user_details",
          {
            p_user_id:
              userId,
          }
        );

      if (
        detailsError
      ) {
        console.error(
          "Admin user details:",
          detailsError
        );

        setError(
          formatRpcError(
            detailsError
          )
        );

        return;
      }

      setDetails(
        detailsData as UserDetails
      );

      await loadPredictions(
        1
      );
    } catch (
      unexpectedError
    ) {
      console.error(
        "Admin user page:",
        unexpectedError
      );

      setError(
        "Не удалось загрузить карточку пользователя."
      );
    } finally {
      setIsLoading(
        false
      );
    }
  }

  // =========================================================
  // PREDICTIONS
  // =========================================================

  async function loadPredictions(
    nextPage:
      number
  ) {
    const supabase =
      createClient();

    setPredictionsLoading(
      true
    );

    try {
      const {
        data,
        error:
          predictionsError,
      } =
        await supabase.rpc(
          "admin_get_user_predictions",
          {
            p_user_id:
              userId,

            p_limit:
              PAGE_SIZE,

            p_offset:
              (
                nextPage -
                1
              ) *
              PAGE_SIZE,
          }
        );

      if (
        predictionsError
      ) {
        console.error(
          "Admin user predictions:",
          predictionsError
        );

        setError(
          formatRpcError(
            predictionsError
          )
        );

        return;
      }

      const rows =
        (
          data ??
          []
        ) as UserPrediction[];

      setPredictions(
        rows
      );

      setTotalPredictions(
        rows.length
          ? Number(
              rows[
                0
              ].total_count
            )
          : 0
      );

      setPage(
        nextPage
      );
    } finally {
      setPredictionsLoading(
        false
      );
    }
  }

  // =========================================================
  // MODERATOR ROLE
  // =========================================================

  async function handleModeratorChange(
    enabled:
      boolean
  ) {
    if (
      !details
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        enabled
          ? `Назначить пользователя ${details.username} модератором?`
          : `Снять права модератора у пользователя ${details.username}?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    const supabase =
      createClient();

    setIsRoleUpdating(
      true
    );

    setRoleMessage("");

    setError("");

    try {
      const {
        data,
        error:
          roleError,
      } =
        await supabase.rpc(
          "admin_set_moderator",
          {
            p_user_id:
              details.user_id,

            p_enabled:
              enabled,
          }
        );

      if (
        roleError
      ) {
        console.error(
          "Admin moderator update:",
          roleError
        );

        setError(
          formatRpcError(
            roleError
          )
        );

        return;
      }

      const newRole =
        data ===
        "moderator"
          ? "moderator"
          : null;

      setDetails(
        (
          current
        ) =>
          current
            ? {
                ...current,
                staff_role:
                  newRole,
              }
            : current
      );

      setRoleMessage(
        enabled
          ? "Права модератора назначены."
          : "Права модератора сняты."
      );
    } catch (
      unexpectedError
    ) {
      console.error(
        "Admin moderator update unexpected error:",
        unexpectedError
      );

      setError(
        "Не удалось изменить права пользователя."
      );
    } finally {
      setIsRoleUpdating(
        false
      );
    }
  }

  // =========================================================
  // STATES
  // =========================================================

  if (
    isLoading
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <p className="text-sm text-white/40">
          Загрузка пользователя...
        </p>
      </main>
    );
  }

  if (
    error &&
    !details
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-8 text-center">
          <h1 className="text-xl font-semibold text-white">
            Не удалось открыть пользователя
          </h1>

          <p className="mt-3 text-sm text-red-300/75">
            {error}
          </p>

          <Link
            href="/admin/users"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] px-5 text-sm text-white/70"
          >
            ← Пользователи
          </Link>
        </div>
      </main>
    );
  }

  if (
    !details
  ) {
    return null;
  }

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalPredictions /
          PAGE_SIZE
      )
    );

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
            href="/admin/users"
            className="text-sm text-white/35 transition hover:text-white/70"
          >
            ← Пользователи
          </Link>

          {/* PROFILE */}

          <section className="mt-7 rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="truncate text-3xl font-bold tracking-[-0.04em] text-white">
                    {details.username}
                  </h1>

                  <StaffBadge
                    role={
                      details.staff_role
                    }
                  />
                </div>

                <p className="mt-3 font-mono text-xs text-white/25">
                  {details.user_id}
                </p>

                <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-sm text-white/35">
                  <span>
                    Регистрация:{" "}
                    <strong className="font-medium text-white/55">
                      {formatDateTime(
                        details.registered_at
                      )}
                    </strong>
                  </span>

                  <span>
                    Возраст:{" "}
                    <strong className="font-medium text-white/55">
                      {details.age_confirmed
                        ? "подтверждён"
                        : "не подтверждён"}
                    </strong>
                  </span>

                  {details.age_confirmed_at && (
                    <span>
                      Подтверждение возраста:{" "}
                      <strong className="font-medium text-white/55">
                        {formatDateTime(
                          details.age_confirmed_at
                        )}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ACCESS MANAGEMENT */}

            <div className="mt-7 border-t border-white/[0.07] pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/25">
                    Права доступа
                  </p>

                  <p className="mt-2 text-sm text-white/45">
                    Текущая роль:{" "}
                    <strong className="font-medium text-white/70">
                      {details.staff_role ===
                      "admin"
                        ? "Администратор"
                        : details.staff_role ===
                            "moderator"
                          ? "Модератор"
                          : "Пользователь"}
                    </strong>
                  </p>

                  {roleMessage && (
                    <p className="mt-2 text-xs text-emerald-300/70">
                      {roleMessage}
                    </p>
                  )}
                </div>

                {details.staff_role ===
                "admin" ? (
                  <div className="rounded-xl border border-amber-300/10 bg-amber-300/[0.035] px-4 py-3 text-xs text-amber-200/60">
                    Роль администратора изменяется только вручную.
                  </div>
                ) : details.staff_role ===
                  "moderator" ? (
                  <button
                    type="button"
                    disabled={
                      isRoleUpdating
                    }
                    onClick={() =>
                      void handleModeratorChange(
                        false
                      )
                    }
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/[0.04] px-5 text-sm font-medium text-red-300/75 transition hover:bg-red-400/[0.08] hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isRoleUpdating
                      ? "Изменение..."
                      : "Снять права модератора"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      isRoleUpdating
                    }
                    onClick={() =>
                      void handleModeratorChange(
                        true
                      )
                    }
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-[#6577ff]/20 bg-[#6577ff]/[0.06] px-5 text-sm font-medium text-[#aeb7ff] transition hover:bg-[#6577ff]/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isRoleUpdating
                      ? "Изменение..."
                      : "Назначить модератором"}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* CURRENT SEASON */}

          <section className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9aff]">
              Текущий сезон
            </p>

            {details.current_season ? (
              <div className="mt-3 rounded-3xl border border-[#6577ff]/15 bg-[#6577ff]/[0.035] p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-white">
                        {
                          details
                            .current_season
                            .season_title
                        }
                      </h2>

                      <SeasonStatusBadge
                        status={
                          details
                            .current_season
                            .season_status
                        }
                      />
                    </div>

                    <p className="mt-2 text-sm text-white/35">
                      {formatDate(
                        details
                          .current_season
                          .start_at
                      )}
                      {" — "}
                      {formatDate(
                        details
                          .current_season
                          .end_at
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
                    <Metric
                      label="Место"
                      value={
                        details
                          .current_season
                          .rank
                          ? `#${details.current_season.rank}`
                          : "—"
                      }
                    />

                    <Metric
                      label="Баланс"
                      value={
                        details
                          .current_season
                          .balance_gp !==
                        null
                          ? `${details.current_season.balance_gp.toLocaleString(
                              "ru-RU"
                            )} GP`
                          : "—"
                      }
                    />

                    <Metric
                      label="Прогнозы"
                      value={String(
                        details
                          .current_season
                          .predictions_count
                      )}
                    />

                    <Metric
                      label="События"
                      value={String(
                        details
                          .current_season
                          .resolved_events_count
                      )}
                    />

                    <Metric
                      label="Точность"
                      value={formatAccuracy(
                        details
                          .current_season
                          .accuracy
                      )}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/30">
                  <span>
                    Emergency GP:{" "}
                    <strong className="font-medium text-white/45">
                      {details.current_season
                        .emergency_refill_used
                        ? "использован"
                        : "не использован"}
                    </strong>
                  </span>

                  <span>
                    Для приза:{" "}
                    <strong className="font-medium text-white/45">
                      {
                        details
                          .current_season
                          .resolved_events_count
                      }
                      {" / "}
                      {
                        details
                          .current_season
                          .minimum_predictions_for_prize
                      }
                      {" событий"}
                    </strong>
                  </span>

                  <span>
                    Успешных событий:{" "}
                    <strong className="font-medium text-white/45">
                      {
                        details
                          .current_season
                          .successful_events_count
                      }
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-6 text-sm text-white/35">
                Сейчас нет активного сезона.
              </div>
            )}
          </section>

          {/* SEASON HISTORY */}

          <section className="mt-10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9aff]">
              История
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Сезоны пользователя
            </h2>

            <div className="mt-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0f15]">
              {details.season_history.length ? (
                details.season_history.map(
                  (
                    season
                  ) => (
                    <SeasonHistoryRow
                      key={
                        season.season_id
                      }
                      season={
                        season
                      }
                    />
                  )
                )
              ) : (
                <div className="px-6 py-12 text-center text-sm text-white/35">
                  Пользователь ещё не участвовал в сезонах.
                </div>
              )}
            </div>
          </section>

          {/* PREDICTIONS */}

          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9aff]">
                  Активность
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Прогнозы
                </h2>
              </div>

              <p className="text-sm text-white/30">
                Всего:{" "}
                <span className="font-mono text-white/55">
                  {totalPredictions}
                </span>
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0f15]">
              {predictionsLoading ? (
                <div className="px-6 py-12 text-center text-sm text-white/35">
                  Загрузка прогнозов...
                </div>
              ) : predictions.length ? (
                predictions.map(
                  (
                    prediction
                  ) => (
                    <PredictionRow
                      key={
                        prediction.prediction_id
                      }
                      prediction={
                        prediction
                      }
                    />
                  )
                )
              ) : (
                <div className="px-6 py-12 text-center text-sm text-white/35">
                  Пользователь ещё не делал прогнозов.
                </div>
              )}
            </div>

            {totalPages >
              1 && (
              <div className="mt-5 flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={
                    page <=
                      1 ||
                    predictionsLoading
                  }
                  onClick={() =>
                    void loadPredictions(
                      page -
                        1
                    )
                  }
                  className={
                    pageButton
                  }
                >
                  ← Назад
                </button>

                <span className="text-sm text-white/35">
                  Страница{" "}
                  <span className="font-mono text-white/55">
                    {page}
                  </span>
                  {" / "}
                  <span className="font-mono text-white/55">
                    {totalPages}
                  </span>
                </span>

                <button
                  type="button"
                  disabled={
                    page >=
                      totalPages ||
                    predictionsLoading
                  }
                  onClick={() =>
                    void loadPredictions(
                      page +
                        1
                    )
                  }
                  className={
                    pageButton
                  }
                >
                  Далее →
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

// ===========================================================
// SEASON HISTORY ROW
// ===========================================================

function SeasonHistoryRow({
  season,
}: {
  season:
    SeasonHistoryItem;
}) {
  return (
    <div className="border-b border-white/[0.055] p-5 last:border-b-0 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-medium text-white/75">
              {season.title}
            </p>

            <SeasonStatusBadge
              status={
                season.status
              }
            />
          </div>

          <p className="mt-2 text-xs text-white/25">
            {formatDate(
              season.start_at
            )}
            {" — "}
            {formatDate(
              season.end_at
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-5">
          <Metric
            label="Место"
            value={
              season.rank
                ? `#${season.rank}`
                : "—"
            }
          />

          <Metric
            label="Баланс"
            value={
              season.balance_gp !==
              null
                ? `${season.balance_gp.toLocaleString(
                    "ru-RU"
                  )} GP`
                : "—"
            }
          />

          <Metric
            label="Прогнозы"
            value={String(
              season.predictions_count
            )}
          />

          <Metric
            label="События"
            value={String(
              season.resolved_events_count
            )}
          />

          <Metric
            label="Точность"
            value={formatAccuracy(
              season.accuracy
            )}
          />
        </div>
      </div>
    </div>
  );
}

// ===========================================================
// PREDICTION ROW
// ===========================================================

function PredictionRow({
  prediction,
}: {
  prediction:
    UserPrediction;
}) {
  return (
    <div className="border-b border-white/[0.055] p-5 last:border-b-0 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <PredictionStatus
              status={
                prediction.prediction_status
              }
            />

            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[11px] text-white/40">
              {prediction.prediction_side ===
              "yes"
                ? "Да"
                : "Нет"}
            </span>

            <span className="text-[11px] text-white/20">
              ID #{prediction.prediction_id}
            </span>
          </div>

          <p className="mt-3 text-sm font-medium leading-6 text-white/75">
            {prediction.event_title}
          </p>

          <p className="mt-2 text-xs text-white/25">
            {prediction.season_title}
            {" · "}
            {formatDateTime(
              prediction.placed_at
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 xl:justify-end">
          <Metric
            label="Сумма"
            value={`${prediction.stake_amount.toLocaleString(
              "ru-RU"
            )} GP`}
          />

          <Metric
            label="Коэффициент"
            value={Number(
              prediction.odds_at_purchase
            ).toFixed(
              2
            )}
          />

          <Metric
            label="Потенциал"
            value={`${prediction.potential_payout.toLocaleString(
              "ru-RU"
            )} GP`}
          />

          <Metric
            label="Выплата"
            value={
              prediction.actual_payout !==
              null
                ? `${prediction.actual_payout.toLocaleString(
                    "ru-RU"
                  )} GP`
                : "—"
            }
          />

          <Link
            href={`/admin/events/${prediction.event_id}`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.025] px-4 text-sm text-white/60 transition hover:bg-white/[0.05] hover:text-white"
          >
            Событие
          </Link>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
// PREDICTION STATUS
// ===========================================================

function PredictionStatus({
  status,
}: {
  status:
    string;
}) {
  const config:
    Record<
      string,
      {
        label: string;
        className: string;
      }
    > = {
    active: {
      label:
        "Активен",

      className:
        "border-blue-400/15 bg-blue-400/[0.05] text-blue-300/80",
    },

    won: {
      label:
        "Выигран",

      className:
        "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300/80",
    },

    lost: {
      label:
        "Проигран",

      className:
        "border-red-400/15 bg-red-400/[0.05] text-red-300/75",
    },

    refunded: {
      label:
        "Возврат",

      className:
        "border-amber-300/15 bg-amber-300/[0.05] text-amber-200/75",
    },

    void: {
      label:
        "Аннулирован",

      className:
        "border-white/[0.08] bg-white/[0.025] text-white/45",
    },
  };

  const item =
    config[
      status
    ] ?? {
      label:
        status,

      className:
        "border-white/[0.08] bg-white/[0.025] text-white/45",
    };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${item.className}`}
    >
      {item.label}
    </span>
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
      <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-3 py-1 text-xs font-medium text-amber-200/75">
        Admin
      </span>
    );
  }

  if (
    role ===
    "moderator"
  ) {
    return (
      <span className="rounded-full border border-[#6577ff]/15 bg-[#6577ff]/[0.05] px-3 py-1 text-xs font-medium text-[#aeb7ff]/75">
        Moderator
      </span>
    );
  }

  return (
    <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-1 text-xs text-white/35">
      Пользователь
    </span>
  );
}

// ===========================================================
// SEASON STATUS
// ===========================================================

function SeasonStatusBadge({
  status,
}: {
  status:
    string;
}) {
  const labels:
    Record<
      string,
      string
    > = {
    draft:
      "Черновик",

    scheduled:
      "Запланирован",

    active:
      "Активен",

    closing:
      "Закрывается",

    finished:
      "Завершён",

    cancelled:
      "Отменён",
  };

  return (
    <span className="rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.06em] text-white/35">
      {labels[
        status
      ] ??
        status}
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
    <div>
      <p className="text-[10px] text-white/25">
        {label}
      </p>

      <p className="mt-1 whitespace-nowrap font-mono text-sm text-white/65">
        {value}
      </p>
    </div>
  );
}

// ===========================================================
// PAGINATION BUTTON
// ===========================================================

const pageButton =
  "min-h-10 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

// ===========================================================
// FORMATTERS
// ===========================================================

function formatAccuracy(
  value:
    number
) {
  return `${Number(
    value ??
      0
  ).toFixed(
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

// ===========================================================
// RPC ERROR
// ===========================================================

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
      "Карточки пользователей доступны только администратору.",

    USER_NOT_FOUND:
      "Пользователь не найден.",

    CANNOT_CHANGE_OWN_ROLE:
      "Нельзя изменять собственные права через интерфейс.",

    ADMIN_ROLE_CANNOT_BE_CHANGED_HERE:
      "Роль администратора через этот интерфейс не изменяется.",

    USER_ID_REQUIRED:
      "Не указан пользователь.",

    MODERATOR_STATE_REQUIRED:
      "Не указано новое состояние роли.",

    UNSUPPORTED_STAFF_ROLE:
      "У пользователя обнаружена неподдерживаемая служебная роль.",
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