"use client";

import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { LogDataPoint } from "@/types/dashboard";
import type { LogColumnDef } from "@/lib/logColumns";

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

export default function LogColumnChart({
  column,
  points,
  onSelectTime,
}: {
  column: LogColumnDef;
  points: LogDataPoint[];
  onSelectTime?: (datatime: string) => void;
}) {
  const { data, max, min, avg } = useMemo(() => {
    const rows: { ts: number; value: number }[] = [];
    for (const p of points) {
      const raw = p[column.key];
      const value = typeof raw === "string" ? parseFloat(raw) : raw;
      if (typeof value === "number" && !Number.isNaN(value)) {
        rows.push({ ts: new Date(p.datatime).getTime(), value });
      }
    }
    if (rows.length === 0) return { data: rows, max: null, min: null, avg: null };
    const values = rows.map((r) => r.value);
    return {
      data: rows,
      max: Math.max(...values),
      min: Math.min(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }, [points, column.key]);

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-bold text-gray-800 mb-2">
        {column.label}
        {column.unit && <span className="text-gray-400 font-normal"> ({column.unit})</span>}
      </h4>
      <div className="flex gap-3 items-center">
        <div className="h-40 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              onClick={(state) => {
                const label = state?.activeLabel;
                if (typeof label === "number" && onSelectTime) {
                  onSelectTime(toLocalTimestamp(label));
                }
              }}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="ts"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatTick}
                minTickGap={40}
                fontSize={11}
              />
              <YAxis fontSize={11} width={40} />
              <Tooltip
                labelFormatter={(v) => new Date(v as number).toLocaleString("ko-KR")}
                formatter={(value: number) => [`${value}${column.unit ?? ""}`, column.label]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="w-28 shrink-0 flex justify-center text-sm text-gray-600">
          <div className="space-y-1">
            <div className="flex gap-1.5">
              <span className="w-7 text-center">Max</span>
              <span className="w-12 text-right">{max?.toFixed(2) ?? "-"}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-7 text-center">Min</span>
              <span className="w-12 text-right">{min?.toFixed(2) ?? "-"}</span>
            </div>
            <div className="flex gap-1.5">
              <span className="w-7 text-center">Avg</span>
              <span className="w-12 text-right">{avg?.toFixed(2) ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
