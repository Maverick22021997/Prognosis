"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import type {
  User,
} from "@supabase/supabase-js";

import {
  createClient,
} from "@/lib/supabase-browser";

import {
  notifySeasonParticipantRefresh,
} from "@/hooks/useSeasonParticipant";

import {
  formatGp,
  formatOdds,
} from "@/lib/format";

// ===========================================================
// TYPES
// ===========================================================

type Profile = {
  id: string;
  username: string | null;
  age_confirmed: boolean;
  created_at: string;
};

type SeasonParticipant = {
  id: number;
  season_id: number;
  user_id: string;
  balance_gp: number;
  emergency_refill_used: boolean;
  predictions_count: number;
  correct_predictions_count: number;
};

type Season = {
  id: number;
  title: string;
  slug: string;
  start_at: string;
  end_at: string;
  starting_balance: number;
  minimum_predictions_for_prize: number;
};

type SeasonRank = {
  rank: number;
  season_id: number;
  user_id: string;
  username: string | null;
  balance_gp: number;
  accuracy: number;
  resolved_events_count: number;
  successful_events_count: number;
};

type PredictionStatus =
  | "active"
  | "won"
  | "lost"
  | "refunded"
  | "void";

type PredictionSide =
  | "yes"
  | "no";

type PredictionEvent = {
  title: string;
  slug: string;
};

type Prediction = {
  id: number;

  event_id: number;

  prediction_side:
    PredictionSide;

  stake_amount: number;

  odds_at_purchase: number;

  potential_payout: number;

  actual_payout:
    number | null;

  status:
    PredictionStatus;

  placed_at: string;

  resolved_at:
    string | null;

  event:
    PredictionEvent | null;
};

// ===========================================================
// EMAIL
// ===========================================================

function isTechnicalEmail(
  email?: string | null
) {
  return Boolean(
    email?.endsWith(
      "@prognosis.local"
    )
  );
}

// ===========================================================
// PAGE
// ===========================================================

