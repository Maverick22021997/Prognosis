import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase-admin";

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return invalidCredentials();
    }

    const requestBody = body as {
      username?: unknown;
      password?: unknown;
    };

    const username =
      typeof requestBody.username === "string"
        ? requestBody.username.trim()
        : "";

    const password =
      typeof requestBody.password === "string"
        ? requestBody.password
        : "";

    if (!USERNAME_REGEX.test(username) || !password) {
      return invalidCredentials();
    }

    /*
     * Находим профиль по username.
     * ilike позволяет входить независимо от регистра:
     * test1, Test1 и TEST1.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);

      return serverError();
    }

    if (!profile) {
      return invalidCredentials();
    }

    /*
     * Получаем внутренний email из auth.users.
     * Он остаётся только на сервере и не возвращается клиенту.
     */
    const {
      data: authUserData,
      error: authUserError,
    } = await supabaseAdmin.auth.admin.getUserById(
      profile.id,
    );

    const internalEmail = authUserData.user?.email;

    if (authUserError || !internalEmail) {
      console.error(
        "Auth user lookup error:",
        authUserError,
      );

      return invalidCredentials();
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        "Не настроены NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );

      return serverError();
    }

    /*
     * Пароль проверяет обычный Auth-клиент.
     * Service Role не используется для проверки пароля.
     */
    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );

    const {
      data: signInData,
      error: signInError,
    } = await authClient.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (signInError || !signInData.session) {
      return invalidCredentials();
    }

    return NextResponse.json({
      success: true,
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
    });
  } catch (error) {
    console.error("Login API error:", error);

    return serverError();
  }
}

function invalidCredentials() {
  return NextResponse.json(
    {
      success: false,
      message: "Неверный никнейм или пароль.",
    },
    {
      status: 401,
    },
  );
}

function serverError() {
  return NextResponse.json(
    {
      success: false,
      message: "Сервис входа временно недоступен.",
    },
    {
      status: 500,
    },
  );
}