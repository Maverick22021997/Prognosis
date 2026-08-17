"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase-browser";
import { useSeasonParticipant } from "@/hooks/useSeasonParticipant";

type Season = {
  id: number;
  title: string;
  start_at: string;
  end_at: string;
  status: string;
};

function getRemainingTime(endAt: string) {
  const difference =
    new Date(endAt).getTime() - new Date().getTime();

  if (difference <= 0) {
    return "сезон завершён";
  }

  const hours = Math.ceil(difference / (1000 * 60 * 60));

  if (hours < 24) {
    return `${hours} ч.`;
  }

  const days = Math.ceil(hours / 24);

  return `${days} дн.`;
}

function getSeasonProgress(startAt: string, endAt: string) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const now = new Date().getTime();

  if (end <= start) {
    return 0;
  }

  if (now <= start) {
    return 0;
  }

  if (now >= end) {
    return 100;
  }

  return Math.round(((now - start) / (end - start)) * 100);
}

export default function SeasonBar() {
  const [season, setSeason] = useState<Season | null>(null);
  const {
    user,
    points,
    predictionsCount,
  } = useSeasonParticipant();

  useEffect(() => {
    const supabase = createClient();

    async function loadSeason() {
      const { data, error } = await supabase
        .from("seasons")
        .select("id, title, start_at, end_at, status")
        .eq("status", "active")
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("SeasonBar loading error:", error);
        return;
      }

      setSeason(data);
    }

    loadSeason();
  }, []);

  if (!season) {
    return null;
  }

  const remaining = getRemainingTime(season.end_at);

  const progress = getSeasonProgress(
    season.start_at,
    season.end_at
  );

  return (
    <section className="border-y border-white/[0.08] bg-[#151b24] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="container-page py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex shrink-0 items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#7f8cff] shadow-[0_0_10px_rgba(115,131,255,0.8)]" />

              <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#b6c0ff]">
                Сезон активен
              </span>
            </div>

            <div className="hidden h-4 w-px bg-white/[0.08] sm:block" />

            <span className="truncate text-sm font-medium text-white/75">
              {season.title}
            </span>

            <span className="hidden text-sm text-white/30 md:inline">
              До конца{" "}
              <span className="font-mono text-white/60">
                {remaining}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden items-center gap-3 md:flex">
                <span className="text-xs text-white/35">
                  Очки{" "}
                  <span className="font-mono font-medium text-white/65">
                    {points.toLocaleString("ru-RU")}
                  </span>
                </span>

                <span className="h-3 w-px bg-white/[0.08]" />

                <span className="text-xs text-white/35">
                  Прогнозы{" "}
                  <span className="font-mono font-medium text-white/65">
                    {predictionsCount}
                  </span>
                </span>
              </div>
            )}
            <div className="hidden w-28 lg:block">
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6577ff] to-[#8b98ff]"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>

            <span className="text-xs text-white/35 md:hidden">
              До конца{" "}
              <span className="font-mono text-white/60">
                {remaining}
              </span>
            </span>

            <Link
              href="/leaders"
              className="shrink-0 text-xs font-medium text-white/45 transition-colors hover:text-[#9ba6ff]"
            >
              Рейтинг сезона →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}