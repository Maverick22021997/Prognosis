"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase-browser";
import { useSeasonParticipant } from "@/hooks/useSeasonParticipant";

type StaffRole =
  | "admin"
  | "moderator"
  | null;

const navigation = [
  {
    label: "События",
    href: "/#events",
  },
  {
    label: "Лидеры",
    href: "/leaders",
  },
  {
    label: "Победители",
    href: "/winners",
  },
  {
    label: "Архив",
    href: "/archive",
  },
  {
    label: "Как это работает",
    href: "/how-it-works",
  },
  {
    label: "О платформе",
    href: "/about",
  },
  {
    label: "Правила",
    href: "/rules",
  },
];

export default function Header() {
  const router =
    useRouter();

  const {
    balanceGp,
  } =
    useSeasonParticipant();

  const [
    isMenuOpen,
    setIsMenuOpen,
  ] =
    useState(false);

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    staffRole,
    setStaffRole,
  ] =
    useState<StaffRole>(
      null
    );

  const [
    isAuthLoading,
    setIsAuthLoading,
  ] =
    useState(true);

  // =========================================================
  // AUTH + STAFF ROLE
  // =========================================================

  useEffect(() => {
    const supabase =
      createClient();

    let isMounted =
      true;

    async function loadStaffRole(
      userId:
        string
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "staff_users"
          )
          .select(
            "role"
          )
          .eq(
            "user_id",
            userId
          )
          .maybeSingle();

      if (
        !isMounted
      ) {
        return;
      }

      if (
        error
      ) {
        console.error(
          "Header staff role error:",
          error
        );

        setStaffRole(
          null
        );

        return;
      }

      const role =
        data?.role;

      if (
        role ===
          "admin" ||
        role ===
          "moderator"
      ) {
        setStaffRole(
          role
        );
      } else {
        setStaffRole(
          null
        );
      }
    }

    async function loadUser() {
      const {
        data: {
          user:
            currentUser,
        },
      } =
        await supabase.auth.getUser();

      if (
        !isMounted
      ) {
        return;
      }

      setUser(
        currentUser
      );

      if (
        currentUser
      ) {
        await loadStaffRole(
          currentUser.id
        );
      } else {
        setStaffRole(
          null
        );
      }

      if (
        isMounted
      ) {
        setIsAuthLoading(
          false
        );
      }
    }

    void loadUser();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          session
        ) => {
          const currentUser =
            session?.user ??
            null;

          setUser(
            currentUser
          );

          if (
            currentUser
          ) {
            void loadStaffRole(
              currentUser.id
            );
          } else {
            setStaffRole(
              null
            );
          }

          setIsAuthLoading(
            false
          );
        }
      );

    return () => {
      isMounted =
        false;

      subscription.unsubscribe();
    };
  }, []);

  // =========================================================
  // HELPERS
  // =========================================================

  function closeMenu() {
    setIsMenuOpen(
      false
    );
  }

  async function handleLogout() {
    const supabase =
      createClient();

    await supabase.auth.signOut();

    setUser(
      null
    );

    setStaffRole(
      null
    );

    setIsMenuOpen(
      false
    );

    router.push(
      "/"
    );

    router.refresh();
  }

  const isStaff =
    staffRole ===
      "admin" ||
    staffRole ===
      "moderator";

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0b0c10]/90 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="container-page flex h-[72px] items-center justify-between gap-6">

        {/* LOGO */}

        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3"
          onClick={
            closeMenu
          }
          aria-label="PROGNOSIS.IO — главная страница"
        >
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.12] bg-white/[0.04]">
            <svg
              viewBox="0 0 36 36"
              fill="none"
              className="h-7 w-7"
              aria-hidden="true"
            >
              <path
                d="M10 28V8H19.2C24.2 8 27.5 10.8 27.5 15.1C27.5 19.4 24.2 22.2 19.2 22.2H15.4V28H10Z"
                fill="url(#prognosis-logo-gradient)"
              />

              <path
                d="M15.4 12.5V17.8H18.8C20.9 17.8 22.1 16.8 22.1 15.1C22.1 13.5 20.9 12.5 18.8 12.5H15.4Z"
                fill="#0B0C10"
              />

              <path
                d="M24.2 22.8L28.4 28H22.1L18.7 23.5L24.2 22.8Z"
                fill="#6976FF"
              />

              <defs>
                <linearGradient
                  id="prognosis-logo-gradient"
                  x1="10"
                  y1="8"
                  x2="28"
                  y2="28"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop
                    stopColor="#FFFFFF"
                  />

                  <stop
                    offset="1"
                    stopColor="#A7ACB8"
                  />
                </linearGradient>
              </defs>
            </svg>
          </span>

          <span className="text-[15px] font-semibold tracking-[0.15em] text-white transition-opacity group-hover:opacity-80">
            PROGNOSIS.IO
          </span>
        </Link>

        {/* DESKTOP NAVIGATION */}

        <nav
          className="hidden items-center gap-1 xl:flex"
          aria-label="Основная навигация"
        >
          {navigation.map(
            (
              item
            ) => (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                className="rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {
                  item.label
                }
              </Link>
            )
          )}
        </nav>

        {/* RIGHT DESKTOP */}

        <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
          {!isAuthLoading &&
            (
              user ? (
                <>

                  {/* BALANCE */}

                  <div className="rounded-xl border border-[#6577ff]/20 bg-[#6577ff]/[0.06] px-3.5 py-2.5">
                    <span className="font-mono text-sm font-medium text-[#aeb7ff]">
                      {balanceGp?.toLocaleString(
                        "ru-RU"
                      ) ??
                        "—"}{" "}
                      GP
                    </span>
                  </div>

                  {/* ADMIN */}

                  {isStaff && (
                    <Link
                      href="/admin"
                      className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] px-4 py-2.5 text-sm font-medium text-amber-200/80 transition-colors hover:border-amber-300/25 hover:bg-amber-300/[0.07] hover:text-amber-100"
                    >
                      Админ
                    </Link>
                  )}

                  {/* PROFILE */}

                  <Link
                    href="/profile"
                    className="rounded-xl border border-white/[0.1] bg-white/[0.035] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white"
                  >
                    Профиль
                  </Link>

                  {/* LOGOUT */}

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white/70"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Войти
                  </Link>

                  <Link
                    href="/register"
                    className="rounded-xl border border-white/[0.13] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/[0.22] hover:bg-white/[0.08]"
                  >
                    Регистрация
                  </Link>
                </>
              )
            )}
        </div>

        {/* MOBILE BUTTON */}

        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.03] text-white transition-colors hover:bg-white/[0.07] xl:hidden"
          onClick={() =>
            setIsMenuOpen(
              (
                current
              ) =>
                !current
            )
          }
          aria-label={
            isMenuOpen
              ? "Закрыть меню"
              : "Открыть меню"
          }
          aria-expanded={
            isMenuOpen
          }
          aria-controls="mobile-navigation"
        >
          {isMenuOpen ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M4 7H20M4 12H20M4 17H20"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {/* MOBILE NAVIGATION */}

      {isMenuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-white/[0.07] bg-[#0b0c10]/98 xl:hidden"
        >
          <div className="container-page py-4">

            {/* MAIN LINKS */}

            <nav
              className="grid gap-1"
              aria-label="Мобильная навигация"
            >
              {navigation.map(
                (
                  item
                ) => (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    onClick={
                      closeMenu
                    }
                    className="rounded-xl px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    {
                      item.label
                    }
                  </Link>
                )
              )}
            </nav>

            {/* AUTH AREA */}

            {!isAuthLoading && (
              <div className="mt-4 border-t border-white/[0.07] pt-4">
                {user ? (
                  <div className="grid gap-3">

                    {/* BALANCE */}

                    <div className="flex items-center justify-between rounded-xl border border-[#6577ff]/20 bg-[#6577ff]/[0.06] px-4 py-3">
                      <span className="text-xs text-white/40">
                        Баланс
                      </span>

                      <span className="font-mono text-sm font-medium text-[#aeb7ff]">
                        {balanceGp?.toLocaleString(
                          "ru-RU"
                        ) ??
                          "—"}{" "}
                        GP
                      </span>
                    </div>

                    {/* ADMIN */}

                    {isStaff && (
                      <Link
                        href="/admin"
                        onClick={
                          closeMenu
                        }
                        className="flex min-h-11 items-center justify-center rounded-xl border border-amber-300/15 bg-amber-300/[0.035] text-sm font-medium text-amber-200/80 transition-colors hover:bg-amber-300/[0.07] hover:text-amber-100"
                      >
                        Админ
                      </Link>
                    )}

                    {/* PROFILE */}

                    <Link
                      href="/profile"
                      onClick={
                        closeMenu
                      }
                      className="flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] text-sm font-medium text-white/80"
                    >
                      Профиль
                    </Link>

                    {/* LOGOUT */}

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="min-h-11 rounded-xl text-sm font-medium text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white"
                    >
                      Выйти
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/login"
                      onClick={
                        closeMenu
                      }
                      className="flex min-h-11 items-center justify-center rounded-xl border border-white/[0.1] text-sm font-medium text-white/75"
                    >
                      Войти
                    </Link>

                    <Link
                      href="/register"
                      onClick={
                        closeMenu
                      }
                      className="flex min-h-11 items-center justify-center rounded-xl border border-white/[0.13] bg-white/[0.04] px-4 text-sm font-medium text-white"
                    >
                      Регистрация
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}