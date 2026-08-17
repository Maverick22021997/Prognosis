"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const productFacts = [
  {
    value: "25 000 GP",
    label: "стартовый баланс",
  },
  {
    value: "3 месяца",
    label: "один сезон",
  },
  {
    value: "TOP-100",
    label: "рейтинг участников",
  },
];

export default function Hero() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsAuthenticated(Boolean(user));
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
   function scrollToEvents() {
    const eventsSection = document.getElementById("events");

    if (!eventsSection) {
      return;
    }

    eventsSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      {/* Фоновое свечение */}
      <div
        className="pointer-events-none absolute left-[-180px] top-[-260px] h-[560px] w-[560px] rounded-full bg-[#6577ff]/[0.10] blur-[120px]"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute right-[-240px] top-[-180px] h-[620px] w-[620px] rounded-full bg-[#8d5cff]/[0.08] blur-[140px]"
        aria-hidden="true"
      />

      <div
        className="hero-grid pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      />

      <div className="container-page relative grid items-center gap-10 py-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:gap-12 lg:py-12">
        {/* Левая часть */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.035] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7383ff] shadow-[0_0_12px_rgba(115,131,255,0.85)]" />

            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/55">
              Платформа коллективного прогнозирования
            </span>
          </div>

          <h1 className="mt-5 max-w-3xl text-[clamp(2.2rem,5vw,4.4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[var(--foreground)]">
            Проверяйте идеи
            <span className="block bg-gradient-to-r from-white via-[#c7ccff] to-[#7d8cff] bg-clip-text text-transparent">
              на точность
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--foreground-muted)]">
            Оценивайте вероятность событий, сравнивайте свои прогнозы с
            мнением сообщества и поднимайтесь в рейтинге благодаря точности,
            а не случайности.
          </p>

          {/* Информация о подарках */}
          <div className="mt-5 inline-flex max-w-xl items-center gap-3 rounded-xl border border-[#6577ff]/20 bg-[#6577ff]/[0.06] px-4 py-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6577ff]/10 text-[#aeb7ff]"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-[18px] w-[18px]"
              >
                <path
                  d="M8 3H16V6.5C16 8.71 14.21 10.5 12 10.5C9.79 10.5 8 8.71 8 6.5V3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />

                <path
                  d="M8 5H5V6.2C5 8.3 6.7 10 8.8 10H9"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M16 5H19V6.2C19 8.3 17.3 10 15.2 10H15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                <path
                  d="M12 10.5V15M9 20H15M10 15H14L14.8 20H9.2L10 15Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <p className="text-sm leading-6 text-[var(--foreground-muted)]">
              Лучшие участники сезона получают{" "}
              <span className="font-medium text-[var(--foreground)]">
                призы и подарки за точность прогнозов.
              </span>
            </p>
          </div>

          {/* Кнопки */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {isAuthenticated ? (
  <button
    type="button"
    onClick={scrollToEvents}
    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white shadow-[0_12px_36px_rgba(101,119,255,0.23)] transition-all hover:-translate-y-0.5 hover:bg-[#7383ff] hover:shadow-[0_16px_42px_rgba(101,119,255,0.3)]"
  >
    Начать прогнозировать
  </button>
) : (
  <Link
    href="/register"
    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white shadow-[0_12px_36px_rgba(101,119,255,0.23)] transition-all hover:-translate-y-0.5 hover:bg-[#7383ff] hover:shadow-[0_16px_42px_rgba(101,119,255,0.3)]"
  >
    Начать прогнозировать
  </Link>
)}

            <button
  type="button"
  onClick={scrollToEvents}
  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.11] bg-white/[0.035] px-5 text-sm font-medium text-white/80 transition-colors hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
>
  Смотреть события

  <svg
    viewBox="0 0 20 20"
    fill="none"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path
      d="M5 7.5L10 12.5L15 7.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
</button>
          </div>

          {/* Ключевые параметры */}
          <dl className="mt-7 grid max-w-2xl grid-cols-3 gap-3 border-t border-white/[0.08] pt-5">
            {productFacts.map((fact) => (
              <div
                key={fact.label}
                className="min-w-0"
              >
                <dt className="truncate font-mono text-sm font-medium text-white sm:text-base">
                  {fact.value}
                </dt>

                <dd className="mt-1 text-[11px] leading-4 text-white/40 sm:text-xs">
                  {fact.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Правая часть */}
        <div className="relative mx-auto hidden w-full max-w-[500px] lg:block">
          <div
            className="absolute inset-x-12 bottom-[-28px] h-28 rounded-full bg-[#6577ff]/15 blur-[60px]"
            aria-hidden="true"
          />

          <div className="relative overflow-hidden rounded-[26px] border border-white/[0.11] bg-[#101218]/90 shadow-[0_32px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl">
            {/* Верхняя строка карточки */}
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#7383ff] shadow-[0_0_14px_rgba(115,131,255,0.7)]" />

                <span className="text-xs font-medium uppercase tracking-[0.13em] text-white/45">
                  Технологии
                </span>
              </div>

              <span className="font-mono text-xs text-white/35">
                до 30.09.2026
              </span>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="flex items-start justify-between gap-5">
                <h2 className="max-w-[330px] text-xl font-medium leading-7 tracking-[-0.025em] text-white">
                  Выпустит ли компания новый ИИ-продукт до конца квартала?
                </h2>

                <span className="shrink-0 rounded-lg border border-[#6577ff]/20 bg-[#6577ff]/[0.08] px-2.5 py-1.5 font-mono text-xs text-[#aeb7ff]">
                  4 820 GP
                </span>
              </div>

              {/* Текущая вероятность */}
              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-white/40">
                    Вероятность «Да»
                  </p>

                  <p className="mt-1 font-mono text-[42px] font-medium leading-none tracking-[-0.06em] text-white">
                    68
                    <span className="ml-1 text-xl text-white/45">%</span>
                  </p>
                </div>

                <div className="mb-1 flex items-center gap-1.5 rounded-lg bg-emerald-400/[0.08] px-2.5 py-1.5 font-mono text-xs text-emerald-300/80">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 10L6.2 6.8L8.5 9.1L13 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  6,4%
                </div>
              </div>

              {/* График */}
              <div className="mt-6">
                <svg
                  viewBox="0 0 440 128"
                  fill="none"
                  className="h-auto w-full"
                  aria-label="Пример графика изменения вероятности"
                  role="img"
                >
                  <defs>
                    <linearGradient
                      id="hero-chart-area"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        stopColor="#6577FF"
                        stopOpacity="0.32"
                      />
                      <stop
                        offset="1"
                        stopColor="#6577FF"
                        stopOpacity="0"
                      />
                    </linearGradient>

                    <linearGradient
                      id="hero-chart-line"
                      x1="0"
                      y1="0"
                      x2="440"
                      y2="0"
                    >
                      <stop stopColor="#8D97FF" />
                      <stop
                        offset="1"
                        stopColor="#6577FF"
                      />
                    </linearGradient>
                  </defs>

                  <path
                    d="M0 105H440M0 69H440M0 33H440"
                    stroke="white"
                    strokeOpacity="0.05"
                  />

                  <path
                    d="M0 97C28 94 43 89 67 90C94 91 111 77 137 79C163 81 180 72 205 67C231 62 245 71 270 59C295 47 311 54 336 42C359 31 383 38 405 27C418 21 430 18 440 17V128H0V97Z"
                    fill="url(#hero-chart-area)"
                  />

                  <path
                    d="M0 97C28 94 43 89 67 90C94 91 111 77 137 79C163 81 180 72 205 67C231 62 245 71 270 59C295 47 311 54 336 42C359 31 383 38 405 27C418 21 430 18 440 17"
                    stroke="url(#hero-chart-line)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  <circle
                    cx="440"
                    cy="17"
                    r="4"
                    fill="#8996FF"
                  />

                  <circle
                    cx="440"
                    cy="17"
                    r="8"
                    fill="#6577FF"
                    fillOpacity="0.15"
                  />
                </svg>

                <div className="mt-2 flex justify-between font-mono text-[10px] text-white/25">
                  <span>01 июл.</span>
                  <span>01 авг.</span>
                  <span>01 сент.</span>
                  <span>сейчас</span>
                </div>
              </div>

              {/* Варианты ответа */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#6577ff]/25 bg-[#6577ff]/[0.08] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      Да
                    </span>

                    <span className="font-mono text-sm text-[#aeb7ff]">
                      68%
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/65">
                      Нет
                    </span>

                    <span className="font-mono text-sm text-white/40">
                      32%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Нижняя строка */}
            <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3.5 sm:px-6">
              <span className="text-xs text-white/35">
                1 284 прогноза
              </span>

              <span className="flex items-center gap-1.5 text-xs font-medium text-[#9ba6ff]">
                Открыть событие

                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path
                    d="M3.5 8H12.5M9 4.5L12.5 8L9 11.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}