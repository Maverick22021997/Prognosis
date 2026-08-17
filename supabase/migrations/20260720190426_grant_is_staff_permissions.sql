grant execute on function public.is_staff()
to anon, authenticated;

grant execute on function public.is_admin()
to anon, authenticated;

grant execute on function public.calculate_prediction_odds(
  bigint,
  bigint,
  public.prediction_side,
  bigint,
  numeric
) to anon, authenticated;