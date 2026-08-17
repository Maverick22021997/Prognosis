import Link from "next/link";

const principles = [
  {
    title: "Не азарт, а проверка мышления",
    description:
      "prognosis.io создан не вокруг денежных ставок, а вокруг способности оценивать вероятность событий и проверять качество собственных решений.",
  },
  {
    title: "Результат можно измерить",
    description:
      "Каждый прогноз сохраняется, а после завершения события становится понятно, насколько точной была ваша оценка.",
  },
  {
    title: "Коллективное мнение",
    description:
      "Вероятность события формируется на основе решений участников и показывает, как сообщество оценивает возможный исход.",
  },
  {
    title: "Соревнование на дистанции",
    description:
      "Один удачный прогноз ничего не доказывает. Поэтому участники соревнуются в рамках сезонов и строят историю результатов.",
  },
];

const directions = [
  "Экономика",
  "Политика",
  "Спорт",
  "Технологии",
  "Развлечения",
  "Мир",
];

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          className="pointer-events-none absolute left-1/2 top-[-320px] h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.08] blur-[150px]"
          aria-hidden="true"
        />

        <div className="container-page relative py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8f9aff]">
              О платформе
            </p>

            <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-white">
              Место, где мнение
              <span className="block text-white/45">
                превращается в результат
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/50 sm:text-lg sm:leading-8">
              prognosis.io — платформа коллективного прогнозирования, где можно
              оценивать вероятность будущих событий, сравнивать своё мнение с
              другими участниками и со временем понимать, насколько точны ваши
              собственные прогнозы.
            </p>
          </div>
        </div>
      </section>

      {/* Main idea */}
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
                Идея
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Мы постоянно делаем прогнозы
              </h2>
            </div>

            <div className="space-y-5 text-sm leading-7 text-white/50 sm:text-base">
              <p>
                Каждый день мы предполагаем, что произойдёт с рынком, спортом,
                технологиями, политикой или мировой повесткой. Но большинство
                таких предположений быстро забывается.
              </p>

              <p>
                prognosis.io предлагает другой подход: зафиксировать своё мнение
                заранее, дождаться результата и проверить, насколько хорошо вы
                действительно оцениваете будущее.
              </p>

              <p className="text-white/75">
                Главная ценность платформы — не сам прогноз, а возможность
                измерять качество собственного мышления на дистанции.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
                Принципы
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                На чём строится prognosis.io
              </h2>
            </div>

            <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-2">
              {principles.map((principle) => (
                <article
                  key={principle.title}
                  className="bg-[#0b0d12] p-7 sm:p-9"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#6577ff]/20 bg-[#6577ff]/[0.07]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7d89ff] shadow-[0_0_10px_rgba(125,137,255,0.8)]" />
                  </div>

                  <h3 className="mt-6 text-xl font-semibold tracking-[-0.025em] text-white">
                    {principle.title}
                  </h3>

                  <p className="mt-3 max-w-md text-sm leading-6 text-white/45">
                    {principle.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
                Темы
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Прогнозируйте то, что действительно интересно
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">
                На платформе собраны события из разных областей. Со временем
                набор категорий может расширяться вместе с развитием
                сообщества.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {directions.map((direction) => (
                <span
                  key={direction}
                  className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-3 text-sm font-medium text-white/65"
                >
                  {direction}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GP */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-7 sm:p-10 lg:p-12">
              <div
                className="pointer-events-none absolute right-[-100px] top-[-140px] h-[320px] w-[320px] rounded-full bg-[#6577ff]/10 blur-[100px]"
                aria-hidden="true"
              />

              <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="max-w-2xl">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
                    GP
                  </p>

                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
                    Внутренняя игровая единица платформы
                  </h2>

                  <p className="mt-4 text-sm leading-7 text-white/45">
                    Для прогнозов используется виртуальный баланс GP. Он
                    позволяет участникам распределять уверенность между
                    событиями и участвовать в механике платформы без реальных
                    денежных ставок.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#6577ff]/20 bg-[#6577ff]/[0.06] px-7 py-6">
                  <p className="font-mono text-3xl font-medium tracking-[-0.04em] text-white">
                    25 000 GP
                  </p>

                  <p className="mt-2 text-xs text-white/40">
                    на старте сезона
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Competition */}
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
                Соревнование
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Оказаться правым — интересно
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">
                Участники соревнуются в течение сезона, поднимаются в общем
                рейтинге и формируют собственную историю результатов.
                Лучшие участники сезона могут получать призы и подарки.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <span className="text-xs font-medium uppercase tracking-[0.13em] text-white/35">
                  Сезон
                </span>

                <span className="font-mono text-xs text-[#8f9aff]">
                  TOP-100
                </span>
              </div>

              <div className="space-y-3 pt-5">
                {[
                  ["01", "analyst_01", "9 842"],
                  ["02", "forecast_lab", "9 516"],
                  ["03", "observer", "9 301"],
                ].map(([position, name, score]) => (
                  <div
                    key={position}
                    className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                  >
                    <span className="w-6 font-mono text-xs text-white/30">
                      {position}
                    </span>

                    <span className="flex-1 text-sm font-medium text-white/70">
                      {name}
                    </span>

                    <span className="font-mono text-sm text-white">
                      {score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 border-t border-white/[0.07] pt-10 sm:flex-row">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
              Проверьте собственные прогнозы
            </h2>

            <p className="mt-2 text-sm text-white/40">
              Начните с любого открытого события.
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