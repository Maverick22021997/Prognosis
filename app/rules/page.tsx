import Link from "next/link";

const rules = [
  {
    number: "01",
    title: "Возраст участников",
    text: "Участвовать в prognosis.io могут только лица, достигшие 18 лет. При регистрации пользователь подтверждает, что на момент создания аккаунта ему исполнилось 18 лет.",
  },
  {
    number: "02",
    title: "Участие",
    text: "Участие в prognosis.io бесплатное. Для создания прогнозов необходим зарегистрированный аккаунт.",
  },
  {
    number: "03",
    title: "Виртуальный баланс GP",
    text: "В начале каждого сезона участник получает 25 000 GP. GP используются только внутри платформы и не являются денежными средствами.",
  },
  {
    number: "04",
    title: "Создание прогнозов",
    text: "Для каждого события участник выбирает один из доступных исходов и определяет количество GP, которое хочет использовать для прогноза.",
  },
  {
    number: "05",
    title: "Завершение события",
    text: "После наступления проверяемого результата событие закрывается и рассчитывается в соответствии с заранее опубликованными условиями.",
  },
  {
    number: "06",
    title: "Сезоны",
    text: "Один сезон длится три месяца. С началом нового сезона участники получают новый стартовый баланс, а результаты предыдущих сезонов сохраняются в истории профиля.",
  },
  {
    number: "07",
    title: "Рейтинг",
    text: "Положение участника определяется результатами его прогнозов в рамках текущего сезона. Для участия в итоговом рейтинге необходимо сделать не менее 3 прогнозов.",
  },
  {
    number: "08",
    title: "Дополнительные GP",
    text: "Если баланс участника достигнет нуля, один раз за сезон можно получить дополнительные 1 000 GP и продолжить участие.",
  },
  {
    number: "09",
    title: "Призы",
    text: "По итогам сезона лучшие участники могут получать призы и подарки. Конкретный состав наград и условия их получения публикуются отдельно для каждого сезона.",
  },
];

export default function RulesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          className="pointer-events-none absolute left-1/2 top-[-320px] h-[650px] w-[900px] -translate-x-1/2 rounded-full bg-[#6577ff]/[0.08] blur-[150px]"
          aria-hidden="true"
        />

        <div className="container-page relative py-20 sm:py-24 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8f9aff]">
              Правила
            </p>

            <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-white">
              Всё просто.
              <span className="block text-white/45">
                Главное — быть точным.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/50 sm:text-lg sm:leading-8">
              Основные правила участия в prognosis.io, использования GP,
              формирования рейтинга и получения сезонных наград.
            </p>
          </div>
        </div>
      </section>

      {/* Main rules */}
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
              Основные положения
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              Как устроено участие
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
            {rules.map((rule, index) => (
              <article
                key={rule.number}
                className={`grid gap-5 bg-[#0b0d12] p-6 sm:grid-cols-[70px_220px_1fr] sm:gap-6 sm:p-8 ${
                  index !== rules.length - 1
                    ? "border-b border-white/[0.07]"
                    : ""
                }`}
              >
                <span className="font-mono text-xs text-[#7d89ff]">
                  {rule.number}
                </span>

                <h3 className="text-base font-semibold text-white">
                  {rule.title}
                </h3>

                <p className="max-w-2xl text-sm leading-6 text-white/45">
                  {rule.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Important note */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-6 rounded-3xl border border-[#6577ff]/20 bg-[#6577ff]/[0.055] p-7 sm:p-9 lg:grid-cols-[auto_1fr] lg:gap-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#6577ff]/20 bg-[#6577ff]/10 text-[#aab3ff]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />

                  <path
                    d="M12 10V16M12 7.5V7.6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
                  GP не являются реальными деньгами
                </h2>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">
                  Виртуальные единицы GP предназначены исключительно для
                  механики prognosis.io. Их нельзя купить, продать, обменять на
                  деньги или вывести с платформы.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event resolution */}
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
                Результаты событий
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
                Проверяемый результат
              </h2>
            </div>

            <div className="space-y-5 text-sm leading-7 text-white/45">
              <p>
                Для каждого события заранее публикуется формулировка вопроса,
                срок завершения и критерии определения результата.
              </p>

              <p>
                После завершения события результат фиксируется на основании
                указанных в его условиях источников или объективно
                установленного факта.
              </p>

              <p className="text-white/70">
                Условия определения результата не должны изменяться после
                начала события, кроме случаев очевидной технической ошибки или
                невозможности определить исход по первоначальным условиям.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Fair play */}
      <section className="border-y border-white/[0.06] bg-white/[0.015]">
        <div className="container-page py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
                Честная игра
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
                Один человек — один участник
              </h2>

              <p className="mt-5 text-sm leading-7 text-white/45">
                Использование нескольких аккаунтов, автоматизированных
                способов участия, попытки манипулирования рейтингом или иные
                действия, создающие несправедливое преимущество, могут привести
                к исключению результатов участника из рейтинга.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rewards */}
      <section className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 rounded-3xl border border-white/[0.08] bg-[#0d0f15] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#8f9aff]">
                Награды сезона
              </p>

              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
                Призы получают лучшие участники
              </h2>

              <p className="mt-4 text-sm leading-7 text-white/45">
                Перед началом или в течение сезона prognosis.io публикует состав
                наград, количество призовых мест и дополнительные условия.
                Участие в прогнозах остаётся бесплатным независимо от наличия
                призов.
              </p>
            </div>

            <div className="rounded-2xl border border-[#6577ff]/20 bg-[#6577ff]/[0.06] px-6 py-5">
              <span className="font-mono text-sm font-medium text-[#aeb7ff]">
                TOP сезона
              </span>

              <p className="mt-2 text-xs text-white/40">
                призы и подарки
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Legal placeholder */}
      <section className="container-page pb-16">
        <div className="mx-auto max-w-5xl border-t border-white/[0.07] pt-8">
          <p className="max-w-3xl text-xs leading-6 text-white/30">
            Настоящая страница содержит основные правила работы платформы.
            Подробные условия конкретного сезона, проведения конкурса и
            предоставления наград могут публиковаться отдельным документом.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 border-t border-white/[0.07] pt-10 sm:flex-row">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.025em] text-white">
              Всё понятно?
            </h2>

            <p className="mt-2 text-sm text-white/40">
              Тогда можно переходить к прогнозам.
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