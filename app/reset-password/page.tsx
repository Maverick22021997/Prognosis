"use client";

import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const [username, setUsername] =
    useState(
      searchParams.get("username") ??
        ""
    );

  const [token, setToken] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedUsername =
      username.trim();

    const normalizedToken =
      token.trim();

    if (
      !/^[A-Za-z0-9_]{3,20}$/.test(
        normalizedUsername
      )
    ) {
      setError(
        "Введите корректный логин."
      );

      return;
    }

    if (
  !/^\d{6}$/.test(
    normalizedToken
  )
) {
  setError(
    "Код должен содержать 6 цифр."
  );

  return;
}

    if (password.length < 8) {
      setError(
        "Пароль должен содержать минимум 8 символов."
      );

      return;
    }

    if (
      password !==
      passwordConfirmation
    ) {
      setError(
        "Пароли не совпадают."
      );

      return;
    }

    setIsSaving(true);

    try {
      const response =
        await fetch(
          "/api/auth/reset-password",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              username:
                normalizedUsername,
              token:
                normalizedToken,
              password,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ??
            "Не удалось изменить пароль."
        );

        return;
      }

      setSuccess(
        "Пароль успешно изменён."
      );

      setPassword("");
      setPasswordConfirmation("");
      setToken("");

      setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 1500);
    } catch (requestError) {
      console.error(
        "Reset password request error:",
        requestError
      );

      setError(
        "Не удалось изменить пароль. Попробуйте ещё раз."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-[-260px] h-[600px] w-[850px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.08] blur-[140px]"
        aria-hidden="true"
      />

      <div className="container-page relative flex min-h-[calc(100vh-72px)] items-center justify-center py-12">
        <div className="w-full max-w-[460px]">
          <div className="rounded-3xl border border-white/[0.08] bg-[#0d0f15]/95 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
                Восстановление доступа
              </p>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
                Новый пароль
              </h1>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Введите код из письма
                и придумайте новый пароль.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
              <div>
                <label
                  htmlFor="username"
                  className="text-sm font-medium text-white/70"
                >
                  Логин
                </label>

                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => {
                    setUsername(
                      event.target.value
                    );
                    setError("");
                  }}
                  placeholder="Введите логин"
                  maxLength={20}
                  disabled={
                    isSaving ||
                    Boolean(success)
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60 disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="token"
                  className="text-sm font-medium text-white/70"
                >
                  Код из письма
                </label>

                <input
                  id="token"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={token}
                  onChange={(event) => {
                    const value =
                      event.target.value
                        .replace(
                          /\D/g,
                          ""
                        )
                        .slice(0, 6);

                    setToken(value);
                    setError("");
                  }}
                  placeholder="000000"
                  maxLength={6}
                  disabled={
                    isSaving ||
                    Boolean(success)
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 font-mono text-lg tracking-[0.2em] text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60 disabled:opacity-50"
                />

                <p className="mt-2 text-xs leading-5 text-white/30">
                  Код отправлен на
                  подтверждённый email,
                  привязанный к аккаунту.
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-white/70"
                >
                  Новый пароль
                </label>

                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(
                      event.target.value
                    );
                    setError("");
                  }}
                  placeholder="Минимум 8 символов"
                  disabled={
                    isSaving ||
                    Boolean(success)
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60 disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="password-confirmation"
                  className="text-sm font-medium text-white/70"
                >
                  Повторите пароль
                </label>

                <input
                  id="password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={
                    passwordConfirmation
                  }
                  onChange={(event) => {
                    setPasswordConfirmation(
                      event.target.value
                    );
                    setError("");
                  }}
                  placeholder="Повторите новый пароль"
                  disabled={
                    isSaving ||
                    Boolean(success)
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60 disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm leading-6 text-emerald-300">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isSaving ||
                  Boolean(success)
                }
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#7383ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving
                  ? "Сохраняем..."
                  : "Изменить пароль"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/35">
              Не получили код?{" "}
              <Link
                href="/forgot-password"
                className="font-medium text-[#9ba6ff] transition-colors hover:text-[#b2baff]"
              >
                Запросить новый
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}