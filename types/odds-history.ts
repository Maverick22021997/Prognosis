export type OddsHistoryPoint = {
  recorded_at: string;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
  yes_odds: number;
  no_odds: number;
  yes_probability: number;
  no_probability: number;
  predictions_count: number;
};

export type OddsChartPoint = {
  recordedAt: string;
  label: string;
  yesProbability: number;
  noProbability: number;
  yesOdds: number;
  noOdds: number;
  totalPool: number;
  predictionsCount: number;
};