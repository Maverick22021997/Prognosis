import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@supabase/supabase-js";

import {
  supabaseAdmin,
} from "@/lib/supabase-admin";

const USERNAME_REGEX =
  /^[A-Za-z0-9_]{3,20}$/;

export async function POST(
  request: NextRequest
) {
  try {
    const body: unknown =
      await request.json();

    if (
      !body ||
      typeof body !== "object"
    ) {
      return invalidRecovery();
    }

    const requestBody = body as {
      username?: unknown;
      token?: unknown;
      password?: unknown;
    };

    const username =
      typeof requestBody.username === "string"
        ? requestBody.username.trim()
        : "";

    const token =
      typeof requestBody.token === "string"
        ? requestBody.token.trim()
        : "";

    const password =
      typeof requestBody.password === "string"
        ? requestBody.password
        : "";

    if (
      !USERNAME_REGEX.test(username)
    ) {
      return invalidRecovery();
    }

   if (
  !/^\d{6}$/.test(token)
) {
  return invalidRecovery();
}

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Пароль должен содержать минимум 8 символов.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Находим профиль по username.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (
      profileError ||
      !profile
    ) {
      if (profileError) {
        console.error(
          "Reset password profile error:",
          profileError
        );
      }

      return invalidRecovery();
    }

    /*
     * Получаем настоящий email пользователя
     * сервером.
     */
    const {
      data: authUserData,
      error: authUserError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        profile.id
      );

    const authUser =
      authUserData.user;

    const email =
      authUser?.email;

    if (
      authUserError ||
      !authUser ||
      !email ||
      email.endsWith(
        "@prognosis.local"
      ) ||
      !authUser.email_confirmed_at
    ) {
      if (authUserError) {
        console.error(
          "Reset password auth lookup error:",
          authUserError
        );
      }

      return invalidRecovery();
    }

    const supabaseUrl =
      process.env
        .NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      console.error(
        "Reset password env variables are missing."
      );

      return serverError();
    }

    /*
     * Отдельный Auth client.
     *
     * Сессия после verifyOtp нам хранить
     * не требуется.
     */
    const authClient =
      createClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    /*
     * Проверяем recovery-код.
     */
    const {
      data: verifyData,
      error: verifyError,
    } =
      await authClient.auth.verifyOtp({
        email,
        token,
        type: "recovery",
      });

    if (
      verifyError ||
      !verifyData.user
    ) {
      console.error(
        "Recovery OTP verification error:",
        verifyError
      );

      return invalidRecovery();
    }

    /*
     * Дополнительная защита:
     * OTP должен принадлежать именно
     * найденному по username пользователю.
     */
    if (
      verifyData.user.id !==
      profile.id
    ) {
      console.error(
        "Recovery user mismatch."
      );

      return invalidRecovery();
    }

    /*
     * Код подтверждён.
     * Меняем пароль серверным Admin API.
     */
    const {
      error: updateError,
    } =
      await supabaseAdmin.auth.admin.updateUserById(
        profile.id,
        {
          password,
        }
      );

    if (updateError) {
      console.error(
        "Password update error:",
        updateError
      );

      return serverError();
    }

    /*
     * Закрываем временную сессию,
     * созданную verifyOtp.
     */
    if (verifyData.session) {
      await authClient.auth.signOut();
    }

    return NextResponse.json({
      success: true,
      message:
        "Пароль успешно изменён.",
    });
  } catch (error) {
    console.error(
      "Reset password API error:",
      error
    );

    return serverError();
  }
}

function invalidRecovery() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Неверный или устаревший код восстановления.",
    },
    {
      status: 400,
    }
  );
}

function serverError() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Не удалось изменить пароль. Попробуйте ещё раз.",
    },
    {
      status: 500,
    }
  );
}