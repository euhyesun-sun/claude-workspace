"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { appUrl } from "@/lib/app-url";
import type { ChartPoint, VehicleStatusRow } from "@/types/dashboard";

// dataviz 가이드: 첫 번째 시리즈는 파랑(1번 슬롯), 두 번째 시리즈는 주황(2번 슬롯) —
// "동일 차량 비교"의 기간2든 "타 차량 비교"의 차량2든, 항상 왼쪽=파랑/오른쪽=주황으로 통일한다.
const BLUE = "#2a78d6";
const ORANGE = "#eb6834";

const METRICS: { key: keyof ChartPoint; label: string; unit: string }[] = [
  { key: "fuel_lv", label: "남은 연료", unit: "%" },
  { key: "sog", label: "속도", unit: "km/h" },
  { key: "pb_prg", label: "진전", unit: "%" },
  { key: "pb_est", label: "예상 종료 시간", unit: "분" },
];

interface Period {
  start: string;
  end: string;
}

function toQueryTimestamp(inputValue: string): string {
  return inputValue.replace("T", " ") + ":00";
}

// 차량 상태 메인 화면의 "데이터 시간" 날짜를 기준으로 기간을 잡는다 (VehicleDetailModal의
// defaultPeriod와 동일한 이유 — offline 차량은 마지막 데이터가 오늘이 아닐 수 있음).
function periodForDate(dateStr: string): Period {
  return { start: `${dateStr}T00:00`, end: `${dateStr}T23:59` };
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + deltaDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTick(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toSeries(points: ChartPoint[], key: keyof ChartPoint): { ts: number; value: number }[] {
  return points
    .map((p) => ({ ts: new Date(p.datatime).getTime(), value: p[key] }))
    .filter((d): d is { ts: number; value: number } => typeof d.value === "number");
}

function ChartWithStats({
  data,
  color,
  unit,
  label,
}: {
  data: { ts: number; value: number }[];
  color: string;
  unit: string;
  label: string;
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
    <div className="flex gap-3 items-center">
      <div className="h-40 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
              formatter={(value: number) => [`${value} ${unit}`, label]}
              contentStyle={{ borderRadius: 8, borderColor: "#e1e0d9", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={0.15}
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
  );
}

export default function VehicleCompareModal({
  vehicle,
  allVehicleIds,
  onClose,
}: {
  vehicle: VehicleStatusRow;
  allVehicleIds: string[];
  onClose: () => void;
}) {
  const referenceTime = vehicle.data_time ?? vehicle.collect_datetime ?? new Date().toISOString();
  const referenceDate = referenceTime.slice(0, 10);

  const [mode, setMode] = useState<"same" | "other">("same");
  const [period1, setPeriod1] = useState<Period>(() => periodForDate(referenceDate));
  const [period2, setPeriod2] = useState<Period>(() =>
    periodForDate(shiftDate(referenceDate, -1))
  );
  const [sharedPeriod, setSharedPeriod] = useState<Period>(() => periodForDate(referenceDate));
  const [vehicle2Id, setVehicle2Id] = useState(
    () => allVehicleIds.find((id) => id !== vehicle.vehicle_id) ?? ""
  );
  const [pointsLeft, setPointsLeft] = useState<ChartPoint[]>([]);
  const [pointsRight, setPointsRight] = useState<ChartPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const otherVehicleIds = allVehicleIds.filter((id) => id !== vehicle.vehicle_id);

  useEffect(() => {
    let ignore = false;

    function fetchChart(vehicleId: string, period: Period) {
      const startDate = toQueryTimestamp(period.start);
      const endDate = toQueryTimestamp(period.end);
      return fetch(
        appUrl(
          `/api/vehicle/chart?vehicleId=${encodeURIComponent(
            vehicleId
          )}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
        )
      )
        .then((res) => res.json())
        .then((json) => (json.points ?? []) as ChartPoint[])
        .catch((e) => {
          if (!ignore) setError(e.message);
          return [] as ChartPoint[];
        });
    }

    const rightVehicleId = mode === "same" ? vehicle.vehicle_id : vehicle2Id;
    const leftPeriod = mode === "same" ? period1 : sharedPeriod;
    const rightPeriod = mode === "same" ? period2 : sharedPeriod;

    Promise.all([
      fetchChart(vehicle.vehicle_id, leftPeriod),
      rightVehicleId ? fetchChart(rightVehicleId, rightPeriod) : Promise.resolve([]),
    ]).then(([left, right]) => {
      if (!ignore) {
        setPointsLeft(left);
        setPointsRight(right);
      }
    });

    return () => {
      ignore = true;
    };
  }, [mode, vehicle.vehicle_id, period1, period2, sharedPeriod, vehicle2Id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-7xl max-h-[90vh] flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">차량 데이터 비교</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto">
        <div className="px-6 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {mode === "same" ? (
            <span className="font-bold text-lg text-gray-900">{vehicle.vehicle_id}</span>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
              <span className="text-sm font-bold text-gray-700 shrink-0">기간</span>
              <input
                type="datetime-local"
                value={sharedPeriod.start}
                onChange={(e) => setSharedPeriod((p) => ({ ...p, start: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
              />
              <span className="text-gray-400">~</span>
              <input
                type="datetime-local"
                value={sharedPeriod.end}
                onChange={(e) => setSharedPeriod((p) => ({ ...p, end: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
              />
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={() => setMode(mode === "same" ? "other" : "same")}
              className="flex items-center justify-center gap-1.5 shrink-0 w-56 rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 text-sm"
            >
              {mode === "same" ? (
                <>
                  타 차량 비교로 이동
                  <span aria-hidden="true">→</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">←</span>
                  동일 차량 비교로 이동
                </>
              )}
            </button>
          </div>
        </div>

        {error && <div className="mx-6 mt-3 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">{error}</div>}

        {mode === "same" ? (
          <div className="px-6 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
              <span className="text-sm font-bold text-gray-700 shrink-0">기간 1</span>
              <input
                type="datetime-local"
                value={period1.start}
                onChange={(e) => setPeriod1((p) => ({ ...p, start: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
              />
              <span className="text-gray-400">~</span>
              <input
                type="datetime-local"
                value={period1.end}
                onChange={(e) => setPeriod1((p) => ({ ...p, end: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
              <span className="text-sm font-bold text-gray-700 shrink-0">기간 2</span>
              <input
                type="datetime-local"
                value={period2.start}
                onChange={(e) => setPeriod2((p) => ({ ...p, start: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
              />
              <span className="text-gray-400">~</span>
              <input
                type="datetime-local"
                value={period2.end}
                onChange={(e) => setPeriod2((p) => ({ ...p, end: e.target.value }))}
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="px-6 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
                <span className="text-sm font-bold text-gray-700 shrink-0">차량 1</span>
                <span className="text-sm text-gray-900">{vehicle.vehicle_id}</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
                <span className="text-sm font-bold text-gray-700 shrink-0">차량 2</span>
                <select
                  value={vehicle2Id}
                  onChange={(e) => setVehicle2Id(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                >
                  {otherVehicleIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 pb-6 pt-4 space-y-4">
          {METRICS.map((metric) => (
            <div key={metric.key} className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-bold text-gray-800 mb-2">
                {metric.label}
                <span className="text-gray-400 font-normal"> ({metric.unit})</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ChartWithStats
                  data={toSeries(pointsLeft, metric.key)}
                  color={BLUE}
                  unit={metric.unit}
                  label={metric.label}
                />
                <ChartWithStats
                  data={toSeries(pointsRight, metric.key)}
                  color={ORANGE}
                  unit={metric.unit}
                  label={metric.label}
                />
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
