export function formatNumber(value: number | null | undefined): string {
  const safeValue = value ?? 0;

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(safeValue);
}

export function formatGp(value: number | null | undefined): string {
  return `${formatNumber(value)} GP`;
}

export function formatOdds(value: number | null | undefined): string {
  const safeValue = value ?? 1;

  return safeValue.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTimeRemaining(
  seconds: number | null | undefined,
): string {
  const safeSeconds = Math.max(seconds ?? 0, 0);

  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (days > 0) {
    return `${days} дн. ${hours} ч.`;
  }

  if (hours > 0) {
    return `${hours} ч. ${minutes} мин.`;
  }

  if (minutes > 0) {
    return `${minutes} мин.`;
  }

  return "Закрывается скоро";
}
export function formatPercentage(
  value: number,
  maximumFractionDigits = 1,
): string {
  return `${value.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })}%`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatShortDateTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}