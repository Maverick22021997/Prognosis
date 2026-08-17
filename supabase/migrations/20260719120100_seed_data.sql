begin;

-- ============================================================
-- PROGNOSIS
-- Initial seed data
-- ============================================================
-- ============================================================
-- 1. EVENT CATEGORIES
-- ============================================================

insert into public.event_categories (
  code,
  name,
  description,
  icon,
  sort_order,
  is_active
)
values
  (
    'sport',
    'Спорт',
    'Спортивные соревнования, матчи, турниры и достижения.',
    'trophy',
    10,
    true
  ),
  (
    'economy',
    'Экономика',
    'Экономические показатели, рынки, компании и финансы.',
    'chart-no-axes-combined',
    20,
    true
  ),
  (
    'news',
    'Новости',
    'Общественно значимые события и актуальная повестка.',
    'newspaper',
    30,
    true
  ),
  (
    'entertainment',
    'Развлечения',
    'Кино, музыка, телевидение, премии и популярная культура.',
    'clapperboard',
    40,
    true
  ),
  (
    'world',
    'Мир',
    'Международные события, наука, общество и глобальные процессы.',
    'globe-2',
    50,
    true
  );
  -- ============================================================
-- 2. REPUTATION LEVELS
-- ============================================================

insert into public.reputation_levels (
  code,
  title,
  description,
  icon,
  min_reputation,
  max_reputation,
  sort_order,
  is_active
)
values
  (
    'newcomer',
    'Новичок',
    'Начальный уровень участника платформы.',
    'circle',
    0,
    99,
    10,
    true
  ),
  (
    'observer',
    'Наблюдатель',
    'Участник, который начинает регулярно делать прогнозы.',
    'eye',
    100,
    499,
    20,
    true
  ),
  (
    'analyst',
    'Аналитик',
    'Опытный участник с устойчивой историей прогнозов.',
    'chart-spline',
    500,
    1499,
    30,
    true
  ),
  (
    'expert',
    'Эксперт',
    'Участник с высокой репутацией и значительным опытом.',
    'badge-check',
    1500,
    4999,
    40,
    true
  ),
  (
    'visionary',
    'Визионер',
    'Высший уровень репутации на платформе.',
    'crown',
    5000,
    null,
    50,
    true
  );
  -- ============================================================
-- 3. ACHIEVEMENTS
-- ============================================================

insert into public.achievements (
  code,
  title,
  description,
  icon,
  is_active
)
values
  (
    'first_prediction',
    'Первый прогноз',
    'Сделать первый прогноз на платформе.',
    'flag',
    true
  ),
  (
    'first_win',
    'Первая победа',
    'Получить первую успешную выплату за правильный прогноз.',
    'medal',
    true
  ),
  (
    'ten_predictions',
    'Первые десять',
    'Сделать десять прогнозов в течение одного сезона.',
    'list-checks',
    true
  ),
  (
    'fifty_predictions',
    'Опытный прогнозист',
    'Сделать пятьдесят прогнозов в течение одного сезона.',
    'target',
    true
  ),
  (
    'three_win_streak',
    'Уверенная серия',
    'Сделать три правильных прогноза подряд.',
    'flame',
    true
  ),
  (
    'five_win_streak',
    'На волне',
    'Сделать пять правильных прогнозов подряд.',
    'waves',
    true
  ),
  (
    'ten_win_streak',
    'Безошибочная серия',
    'Сделать десять правильных прогнозов подряд.',
    'zap',
    true
  ),
  (
    'double_capital',
    'Удвоение',
    'Увеличить сезонный капитал в два раза относительно стартового баланса.',
    'trending-up',
    true
  ),
  (
    'season_top_three',
    'На пьедестале',
    'Завершить сезон в тройке лидеров.',
    'podium',
    true
  ),
  (
    'season_winner',
    'Победитель сезона',
    'Занять первое место по итогам сезона.',
    'crown',
    true
  );
  -- ============================================================
-- 4. SYSTEM SETTINGS
-- ============================================================

insert into public.system_settings (
  key,
  value,
  description,
  is_public
)
values
  (
    'prediction.max_odds',
    '10'::jsonb,
    'Максимально допустимый коэффициент прогноза.',
    true
  ),
  (
    'prediction.minimum_stake',
    '10'::jsonb,
    'Минимальная ставка в GP.',
    true
  ),
  (
    'prediction.initial_pool_per_side',
    '1000'::jsonb,
    'Начальное значение пула для каждой стороны нового события.',
    false
  ),
  (
    'bonus.emergency.amount',
    '1000'::jsonb,
    'Размер экстренного пополнения при нулевом балансе.',
    true
  ),
  (
    'bonus.emergency.limit_per_season',
    '1'::jsonb,
    'Максимальное количество экстренных пополнений за сезон.',
    true
  ),
  (
    'bonus.rewarded_ad.amount',
    '100'::jsonb,
    'Количество GP за просмотр рекламного объявления.',
    true
  ),
  (
    'bonus.rewarded_ad.daily_limit',
    '1'::jsonb,
    'Максимальное количество рекламных пополнений в сутки.',
    true
  ),
  (
    'leaderboard.public_limit',
    '100'::jsonb,
    'Количество участников, отображаемых в публичном рейтинге.',
    true
  ),
  (
    'registration.captcha_required',
    'true'::jsonb,
    'Требовать прохождение CAPTCHA при регистрации.',
    false
  ),
  (
    'suggestions.enabled',
    'true'::jsonb,
    'Разрешить пользователям предлагать новые события.',
    true
  );
  -- ============================================================
-- 5. FIRST SEASON
-- ============================================================

insert into public.seasons (
  title,
  slug,
  description,
  start_at,
  end_at,
  status,
  starting_balance,
  minimum_predictions_for_prize
)
values (
  'Осень 2026',
  'autumn-2026',
  'Первый сезон платформы коллективного прогнозирования PROGNOSIS.',
  '2026-09-01 00:00:00+03',
  '2026-12-01 00:00:00+03',
  'draft',
  25000,
  3
);
-- ============================================================
-- 6. FIRST SEASON PRIZES
-- ============================================================

insert into public.season_prizes (
  season_id,
  place,
  title,
  description
)
select
  seasons.id,
  prizes.place,
  prizes.title,
  prizes.description
from public.seasons
cross join (
  values
    (
      1,
      'Приз за первое место',
      'Главный приз сезона. Конкретная награда будет утверждена организатором до начала конкурса.'
    ),
    (
      2,
      'Приз за второе место',
      'Награда за второе место. Конкретный состав приза будет утверждён до начала конкурса.'
    ),
    (
      3,
      'Приз за третье место',
      'Награда за третье место. Конкретный состав приза будет утверждён до начала конкурса.'
    )
) as prizes (
  place,
  title,
  description
)
where seasons.slug = 'autumn-2026';
commit;