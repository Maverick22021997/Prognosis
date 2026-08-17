import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase-admin";

const USERNAME_REGEX =
  /^[A-Za-z0-9_]{3,20}$/;

const GENERIC_MESSAGE =
  "Если для этого аккаунта доступно восстановление, мы отправили письмо на привязанный email.";

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
      return genericResponse();
    }

    const requestBody = body as {
      username?: unknown;
    };

    const username =
      typeof requestBody.username ===
      "string"
        ? requestBody.username.trim()
        : "";

    if (
      !USERNAME_REGEX.test(username)
    ) {
      return genericResponse();
    }

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Password recovery profile lookup error:",
        profileError
      );

      return genericResponse();
    }

    if (!profile) {
      return genericResponse();
    }

    const {
      data: authUserData,
      error: authUserError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        profile.id
      );

    if (
      authUserError ||
      !authUserData.user
    ) {
      console.error(
        "Password recovery auth lookup error:",
        authUserError
      );

      return genericResponse();
    }

    const authUser =
      authUserData.user;

    const email = authUser.email;

    /*
     * Аккаунт только с техническим email
     * восстановить через почту нельзя.
     */
    if (
      !email ||
      email.endsWith(
        "@prognosis.local"
      )
    ) {
      return genericResponse();
    }

    /*
     * Email должен быть подтверждён.
     */
    if (
      !authUser.email_confirmed_at
    ) {
      return genericResponse();
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
        "Password recovery env variables are missing."
      );

      return genericResponse();
    }

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
     * redirectTo здесь оставляем.
     * Он используется Supabase при формировании
     * recovery-письма, хотя сам email-template
     * будет вести на наш /auth/confirm.
     */
    const siteUrl =
      process.env
        .NEXT_PUBLIC_SITE_URL ??
      "http://127.0.0.1:3000";

    const redirectTo =
      `${siteUrl}/reset-password`;

    const {
      error: resetError,
    } =
      await authClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo,
        }
      );

    if (resetError) {
      console.error(
        "Password reset email error:",
        resetError
      );
    }

    return genericResponse();
  } catch (error) {
    console.error(
      "Forgot password API error:",
      error
    );

    return genericResponse();
  }
}

function genericResponse() {
  return NextResponse.json({
    success: true,
    message: GENERIC_MESSAGE,
  });
}