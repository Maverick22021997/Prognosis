"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedUsername =
      username.trim();

    if (!normalizedUsername) {
      setError("Введите логин.");
      return;
    }

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

    setIsLoading(true);

    try {
      const response = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            username:
              normalizedUsername,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        setError(
          result.message ??
            "Не удалось выполнить запрос."
        );

        return;
      }

      setSuccess(
        result.message ??
          "Если для этого аккаунта доступно восстановление, мы отправили код на привязанный email."
      );

      /*
       * Через секунду переводим пользователя
       * на страницу ввода кода и нового пароля.
       *
       * Username передаём в query-параметре,
       * чтобы пользователь не вводил его повторно.
       */
      setTimeout(() => {
        router.push(
          `/reset-password?username=${encodeURIComponent(
            normalizedUsername
          )}`
        );
      }, 1200);
    } catch (requestError) {
      console.error(
        "Forgot password error:",
        requestError
      );

      setError(
        "Не удалось выполнить запрос. Попробуйте ещё раз."
      );
    } finally {
      setIsLoading(false);
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
                Забыли пароль?
              </h1>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Введите логин аккаунта. Если к
                нему привязан подтверждённый
                email, мы отправим код для
                восстановления доступа.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8"
            >
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
                  setSuccess("");
                }}
                placeholder="Введите логин"
                maxLength={20}
                disabled={isLoading}
                className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60 disabled:cursor-not-allowed disabled:opacity-50"
              />

              {error && (
                <div className="mt-5 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm leading-6 text-emerald-300">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#7383ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? "Отправляем..."
                  : "Получить код"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/35">
              Вспомнили пароль?{" "}
              <Link
                href="/login"
                className="font-medium text-[#9ba6ff] transition-colors hover:text-[#b2baff]"
              >
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}