export type Event = {
  id: number;
  season_id: number;
  category_id: number;

  category_code: string;
  category_name: string;
  category_icon: string | null;

  title: string;
  slug: string;

  description: string | null;

  source_name: string | null;
  source_url: string | null;

  resolution_rule: string | null;

  publish_at: string;
  prediction_close_at: string;
  expected_resolution_at: string | null;
  resolved_at: string | null;

  status: string;
  result: string | null;

  cancel_reason: string | null;

  is_featured: boolean;

  predictions_count: number;
  volume_gp: number;

  yes_pool: number;
  no_pool: number;
  total_pool: number;

  yes_odds: number;
  no_odds: number;

  prediction_available: boolean;
  seconds_until_close: number;

  created_by: string | null;
  resolved_by: string | null;

  created_at: string;
  updated_at: string;
};