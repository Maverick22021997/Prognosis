"use client";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase-browser";

type SeasonStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "closing"
  | "finished"
  | "cancelled";

type EventStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "closed"
  | "resolving"
  | "resolved"
  | "cancelled"
  | "void";

type Season = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  start_at: string;
  end_at: string;
  status: SeasonStatus;
  starting_balance: number;
  minimum_predictions_for_prize: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

type StaffUser = {
  user_id: string;
  role: string;
};

type SeasonEvent = {
  id: number;
  season_id: number;
  status: EventStatus;
};

type SeasonPrize = {
  id: number;
  season_id: number;
  place: number;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type LeaderboardRow = {
  rank: number;
  participant_id: number;
  season_id: number;
  user_id: string;
  username: string;
  balance_gp: number;
  accuracy: number;
  resolved_events_count: number;
  successful_events_count: number;
};

type PreviewWinner = {
  place: number;
  user_id: string;
  username: string;
  balance_gp: number;
  accuracy: number;
  resolved_events_count: number;
};

type PrizeDraft = {
  title: string;
  description: string;
};

export default function AdminSeasonsPage() {
  const router =
    useRouter();

  const [
    seasons,
    setSeasons,
  ] =
    useState<Season[]>(
      []
    );

  const [
    seasonEvents,
    setSeasonEvents,
  ] =
    useState<SeasonEvent[]>(
      []
    );

  const [
    seasonPrizes,
    setSeasonPrizes,
  ] =
    useState<SeasonPrize[]>(
      []
    );

  const [
    prizeDrafts,
    setPrizeDrafts,
  ] =
    useState<
      Record<
        string,
        PrizeDraft
      >
    >({});

  const [
    previewWinners,
    setPreviewWinners,
  ] =
    useState<
      Record<
        number,
        PreviewWinner[]
      >
    >({});

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isAdmin,
    setIsAdmin,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    actionSeasonId,
    setActionSeasonId,
  ] =
    useState<number | null>(
      null
    );

  const [
    prizeActionKey,
    setPrizeActionKey,
  ] =
    useState<string | null>(
      null
    );

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

  // =========================================================
  // FORM
  // =========================================================

  const [
    editingSeasonId,
    setEditingSeasonId,
  ] =
    useState<number | null>(
      null
    );

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    slug,
    setSlug,
  ] =
    useState("");

  const [
    slugTouched,
    setSlugTouched,
  ] =
    useState(false);

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    startAt,
    setStartAt,
  ] =
    useState("");

  const [
    endAt,
    setEndAt,
  ] =
    useState("");

  const [
    startingBalance,
    setStartingBalance,
  ] =
    useState("25000");

  const [
    minimumPredictions,
    setMinimumPredictions,
  ] =
    useState("3");

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    const supabase =
      createClient();

    setIsLoading(true);
    setError("");

    try {
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
      // ADMIN
      // =====================================================

      const {
        data:
          staffData,
        error:
          staffError,
      } =
        await supabase
          .from(
            "staff_users"
          )
          .select(
            `
              user_id,
              role
            `
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (
        staffError
      ) {
        setError(
          staffError.message
        );

        setIsLoading(
          false
        );

        return;
      }

      const staff =
        staffData as
          | StaffUser
          | null;

      if (
        !staff ||
        staff.role !==
          "admin"
      ) {
        setIsAdmin(
          false
        );

        setIsLoading(
          false
        );

        return;
      }

      setIsAdmin(
        true
      );

      // =====================================================
      // SEASONS
      // =====================================================

      const {
        data:
          seasonsData,
        error:
          seasonsError,
      } =
        await supabase
          .from(
            "seasons"
          )
          .select(
            `
              id,
              title,
              slug,
              description,
              start_at,
              end_at,
              status,
              starting_balance,
              minimum_predictions_for_prize,
              created_at,
              updated_at,
              closed_at
            `
          )
          .order(
            "start_at",
            {
              ascending:
                false,
            }
          );

      if (
        seasonsError
      ) {
        setError(
          seasonsError.message
        );

        setIsLoading(
          false
        );

        return;
      }

      const loadedSeasons =
        (
          seasonsData ??
          []
        ) as Season[];

      setSeasons(
        loadedSeasons
      );

      // =====================================================
      // EVENTS
      // =====================================================

      const {
        data:
          eventsData,
        error:
          eventsError,
      } =
        await supabase
          .from(
            "events"
          )
          .select(
            `
              id,
              season_id,
              status
            `
          );

      if (
        eventsError
      ) {
        console.error(
          "Season events loading error:",
          eventsError
        );
      } else {
        setSeasonEvents(
          (
            eventsData ??
            []
          ) as SeasonEvent[]
        );
      }

      // =====================================================
      // PRIZES
      // =====================================================

      const {
        data:
          prizesData,
        error:
          prizesError,
      } =
        await supabase
          .from(
            "season_prizes"
          )
          .select(
            `
              id,
              season_id,
              place,
              title,
              description,
              created_at,
              updated_at
            `
          )
          .order(
            "season_id",
            {
              ascending:
                true,
            }
          )
          .order(
            "place",
            {
              ascending:
                true,
            }
          );

      if (
        prizesError
      ) {
        console.error(
          "Season prizes loading error:",
          prizesError
        );
      } else {
        const loadedPrizes =
          (
            prizesData ??
            []
          ) as SeasonPrize[];

        setSeasonPrizes(
          loadedPrizes
        );

        const drafts:
          Record<
            string,
            PrizeDraft
          > = {};

        for (
          const season
          of loadedSeasons
        ) {
          for (
            const place
            of [
              1,
              2,
              3,
            ]
          ) {
            const prize =
              loadedPrizes.find(
                (
                  item
                ) =>
                  item.season_id ===
                    season.id &&
                  item.place ===
                    place
              );

            drafts[
              prizeKey(
                season.id,
                place
              )
            ] = {
              title:
                prize?.title ??
                "",

              description:
                prize?.description ??
                "",
            };
          }
        }

        setPrizeDrafts(
          drafts
        );
      }

      // =====================================================
      // PREVIEW TOP 3
      // =====================================================

      const seasonsForPreview =
        loadedSeasons.filter(
          (
            season
          ) =>
            season.status ===
              "active" ||
            season.status ===
              "closing"
        );

      const previews:
        Record<
          number,
          PreviewWinner[]
        > = {};

      for (
        const season
        of seasonsForPreview
      ) {
        const {
          data:
            leaderboardData,
          error:
            leaderboardError,
        } =
          await supabase.rpc(
            "get_season_leaderboard",
            {
              p_season_id:
                season.id,

              p_limit:
                100,
            }
          );

        if (
          leaderboardError
        ) {
          console.error(
            `Leaderboard preview season ${season.id}:`,
            leaderboardError
          );

          previews[
            season.id
          ] = [];

          continue;
        }

        const leaderboard =
          (
            leaderboardData ??
            []
          ) as LeaderboardRow[];

        previews[
          season.id
        ] =
          leaderboard
            .filter(
              (
                row
              ) =>
                row.resolved_events_count >=
                season.minimum_predictions_for_prize
            )
            .slice(
              0,
              3
            )
            .map(
              (
                row,
                index
              ) => ({
                place:
                  index +
                  1,

                user_id:
                  row.user_id,

                username:
                  row.username,

                balance_gp:
                  row.balance_gp,

                accuracy:
                  Number(
                    row.accuracy
                  ),

                resolved_events_count:
                  row.resolved_events_count,
              })
            );
      }

      setPreviewWinners(
        previews
      );

      setIsLoading(
        false
      );
    } catch (
      unexpectedError
    ) {
      console.error(
        "Seasons unexpected error:",
        unexpectedError
      );

      setError(
        "Не удалось загрузить управление сезонами."
      );

      setIsLoading(
        false
      );
    }
  }

  // =========================================================
  // CURRENT SEASON
  // =========================================================

  const activeSeason =
    useMemo(
      () =>
        seasons.find(
          (
            season
          ) =>
            season.status ===
            "active"
        ) ??
        null,
      [
        seasons,
      ]
    );

  const closingSeason =
    useMemo(
      () =>
        seasons.find(
          (
            season
          ) =>
            season.status ===
            "closing"
        ) ??
        null,
      [
        seasons,
      ]
    );

  const currentSeason =
    activeSeason ??
    closingSeason;

  // =========================================================
  // FORM HELPERS
  // =========================================================

  function handleTitleChange(
    value: string
  ) {
    setTitle(
      value
    );

    if (
      !slugTouched
    ) {
      setSlug(
        makeSlug(
          value
        )
      );
    }
  }

  function resetForm() {
    setEditingSeasonId(
      null
    );

    setTitle("");
    setSlug("");
    setDescription("");
    setStartAt("");
    setEndAt("");

    setStartingBalance(
      "25000"
    );

    setMinimumPredictions(
      "3"
    );

    setSlugTouched(
      false
    );
  }

  function handleEdit(
    season:
      Season
  ) {
    if (
      season.status !==
      "draft"
    ) {
      return;
    }

    setEditingSeasonId(
      season.id
    );

    setTitle(
      season.title
    );

    setSlug(
      season.slug
    );

    setDescription(
      season.description ??
        ""
    );

    setStartAt(
      toLocalInput(
        season.start_at
      )
    );

    setEndAt(
      toLocalInput(
        season.end_at
      )
    );

    setStartingBalance(
      String(
        season.starting_balance
      )
    );

    setMinimumPredictions(
      String(
        season.minimum_predictions_for_prize
      )
    );

    setSlugTouched(
      true
    );

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  // =========================================================
  // CREATE / UPDATE SEASON
  // =========================================================

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      isSaving
    ) {
      return;
    }

    setError("");
    setSuccess("");

    const normalizedTitle =
      title.trim();

    const normalizedSlug =
      slug
        .trim()
        .toLowerCase();

    const parsedBalance =
      Number(
        startingBalance
      );

    const parsedMinimum =
      Number(
        minimumPredictions
      );

    if (
      normalizedTitle.length <
      2
    ) {
      setError(
        "Название сезона должно содержать минимум 2 символа."
      );

      return;
    }

    if (
      normalizedTitle.length >
      100
    ) {
      setError(
        "Название сезона не должно превышать 100 символов."
      );

      return;
    }

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        normalizedSlug
      )
    ) {
      setError(
        "Slug может содержать только латинские буквы, цифры и дефисы."
      );

      return;
    }

    if (
      !startAt ||
      !endAt
    ) {
      setError(
        "Укажи даты начала и окончания сезона."
      );

      return;
    }

    if (
      new Date(
        endAt
      ) <=
      new Date(
        startAt
      )
    ) {
      setError(
        "Дата окончания должна быть позже даты начала сезона."
      );

      return;
    }

    if (
      !Number.isInteger(
        parsedBalance
      ) ||
      parsedBalance <= 0
    ) {
      setError(
        "Стартовый баланс должен быть положительным целым числом."
      );

      return;
    }

    if (
      !Number.isInteger(
        parsedMinimum
      ) ||
      parsedMinimum < 0
    ) {
      setError(
        "Минимальное число событий не может быть отрицательным."
      );

      return;
    }

    setIsSaving(
      true
    );

    try {
      const supabase =
        createClient();

      if (
        editingSeasonId
      ) {
        const {
          error:
            updateError,
        } =
          await supabase.rpc(
            "admin_update_season",
            {
              p_season_id:
                editingSeasonId,

              p_title:
                normalizedTitle,

              p_slug:
                normalizedSlug,

              p_description:
                description,

              p_start_at:
                new Date(
                  startAt
                ).toISOString(),

              p_end_at:
                new Date(
                  endAt
                ).toISOString(),

              p_starting_balance:
                parsedBalance,

              p_minimum_predictions_for_prize:
                parsedMinimum,
            }
          );

        if (
          updateError
        ) {
          setError(
            formatRpcError(
              updateError
            )
          );

          return;
        }

        setSuccess(
          "Сезон обновлён."
        );
      } else {
        const {
          error:
            createError,
        } =
          await supabase.rpc(
            "admin_create_season",
            {
              p_title:
                normalizedTitle,

              p_slug:
                normalizedSlug,

              p_description:
                description,

              p_start_at:
                new Date(
                  startAt
                ).toISOString(),

              p_end_at:
                new Date(
                  endAt
                ).toISOString(),

              p_starting_balance:
                parsedBalance,

              p_minimum_predictions_for_prize:
                parsedMinimum,
            }
          );

        if (
          createError
        ) {
          setError(
            formatRpcError(
              createError
            )
          );

          return;
        }

        setSuccess(
          "Черновик сезона создан."
        );
      }

      resetForm();

      await loadPage();
    } finally {
      setIsSaving(
        false
      );
    }
  }

  // =========================================================
  // PRIZES
  // =========================================================

  function updatePrizeDraft(
    seasonId:
      number,
    place:
      number,
    field:
      keyof PrizeDraft,
    value:
      string
  ) {
    const key =
      prizeKey(
        seasonId,
        place
      );

    setPrizeDrafts(
      (
        current
      ) => ({
        ...current,

        [key]: {
          title:
            current[
              key
            ]?.title ??
            "",

          description:
            current[
              key
            ]?.description ??
            "",

          [field]:
            value,
        },
      })
    );
  }

  async function handleSavePrize(
    season:
      Season,
    place:
      number
  ) {
    const key =
      prizeKey(
        season.id,
        place
      );

    const draft =
      prizeDrafts[
        key
      ] ?? {
        title: "",
        description: "",
      };

    const normalizedTitle =
      draft.title.trim();

    if (
      normalizedTitle.length <
      2
    ) {
      setError(
        `Для ${place} места название приза должно содержать минимум 2 символа.`
      );

      return;
    }

    if (
      normalizedTitle.length >
      150
    ) {
      setError(
        "Название приза не должно превышать 150 символов."
      );

      return;
    }

    setPrizeActionKey(
      key
    );

    setError("");
    setSuccess("");

    try {
      const supabase =
        createClient();

      const {
        error:
          prizeError,
      } =
        await supabase.rpc(
          "admin_upsert_season_prize",
          {
            p_season_id:
              season.id,

            p_place:
              place,

            p_title:
              normalizedTitle,

            p_description:
              draft.description,
          }
        );

      if (
        prizeError
      ) {
        setError(
          formatRpcError(
            prizeError
          )
        );

        return;
      }

      setSuccess(
        `Приз за ${place} место сохранён.`
      );

      await loadPage();
    } finally {
      setPrizeActionKey(
        null
      );
    }
  }

  async function handleDeletePrize(
    season:
      Season,
    place:
      number
  ) {
    const prize =
      seasonPrizes.find(
        (
          item
        ) =>
          item.season_id ===
            season.id &&
          item.place ===
            place
      );

    if (
      !prize
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Удалить приз за ${place} место «${prize.title}»?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    const key =
      prizeKey(
        season.id,
        place
      );

    setPrizeActionKey(
      key
    );

    setError("");
    setSuccess("");

    try {
      const supabase =
        createClient();

      const {
        error:
          deleteError,
      } =
        await supabase.rpc(
          "admin_delete_season_prize",
          {
            p_season_id:
              season.id,

            p_place:
              place,
          }
        );

      if (
        deleteError
      ) {
        setError(
          formatRpcError(
            deleteError
          )
        );

        return;
      }

      setSuccess(
        `Приз за ${place} место удалён.`
      );

      await loadPage();
    } finally {
      setPrizeActionKey(
        null
      );
    }
  }

  // =========================================================
  // SEASON ACTIONS
  // =========================================================

  async function handleSchedule(
    season:
      Season
  ) {
    if (
      !window.confirm(
        `Запланировать сезон «${season.title}»?`
      )
    ) {
      return;
    }

    await runSeasonAction(
      season.id,
      "admin_schedule_season",
      "Сезон запланирован."
    );
  }

  async function handleActivate(
    season:
      Season
  ) {
    if (
      currentSeason &&
      currentSeason.id !==
        season.id
    ) {
      setError(
        `Сейчас используется сезон «${currentSeason.title}».`
      );

      return;
    }

    if (
      !window.confirm(
        `Активировать сезон «${season.title}»?`
      )
    ) {
      return;
    }

    await runSeasonAction(
      season.id,
      "admin_activate_season",
      "Сезон активирован."
    );
  }

  async function handleBeginClosing(
    season:
      Season
  ) {
    if (
      !window.confirm(
        `Начать завершение сезона «${season.title}»?\n\nСезон перестанет считаться активным.`
      )
    ) {
      return;
    }

    await runSeasonAction(
      season.id,
      "admin_begin_season_closing",
      "Сезон переведён в режим завершения."
    );
  }

  async function handleFinish(
    season:
      Season
  ) {
    const unfinishedCount =
      getUnfinishedEventsCount(
        season.id,
        seasonEvents
      );

    if (
      unfinishedCount >
      0
    ) {
      setError(
        `Осталось незавершённых событий: ${unfinishedCount}.`
      );

      return;
    }

    const winners =
      previewWinners[
        season.id
      ] ??
      [];

    const winnerText =
      winners.length
        ? winners
            .map(
              (
                winner
              ) =>
                `${winner.place}. ${winner.username} — ${winner.balance_gp.toLocaleString(
                  "ru-RU"
                )} GP`
            )
            .join(
              "\n"
            )
        : "Нет участников, выполнивших минимальный критерий.";

    if (
      !window.confirm(
        `Зафиксировать итоги сезона «${season.title}»?\n\n${winnerText}\n\nНаличие настроенных призов не требуется.`
      )
    ) {
      return;
    }

    await runSeasonAction(
      season.id,
      "admin_finish_season",
      "Итоги сезона зафиксированы."
    );
  }

  async function handleDelete(
    season:
      Season
  ) {
    if (
      !window.confirm(
        `Удалить черновик сезона «${season.title}»?\n\nЭто действие нельзя отменить.`
      )
    ) {
      return;
    }

    setActionSeasonId(
      season.id
    );

    setError("");
    setSuccess("");

    try {
      const supabase =
        createClient();

      const {
        error:
          deleteError,
      } =
        await supabase.rpc(
          "admin_delete_season",
          {
            p_season_id:
              season.id,
          }
        );

      if (
        deleteError
      ) {
        setError(
          formatRpcError(
            deleteError
          )
        );

        return;
      }

      setSuccess(
        "Черновик сезона удалён."
      );

      await loadPage();
    } finally {
      setActionSeasonId(
        null
      );
    }
  }

  async function runSeasonAction(
    seasonId:
      number,

    rpcName:
      | "admin_schedule_season"
      | "admin_activate_season"
      | "admin_begin_season_closing"
      | "admin_finish_season",

    successMessage:
      string
  ) {
    setActionSeasonId(
      seasonId
    );

    setError("");
    setSuccess("");

    try {
      const supabase =
        createClient();

      const {
        error:
          actionError,
      } =
        await supabase.rpc(
          rpcName,
          {
            p_season_id:
              seasonId,
          }
        );

      if (
        actionError
      ) {
        setError(
          formatRpcError(
            actionError
          )
        );

        return;
      }

      setSuccess(
        successMessage
      );

      await loadPage();
    } finally {
      setActionSeasonId(
        null
      );
    }
  }

  // =========================================================
  // PAGE STATES
  // =========================================================

  if (
    isLoading
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <p className="text-sm text-white/40">
          Загрузка сезонов...
        </p>
      </main>
    );
  }

  if (
    !isAdmin
  ) {
    return (
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-8 text-center">
          <h1 className="text-xl font-semibold text-white">
            Доступ ограничен
          </h1>

          <p className="mt-3 text-sm text-white/40">
            Управление сезонами доступно только администратору prognosis.io.
          </p>
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
        className="pointer-events-none absolute left-1/2 top-[-450px] h-[850px] w-[1000px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.06] blur-[170px]"
        aria-hidden="true"
      />

      <div className="container-page relative py-10 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin"
            className="text-sm text-white/35 transition hover:text-white/70"
          >
            ← Админ-панель
          </Link>

          <div className="mt-7">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8f9aff]">
              Admin
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
              Управление сезонами
            </h1>

            <p className="mt-3 text-sm text-white/40">
              Создание, запуск, призы и завершение сезонов prognosis.io.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] px-5 py-4 text-sm text-emerald-300">
              {success}
            </div>
          )}

          {/* CURRENT */}

          <section className="mt-8 rounded-3xl border border-[#6577ff]/15 bg-[#6577ff]/[0.045] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8f9aff]">
              Текущий сезон
            </p>

            {currentSeason ? (
              <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {currentSeason.title}
                  </h2>

                  <p className="mt-2 text-sm text-white/40">
                    {formatDateTime(
                      currentSeason.start_at
                    )}
                    {" → "}
                    {formatDateTime(
                      currentSeason.end_at
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-8">
                  <SmallMetric
                    label="Баланс"
                    value={`${currentSeason.starting_balance.toLocaleString(
                      "ru-RU"
                    )} GP`}
                  />

                  <SmallMetric
                    label="Минимум"
                    value={`${currentSeason.minimum_predictions_for_prize} событий`}
                  />
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/40">
                Сейчас нет активного сезона.
              </p>
            )}
          </section>

          {/* FORM */}

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-6 rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {editingSeasonId
                    ? "Редактирование сезона"
                    : "Новый сезон"}
                </h2>

                <p className="mt-2 text-sm text-white/35">
                  Новый сезон создаётся как черновик.
                </p>
              </div>

              {editingSeasonId && (
                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  className="text-sm text-white/40 hover:text-white"
                >
                  Отменить
                </button>
              )}
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <Field
                label="Название"
              >
                <input
                  value={
                    title
                  }
                  onChange={(
                    event
                  ) =>
                    handleTitleChange(
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Slug"
              >
                <input
                  value={
                    slug
                  }
                  onChange={(
                    event
                  ) => {
                    setSlugTouched(
                      true
                    );

                    setSlug(
                      event.target.value
                    );
                  }}
                  className={
                    inputClass
                  }
                />
              </Field>

              <div className="md:col-span-2">
                <Field
                  label="Описание"
                >
                  <textarea
                    rows={3}
                    value={
                      description
                    }
                    onChange={(
                      event
                    ) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>

              <Field
                label="Начало"
              >
                <input
                  type="datetime-local"
                  value={
                    startAt
                  }
                  onChange={(
                    event
                  ) =>
                    setStartAt(
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Окончание"
              >
                <input
                  type="datetime-local"
                  value={
                    endAt
                  }
                  onChange={(
                    event
                  ) =>
                    setEndAt(
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Стартовый баланс GP"
              >
                <input
                  type="number"
                  value={
                    startingBalance
                  }
                  onChange={(
                    event
                  ) =>
                    setStartingBalance(
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Минимум событий для приза"
              >
                <input
                  type="number"
                  value={
                    minimumPredictions
                  }
                  onChange={(
                    event
                  ) =>
                    setMinimumPredictions(
                      event.target.value
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={
                isSaving
              }
              className={`${primaryButton} mt-6`}
            >
              {isSaving
                ? "Сохраняем..."
                : editingSeasonId
                  ? "Сохранить"
                  : "Создать черновик"}
            </button>
          </form>

          {/* SEASONS */}

          <section className="mt-6 space-y-5">
            {seasons.map(
              (
                season
              ) => {
                const winners =
                  previewWinners[
                    season.id
                  ] ??
                  [];

                const unfinished =
                  getUnfinishedEventsCount(
                    season.id,
                    seasonEvents
                  );

                const canEditPrizes =
                  season.status !==
                    "finished" &&
                  season.status !==
                    "cancelled";

                return (
                  <article
                    key={
                      season.id
                    }
                    className="rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-6 sm:p-8"
                  >
                    <div className="flex flex-col gap-6 xl:flex-row xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <SeasonStatusBadge
                            status={
                              season.status
                            }
                          />

                          <span className="text-xs text-white/20">
                            ID #{season.id}
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-semibold text-white">
                          {season.title}
                        </h2>

                        <p className="mt-1 text-xs text-white/25">
                          {season.slug}
                        </p>

                        <p className="mt-4 text-xs text-white/35">
                          {formatDateTime(
                            season.start_at
                          )}
                          {" → "}
                          {formatDateTime(
                            season.end_at
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        {season.status ===
                          "draft" && (
                          <>
                            <button
                              onClick={() =>
                                handleEdit(
                                  season
                                )
                              }
                              className={
                                secondaryButton
                              }
                            >
                              Редактировать
                            </button>

                            <button
                              onClick={() =>
                                handleSchedule(
                                  season
                                )
                              }
                              className={
                                secondaryButton
                              }
                            >
                              Запланировать
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(
                                  season
                                )
                              }
                              className={
                                dangerButton
                              }
                            >
                              Удалить
                            </button>
                          </>
                        )}

                        {(season.status ===
                          "draft" ||
                          season.status ===
                            "scheduled") &&
                          canActivateSeason(
                            season,
                            currentSeason
                          ) && (
                            <button
                              onClick={() =>
                                handleActivate(
                                  season
                                )
                              }
                              className={
                                primaryButton
                              }
                            >
                              Активировать
                            </button>
                          )}

                        {season.status ===
                          "active" && (
                          <button
                            onClick={() =>
                              handleBeginClosing(
                                season
                              )
                            }
                            className={
                              warningButton
                            }
                          >
                            Начать завершение
                          </button>
                        )}

                        {season.status ===
                          "closing" && (
                          <button
                            disabled={
                              unfinished >
                                0
                            }
                            onClick={() =>
                              handleFinish(
                                season
                              )
                            }
                            className={
                              primaryButton
                            }
                          >
                            {unfinished >
                            0
                              ? `Осталось событий: ${unfinished}`
                              : "Зафиксировать итоги"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* PREVIEW */}

                    {(season.status ===
                      "active" ||
                      season.status ===
                        "closing") && (
                      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                        <p className="text-sm font-semibold text-white/70">
                          Предварительный TOP-3
                        </p>

                        {winners.length ? (
                          <div className="mt-4 space-y-2">
                            {winners.map(
                              (
                                winner
                              ) => (
                                <div
                                  key={
                                    winner.user_id
                                  }
                                  className="flex items-center gap-4 rounded-xl border border-white/[0.05] px-4 py-3"
                                >
                                  <span className="font-mono text-white/40">
                                    #{winner.place}
                                  </span>

                                  <span className="flex-1 text-sm text-white/70">
                                    {winner.username}
                                  </span>

                                  <span className="font-mono text-sm font-semibold text-white">
                                    {winner.balance_gp.toLocaleString(
                                      "ru-RU"
                                    )}{" "}
                                    GP
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-white/30">
                            Пока нет участников, выполнивших минимальный критерий.
                          </p>
                        )}
                      </div>
                    )}

                    {/* PRIZES */}

                    <div className="mt-6 border-t border-white/[0.06] pt-6">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          Призы сезона
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-white/30">
                          Необязательно. Отсутствие призов не препятствует завершению сезона.
                        </p>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        {[1, 2, 3].map(
                          (
                            place
                          ) => {
                            const key =
                              prizeKey(
                                season.id,
                                place
                              );

                            const draft =
                              prizeDrafts[
                                key
                              ] ?? {
                                title:
                                  "",
                                description:
                                  "",
                              };

                            const existingPrize =
                              seasonPrizes.find(
                                (
                                  item
                                ) =>
                                  item.season_id ===
                                    season.id &&
                                  item.place ===
                                    place
                              );

                            const prizeLoading =
                              prizeActionKey ===
                              key;

                            return (
                              <div
                                key={
                                  place
                                }
                                className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-white/75">
                                    {place} место
                                  </p>

                                  {existingPrize && (
                                    <span className="text-[11px] text-emerald-300/70">
                                      Настроен
                                    </span>
                                  )}
                                </div>

                                <input
                                  value={
                                    draft.title
                                  }
                                  disabled={
                                    !canEditPrizes
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updatePrizeDraft(
                                      season.id,
                                      place,
                                      "title",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  placeholder="Название приза"
                                  className={`${inputClass} mt-4`}
                                />

                                <textarea
                                  rows={3}
                                  value={
                                    draft.description
                                  }
                                  disabled={
                                    !canEditPrizes
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updatePrizeDraft(
                                      season.id,
                                      place,
                                      "description",
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  placeholder="Описание — необязательно"
                                  className={`${inputClass} mt-3`}
                                />

                                {canEditPrizes ? (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={
                                        prizeLoading
                                      }
                                      onClick={() =>
                                        handleSavePrize(
                                          season,
                                          place
                                        )
                                      }
                                      className={
                                        secondaryButton
                                      }
                                    >
                                      {prizeLoading
                                        ? "Сохраняем..."
                                        : existingPrize
                                          ? "Сохранить"
                                          : "Добавить"}
                                    </button>

                                    {existingPrize && (
                                      <button
                                        type="button"
                                        disabled={
                                          prizeLoading
                                        }
                                        onClick={() =>
                                          handleDeletePrize(
                                            season,
                                            place
                                          )
                                        }
                                        className={
                                          dangerButton
                                        }
                                      >
                                        Удалить
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <p className="mt-4 text-xs text-white/25">
                                    После завершения сезона призы зафиксированы.
                                  </p>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

// ===========================================================
// COMPONENTS
// ===========================================================

function SeasonStatusBadge({
  status,
}: {
  status:
    SeasonStatus;
}) {
  const labels:
    Record<
      SeasonStatus,
      string
    > = {
    draft:
      "Черновик",
    scheduled:
      "Запланирован",
    active:
      "Активен",
    closing:
      "Завершается",
    finished:
      "Завершён",
    cancelled:
      "Отменён",
  };

  return (
    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/50">
      {labels[
        status
      ]}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-white/60">
        {label}
      </span>

      <div className="mt-2">
        {children}
      </div>
    </label>
  );
}

function SmallMetric({
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
      <p className="text-[11px] text-white/25">
        {label}
      </p>

      <p className="mt-1 font-mono text-sm font-semibold text-white/70">
        {value}
      </p>
    </div>
  );
}

// ===========================================================
// STYLES
// ===========================================================

const inputClass =
  "min-h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#6577ff]/55 disabled:cursor-not-allowed disabled:opacity-50";

const primaryButton =
  "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#6577ff] px-4 text-sm font-semibold text-white transition hover:bg-[#7383ff] disabled:cursor-not-allowed disabled:opacity-35";

const secondaryButton =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-white/65 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40";

const dangerButton =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-red-400/15 bg-red-400/[0.03] px-4 text-sm font-medium text-red-300/70 transition hover:bg-red-400/[0.07] disabled:opacity-40";

const warningButton =
  "inline-flex min-h-10 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 text-sm font-medium text-amber-200 transition hover:bg-amber-300/[0.08] disabled:opacity-40";

// ===========================================================
// HELPERS
// ===========================================================

function prizeKey(
  seasonId:
    number,
  place:
    number
) {
  return `${seasonId}:${place}`;
}

function getUnfinishedEventsCount(
  seasonId:
    number,
  events:
    SeasonEvent[]
) {
  return events.filter(
    (
      event
    ) =>
      event.season_id ===
        seasonId &&
      ![
        "resolved",
        "void",
        "cancelled",
      ].includes(
        event.status
      )
  ).length;
}

function canActivateSeason(
  season:
    Season,
  currentSeason:
    Season | null
) {
  const now =
    Date.now();

  return (
    new Date(
      season.start_at
    ).getTime() <=
      now &&
    new Date(
      season.end_at
    ).getTime() >
      now &&
    (
      !currentSeason ||
      currentSeason.id ===
        season.id
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

function toLocalInput(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  const pad = (
    number:
      number
  ) =>
    String(
      number
    ).padStart(
      2,
      "0"
    );

  return (
    `${date.getFullYear()}-` +
    `${pad(
      date.getMonth() +
        1
    )}-` +
    `${pad(
      date.getDate()
    )}T` +
    `${pad(
      date.getHours()
    )}:` +
    `${pad(
      date.getMinutes()
    )}`
  );
}

function makeSlug(
  value:
    string
) {
  const map:
    Record<
      string,
      string
    > = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return value
    .toLowerCase()
    .split("")
    .map(
      (
        char
      ) =>
        map[
          char
        ] ??
        char
    )
    .join("")
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

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
      "Недостаточно прав администратора.",

    SEASON_NOT_FOUND:
      "Сезон не найден.",

    SEASON_SLUG_ALREADY_EXISTS:
      "Сезон с таким slug уже существует.",

    INVALID_SEASON_DATES:
      "Проверь даты сезона.",

    ANOTHER_ACTIVE_SEASON_EXISTS:
      "Уже существует другой активный сезон.",

    SEASON_HAS_UNFINISHED_EVENTS:
      "В сезоне остались незавершённые события.",

    ONLY_DRAFT_SEASON_CAN_BE_DELETED:
      "Удалять можно только черновики.",

    SEASON_HAS_EVENTS:
      "Сезон содержит события и не может быть удалён.",

    SEASON_HAS_PARTICIPANTS:
      "В сезоне уже есть участники.",

    SEASON_PRIZES_ARE_LOCKED:
      "Призы завершённого или отменённого сезона изменить нельзя.",

    INVALID_PRIZE_PLACE:
      "Можно настроить призы только за 1, 2 и 3 место.",

    PRIZE_TITLE_TOO_SHORT:
      "Название приза должно содержать минимум 2 символа.",

    PRIZE_TITLE_TOO_LONG:
      "Название приза не должно превышать 150 символов.",
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