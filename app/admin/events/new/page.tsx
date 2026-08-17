"use client";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase-browser";

import AdminSelect from "@/components/AdminSelect";

type EventCategory = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
};

export default function NewAdminEventPage() {
  const router =
    useRouter();

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
    error,
    setError,
  ] =
    useState("");

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
  // ACCESS + CATEGORIES
  // =========================================================

  useEffect(() => {
    const supabase =
      createClient();

    async function load() {
      setIsLoading(true);
      setError("");

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

      const {
        data:
          categoriesData,
        error:
          categoriesError,
      } =
        await supabase
          .from(
            "event_categories"
          )
          .select(
            `
              id,
              code,
              name,
              description,
              icon
            `
          )
          .eq(
            "is_active",
            true
          )
          .order(
            "sort_order",
            {
              ascending:
                true,
            }
          );

      if (
        categoriesError
      ) {
        console.error(
          "Categories loading error:",
          categoriesError
        );

        setError(
          `Не удалось загрузить категории: ${categoriesError.message}`
        );

        setIsLoading(false);

        return;
      }

      const loadedCategories =
        (
          categoriesData ??
          []
        ) as EventCategory[];

      setCategories(
        loadedCategories
      );

      if (
        loadedCategories.length >
        0
      ) {
        setCategoryId(
          String(
            loadedCategories[0].id
          )
        );
      }

      setIsLoading(false);
    }

    void load();
  }, [
    router,
  ]);

  // =========================================================
  // TITLE
  // =========================================================

  function handleTitleChange(
    value: string
  ) {
    setTitle(value);

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

  // =========================================================
  // CREATE
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

    const normalizedTitle =
      title.trim();

    const normalizedSlug =
      slug
        .trim()
        .toLowerCase();

    if (
      normalizedTitle.length <
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
      normalizedSlug.length <
      3
    ) {
      setError(
        "Укажите slug события."
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
      !resolutionRule.trim()
    ) {
      setError(
        "Укажите правило определения результата."
      );

      return;
    }

    if (
      !publishAt
    ) {
      setError(
        "Укажите дату публикации."
      );

      return;
    }

    if (
      !predictionCloseAt
    ) {
      setError(
        "Укажите дату закрытия прогнозов."
      );

      return;
    }

    const publishDate =
      new Date(
        publishAt
      );

    const closeDate =
      new Date(
        predictionCloseAt
      );

    if (
      closeDate <=
      publishDate
    ) {
      setError(
        "Закрытие прогнозов должно быть позже публикации."
      );

      return;
    }

    if (
      expectedResolutionAt
    ) {
      const resolutionDate =
        new Date(
          expectedResolutionAt
        );

      if (
        resolutionDate <
        closeDate
      ) {
        setError(
          "Ожидаемое определение результата не может быть раньше закрытия прогнозов."
        );

        return;
      }
    }

    setIsSaving(true);

    try {
      const supabase =
        createClient();

      const {
        data,
        error:
          createError,
      } =
        await supabase.rpc(
          "admin_create_event",
          {
            p_category_id:
              Number(
                categoryId
              ),

            p_title:
              normalizedTitle,

            p_slug:
              normalizedSlug,

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
        createError
      ) {
        console.error(
          "Create event error:",
          createError
        );

        const message =
          createError.message.toLowerCase();

        if (
          message.includes(
            "slug already exists"
          ) ||
          createError.code ===
            "23505"
        ) {
          setError(
            "Событие с таким slug уже существует."
          );
        } else {
          setError(
            `Не удалось создать событие: ${createError.message}`
          );
        }

        return;
      }

      const eventId =
        Number(
          data
        );

      router.push(
        `/admin/events/${eventId}`
      );

      router.refresh();
    } catch (
      createUnexpectedError
    ) {
      console.error(
        "Create event unexpected error:",
        createUnexpectedError
      );

      setError(
        "Не удалось создать событие."
      );
    } finally {
      setIsSaving(false);
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
            Загрузка...
          </p>
        </div>
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
      <main className="container-page min-h-[calc(100vh-72px)] py-16">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-8 text-center">
            <h1 className="text-xl font-semibold text-white">
              Доступ ограничен
            </h1>

            <p className="mt-3 text-sm text-white/40">
              Страница доступна
              только сотрудникам
              prognosis.io.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] px-5 text-sm font-medium text-white/70"
            >
              На главную
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-visible">
      <div
        className="pointer-events-none absolute left-1/2 top-[-400px] h-[800px] w-[1000px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.06] blur-[170px]"
        aria-hidden="true"
      />

      <div className="container-page relative py-10 sm:py-14">
        <div className="mx-auto max-w-5xl">
          {/* HEADER */}

          <div>
            <Link
              href="/admin"
              className="text-sm text-white/35 transition hover:text-white/70"
            >
              ← Управление событиями
            </Link>

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.16em] text-[#8f9aff]">
              Admin
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white sm:text-4xl">
              Новое событие
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/40">
              Событие будет создано
              как черновик. После
              проверки его можно
              будет опубликовать.
            </p>
          </div>

          {/* FORM */}

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-10 space-y-6"
          >
            {/* MAIN */}

            <section className="overflow-visible rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6 sm:p-8">
              <SectionTitle
                title="Основная информация"
                description="Название, категория и адрес события."
              />

              <div className="mt-7 space-y-5">
                <Field
                  label="Название события"
                  required
                >
                  <textarea
                    value={
                      title
                    }
                    onChange={(
                      event
                    ) =>
                      handleTitleChange(
                        event
                          .target
                          .value
                      )
                    }
                    rows={3}
                    placeholder="Например: Превысит ли индекс МосБиржи 3000 пунктов к 1 октября?"
                    className={inputClass}
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Категория"
                    required
                  >
                    <AdminSelect
                      value={
                        categoryId
                      }
                      onChange={
                        setCategoryId
                      }
                      placeholder="Выберите категорию"
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
                  </Field>

                  <Field
                    label="Slug"
                    required
                  >
                    <input
                      type="text"
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
                          event
                            .target
                            .value
                        );
                      }}
                      placeholder="mosbirzha-3000-october"
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
                    onChange={(
                      event
                    ) =>
                      setDescription(
                        event
                          .target
                          .value
                      )
                    }
                    rows={5}
                    placeholder="Краткая справка и контекст события."
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>

            {/* SOURCE */}

            <section className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6 sm:p-8">
              <SectionTitle
                title="Источник и результат"
                description="Укажи источник и точное правило, по которому будет определён исход."
              />

              <div className="mt-7 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Название источника"
                  >
                    <input
                      type="text"
                      value={
                        sourceName
                      }
                      onChange={(
                        event
                      ) =>
                        setSourceName(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Банк России"
                      className={inputClass}
                    />
                  </Field>

                  <Field
                    label="Ссылка на источник"
                  >
                    <input
                      type="url"
                      value={
                        sourceUrl
                      }
                      onChange={(
                        event
                      ) =>
                        setSourceUrl(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field
                  label="Правило определения результата"
                  required
                >
                  <textarea
                    value={
                      resolutionRule
                    }
                    onChange={(
                      event
                    ) =>
                      setResolutionRule(
                        event
                          .target
                          .value
                      )
                    }
                    rows={5}
                    placeholder="Результат «Да» фиксируется, если..."
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>

            {/* DATES */}

            <section className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6 sm:p-8">
              <SectionTitle
                title="Даты"
                description="Период публикации и приёма прогнозов."
              />

              <div className="mt-7 grid gap-5 md:grid-cols-3">
                <Field
                  label="Публикация"
                  required
                >
                  <input
                    type="datetime-local"
                    value={
                      publishAt
                    }
                    onChange={(
                      event
                    ) =>
                      setPublishAt(
                        event
                          .target
                          .value
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Закрытие прогнозов"
                  required
                >
                  <input
                    type="datetime-local"
                    value={
                      predictionCloseAt
                    }
                    onChange={(
                      event
                    ) =>
                      setPredictionCloseAt(
                        event
                          .target
                          .value
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
                    onChange={(
                      event
                    ) =>
                      setExpectedResolutionAt(
                        event
                          .target
                          .value
                      )
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </section>

            {/* OPTIONS */}

            <section className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/90 p-6 sm:p-8">
              <SectionTitle
                title="Дополнительно"
                description="Настройки отображения события."
              />

              <label className="mt-7 flex cursor-pointer items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <input
                  type="checkbox"
                  checked={
                    isFeatured
                  }
                  onChange={(
                    event
                  ) =>
                    setIsFeatured(
                      event
                        .target
                        .checked
                    )
                  }
                  className="mt-1"
                />

                <div>
                  <p className="text-sm font-medium text-white/75">
                    Рекомендуемое событие
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/30">
                    Событие может
                    получить повышенную
                    видимость на главной.
                  </p>
                </div>
              </label>
            </section>

            {/* ERROR */}

            {error && (
              <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] px-5 py-4 text-sm leading-6 text-red-300">
                {
                  error
                }
              </div>
            )}

            {/* ACTIONS */}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/admin"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] px-5 text-sm font-medium text-white/65 transition hover:bg-white/[0.06] hover:text-white"
              >
                Отмена
              </Link>

              <button
                type="submit"
                disabled={
                  isSaving
                }
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6577ff] px-6 text-sm font-semibold text-white transition hover:bg-[#7383ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Создаём..."
                  : "Создать черновик"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

// ===========================================================
// FIELD
// ===========================================================

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-white/65">
        {
          label
        }

        {required && (
          <span className="ml-1 text-[#8f9aff]">
            *
          </span>
        )}
      </span>

      <div className="mt-2">
        {
          children
        }
      </div>
    </label>
  );
}

// ===========================================================
// SECTION TITLE
// ===========================================================

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
        {
          title
        }
      </h2>

      <p className="mt-2 text-sm leading-6 text-white/35">
        {
          description
        }
      </p>
    </div>
  );
}

// ===========================================================
// INPUT STYLE
// ===========================================================

const inputClass =
  "min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/55";

// ===========================================================
// SLUG
// ===========================================================

function makeSlug(
  value: string
) {
  const transliteration:
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
        character
      ) =>
        transliteration[
          character
        ] ??
        character
    )
    .join("")
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(
      0,
      120
    );
}