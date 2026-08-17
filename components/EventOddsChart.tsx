"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatDateTime,
  formatGp,
  formatOdds,
  formatPercentage,
  formatShortDateTime,
} from "@/lib/format";

import type {
  OddsChartPoint,
  OddsHistoryPoint,
} from "@/types/odds-history";

type EventOddsChartProps = {
  history: OddsHistoryPoint[];
};

type TooltipPayloadItem = {
  payload?: OddsChartPoint;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
};

export default function EventOddsChart({
  history,
}: EventOddsChartProps) {
  const chartData: OddsChartPoint[] =
    history.map((point) => ({
      recordedAt:
        point.recorded_at,

      label:
        formatShortDateTime(
          point.recorded_at
        ),

      yesProbability:
        Number(
          point.yes_probability
        ),

      noProbability:
        Number(
          point.no_probability
        ),

      yesOdds:
        Number(
          point.yes_odds
        ),

      noOdds:
        Number(
          point.no_odds
        ),

      totalPool:
        Number(
          point.total_pool
        ),

      predictionsCount:
        Number(
          point.predictions_count
        ),
    }));

  if (chartData.length < 2) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-white/[0.015] px-6 text-center">
        <div>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-white/[0.03] text-lg">
            ↗
          </div>

          <p className="mt-4 font-medium text-[var(--foreground)]">
            Недостаточно данных для
            графика
          </p>

          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--foreground-muted)]">
            График появится после
            первых изменений
            распределения прогнозов.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-80 w-full sm:h-96">
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={chartData}
          margin={{
            top: 12,
            right: 8,
            bottom: 4,
            left: -16,
          }}
        >
          <CartesianGrid
            vertical={false}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            minTickGap={28}
            tick={{
              fill: "#747d89",
              fontSize: 12,
            }}
          />

          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            ticks={[
              0,
              25,
              50,
              75,
              100,
            ]}
            tickFormatter={(
              value: number
            ) => `${value}%`}
            tick={{
              fill: "#747d89",
              fontSize: 12,
            }}
          />

          <Tooltip
            content={
              <CustomTooltip />
            }
            cursor={{
              stroke:
                "rgba(255,255,255,0.14)",

              strokeWidth: 1,

              strokeDasharray:
                "4 4",
            }}
          />

          <Line
            type="monotone"
            dataKey="yesProbability"
            name="Да"
            stroke="#79d9a0"
            strokeWidth={2.5}
            dot={{
              r: 3,
              fill: "#79d9a0",
              strokeWidth: 0,
            }}
            activeDot={{
              r: 5,
              fill: "#79d9a0",
              stroke: "#111419",
              strokeWidth: 2,
            }}
          />

          <Line
            type="monotone"
            dataKey="noProbability"
            name="Нет"
            stroke="#ed8888"
            strokeWidth={2.5}
            dot={{
              r: 3,
              fill: "#ed8888",
              strokeWidth: 0,
            }}
            activeDot={{
              r: 5,
              fill: "#ed8888",
              stroke: "#111419",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
}: CustomTooltipProps) {
  const point =
    payload?.[0]?.payload;

  if (
    !active ||
    !point
  ) {
    return null;
  }

  return (
    <div className="min-w-56 rounded-2xl border border-[var(--border-strong)] bg-[#111419] p-4 shadow-2xl">
      <p className="text-xs font-medium text-[var(--foreground-subtle)]">
        {formatDateTime(
          point.recordedAt
        )}
      </p>

      <div className="mt-3 space-y-2">
        <TooltipRow
          label="Да"
          value={`${formatPercentage(
            point.yesProbability
          )} · ${formatOdds(
            point.yesOdds
          )}`}
          indicatorClassName="bg-[#79d9a0]"
        />

        <TooltipRow
          label="Нет"
          value={`${formatPercentage(
            point.noProbability
          )} · ${formatOdds(
            point.noOdds
          )}`}
          indicatorClassName="bg-[#ed8888]"
        />
      </div>

      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-[var(--foreground-subtle)]">
            Общий пул
          </span>

          <span className="font-medium text-[var(--foreground)]">
            {formatGp(
              point.totalPool
            )}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 text-xs">
          <span className="text-[var(--foreground-subtle)]">
            Прогнозов
          </span>

          <span className="font-medium text-[var(--foreground)]">
            {point.predictionsCount.toLocaleString(
              "ru-RU"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

type TooltipRowProps = {
  label: string;
  value: string;
  indicatorClassName: string;
};

function TooltipRow({
  label,
  value,
  indicatorClassName,
}: TooltipRowProps) {
  return (
    <div className="flex items-center justify-between gap-5 text-sm">
      <span className="inline-flex items-center gap-2 text-[var(--foreground-muted)]">
        <span
          className={[
            "h-2 w-2 rounded-full",
            indicatorClassName,
          ].join(" ")}
        />

        {label}
      </span>

      <span className="font-semibold text-[var(--foreground)]">
        {value}
      </span>
    </div>
  );
}