"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase-browser";

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

function getRegistrationErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("already been registered")
  ) {
    return "Пользователь с такими данными уже зарегистрирован.";
  }

  if (
    normalizedMessage.includes("duplicate key") ||
    normalizedMessage.includes("profiles_username_lower_unique") ||
    normalizedMessage.includes("profiles_username_key")
  ) {
    return "Этот никнейм уже занят.";
  }

  if (normalizedMessage.includes("password")) {
    return "Пароль не соответствует требованиям безопасности.";
  }

  if (normalizedMessage.includes("email")) {
    return "Проверьте правильность указанного email.";
  }

  return "Не удалось зарегистрироваться. Попробуйте ещё раз.";
}

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [personalDataAccepted, setPersonalDataAccepted] = useState(false);
  const [contestRulesAccepted, setContestRulesAccepted] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const normalizedUsername = username.trim();

  const isFormValid =
    USERNAME_REGEX.test(normalizedUsername) &&
    password.length >= 8 &&
    password === passwordRepeat &&
    ageConfirmed &&
    termsAccepted &&
    privacyAccepted &&
    personalDataAccepted &&
    contestRulesAccepted;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!normalizedUsername) {
      setError("Введите никнейм.");
      return;
    }

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      setError(
        "Никнейм должен содержать от 3 до 20 символов: латинские буквы, цифры и знак подчёркивания."
      );
      return;
    }

    if (email.trim() && !email.includes("@")) {
      setError("Введите корректный email или оставьте поле пустым.");
      return;
    }

    if (password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов.");
      return;
    }

    if (password !== passwordRepeat) {
      setError("Пароли не совпадают.");
      return;
    }

    if (!ageConfirmed) {
      setError(
        "Для регистрации необходимо подтвердить, что вам исполнилось 18 лет."
      );
      return;
    }

    if (
      !termsAccepted ||
      !privacyAccepted ||
      !personalDataAccepted ||
      !contestRulesAccepted
    ) {
      setError("Для регистрации необходимо принять все обязательные условия.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const technicalEmail = `${crypto.randomUUID()}@prognosis.local`;
      const registrationEmail = email.trim().toLowerCase() || technicalEmail;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: registrationEmail,
        password,
        options: {
          data: {
            username: normalizedUsername,
            age_confirmed: true,
            age_confirmed_at: new Date().toISOString(),
            has_real_email: Boolean(email.trim()),
          },
        },
      });

      if (signUpError) {
        console.error("Supabase signUp error:", signUpError);
        setError(getRegistrationErrorMessage(signUpError.message));
        return;
      }

      if (!data.user) {
        setError("Не удалось создать пользователя. Попробуйте ещё раз.");
        return;
      }

      const { error: participantError } = await supabase.rpc(
        "ensure_active_season_participant",
        {
          p_user_id: data.user.id,
        }
      );

      if (participantError) {
        console.error(
          "Season participant creation error:",
          participantError
        );

        setError(
          "Аккаунт создан, но не удалось добавить вас в текущий сезон. Попробуйте войти ещё раз."
        );

        return;
      }

      router.push("/");
      router.refresh();
    } catch (registrationError) {
      console.error("Registration error:", registrationError);

      setError(
        registrationError instanceof Error
          ? getRegistrationErrorMessage(registrationError.message)
          : "Не удалось зарегистрироваться. Попробуйте ещё раз."
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
                Регистрация
              </p>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
                Создайте аккаунт
              </h1>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Получите стартовый баланс и начните проверять свои прогнозы.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="text-sm font-medium text-white/70"
                >
                  Никнейм
                </label>

                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Например, Evgenii_01"
                  maxLength={20}
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60"
                />

                <p className="mt-2 text-xs leading-5 text-white/30">
                  От 3 до 20 символов: латинские буквы, цифры и знак
                  подчёркивания.
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-white/70"
                >
                  Email{" "}
                  <span className="font-normal text-white/30">
                    — необязательно
                  </span>
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60"
                />

                <p className="mt-2 text-xs leading-5 text-white/30">
                  Пригодится для восстановления доступа в будущем.
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-white/70"
                >
                  Пароль
                </label>

                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Минимум 8 символов"
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60"
                />
              </div>

              <div>
                <label
                  htmlFor="password-repeat"
                  className="text-sm font-medium text-white/70"
                >
                  Повторите пароль
                </label>

                <input
                  id="password-repeat"
                  type="password"
                  autoComplete="new-password"
                  value={passwordRepeat}
                  onChange={(event) =>
                    setPasswordRepeat(event.target.value)
                  }
                  placeholder="Повторите пароль"
                  className="mt-2 min-h-12 w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#6577ff]/60"
                />
              </div>

              <ConsentCheckbox
                checked={ageConfirmed}
                onChange={setAgeConfirmed}
              >
                Мне исполнилось{" "}
                <span className="font-medium text-white/80">18 лет</span>
              </ConsentCheckbox>

              <ConsentCheckbox
                checked={termsAccepted}
                onChange={setTermsAccepted}
              >
                Я принимаю{" "}
                <DocumentLink href="/terms">
                  Пользовательское соглашение
                </DocumentLink>
              </ConsentCheckbox>

              <ConsentCheckbox
                checked={privacyAccepted}
                onChange={setPrivacyAccepted}
              >
                Я ознакомился с{" "}
                <DocumentLink href="/privacy">
                  Политикой конфиденциальности
                </DocumentLink>
              </ConsentCheckbox>

              <ConsentCheckbox
                checked={personalDataAccepted}
                onChange={setPersonalDataAccepted}
              >
                Я даю{" "}
                <DocumentLink href="/personal-data-consent">
                  согласие на обработку персональных данных
                </DocumentLink>
              </ConsentCheckbox>

              <ConsentCheckbox
                checked={contestRulesAccepted}
                onChange={setContestRulesAccepted}
              >
                Я принимаю{" "}
                <DocumentLink href="/rules">
                  Правила платформы и участия в конкурсах
                </DocumentLink>
              </ConsentCheckbox>

              {error && (
                <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#6577ff] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#7383ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading
                  ? "Создаём аккаунт..."
                  : "Зарегистрироваться"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-white/35">
              Уже есть аккаунт?{" "}
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

type ConsentCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
};

function ConsentCheckbox({
  checked,
  onChange,
  children,
}: ConsentCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#6577ff]"
      />

      <span className="text-sm leading-5 text-white/55">{children}</span>
    </label>
  );
}

type DocumentLinkProps = {
  href: string;
  children: React.ReactNode;
};

function DocumentLink({ href, children }: DocumentLinkProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[#9ba6ff] transition-colors hover:text-[#b2baff]"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Link>
  );
}