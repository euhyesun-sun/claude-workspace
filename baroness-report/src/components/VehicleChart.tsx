"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { ChartPoint } from "@/types/dashboard";

// dataviz 가이드: 단위가 다른 지표(연료 %, 속도 km/h, 진전 %, 예상 종료 시간 분)를
// 한 차트에 이중 축으로 욱여넣지 않고("dual-axis는 대표적인 안티패턴"), 지표별로
// 축이 하나뿐인 미니 차트로 나눈다(small multiples). 색은 "추세" 용도라 시리즈가
// 하나뿐인 파랑 한 가지로 통일한다.
const BLUE = "#2a78d6";

const METRICS: { key: keyof ChartPoint; label: string; unit: string }[] = [
  { key: "fuel_lv", label: "남은 연료", unit: "%" },
  { key: "sog", label: "속도", unit: "km/h" },
  { key: "pb_prg", label: "진전", unit: "%" },
  { key: "pb_est", label: "예상 종료 시간", unit: "분" },
];

function formatTick(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// 이 앱은 timestamp를 항상 "브라우저 로컬 시각 = 표시 시각"인 평문("YYYY-MM-DD HH:MM:SS")으로
// 다룬다(타임존 변환 없음). `ts`(차트 데이터포인트의 epoch ms)도 그 평문을 `new Date()`로 파싱해
// 만든 값이므로, 되돌릴 때도 `toISOString()`(UTC로 변환됨)이 아니라 이 형식 그대로 써야 한다 —
// 안 그러면 브라우저 UTC 오프셋만큼 시각이 밀려서 `/api/vehicle/location` 조회가 엉뚱한 시각을 찾는다.
function toLocalTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function MetricPanel({
  metric,
  data,
  onSelectTime,
}: {
  metric: { key: keyof ChartPoint; label: string; unit: string };
  data: { ts: number; value: number }[];
  onSelectTime?: (datatime: string) => void;
}) {
  const { max, min, avg } = useMemo(() => {
    if (data.length === 0) return { max: null, min: null, avg: null };
    const values = data.map((d) => d.value);
    return {
      max: Math.max(...values),
      min: Math.min(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }, [data]);

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-bold text-gray-800 mb-2">
        {metric.label}
        <span className="text-gray-400 font-normal"> ({metric.unit})</span>
      </h4>
      <div className="flex gap-3 items-center">
        <div className="h-40 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              onClick={(state) => {
                const label = state?.activeLabel;
                if (typeof label === "number" && onSelectTime) {
                  onSelectTime(toLocalTimestamp(label));
                }
              }}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#e1e0d9" />
              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatTick}
                minTickGap={40}
                fontSize={11}
                stroke="#c3c2b7"
                tick={{ fill: "#898781" }}
              />
              <YAxis fontSize={11} width={40} stroke="#c3c2b7" tick={{ fill: "#898781" }} />
              <Tooltip
                labelFormatter={(v) => new Date(v as number).toLocaleString("ko-KR")}
                formatter={(value: number) => [`${value} ${metric.unit}`, metric.label]}
                contentStyle={{ borderRadius: 8, borderColor: "#e1e0d9", fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={BLUE}
                strokeWidth={2}
                fill={BLUE}
                fillOpacity={0.1}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="w-24 shrink-0 flex justify-center text-sm text-gray-600">
          <div className="space-y-1">
            <div className="flex gap-1.5">
              <span className="w-7 text-center">Max</span>
              <span className="w-9 text-right">{max?.toFixed(1) ?? "-"}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-7 text-center">Min</span>
              <span className="w-9 text-right">{min?.toFixed(1) ?? "-"}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-7 text-center">Avg</span>
              <span className="w-9 text-right">{avg?.toFixed(1) ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VehicleChart({
  points,
  onSelectTime,
}: {
  points: ChartPoint[];
  onSelectTime?: (datatime: string) => void;
}) {
  const seriesByMetric = useMemo(() => {
    const ts = points.map((p) => new Date(p.datatime).getTime());
    return METRICS.map((metric) => ({
      metric,
      data: points
        .map((p, i) => ({ ts: ts[i], value: p[metric.key] }))
        .filter((d): d is { ts: number; value: number } => typeof d.value === "number"),
    }));
  }, [points]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {seriesByMetric.map(({ metric, data }) => (
        <MetricPanel key={metric.key} metric={metric} data={data} onSelectTime={onSelectTime} />
      ))}
    </div>
  );
}
