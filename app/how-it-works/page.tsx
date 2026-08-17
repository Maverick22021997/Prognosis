import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Выберите событие",
    description:
      "Изучите вопрос, условия его разрешения и текущую оценку вероятности сообщества.",
  },
  {
    number: "02",
    title: "Сделайте прогноз",
    description:
      "Выберите исход, который считаете наиболее вероятным, и укажите количество GP.",
  },
  {
    number: "03",
    title: "Следите за результатом",
    description:
      "После завершения события прогноз рассчитывается в соответствии с фактическим исходом.",
  },
  {
    number: "04",
    title: "Поднимайтесь в рейтинге",
    description:
      "Точность прогнозов и результаты сезона определяют ваше положение среди других участников.",
  },
];

const facts = [
  {
    value: "25 000 GP",
    label: "стартовый баланс каждого сезона",
  },
  {
    value: "3 месяца",
    label: "продолжительность сезона",
  },
  {
    value: "TOP-100",
    label: "рейтинг лучших участников",
  },
];

export default function HowItWorksPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          className="pointer-events-none absolute left-1/2 top-[-300px] h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.08] blur-[140px]"
          aria-hidden="true"
        />

        <div className="container-page relative py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8f9aff]">
              Как это работает
            </p>

            <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-white">
              Ваш прогноз.
              <span className="block text-white/45">
                Проверенный результат.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/50 sm:text-lg sm:leading-8">
              prognosis.io позволяет оценивать вероятность будущих событий,
              проверять точность собственных решений и сравнивать результат с
              другими участниками.
            </p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-[#0b0d12] p-7 sm:p-9"
              >
                <span className="font-mono text-xs text-[#7d89ff]">
                  {step.number}
                </span>

                <h2 className="mt-7 text-xl font-semibold tracking-[-0.025em] text-white">
                  {step.title}
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-white/45">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Season */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
                  Сезоны
                </p>

                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  Начинайте заново каждый квартал
                </h2>

                <p className="mt-5 max-w-lg text-sm leading-7 text-white/45">
                  Каждый сезон длится три месяца. Участники получают новый
                  стартовый баланс и снова соревнуются за место в рейтинге.
                  История предыдущих сезонов сохраняется в профиле.
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"
                  >
                    <dt className="font-mono text-lg font-medium text-white">
                      {fact.value}
                    </dt>

                    <dd className="mt-2 text-xs leading-5 text-white/40">
                      {fact.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Rewards */}
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-[#6577ff]/20 bg-[#6577ff]/[0.055] px-7 py-10 sm:px-10 lg:px-12">
            <div
              className="pointer-events-none absolute right-[-120px] top-[-160px] h-[360px] w-[360px] rounded-full bg-[#6577ff]/15 blur-[100px]"
              aria-hidden="true"
            />

            <div className="relative max-w-2xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#6577ff]/20 bg-[#6577ff]/10 text-[#aab3ff]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="M8 3H16V6.5C16 8.71 14.21 10.5 12 10.5C9.79 10.5 8 8.71 8 6.5V3Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M8 5H5V6.2C5 8.3 6.7 10 8.8 10H9M16 5H19V6.2C19 8.3 17.3 10 15.2 10H15M12 10.5V15M9 20H15M10 15H14L14.8 20H9.2L10 15Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>

              <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
                Точность может приносить не только место в рейтинге
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/50">
                По результатам сезонов лучшие участники prognosis.io могут
                получать призы и подарки. Награды связаны с результатами
                интеллектуального соревнования, а участие в платформе не
                требует денежных ставок.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 border-t border-white/[0.07] pt-10 sm:flex-row">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
              Готовы проверить свою точность?
            </h2>

            <p className="mt-2 text-sm text-white/40">
              Выберите событие и сделайте первый прогноз.
            </p>
          </div>

          <Link
            href="/#events"
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#6577ff] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#7383ff]"
          >
            Смотреть события
          </Link>
        </div>
      </section>
    </main>
  );
}