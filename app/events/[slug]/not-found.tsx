import Link from "next/link";

import Card from "@/components/ui/Card";

export default function EventNotFound() {
  return (
    <main className="container-page flex min-h-[70vh] items-center justify-center py-10">
      <Card className="w-full max-w-lg px-6 py-14 text-center sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-white/[0.03] text-2xl">
          ◈
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
          Событие не найдено
        </h1>

        <p className="mt-3 text-sm leading-6 text-[var(--foreground-muted)]">
          Возможно, событие было удалено, перемещено или ссылка
          содержит ошибку.
        </p>

        <Link
          href="/"
          className="focus-ring mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
        >
          Вернуться к событиям
        </Link>
      </Card>
    </main>
  );
}