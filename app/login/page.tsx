"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!username.trim()) {
      setError("Введите логин.");
      return;
    }

    if (!password) {
      setError("Введите пароль.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message);
        return;
      }

      const supabase = createClient();

      const { error: sessionError } =
        await supabase.auth.setSession({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        });

      if (sessionError) {
        setError("Не удалось создать сессию.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);

      setError("Не удалось войти. Попробуйте ещё раз.");
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
                Вход
              </p>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
                С возвращением
              </h1>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Войдите в аккаунт, чтобы продолжить прогнозировать и следить за
                своими результатами.
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
                  onChange={(event) =>
                    setUsername(event.target.value)
                  }
                  placeholder="Введите логин"
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-white/70"
                  >
                    Пароль
                  </label>

                  <Link
  href="/forgot-password"
  className="text-xs font-medium text-[#9ba6ff] transition-colors hover:text-[#b2baff]"
>
  Забыли пароль?
</Link>
                </div>

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Введите пароль"
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#7383ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Входим..." : "Войти"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/35">
              Нет аккаунта?{" "}
              <Link
                href="/register"
                className="font-medium text-[#9ba6ff] transition-colors hover:text-[#b2baff]"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}