export default function ProfilePage() {
  const router =
    useRouter();

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    profile,
    setProfile,
  ] =
    useState<Profile | null>(
      null
    );

  const [
    participant,
    setParticipant,
  ] =
    useState<SeasonParticipant | null>(
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
    seasonRank,
    setSeasonRank,
  ] =
    useState<SeasonRank | null>(
      null
    );

  const [
    predictions,
    setPredictions,
  ] =
    useState<Prediction[]>(
      []
    );

  const [
    username,
    setUsername,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    isSavingEmail,
    setIsSavingEmail,
  ] =
    useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(false);

  const [
    isClaimingRefill,
    setIsClaimingRefill,
  ] =
    useState(false);

  const [
    refillError,
    setRefillError,
  ] =
    useState("");

  const [
    refillSuccess,
    setRefillSuccess,
  ] =
    useState("");

  const [
    deleteError,
    setDeleteError,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  const [
    emailError,
    setEmailError,
  ] =
    useState("");

  const [
    emailSuccess,
    setEmailSuccess,
  ] =
    useState("");

  // =========================================================
  // LOAD PROFILE
  // =========================================================

  useEffect(() => {
    const supabase =
      createClient();

    let cancelled =
      false;

    async function loadProfile() {
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
          error:
            userError,
        } =
          await supabase.auth.getUser();

        if (
          cancelled
        ) {
          return;
        }

        if (
          userError ||
          !currentUser
        ) {
          router.replace(
            "/login"
          );

          return;
        }

        setUser(
          currentUser
        );

        if (
          !isTechnicalEmail(
            currentUser.email
          )
        ) {
          setEmail(
            currentUser.email ??
              ""
          );
        }

        // ===================================================
        // PROFILE
        // ===================================================

        const {
          data:
            profileData,
          error:
            profileError,
        } =
          await supabase
            .from(
              "profiles"
            )
            .select(
              `
                id,
                username,
                age_confirmed,
                created_at
              `
            )
            .eq(
              "id",
              currentUser.id
            )
            .single();

        if (
          cancelled
        ) {
          return;
        }

        if (
          profileError
        ) {
          console.error(
            "Profile loading error:",
            profileError
          );

          setError(
            `Ошибка профиля: ${profileError.message}`
          );

          return;
        }

        setProfile(
          profileData
        );

        setUsername(
          profileData.username ??
            ""
        );

        // ===================================================
        // ACTIVE SEASON
        //
        // Отсутствие active season является нормальным
        // состоянием между сезонами.
        // ===================================================

        const {
          data:
            activeSeasonData,
          error:
            activeSeasonError,
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
                starting_balance,
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
          activeSeasonError
        ) {
          console.error(
            "Active season loading error:",
            activeSeasonError
          );

          /*
           * Ошибка загрузки сезона не должна
           * уничтожать весь профиль.
           */
          setSeason(
            null
          );

          setParticipant(
            null
          );

          setSeasonRank(
            null
          );
        } else if (
          !activeSeasonData
        ) {
          /*
           * Сейчас между сезонами.
           */
          setSeason(
            null
          );

          setParticipant(
            null
          );

          setSeasonRank(
            null
          );
        } else {
          const activeSeason:
            Season = {
            id:
              Number(
                activeSeasonData.id
              ),

            title:
              String(
                activeSeasonData.title
              ),

            slug:
              String(
                activeSeasonData.slug
              ),

            start_at:
              String(
                activeSeasonData.start_at
              ),

            end_at:
              String(
                activeSeasonData.end_at
              ),

            starting_balance:
              Number(
                activeSeasonData.starting_balance
              ),

            minimum_predictions_for_prize:
              Number(
                activeSeasonData.minimum_predictions_for_prize
              ),
          };

          setSeason(
            activeSeason
          );

          // =================================================
          // ENSURE ACTIVE SEASON PARTICIPANT
          // =================================================

          const {
            error:
              participantEnsureError,
          } =
            await supabase.rpc(
              "ensure_active_season_participant",
              {
                p_user_id:
                  currentUser.id,
              }
            );

          if (
            participantEnsureError
          ) {
            /*
             * Возможна гонка:
             * сезон завершился между запросами.
             */
            if (
              participantEnsureError.message ===
              "ACTIVE_SEASON_NOT_FOUND"
            ) {
              setSeason(
                null
              );

              setParticipant(
                null
              );

              setSeasonRank(
                null
              );
            } else {
              console.error(
                "Season participant ensure error:",
                participantEnsureError
              );

              setParticipant(
                null
              );

              setSeasonRank(
                null
              );
            }
          } else {
            // ===============================================
            // LOAD PARTICIPANT FOR EXACT ACTIVE SEASON
            // ===============================================

            const {
              data:
                participantData,
              error:
                participantError,
            } =
              await supabase
                .from(
                  "season_participants"
                )
                .select(
                  `
                    id,
                    season_id,
                    user_id,
                    balance_gp,
                    emergency_refill_used,
                    predictions_count,
                    correct_predictions_count
                  `
                )
                .eq(
                  "user_id",
                  currentUser.id
                )
                .eq(
                  "season_id",
                  activeSeason.id
                )
                .maybeSingle();

            if (
              participantError
            ) {
              console.error(
                "Season participant loading error:",
                participantError
              );

              setParticipant(
                null
              );

              setSeasonRank(
                null
              );
            } else if (
              participantData
            ) {
              setParticipant({
                id:
                  Number(
                    participantData.id
                  ),

                season_id:
                  Number(
                    participantData.season_id
                  ),

                user_id:
                  String(
                    participantData.user_id
                  ),

                balance_gp:
                  Number(
                    participantData.balance_gp
                  ),

                emergency_refill_used:
                  Boolean(
                    participantData.emergency_refill_used
                  ),

                predictions_count:
                  Number(
                    participantData.predictions_count
                  ),

                correct_predictions_count:
                  Number(
                    participantData.correct_predictions_count
                  ),
              });

              // =============================================
              // MY RANK
              // =============================================

              const {
                data:
                  rankData,
                error:
                  rankError,
              } =
                await supabase.rpc(
                  "get_my_season_rank",
                  {
                    p_season_id:
                      activeSeason.id,
                  }
                );

              if (
                rankError
              ) {
                console.error(
                  "Season rank loading error:",
                  rankError
                );

                setSeasonRank(
                  null
                );
              } else {
                const rankRow =
                  Array.isArray(
                    rankData
                  )
                    ? rankData[0]
                    : rankData;

                setSeasonRank(
                  rankRow
                    ? {
                        rank:
                          Number(
                            rankRow.rank
                          ),

                        season_id:
                          Number(
                            rankRow.season_id
                          ),

                        user_id:
                          String(
                            rankRow.user_id
                          ),

                        username:
                          rankRow.username ??
                          null,

                        balance_gp:
                          Number(
                            rankRow.balance_gp
                          ),

                        accuracy:
                          Number(
                            rankRow.accuracy
                          ),

                        resolved_events_count:
                          Number(
                            rankRow.resolved_events_count
                          ),

                        successful_events_count:
                          Number(
                            rankRow.successful_events_count
                          ),
                      }
                    : null
                );
              }
            } else {
              setParticipant(
                null
              );

              setSeasonRank(
                null
              );
            }
          }
        }

        // ===================================================
        // PREDICTIONS HISTORY
        //
        // Загружается независимо от наличия активного сезона.
        // ===================================================

        const {
          data:
            predictionsData,
          error:
            predictionsError,
        } =
          await supabase
            .from(
              "predictions"
            )
            .select(
              `
                id,
                event_id,
                prediction_side,
                stake_amount,
                odds_at_purchase,
                potential_payout,
                actual_payout,
                status,
                placed_at,
                resolved_at,

                event:events!predictions_event_id_fkey (
                  title,
                  slug
                )
              `
            )
            .eq(
              "user_id",
              currentUser.id
            )
            .order(
              "placed_at",
              {
                ascending:
                  false,
              }
            );

        if (
          cancelled
        ) {
          return;
        }

        if (
          predictionsError
        ) {
          console.error(
            "Predictions history loading error:",
            predictionsError
          );

          setPredictions(
            []
          );
        } else {
          setPredictions(
            (
              predictionsData ??
              []
            ) as unknown as Prediction[]
          );
        }
      } catch (
        unexpectedError
      ) {
        console.error(
          "Profile loading unexpected error:",
          unexpectedError
        );

        if (
          !cancelled
        ) {
          setError(
            "Не удалось загрузить профиль."
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

    void loadProfile();

    return () => {
      cancelled =
        true;
    };
  }, [
    router,
  ]);

  // =========================================================
  // SAVE USERNAME
  // =========================================================

  async function handleSave(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !user
    ) {
      return;
    }

    const normalizedUsername =
      username.trim();

    if (
      normalizedUsername.length <
      3
    ) {
      setError(
        "Имя пользователя должно содержать минимум 3 символа."
      );

      return;
    }

    if (
      normalizedUsername.length >
      20
    ) {
      setError(
        "Имя пользователя не должно быть длиннее 20 символов."
      );

      return;
    }

    if (
      !/^[a-zA-Z0-9_]+$/.test(
        normalizedUsername
      )
    ) {
      setError(
        "Используйте только латинские буквы, цифры и знак подчёркивания."
      );

      return;
    }

    setIsSaving(
      true
    );

    try {
      const supabase =
        createClient();

      const {
        data,
        error:
          updateError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .update({
            username:
              normalizedUsername,
          })
          .eq(
            "id",
            user.id
          )
          .select(
            `
              id,
              username,
              age_confirmed,
              created_at
            `
          )
          .single();

      if (
        updateError
      ) {
        console.error(
          "Profile update error:",
          updateError
        );

        if (
          updateError.code ===
          "23505"
        ) {
          setError(
            "Это имя пользователя уже занято."
          );
        } else {
          setError(
            "Не удалось сохранить изменения."
          );
        }

        return;
      }

      setProfile(
        data
      );

      setUsername(
        data.username ??
          ""
      );

      setSuccess(
        "Профиль обновлён."
      );
    } catch (
      saveError
    ) {
      console.error(
        "Profile save error:",
        saveError
      );

      setError(
        "Не удалось сохранить изменения."
      );
    } finally {
      setIsSaving(
        false
      );
    }
  }

  // =========================================================
  // SAVE EMAIL
  // =========================================================

  async function handleEmailSave(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setEmailError("");
    setEmailSuccess("");

    if (
      !user
    ) {
      return;
    }

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !normalizedEmail
    ) {
      setEmailError(
        "Введите email."
      );

      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        normalizedEmail
      )
    ) {
      setEmailError(
        "Введите корректный email."
      );

      return;
    }

    if (
      normalizedEmail.endsWith(
        "@prognosis.local"
      )
    ) {
      setEmailError(
        "Этот адрес нельзя использовать."
      );

      return;
    }

    if (
      user.email?.toLowerCase() ===
      normalizedEmail
    ) {
      setEmailError(
        "Этот email уже используется в аккаунте."
      );

      return;
    }

    setIsSavingEmail(
      true
    );

    try {
      const supabase =
        createClient();

      const {
        data,
        error:
          updateEmailError,
      } =
        await supabase.auth.updateUser(
          {
            email:
              normalizedEmail,
          }
        );

      if (
        updateEmailError
      ) {
        console.error(
          "Email update error:",
          updateEmailError
        );

        const message =
          updateEmailError.message.toLowerCase();

        if (
          message.includes(
            "already registered"
          ) ||
          message.includes(
            "already been registered"
          ) ||
          message.includes(
            "already exists"
          )
        ) {
          setEmailError(
            "Этот email уже используется другим аккаунтом."
          );
        } else {
          setEmailError(
            "Не удалось добавить email. Попробуйте ещё раз."
          );
        }

        return;
      }

      if (
        data.user
      ) {
        setUser(
          data.user
        );
      }

      setEmailSuccess(
        "На указанный email отправлено письмо. Перейдите по ссылке в письме, чтобы подтвердить адрес."
      );
    } catch (
      saveEmailError
    ) {
      console.error(
        "Email save error:",
        saveEmailError
      );

      setEmailError(
        "Не удалось добавить email. Попробуйте ещё раз."
      );
    } finally {
      setIsSavingEmail(
        false
      );
    }
  }

  // =========================================================
  // EMERGENCY REFILL
  // =========================================================

  async function handleEmergencyRefill() {
    if (
      !participant ||
      isClaimingRefill
    ) {
      return;
    }

    setRefillError("");
    setRefillSuccess("");

    if (
      participant.emergency_refill_used
    ) {
      setRefillError(
        "Экстренное пополнение уже использовано в этом сезоне."
      );

      return;
    }

    if (
      participant.balance_gp !==
      0
    ) {
      setRefillError(
        "Экстренное пополнение доступно только при нулевом балансе GP."
      );

      return;
    }

    setIsClaimingRefill(
      true
    );

    try {
      const supabase =
        createClient();

      const {
        data,
        error:
          refillRpcError,
      } =
        await supabase.rpc(
          "claim_emergency_bonus"
        );

      if (
        refillRpcError
      ) {
        console.error(
          "Emergency refill error:",
          refillRpcError
        );

        const message =
          refillRpcError.message.toLowerCase();

        if (
          message.includes(
            "already been used"
          ) ||
          message.includes(
            "already been processed"
          )
        ) {
          setParticipant(
            (
              current
            ) =>
              current
                ? {
                    ...current,

                    emergency_refill_used:
                      true,
                  }
                : current
          );

          setRefillError(
            "Экстренное пополнение уже использовано в этом сезоне."
          );
        } else if (
          message.includes(
            "balance is zero"
          )
        ) {
          setRefillError(
            "Пополнение доступно только при нулевом балансе."
          );
        } else {
          setRefillError(
            "Не удалось получить GP. Попробуйте ещё раз."
          );
        }

        return;
      }

      const refillRow =
        Array.isArray(
          data
        )
          ? data[0]
          : data;

      if (
        !refillRow
      ) {
        setRefillError(
          "Не удалось получить данные пополнения."
        );

        return;
      }

      setParticipant(
        (
          current
        ) =>
          current
            ? {
                ...current,

                balance_gp:
                  Number(
                    refillRow.balance_gp
                  ),

                emergency_refill_used:
                  Boolean(
                    refillRow.emergency_refill_used
                  ),
              }
            : current
      );

      setRefillSuccess(
        `Баланс пополнен на ${Number(
          refillRow.bonus_amount
        ).toLocaleString(
          "ru-RU"
        )} GP.`
      );

      notifySeasonParticipantRefresh();
    } catch (
      refillUnexpectedError
    ) {
      console.error(
        "Emergency refill unexpected error:",
        refillUnexpectedError
      );

      setRefillError(
        "Не удалось получить GP. Попробуйте ещё раз."
      );
    } finally {
      setIsClaimingRefill(
        false
      );
    }
  }

  // =========================================================
  // DELETE ACCOUNT
  // =========================================================

  async function handleDeleteAccount() {
    setDeleteError("");

    if (
      !user ||
      isDeleting
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Удалить аккаунт prognosis.io?\n\n" +
          "Профиль и данные участия в сезонах будут удалены. " +
          "Это действие нельзя отменить."
      );

    if (
      !confirmed
    ) {
      return;
    }

    setIsDeleting(
      true
    );

    try {
      const supabase =
        createClient();

      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.access_token
      ) {
        setDeleteError(
          "Не удалось подтвердить текущую сессию. Войдите в аккаунт заново."
        );

        return;
      }

      const response =
        await fetch(
          "/api/account/delete",
          {
            method:
              "DELETE",

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        );

      let result: {
        success?: boolean;
        message?: string;
      } = {};

      if (
        contentType?.includes(
          "application/json"
        )
      ) {
        result =
          await response.json();
      }

      if (
        !response.ok
      ) {
        console.error(
          "Delete account API error:",
          response.status,
          response.statusText
        );

        setDeleteError(
          result.message ??
            `Не удалось удалить аккаунт. Ошибка сервера (${response.status}).`
        );

        return;
      }

      await supabase.auth.signOut();

      router.replace(
        "/"
      );

      router.refresh();
    } catch (
      deleteAccountError
    ) {
      console.error(
        "Delete account error:",
        deleteAccountError
      );

      setDeleteError(
        "Не удалось удалить аккаунт. Попробуйте ещё раз."
      );
    } finally {
      setIsDeleting(
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
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-white/40">
            Загрузка профиля...
          </p>
        </div>
      </main>
    );
  }

  // =========================================================
  // PROFILE ERROR
  //
  // participant / season больше НЕ являются обязательными.
  // =========================================================

  if (
    !user ||
    !profile
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-5">
            <p className="text-sm text-red-300">
              {error ||
                "Профиль недоступен."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // DERIVED DATA
  // =========================================================

  const registrationDate =
    new Intl.DateTimeFormat(
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
        profile.created_at
      )
    );

  const hasRealEmail =
    Boolean(
      user.email
    ) &&
    !isTechnicalEmail(
      user.email
    );

  const accuracyText =
    seasonRank &&
    seasonRank.resolved_events_count >
      0
      ? `${Number(
          seasonRank.accuracy
        ).toLocaleString(
          "ru-RU",
          {
            maximumFractionDigits:
              1,
          }
        )}%`
      : "—";

  const hasActiveSeason =
    Boolean(
      season &&
      participant
    );

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-[-350px] h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.07] blur-[150px]"
        aria-hidden="true"
      />

      <div className="container-page relative py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">

          {/* PROFILE HEADER */}

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
              Профиль
            </p>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              {profile.username ??
                "Новый участник"}
            </h1>

            <p className="mt-3 text-sm text-white/40">
              Участник prognosis.io с{" "}
              {
                registrationDate
              }
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">

              {/* PROFILE DATA */}

              <section className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6 sm:p-8">
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
                    Данные профиля
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/40">
                    Имя пользователя отображается в рейтинге и истории прогнозов.
                  </p>
                </div>

                <form
                  onSubmit={
                    handleSave
                  }
                  className="mt-8"
                >
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-white/70"
                  >
                    Имя пользователя
                  </label>

                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-white/25">
                      @
                    </span>

                    <input
                      id="username"
                      type="text"
                      value={
                        username
                      }
                      onChange={(
                        event
                      ) =>
                        setUsername(
                          event.target.value
                        )
                      }
                      placeholder="username"
                      autoComplete="username"
                      maxLength={
                        20
                      }
                      className="min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] pl-8 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60"
                    />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-white/30">
                    3–20 символов. Латинские буквы, цифры и знак подчёркивания.
                  </p>

                  {error && (
                    <div className="mt-5 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-300">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm leading-5 text-emerald-300">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      isSaving
                    }
                    className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#7383ff] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving
                      ? "Сохраняем..."
                      : "Сохранить"}
                  </button>
                </form>
              </section>

              {/* EMAIL */}

              <section className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
                      Email
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
                      Email понадобится для восстановления доступа и связи с вами при необходимости.
                    </p>
                  </div>

                  {hasRealEmail ? (
                    <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-xs font-medium text-emerald-300">
                      Добавлен
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/35">
                      Не указан
                    </span>
                  )}
                </div>

                {hasRealEmail ? (
                  <div className="mt-6">
                    <label className="text-sm font-medium text-white/70">
                      Текущий email
                    </label>

                    <div className="mt-2 flex min-h-12 items-center rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 text-sm text-white">
                      {
                        user.email
                      }
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={
                      handleEmailSave
                    }
                    className="mt-6"
                  >
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-white/70"
                    >
                      Email
                    </label>

                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={
                        email
                      }
                      onChange={(
                        event
                      ) => {
                        setEmail(
                          event.target.value
                        );

                        setEmailError("");

                        setEmailSuccess("");
                      }}
                      placeholder="name@example.com"
                      className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60"
                    />

                    <p className="mt-2 text-xs leading-5 text-white/30">
                      Мы отправим письмо для подтверждения адреса.
                    </p>

                    {emailError && (
                      <div className="mt-5 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-300">
                        {emailError}
                      </div>
                    )}

                    {emailSuccess && (
                      <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm leading-5 text-emerald-300">
                        {emailSuccess}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        isSavingEmail
                      }
                      className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#7383ff] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSavingEmail
                        ? "Отправляем..."
                        : "Добавить email"}
                    </button>
                  </form>
                )}
              </section>
            </div>

            {/* RIGHT COLUMN */}

            <aside className="space-y-4">

              {/* CURRENT SEASON */}

              {hasActiveSeason &&
              season &&
              participant ? (
                <section className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-medium uppercase tracking-[0.13em] text-white/35">
                      Текущий сезон
                    </p>

                    <span className="text-xs font-medium text-[#8f9aff]">
                      {
                        season.title
                      }
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="font-mono text-3xl font-medium tracking-[-0.04em] text-white">
                      {participant.balance_gp.toLocaleString(
                        "ru-RU"
                      )}{" "}
                      GP
                    </p>

                    <p className="mt-2 text-xs text-white/35">
                      текущий баланс
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-[#6577ff]/15 bg-[#6577ff]/[0.05] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs text-white/35">
                          Место в рейтинге
                        </p>

                        <p className="mt-1 font-mono text-2xl font-semibold text-white">
                          {seasonRank
                            ? `#${seasonRank.rank}`
                            : "—"}
                        </p>
                      </div>

                      <Link
                        href="/leaders"
                        className="rounded-xl border border-[#6577ff]/20 bg-[#6577ff]/[0.06] px-3 py-2 text-xs font-medium text-[#aeb7ff] transition hover:bg-[#6577ff]/[0.1]"
                      >
                        Рейтинг
                      </Link>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-5">
                    <div>
                      <p className="font-mono text-lg text-white">
                        {
                          accuracyText
                        }
                      </p>

                      <p className="mt-1 text-xs text-white/30">
                        точность
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-lg text-white">
                        {seasonRank?.resolved_events_count ??
                          0}
                      </p>

                      <p className="mt-1 text-xs text-white/30">
                        событий
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-lg text-white">
                        {
                          participant.predictions_count
                        }
                      </p>

                      <p className="mt-1 text-xs text-white/30">
                        прогнозов
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/[0.07] pt-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-white/35">
                        Для участия в призах
                      </span>

                      <span className="text-xs font-medium text-white/55">
                        {seasonRank?.resolved_events_count ??
                          0}
                        {" / "}
                        {
                          season.minimum_predictions_for_prize
                        }{" "}
                        событий
                      </span>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.13em] text-white/35">
                    Текущий сезон
                  </p>

                  <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                    <p className="font-medium text-white/75">
                      Сейчас нет активного сезона
                    </p>

                    <p className="mt-2 text-sm leading-6 text-white/35">
                      Профиль и история прогнозов доступны как обычно.
                      Новый сезон появится здесь после его старта.
                    </p>

                    <Link
                      href="/archive"
                      className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 text-sm font-medium text-white/60 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      Архив сезонов
                    </Link>
                  </div>
                </section>
              )}

              {/* ACCOUNT */}

              <section className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6">
                <p className="text-xs font-medium uppercase tracking-[0.13em] text-white/35">
                  Аккаунт
                </p>

                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-white/40">
                      Возраст 18+
                    </span>

                    <span className="text-sm font-medium text-emerald-300/80">
                      {profile.age_confirmed
                        ? "Подтверждено"
                        : "Нет"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-white/40">
                      Email
                    </span>

                    <span
                      className={
                        hasRealEmail
                          ? "text-sm font-medium text-emerald-300/80"
                          : "text-sm font-medium text-white/40"
                      }
                    >
                      {hasRealEmail
                        ? "Добавлен"
                        : "Не указан"}
                    </span>
                  </div>

                  {participant && (
                    <div className="border-t border-white/[0.06] pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-white/40">
                          Экстренное пополнение
                        </span>

                        <span
                          className={
                            participant.emergency_refill_used
                              ? "text-sm font-medium text-white/35"
                              : participant.balance_gp ===
                                  0
                                ? "text-sm font-medium text-[#aeb7ff]"
                                : "text-sm font-medium text-white/50"
                          }
                        >
                          {participant.emergency_refill_used
                            ? "Использовано"
                            : participant.balance_gp ===
                                0
                              ? "Доступно"
                              : "При 0 GP"}
                        </span>
                      </div>

                      {!participant.emergency_refill_used &&
                        participant.balance_gp ===
                          0 && (
                          <div className="mt-4">
                            <p className="text-xs leading-5 text-white/30">
                              Один раз за сезон можно получить 1 000 GP,
                              если баланс полностью исчерпан.
                            </p>

                            <button
                              type="button"
                              onClick={
                                handleEmergencyRefill
                              }
                              disabled={
                                isClaimingRefill
                              }
                              className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl border border-[#6577ff]/25 bg-[#6577ff]/[0.08] px-4 text-sm font-semibold text-[#b8c0ff] transition-colors hover:border-[#6577ff]/40 hover:bg-[#6577ff]/[0.13] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isClaimingRefill
                                ? "Начисляем..."
                                : "Получить 1 000 GP"}
                            </button>
                          </div>
                        )}

                      {refillError && (
                        <div className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-xs leading-5 text-red-300">
                          {refillError}
                        </div>
                      )}

                      {refillSuccess && (
                        <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-xs leading-5 text-emerald-300">
                          {refillSuccess}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* DELETE */}

              <section className="rounded-3xl border border-red-400/10 bg-[#0d0f15]/90 p-6">
                <p className="text-xs font-medium uppercase tracking-[0.13em] text-red-300/60">
                  Удаление аккаунта
                </p>

                <p className="mt-4 text-sm leading-6 text-white/35">
                  После удаления аккаунта восстановить профиль и данные
                  участия будет невозможно.
                </p>

                {deleteError && (
                  <div className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-300">
                    {deleteError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    handleDeleteAccount
                  }
                  disabled={
                    isDeleting
                  }
                  className="mt-5 flex min-h-11 w-full items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 text-sm font-medium text-red-300 transition-colors hover:border-red-400/30 hover:bg-red-400/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting
                    ? "Удаляем..."
                    : "Удалить аккаунт"}
                </button>
              </section>
            </aside>
          </div>

          {/* PREDICTION HISTORY */}

          <section className="mt-6 rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#8f9aff]">
                  История
                </p>

                <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-white sm:text-2xl">
                  Ваши прогнозы
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  Все размещённые прогнозы и их результаты.
                </p>
              </div>

              <span className="text-sm text-white/30">
                {
                  predictions.length
                }{" "}
                {getPredictionsLabel(
                  predictions.length
                )}
              </span>
            </div>

            {predictions.length >
            0 ? (
              <div className="mt-7 space-y-3">
                {predictions.map(
                  (
                    prediction
                  ) => (
                    <PredictionHistoryCard
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
              <div className="mt-7 rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.015] px-6 py-12 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-lg text-white/40">
                  ◈
                </div>

                <p className="mt-4 font-medium text-white">
                  Пока нет прогнозов
                </p>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
                  После начала нового сезона здесь появятся новые
                  прогнозы. История предыдущих сезонов сохраняется.
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
// PREDICTION HISTORY CARD
// ===========================================================

function PredictionHistoryCard({
  prediction,
}: {
  prediction:
    Prediction;
}) {
  const status =
    getPredictionStatus(
      prediction.status
    );

  const placedAt =
    formatPredictionDate(
      prediction.placed_at
    );

  const sideIsYes =
    prediction.prediction_side ===
    "yes";

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-white/[0.11] hover:bg-white/[0.027] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                sideIsYes
                  ? "rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-xs font-semibold text-emerald-300"
                  : "rounded-full border border-red-400/15 bg-red-400/[0.06] px-2.5 py-1 text-xs font-semibold text-red-300"
              }
            >
              {sideIsYes
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

          {prediction.event ? (
            <Link
              href={`/events/${prediction.event.slug}`}
              className="mt-3 block max-w-2xl text-base font-semibold leading-6 text-white transition hover:text-[#aeb7ff]"
            >
              {
                prediction.event.title
              }
            </Link>
          ) : (
            <p className="mt-3 text-base font-semibold text-white">
              Событие #
              {
                prediction.event_id
              }
            </p>
          )}

          <p className="mt-2 text-xs text-white/30">
            {
              placedAt
            }
          </p>
        </div>

        <div className="shrink-0 sm:text-right">
          <p className="font-mono text-lg font-semibold text-white">
            {formatGp(
              prediction.stake_amount
            )}
          </p>

          <p className="mt-1 text-xs text-white/30">
            сумма прогноза
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-4">
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
          label="Результат"
          value={
            getPredictionResultText(
              prediction
            )
          }
        />
      </div>
    </div>
  );
}

// ===========================================================
// PREDICTION METRIC
// ===========================================================

function PredictionMetric({
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
      <p className="text-xs text-white/30">
        {
          label
        }
      </p>

      <p className="mt-1 font-mono text-sm font-medium text-white/75">
        {
          value
        }
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
  switch (
    status
  ) {
    case "won":
      return {
        label:
          "Точный прогноз",

        className:
          "rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-xs font-medium text-emerald-300",
      };

    case "lost":
      return {
        label:
          "Не сбылся",

        className:
          "rounded-full border border-red-400/15 bg-red-400/[0.06] px-2.5 py-1 text-xs font-medium text-red-300",
      };

    case "refunded":
    case "void":
      return {
        label:
          "Возврат",

        className:
          "rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-2.5 py-1 text-xs font-medium text-amber-200",
      };

    default:
      return {
        label:
          "Активен",

        className:
          "rounded-full border border-[#8f9aff]/20 bg-[#6577ff]/[0.07] px-2.5 py-1 text-xs font-medium text-[#aeb7ff]",
      };
  }
}

// ===========================================================
// RESULT TEXT
// ===========================================================

function getPredictionResultText(
  prediction:
    Prediction
) {
  switch (
    prediction.status
  ) {
    case "won":
      return "Верно";

    case "lost":
      return "Неверно";

    case "refunded":
    case "void":
      return "Возврат";

    default:
      return "Ожидается";
  }
}

// ===========================================================
// DATE
// ===========================================================

function formatPredictionDate(
  value:
    string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      day:
        "numeric",

      month:
        "short",

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
// PREDICTIONS LABEL
// ===========================================================

function getPredictionsLabel(
  count:
    number
) {
  const lastTwoDigits =
    count %
    100;

  const lastDigit =
    count %
    10;

  if (
    lastTwoDigits >=
      11 &&
    lastTwoDigits <=
      14
  ) {
    return "прогнозов";
  }

  if (
    lastDigit ===
    1
  ) {
    return "прогноз";
  }

  if (
    lastDigit >=
      2 &&
    lastDigit <=
      4
  ) {
    return "прогноза";
  }

  return "прогнозов";
}