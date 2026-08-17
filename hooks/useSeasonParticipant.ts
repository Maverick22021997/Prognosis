"use client";

import {
  useCallback,
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

export interface SeasonParticipant {
  season_id: number;
  balance_gp: number;
  points: number;
  predictions_count: number;
  correct_predictions_count: number;
  emergency_refill_used: boolean;
}

type ActiveSeason = {
  id: number;
};

export const SEASON_PARTICIPANT_REFRESH_EVENT =
  "prognosis:season-participant-refresh";

export function notifySeasonParticipantRefresh() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      SEASON_PARTICIPANT_REFRESH_EVENT
    )
  );
}

export function useSeasonParticipant() {
  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
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
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const refresh =
    useCallback(
      async () => {
        setIsLoading(
          true
        );

        try {
          // =================================================
          // SESSION
          // =================================================

          const {
            data: {
              session,
            },
            error:
              sessionError,
          } =
            await supabase.auth.getSession();

          if (
            sessionError
          ) {
            console.error(
              "Session loading error:",
              sessionError
            );

            setUser(
              null
            );

            setParticipant(
              null
            );

            return;
          }

          // Guest = normal state

          if (
            !session
          ) {
            setUser(
              null
            );

            setParticipant(
              null
            );

            return;
          }

          // =================================================
          // USER
          // =================================================

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
            userError ||
            !currentUser
          ) {
            if (
              userError &&
              userError.name !==
                "AuthSessionMissingError"
            ) {
              console.error(
                "User loading error:",
                userError
              );
            }

            setUser(
              null
            );

            setParticipant(
              null
            );

            return;
          }

          setUser(
            currentUser
          );

          // =================================================
          // ACTIVE SEASON
          //
          // Между сезонами отсутствие active season —
          // нормальное состояние.
          // =================================================

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
                "id"
              )
              .maybeSingle();

          if (
            activeSeasonError
          ) {
            console.error(
              "Active season loading error:",
              activeSeasonError
            );

            setParticipant(
              null
            );

            return;
          }

          const activeSeason =
            activeSeasonData as
              | ActiveSeason
              | null;

          if (
            !activeSeason
          ) {
            setParticipant(
              null
            );

            return;
          }

          // =================================================
          // ENSURE PARTICIPANT
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
             * сезон мог закончиться между запросом
             * v_active_season и RPC.
             *
             * Это тоже нормальное состояние.
             */
            if (
              participantEnsureError.message ===
              "ACTIVE_SEASON_NOT_FOUND"
            ) {
              setParticipant(
                null
              );

              return;
            }

            console.error(
              "ensure_active_season_participant error:",
              participantEnsureError
            );

            setParticipant(
              null
            );

            return;
          }

          // =================================================
          // PARTICIPANT FOR EXACT ACTIVE SEASON
          // =================================================

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
              .select(`
                season_id,
                balance_gp,
                points,
                predictions_count,
                correct_predictions_count,
                emergency_refill_used
              `)
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

            return;
          }

          setParticipant(
            (
              participantData ??
              null
            ) as SeasonParticipant | null
          );
        } catch (
          error
        ) {
          console.error(
            "Unexpected season participant error:",
            error
          );

          setUser(
            null
          );

          setParticipant(
            null
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        supabase,
      ]
    );

  // =========================================================
  // INITIAL LOAD + AUTH CHANGES
  // =========================================================

  useEffect(() => {
    void refresh();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        () => {
          window.setTimeout(
            () => {
              void refresh();
            },
            0
          );
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [
    refresh,
    supabase,
  ]);

  // =========================================================
  // GLOBAL PARTICIPANT REFRESH
  // =========================================================

  useEffect(() => {
    function handleRefresh() {
      void refresh();
    }

    window.addEventListener(
      SEASON_PARTICIPANT_REFRESH_EVENT,
      handleRefresh
    );

    return () => {
      window.removeEventListener(
        SEASON_PARTICIPANT_REFRESH_EVENT,
        handleRefresh
      );
    };
  }, [
    refresh,
  ]);

  return {
    user,

    participant,

    /*
     * null означает:
     * активного сезона сейчас нет
     * или пользователь ещё не участник.
     */
    balanceGp:
      participant?.balance_gp ??
      null,

    points:
      participant?.points ??
      0,

    predictionsCount:
      participant?.predictions_count ??
      0,

    correctPredictionsCount:
      participant?.correct_predictions_count ??
      0,

    emergencyRefillUsed:
      participant?.emergency_refill_used ??
      false,

    isLoading,

    refresh,
  };
}