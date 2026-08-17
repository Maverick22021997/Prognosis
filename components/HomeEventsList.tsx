"use client";

import { useRouter } from "next/navigation";

import EventCard from "@/components/EventCard";
import {
  notifySeasonParticipantRefresh,
  useSeasonParticipant,
} from "@/hooks/useSeasonParticipant";

import type { Event } from "@/types/event";

type HomeEventsListProps = {
  events: Event[];
};

export default function HomeEventsList({
  events,
}: HomeEventsListProps) {
  const router = useRouter();

  const {
    balanceGp,
    refresh,
  } = useSeasonParticipant();

  async function handlePredictionSuccess() {
  await refresh();

  notifySeasonParticipantRefresh();

  router.refresh();
}

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          currentBalance={balanceGp}
          onPredictionSuccess={
            handlePredictionSuccess
          }
        />
      ))}
    </div>
  );
}