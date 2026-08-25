"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import * as XLSX from "xlsx";
import { appUrl } from "@/lib/app-url";
import type { LocationPoint, LogDataPoint, VehicleDetail } from "@/types/dashboard";
import {
  ALL_LOG_COLUMNS,
  BASIC_LOG_COLUMNS,
  EXTENDED_LOG_COLUMNS,
  DEFAULT_SELECTED_LOG_COLUMNS,
} from "@/lib/logColumns";
import LogColumnChart from "./LogColumnChart";
import StatRow from "./StatRow";

const VehicleMap = dynamic(() => import("./VehicleMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
      지도를 불러오는 중...
    </div>
  ),
});

function toQueryTimestamp(inputValue: string): string {
  return inputValue.replace("T", " ") + ":00";
}

export interface Period {
  start: string;
  end: string;
}

function ColumnCheckboxGroup({
  title,
  columns,
  selected,
  onToggle,
}: {
  title: string;
  columns: typeof ALL_LOG_COLUMNS;
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="text-sm font-bold text-gray-700 mb-2">{title}</div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {columns.map((c) => (
          <label key={c.key} className="flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={selected.has(c.key)}
              onChange={() => onToggle(c.key)}
              className="rounded border-gray-300"
            />
            {c.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function LogDataPanel({
  vehicleId,
  initialPeriod,
  detail,
  onBack,
  periodReferenceTime,
}: {
  vehicleId: string;
  initialPeriod: Period;
  detail: VehicleDetail | null;
  onBack: () => void;
  // 경고 목록에서 열었을 때(예: periodReferenceTime 지정)는 "차량 상태 상세정보" 화면과
  // 동일하게 최종 위치를 그 시점 스냅샷으로 고정한다 — 안 그러면 기간을 바꿀 때마다
  // 두 화면의 마커 위치가 서로 달라 보인다.
  periodReferenceTime?: string;
}) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_SELECTED_LOG_COLUMNS));
  const [route, setRoute] = useState<LocationPoint[]>([]);
  const [lastLocation, setLastLocation] = useState<LocationPoint | null>(null);
  const [previousLocation, setPreviousLocation] = useState<LocationPoint | null>(null);
  const [routeLoaded, setRouteLoaded] = useState(false);
  const [logPoints, setLogPoints] = useState<LogDataPoint[]>([]);
  const [queriedColumns, setQueriedColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 지도용 이동 경로는 기간이 바뀔 때마다 자동으로 갱신
  useEffect(() => {
    let ignore = false;
    const startDate = toQueryTimestamp(period.start);
    const endDate = toQueryTimestamp(period.end);

    const locationReq = periodReferenceTime
      ? fetch(
          appUrl(
            `/api/vehicle/location?vehicleId=${encodeURIComponent(
              vehicleId
            )}&at=${encodeURIComponent(periodReferenceTime)}`
          )
        )
          .then((res) => res.json())
          .then((json) => {
            if (!ignore) setLastLocation(json.location);
          })
          .catch((e) => {
            if (!ignore) setError(e.message);
          })
      : Promise.resolve();

    const routeReq = fetch(
      appUrl(
        `/api/vehicle/route-history?vehicleId=${encodeURIComponent(
          vehicleId
        )}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      )
    )
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          const points: LocationPoint[] = json.route ?? [];
          setRoute(points);
          if (!periodReferenceTime) {
            setLastLocation(points.length > 0 ? points[points.length - 1] : null);
          }
          setPreviousLocation(null);
        }
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });

    Promise.allSettled([locationReq, routeReq]).then(() => {
      if (!ignore) setRouteLoaded(true);
    });

    return () => {
      ignore = true;
    };
  }, [vehicleId, period, periodReferenceTime]);

  function handleSelectChartTime(datatime: string) {
    fetch(
      appUrl(
        `/api/vehicle/location?vehicleId=${encodeURIComponent(vehicleId)}&at=${encodeURIComponent(
          datatime
        )}`
      )
    )
      .then((res) => res.json())
      .then((json) => setPreviousLocation(json.location))
      .catch(() => {});
  }

  function toggleColumn(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleQuery() {
    if (selected.size === 0) return;
    const startDate = toQueryTimestamp(period.start);
    const endDate = toQueryTimestamp(period.end);
    const columns = Array.from(selected);

    fetch(
      appUrl(
        `/api/vehicle/log?vehicleId=${encodeURIComponent(vehicleId)}&startDate=${encodeURIComponent(
          startDate
        )}&endDate=${encodeURIComponent(endDate)}&columns=${encodeURIComponent(columns.join(","))}`
      )
    )
      .then((res) => res.json())
      .then((json) => {
        setLogPoints(json.points ?? []);
        setQueriedColumns(json.columns ?? []);
      })
      .catch((e) => setError(e.message));
  }

  // 최초 진입 시 기본 선택 항목으로 한 번 조회
  useEffect(() => {
    handleQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 현재 조회된(체크된) 로그 컬럼들의 차트 데이터를 한 시트로 묶어 엑셀 파일로 내려받는다.
  // 파일 생성은 브라우저에서만(클라이언트) 이뤄진다.
  function handleDownloadExcel() {
    const orderedCols = ALL_LOG_COLUMNS.filter((col) => queriedColumns.includes(col.key));
    const rows = logPoints.map((p) => {
      const row: Record<string, string | number> = {
        시간: p.datatime?.toString().replace("T", " ").slice(0, 19) ?? "",
      };
      orderedCols.forEach((col) => {
        const header = col.unit ? `${col.label} (${col.unit})` : col.label;
        row[header] = p[col.key] ?? "";
      });
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "로그 데이터");
    const safeStart = period.start.replace(/[:T]/g, "-");
    const safeEnd = period.end.replace(/[:T]/g, "-");
    XLSX.writeFile(workbook, `${vehicleId}_로그데이터_${safeStart}_${safeEnd}.xlsx`);
  }

  return (
    <div>
      {error && <div className="mx-6 mt-3 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">{error}</div>}

      <div className="px-6 pt-4 pb-2 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
          {routeLoaded ? (
            <VehicleMap
              route={route}
              lastLocation={lastLocation}
              previousLocation={previousLocation}
              resetKey={`${vehicleId}-${period.start}-${period.end}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
              경로를 불러오는 중...
            </div>
          )}
        </div>
        <div className="rounded-lg border border-gray-200 px-4">
          <StatRow label="작동 모드" value={detail?.op_mode ?? "-"} />
          <StatRow label="시스템 모드" value={detail?.sys_mode ?? "-"} />
          <StatRow label="유닛 위치" value={detail?.uni_posi ?? "-"} />
          <StatRow label="남은 연료 (%)" value={detail?.fuel_lv?.toString() ?? "-"} />
          <StatRow label="속도 (km/h)" value={detail?.sog?.toString() ?? "-"} />
          <StatRow label="재생 데이터" value={detail?.pb_data ?? "-"} />
          <StatRow label="진전 (%)" value={detail?.pb_prg?.toString() ?? "-"} />
          <StatRow label="예상 종료 시간 (분)" value={detail?.pb_est?.toString() ?? "-"} />
          <StatRow label="경고 메시지" value={detail?.alert_m ?? "-"} />
        </div>
      </div>

      <div className="px-6 pt-2 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1">
          <span className="text-sm font-bold text-gray-700 shrink-0">기간</span>
          <input
            type="datetime-local"
            value={period.start}
            onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
          />
          <span className="text-gray-400">~</span>
          <input
            type="datetime-local"
            value={period.end}
            onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm"
          />
        </div>
        <div className="flex items-center justify-end">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 text-sm"
          >
            <span aria-hidden="true">←</span>
            차량 데이터로 이동
          </button>
        </div>
      </div>

      <div className="px-6 pt-4">
        <ColumnCheckboxGroup
          title="기본 정보"
          columns={BASIC_LOG_COLUMNS}
          selected={selected}
          onToggle={toggleColumn}
        />
        <ColumnCheckboxGroup
          title="확장 정보"
          columns={EXTENDED_LOG_COLUMNS}
          selected={selected}
          onToggle={toggleColumn}
        />
        <div className="flex justify-end">
          <button
            onClick={handleQuery}
            disabled={selected.size === 0}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 text-sm"
          >
            조회
          </button>
        </div>
      </div>

      <div className="px-6 pt-4 flex items-center justify-end gap-2">
        <span className="text-sm text-gray-700">일괄 다운로드</span>
        <button
          onClick={handleDownloadExcel}
          disabled={queriedColumns.length === 0 || logPoints.length === 0}
          aria-label="일괄 다운로드"
          className="flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
        >
          <span aria-hidden="true">⬇</span>
        </button>
      </div>

      <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        {ALL_LOG_COLUMNS.filter((col) => queriedColumns.includes(col.key)).map((col) => (
          <LogColumnChart
            key={col.key}
            column={col}
            points={logPoints}
            onSelectTime={handleSelectChartTime}
          />
        ))}
        {queriedColumns.length === 0 && (
          <div className="text-sm text-gray-400 col-span-full text-center py-6">
            항목을 선택하고 조회 버튼을 눌러주세요.
          </div>
        )}
      </div>
    </div>
  );
}
