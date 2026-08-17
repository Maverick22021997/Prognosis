import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(request: NextRequest) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return unauthorized();
    }

    const accessToken = authorization.slice(
      "Bearer ".length
    );

    if (!accessToken) {
      return unauthorized();
    }

    /*
     * Не принимаем userId от клиента.
     * Определяем пользователя исключительно
     * по действующей Supabase-сессии.
     */
    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    const user = userData.user;

    if (userError || !user) {
      console.error(
        "Delete account auth error:",
        userError
      );

      return unauthorized();
    }

    /*
     * Сначала удаляем данные активных /
     * прошлых сезонов пользователя.
     */
    const {
      error: participantDeleteError,
    } = await supabaseAdmin
      .from("season_participants")
      .delete()
      .eq("user_id", user.id);

    if (participantDeleteError) {
      console.error(
        "Season participants delete error:",
        participantDeleteError
      );

      return serverError();
    }

    /*
     * Затем профиль.
     */
    const {
      error: profileDeleteError,
    } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileDeleteError) {
      console.error(
        "Profile delete error:",
        profileDeleteError
      );

      return serverError();
    }

    /*
     * В самом конце удаляем пользователя
     * из Supabase Auth.
     */
    const {
      error: authDeleteError,
    } =
      await supabaseAdmin.auth.admin.deleteUser(
        user.id
      );

    if (authDeleteError) {
      console.error(
        "Auth user delete error:",
        authDeleteError
      );

      return serverError();
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Delete account API error:",
      error
    );

    return serverError();
  }
}

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      message: "Необходима авторизация.",
    },
    {
      status: 401,
    }
  );
}

function serverError() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Не удалось удалить аккаунт. Попробуйте ещё раз.",
    },
    {
      status: 500,
    }
  );
}