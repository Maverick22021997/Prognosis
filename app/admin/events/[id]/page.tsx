"use client";

import Link from "next/link";

import {
  FormEvent,
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

import AdminSelect from "@/components/AdminSelect";

type EventStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "closed"
  | "resolving"
  | "resolved"
  | "cancelled"
  | "void";

type PredictionSide =
  | "yes"
  | "no";

type EventCategory = {
  id: number;
  code: string;
  name: string;
};

type AdminEvent = {
  id: number;
  season_id: number;
  category_id: number;

  title: string;
  slug: string;

  description:
    string | null;

  source_name:
    string | null;

  source_url:
    string | null;

  resolution_rule:
    string;

  publish_at:
    string;

  prediction_close_at:
    string;

  expected_resolution_at:
    string | null;

  resolved_at:
    string | null;

  status:
    EventStatus;

  result:
    PredictionSide | null;

  cancel_reason:
    string | null;

  is_featured:
    boolean;

  predictions_count:
    number;

  volume_gp:
    number;

  created_at:
    string;

  updated_at:
    string;
};

type EventPool = {
  event_id: number;
  yes_pool: number;
  no_pool: number;
  updated_at: string;
};

export default function AdminEventPage() {
  const params =
    useParams();

  const router =
    useRouter();

  const eventId =
    Number(
      params.id
    );

  const [
    eventData,
    setEventData,
  ] =
    useState<AdminEvent | null>(
      null
    );

  const [
    pool,
    setPool,
  ] =
    useState<EventPool | null>(
      null
    );

  const [
    categories,
    setCategories,
  ] =
    useState<EventCategory[]>(
      []
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isStaff,
    setIsStaff,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    isActionLoading,
    setIsActionLoading,
  ] =
    useState(false);

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
    categoryId,
    setCategoryId,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    sourceName,
    setSourceName,
  ] =
    useState("");

  const [
    sourceUrl,
    setSourceUrl,
  ] =
    useState("");

  const [
    resolutionRule,
    setResolutionRule,
  ] =
    useState("");

  const [
    publishAt,
    setPublishAt,
  ] =
    useState("");

  const [
    predictionCloseAt,
    setPredictionCloseAt,
  ] =
    useState("");

  const [
    expectedResolutionAt,
    setExpectedResolutionAt,
  ] =
    useState("");

  const [
    isFeatured,
    setIsFeatured,
  ] =
    useState(false);

  // =========================================================
  // LOAD
  // =========================================================

  useEffect(() => {
    if (
      !Number.isFinite(
        eventId
      ) ||
      eventId <= 0
    ) {
      setError(
        "Некорректный ID события."
      );

      setIsLoading(
        false
      );

      return;
    }

    void loadPage();
  }, [
    eventId,
  ]);

  async function loadPage() {
    const supabase =
      createClient();

    setIsLoading(true);
    setError("");

    // =======================================================
    // USER
    // =======================================================

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

    // =======================================================
    // STAFF
    // =======================================================

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
      staffError ||
      !staffData ||
      ![
        "admin",
        "moderator",
      ].includes(
        staffData.role
      )
    ) {
      setIsStaff(false);
      setIsLoading(false);

      return;
    }

    setIsStaff(true);

    // =======================================================
    // CATEGORIES
    // =======================================================

    const {
      data:
        categoriesData,
    } =
      await supabase
        .from(
          "event_categories"
        )
        .select(
          `
            id,
            code,
            name
          `
        )
        .eq(
          "is_active",
          true
        )
        .order(
          "sort_order"
        );

    setCategories(
      (
        categoriesData ??
        []
      ) as EventCategory[]
    );

    // =======================================================
    // EVENT
    // =======================================================

    const {
      data:
        loadedEvent,
      error:
        eventError,
    } =
      await supabase
        .from(
          "events"
        )
        .select(
          `
            id,
            season_id,
            category_id,
            title,
            slug,
            description,
            source_name,
            source_url,
            resolution_rule,
            publish_at,
            prediction_close_at,
            expected_resolution_at,
            resolved_at,
            status,
            result,
            cancel_reason,
            is_featured,
            predictions_count,
            volume_gp,
            created_at,
            updated_at
          `
        )
        .eq(
          "id",
          eventId
        )
        .single();

    if (
      eventError ||
      !loadedEvent
    ) {
      setError(
        eventError?.message ??
          "Событие не найдено."
      );

      setIsLoading(
        false
      );

      return;
    }

    const parsedEvent =
      loadedEvent as AdminEvent;

    setEventData(
      parsedEvent
    );

    fillForm(
      parsedEvent
    );

    // =======================================================
    // POOL
    // =======================================================

    const {
      data:
        poolData,
      error:
        poolError,
    } =
      await supabase
        .from(
          "event_pools"
        )
        .select(
          `
            event_id,
            yes_pool,
            no_pool,
            updated_at
          `
        )
        .eq(
          "event_id",
          eventId
        )
        .maybeSingle();

    if (
      poolError
    ) {
      console.error(
        "Pool loading error:",
        poolError
      );
    }

    setPool(
      poolData as
        | EventPool
        | null
    );

    setIsLoading(false);
  }

  // =========================================================
  // FILL FORM
  // =========================================================

  function fillForm(
    item:
      AdminEvent
  ) {
    setTitle(
      item.title
    );

    setSlug(
      item.slug
    );

    setCategoryId(
      String(
        item.category_id
      )
    );

    setDescription(
      item.description ??
        ""
    );

    setSourceName(
      item.source_name ??
        ""
    );

    setSourceUrl(
      item.source_url ??
        ""
    );

    setResolutionRule(
      item.resolution_rule
    );

    setPublishAt(
      toLocalInput(
        item.publish_at
      )
    );

    setPredictionCloseAt(
      toLocalInput(
        item.prediction_close_at
      )
    );

    setExpectedResolutionAt(
      item.expected_resolution_at
        ? toLocalInput(
            item.expected_resolution_at
          )
        : ""
    );

    setIsFeatured(
      item.is_featured
    );
  }

  // =========================================================
  // SAVE DRAFT
  // =========================================================

  async function handleSave(
    formEvent:
      FormEvent<HTMLFormElement>
  ) {
    formEvent.preventDefault();

    if (
      !eventData ||
      eventData.status !==
        "draft" ||
      isSaving
    ) {
      return;
    }

    setError("");
    setSuccess("");

    if (
      title.trim().length <
      5
    ) {
      setError(
        "Введите название события."
      );

      return;
    }

    if (
      !categoryId
    ) {
      setError(
        "Выберите категорию."
      );

      return;
    }

    if (
      !publishAt ||
      !predictionCloseAt
    ) {
      setError(
        "Укажи даты публикации и закрытия прогнозов."
      );

      return;
    }

    setIsSaving(true);

    try {
      const supabase =
        createClient();

      const {
        data,
        error:
          saveError,
      } =
        await supabase.rpc(
          "admin_update_event",
          {
            p_event_id:
              eventData.id,

            p_category_id:
              Number(
                categoryId
              ),

            p_title:
              title,

            p_slug:
              slug,

            p_description:
              description,

            p_source_name:
              sourceName,

            p_source_url:
              sourceUrl,

            p_resolution_rule:
              resolutionRule,

            p_publish_at:
              new Date(
                publishAt
              ).toISOString(),

            p_prediction_close_at:
              new Date(
                predictionCloseAt
              ).toISOString(),

            p_expected_resolution_at:
              expectedResolutionAt
                ? new Date(
                    expectedResolutionAt
                  ).toISOString()
                : null,

            p_is_featured:
              isFeatured,
          }
        );

      if (
        saveError
      ) {
        setError(
          saveError.message
        );

        return;
      }

      const updated =
        Array.isArray(
          data
        )
          ? data[0]
          : data;

      if (
        updated
      ) {
        setEventData(
          updated as AdminEvent
        );

        fillForm(
          updated as AdminEvent
        );
      }

      setSuccess(
        "Изменения сохранены."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // =========================================================
  // PUBLISH
  // =========================================================

  async function handlePublish() {
    if (
      !eventData ||
      eventData.status !==
        "draft"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Опубликовать событие?\n\nПосле публикации полное редактирование черновика будет недоступно."
      );

    if (
      !confirmed
    ) {
      return;
    }

    await runAction(
      "admin_publish_event",
      {
        p_event_id:
          eventData.id,
      },
      "Событие опубликовано."
    );
  }

  // =========================================================
  // CLOSE
  // =========================================================

  async function handleClose() {
    if (
      !eventData ||
      eventData.status !==
        "active"
    ) {
      return;
    }

    const reason =
      window.prompt(
        "Причина досрочного закрытия (необязательно):",
        ""
      );

    if (
      reason === null
    ) {
      return;
    }

    await runAction(
      "close_event",
      {
        p_event_id:
          eventData.id,

        p_reason:
          reason ||
          null,
      },
      "Приём прогнозов закрыт."
    );
  }

  // =========================================================
  // REOPEN
  // =========================================================

  async function handleOpen() {
    if (
      !eventData ||
      ![
        "closed",
        "scheduled",
      ].includes(
        eventData.status
      )
    ) {
      return;
    }

    const reason =
      window.prompt(
        "Причина открытия (необязательно):",
        ""
      );

    if (
      reason === null
    ) {
      return;
    }

    await runAction(
      "open_event",
      {
        p_event_id:
          eventData.id,

        p_reason:
          reason ||
          null,
      },
      "Событие открыто."
    );
  }

  // =========================================================
  // RESOLVE
  // =========================================================

  async function handleResolve(
    result:
      PredictionSide
  ) {
    if (
      !eventData ||
      ![
        "closed",
        "active",
      ].includes(
        eventData.status
      )
    ) {
      return;
    }

    const resultLabel =
      result ===
      "yes"
        ? "ДА"
        : "НЕТ";

    const confirmed =
      window.confirm(
        `Подтвердить результат «${resultLabel}»?\n\nПосле расчёта пользователям будут начислены выплаты.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    await runAction(
      "resolve_event",
      {
        p_event_id:
          eventData.id,

        p_result:
          result,
      },
      `Результат события: ${resultLabel}.`
    );
  }

  // =========================================================
  // VOID
  // =========================================================

  async function handleVoid() {
    if (
      !eventData ||
      [
        "resolved",
        "void",
        "cancelled",
      ].includes(
        eventData.status
      )
    ) {
      return;
    }

    const reason =
      window.prompt(
        "Укажи причину аннулирования события:"
      );

    if (
      reason === null
    ) {
      return;
    }

    if (
      reason.trim().length <
      5
    ) {
      setError(
        "Причина аннулирования должна содержать минимум 3 символа."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Аннулировать событие?\n\nВсе активные прогнозы будут возвращены пользователям."
      );

    if (
      !confirmed
    ) {
      return;
    }

    await runAction(
      "void_event",
      {
        p_event_id:
          eventData.id,

        p_reason:
          reason.trim(),
      },
      "Событие аннулировано."
    );
  }

  // =========================================================
  // GENERIC RPC ACTION
  // =========================================================

  async function runAction(
    rpcName: string,
    args:
      Record<
        string,
        unknown
      >,
    successMessage:
      string
  ) {
    setIsActionLoading(true);

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
          args
        );

      if (
        actionError
      ) {
        console.error(
          `${rpcName} error:`,
          actionError
        );

        setError(
          actionError.message
        );

        return;
      }

      setSuccess(
        successMessage
      );

      await loadPage();

      router.refresh();
    } finally {
      setIsActionLoading(false);
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (
    isLoading
  ) {
    return (
      <main className="container-page py-16">
        <p className="text-sm text-white/40">
          Загрузка события...
        </p>
      </main>
    );
  }

  // =========================================================
  // ACCESS
  // =========================================================

  if (
    !isStaff
  ) {
    return (
      <main className="container-page py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-8 text-center">
          <h1 className="text-xl font-semibold text-white">
            Доступ ограничен
          </h1>
        </div>
      </main>
    );
  }

  if (
    !eventData
  ) {
    return (
      <main className="container-page py-16">
        <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-5 text-red-300">
          {error ||
            "Событие не найдено."}
        </div>
      </main>
    );
  }

  const editable =
    eventData.status ===
    "draft";

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="relative min-h-[calc(100vh-72px)]">
      <div className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">

          {/* HEADER */}

          <Link
            href="/admin"
            className="text-sm text-white/35 hover:text-white"
          >
            ← К событиям
          </Link>

          <div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={
                    eventData.status
                  }
                />

                <span className="text-xs text-white/25">
                  ID #
                  {
                    eventData.id
                  }
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-white">
                {
                  eventData.title
                }
              </h1>

              <p className="mt-3 text-sm text-white/35">
                /events/
                {
                  eventData.slug
                }
              </p>
            </div>
          </div>

          {/* MESSAGES */}

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-5 py-4 text-sm text-red-300">
              {
                error
              }
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] px-5 py-4 text-sm text-emerald-300">
              {
                success
              }
            </div>
          )}

          {/* METRICS */}

          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Прогнозов"
              value={String(
                eventData.predictions_count
              )}
            />

            <Metric
              label="Объём"
              value={`${eventData.volume_gp.toLocaleString(
                "ru-RU"
              )} GP`}
            />

            <Metric
              label="Пул Да"
              value={
                pool
                  ? `${pool.yes_pool.toLocaleString(
                      "ru-RU"
                    )} GP`
                  : "—"
              }
            />

            <Metric
              label="Пул Нет"
              value={
                pool
                  ? `${pool.no_pool.toLocaleString(
                      "ru-RU"
                    )} GP`
                  : "—"
              }
            />
          </section>

          {/* ACTIONS */}

          <section className="mt-6 rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-6">
            <h2 className="text-lg font-semibold text-white">
              Управление
            </h2>

            <div className="mt-5 flex flex-wrap gap-3">

              {eventData.status ===
                "draft" && (
                <button
                  type="button"
                  disabled={
                    isActionLoading
                  }
                  onClick={
                    handlePublish
                  }
                  className={primaryButton}
                >
                  Опубликовать
                </button>
              )}

              {eventData.status ===
                "active" && (
                <button
                  type="button"
                  disabled={
                    isActionLoading
                  }
                  onClick={
                    handleClose
                  }
                  className={secondaryButton}
                >
                  Закрыть прогнозы
                </button>
              )}

              {[
                "closed",
                "scheduled",
              ].includes(
                eventData.status
              ) && (
                <button
                  type="button"
                  disabled={
                    isActionLoading
                  }
                  onClick={
                    handleOpen
                  }
                  className={secondaryButton}
                >
                  Открыть
                </button>
              )}

              {eventData.status ===
                "closed" && (
                <>
                  <button
                    type="button"
                    disabled={
                      isActionLoading
                    }
                    onClick={() =>
                      handleResolve(
                        "yes"
                      )
                    }
                    className="min-h-11 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 text-sm font-semibold text-emerald-300 disabled:opacity-50"
                  >
                    Результат: Да
                  </button>

                  <button
                    type="button"
                    disabled={
                      isActionLoading
                    }
                    onClick={() =>
                      handleResolve(
                        "no"
                      )
                    }
                    className="min-h-11 rounded-xl border border-red-400/20 bg-red-400/[0.07] px-4 text-sm font-semibold text-red-300 disabled:opacity-50"
                  >
                    Результат: Нет
                  </button>
                </>
              )}

              {![
                "resolved",
                "void",
                "cancelled",
              ].includes(
                eventData.status
              ) && (
                <button
                  type="button"
                  disabled={
                    isActionLoading
                  }
                  onClick={
                    handleVoid
                  }
                  className="min-h-11 rounded-xl border border-red-400/15 px-4 text-sm font-medium text-red-300/70 hover:bg-red-400/[0.05] disabled:opacity-50"
                >
                  Аннулировать
                </button>
              )}

              {eventData.status !==
                "draft" && (
                <Link
                  href={`/events/${eventData.slug}`}
                  className={secondaryButton}
                >
                  Открыть страницу события
                </Link>
              )}
            </div>
          </section>

          {/* FORM */}

          <form
            onSubmit={
              handleSave
            }
            className="mt-6 space-y-6"
          >

            <section className="overflow-visible rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white">
                Данные события
              </h2>

              {!editable && (
                <p className="mt-2 text-sm text-white/35">
                  После публикации
                  основные параметры
                  заблокированы.
                </p>
              )}

              <div className="mt-7 space-y-5">
                <Field
                  label="Название"
                >
                  <textarea
                    value={
                      title
                    }
                    disabled={
                      !editable
                    }
                    onChange={(
                      e
                    ) =>
                      setTitle(
                        e.target.value
                      )
                    }
                    rows={3}
                    className={inputClass}
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Категория"
                  >
                    {editable ? (
                      <AdminSelect
                        value={
                          categoryId
                        }
                        onChange={
                          setCategoryId
                        }
                        options={categories.map(
                          (
                            category
                          ) => ({
                            value:
                              String(
                                category.id
                              ),
                            label:
                              category.name,
                          })
                        )}
                      />
                    ) : (
                      <ReadOnlyValue
                        value={
                          categories.find(
                            (
                              category
                            ) =>
                              category.id ===
                              eventData.category_id
                          )?.name ??
                          `#${eventData.category_id}`
                        }
                      />
                    )}
                  </Field>

                  <Field
                    label="Slug"
                  >
                    <input
                      value={
                        slug
                      }
                      disabled={
                        !editable
                      }
                      onChange={(
                        e
                      ) =>
                        setSlug(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field
                  label="Описание"
                >
                  <textarea
                    value={
                      description
                    }
                    disabled={
                      !editable
                    }
                    onChange={(
                      e
                    ) =>
                      setDescription(
                        e.target.value
                      )
                    }
                    rows={5}
                    className={inputClass}
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Источник"
                  >
                    <input
                      value={
                        sourceName
                      }
                      disabled={
                        !editable
                      }
                      onChange={(
                        e
                      ) =>
                        setSourceName(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Ссылка"
                  >
                    <input
                      value={
                        sourceUrl
                      }
                      disabled={
                        !editable
                      }
                      onChange={(
                        e
                      ) =>
                        setSourceUrl(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field
                  label="Правило определения результата"
                >
                  <textarea
                    value={
                      resolutionRule
                    }
                    disabled={
                      !editable
                    }
                    onChange={(
                      e
                    ) =>
                      setResolutionRule(
                        e.target.value
                      )
                    }
                    rows={5}
                    className={inputClass}
                  />
                </Field>

                <div className="grid gap-5 md:grid-cols-3">
                  <Field
                    label="Публикация"
                  >
                    <input
                      type="datetime-local"
                      value={
                        publishAt
                      }
                      disabled={
                        !editable
                      }
                      onChange={(
                        e
                      ) =>
                        setPublishAt(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Закрытие"
                  >
                    <input
                      type="datetime-local"
                      value={
                        predictionCloseAt
                      }
                      disabled={
                        !editable
                      }
                      onChange={(
                        e
                      ) =>
                        setPredictionCloseAt(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Ожидаемый результат"
                  >
                    <input
                      type="datetime-local"
                      value={
                        expectedResolutionAt
                      }
                      disabled={
                        !editable
                      }
                      onChange={(
                        e
                      ) =>
                        setExpectedResolutionAt(
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      isFeatured
                    }
                    disabled={
                      !editable
                    }
                    onChange={(
                      e
                    ) =>
                      setIsFeatured(
                        e.target.checked
                      )
                    }
                  />

                  <span className="text-sm text-white/65">
                    Рекомендуемое событие
                  </span>
                </label>
              </div>

              {editable && (
                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="mt-7 min-h-12 rounded-xl bg-[#6577ff] px-6 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isSaving
                    ? "Сохраняем..."
                    : "Сохранить изменения"}
                </button>
              )}
            </section>
          </form>
        </div>
      </div>
    </main>
  );
}

// ===========================================================
// COMPONENTS
// ===========================================================

function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-white/60">
        {
          label
        }
      </span>

      <div className="mt-2">
        {
          children
        }
      </div>
    </label>
  );
}

function ReadOnlyValue({
  value,
}: {
  value: string;
}) {
  return (
    <div className="flex min-h-12 items-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 text-sm text-white/50">
      {
        value
      }
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0f15] p-5">
      <p className="text-xs text-white/30">
        {
          label
        }
      </p>

      <p className="mt-2 font-mono text-xl font-semibold text-white">
        {
          value
        }
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    EventStatus;
}) {
  return (
    <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/65">
      {
        getStatusLabel(
          status
        )
      }
    </span>
  );
}

// ===========================================================
// HELPERS
// ===========================================================

const inputClass =
  "min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/55 disabled:cursor-not-allowed disabled:opacity-45";

const primaryButton =
  "min-h-11 rounded-xl bg-[#6577ff] px-4 text-sm font-semibold text-white hover:bg-[#7383ff] disabled:opacity-50";

const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 text-sm font-medium text-white/70 hover:bg-white/[0.06] disabled:opacity-50";

function toLocalInput(
  value: string
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

function getStatusLabel(
  status:
    EventStatus
) {
  const labels:
    Record<
      EventStatus,
      string
    > = {
    draft:
      "Черновик",

    scheduled:
      "Запланировано",

    active:
      "Активно",

    closed:
      "Закрыто",

    resolving:
      "Определяется",

    resolved:
      "Завершено",

    cancelled:
      "Отменено",

    void:
      "Аннулировано",
  };

  return labels[
    status
  ];
}