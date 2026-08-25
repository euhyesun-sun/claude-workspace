"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { appUrl } from "@/lib/app-url";
import type {
  ChartPoint,
  LocationPoint,
  VehicleDetail,
  VehicleStatusRow,
} from "@/types/dashboard";
import VehicleChart from "./VehicleChart";
import LogDataPanel from "./LogDataPanel";
import StatRow from "./StatRow";

const VehicleMap = dynamic(() => import("./VehicleMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
      지도를 불러오는 중...
    </div>
  ),
});

const REFRESH_INTERVAL_MS = 10_000;

function toQueryTimestamp(inputValue: string): string {
  // datetime-local -> "YYYY-MM-DD HH:MM:SS"
  return inputValue.replace("T", " ") + ":00";
}

// 온라인 차량의 위치를 매 갱신 주기마다 "지금 시각" 기준으로 다시 조회하기 위한 값.
// 다른 곳들과 동일하게 브라우저 로컬 시각을 그대로 쓴다(이 앱은 별도 타임존 변환 없이
// 로컬 시각 = 표시 시각으로 다루는 기존 관례를 따름).
function nowAsLocalTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// offline 차량은 마지막 데이터가 오늘이 아닐 수 있으므로, "오늘"이 아니라 이 차량의
// 마지막 데이터 시간이 속한 날짜를 기본 기간으로 잡는다 — 그래야 지도 경로/차트가 비어있지 않다.
function defaultPeriod(referenceTime: string) {
  const datePart = referenceTime.slice(0, 10);
  return { start: `${datePart}T00:00`, end: `${datePart}T23:59` };
}

function fetchVehicleDetail(vehicleId: string, dataTime: string): Promise<VehicleDetail | null> {
  return fetch(
    appUrl(
      `/api/vehicle/detail?vehicleId=${encodeURIComponent(vehicleId)}&dataTime=${encodeURIComponent(
        dataTime
      )}`
    )
  )
    .then((res) => res.json())
    .then((json) => json.detail ?? null);
}

export default function VehicleDetailModal({
  vehicle,
  onClose,
  showPlaybackControls = true,
  showOnlineBadge = true,
  periodReferenceTime,
  dataTimeLabel = "마지막 데이터 시간",
}: {
  vehicle: VehicleStatusRow;
  onClose: () => void;
  showPlaybackControls?: boolean;
  showOnlineBadge?: boolean;
  // 기간(경로/차트)의 기본값 기준 시각을 호출 쪽에서 지정하고 싶을 때 사용 —
  // 지정 안 하면 이 차량의 마지막 데이터 시간을 그대로 쓴다(기존 동작).
  periodReferenceTime?: string;
  dataTimeLabel?: string;
}) {
  const isOnline = vehicle.condition === "online";
  const referenceTime = vehicle.data_time ?? vehicle.collect_datetime ?? new Date().toISOString();
  // periodReferenceTime이 있으면(예: 경고 목록에서 열었을 때) 우측 정보 패널·최초 위치 마커까지
  // 전부 그 시각 기준 스냅샷으로 통일한다 — 안 그러면 "데이터 시간"만 그 시각이고
  // 작동 모드 등 나머지 값은 차량의 실제 최신 상태가 섞여 나오게 된다.
  const effectiveReferenceTime = periodReferenceTime ?? referenceTime;
  const [period, setPeriod] = useState(() => defaultPeriod(effectiveReferenceTime));
  // 지도의 경로 범위는 "기간" 입력을 바꿔도 따라 움직이지 않도록 최초 값에 고정한다 —
  // 기간은 아래 차트 조회용이고, 지도는 항상 처음 보여준 범위를 그대로 유지해야 한다.
  const [mapPeriod] = useState(() => defaultPeriod(effectiveReferenceTime));
  const [detail, setDetail] = useState<VehicleDetail | null>(null);
  const [lastLocation, setLastLocation] = useState<LocationPoint | null>(null);
  const [previousLocation, setPreviousLocation] = useState<LocationPoint | null>(null);
  const [route, setRoute] = useState<LocationPoint[]>([]);
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [screen, setScreen] = useState<"detail" | "log">("detail");
  // 로그 데이터 화면은 처음 이동할 때 한 번만 마운트하고, 그 뒤로는 화면 전환 시 CSS로만
  // 숨겼다 보여줬다 한다 — 그래야 지도(Leaflet 인스턴스)가 매번 새로 생성/로딩되지 않는다.
  const [hasVisitedLog, setHasVisitedLog] = useState(false);

  // 다른 차량으로 바뀌면 이전 차량에서 선택했던 '이전 위치' 마커/로딩 상태를 초기화한다.
  // (렌더링 중 상태를 조정하는 React 권장 패턴 — effect 대신 렌더 도중 비교 후 바로 setState)
  const [trackedVehicleId, setTrackedVehicleId] = useState(vehicle.vehicle_id);
  if (vehicle.vehicle_id !== trackedVehicleId) {
    setTrackedVehicleId(vehicle.vehicle_id);
    setPreviousLocation(null);
    setMapLoaded(false);
    setScreen("detail");
    setHasVisitedLog(false);
  }

  // 우측 정보 패널(작동 모드 등) — online 차량은 지도와 동일한 주기(10초)로 "지금" 기준 최신 값을
  // 계속 갱신하고, offline 차량이나 경고 목록에서 연 경우(periodReferenceTime 지정, 그 시점 스냅샷
  // 고정이 맞음)는 기존처럼 최초 1회만 불러온다. "로그 데이터" 화면을 보는 동안은(online이어도)
  // 지도와 마찬가지로 갱신을 멈추고, 마지막으로 불러온 값을 그대로 유지한다.
  useEffect(() => {
    if (screen !== "detail") return;
    let ignore = false;

    const load = () => {
      const dataTime = periodReferenceTime ?? (isOnline ? nowAsLocalTimestamp() : effectiveReferenceTime);
      fetchVehicleDetail(vehicle.vehicle_id, dataTime)
        .then((d) => {
          if (!ignore) setDetail(d);
        })
        .catch((e) => {
          if (!ignore) setError(e.message);
        });
    };

    load();
    const timer = isOnline && !periodReferenceTime ? setInterval(load, REFRESH_INTERVAL_MS) : undefined;
    return () => {
      ignore = true;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.vehicle_id, isOnline, periodReferenceTime, screen]);

  // online 차량의 재생 제어(시작/일시정지/종료) — 실제 장비(원본 Retool 사이트와 동일한 방식)에
  // postMessage로 제어 명령을 보낸다. 장비가 명령을 반영해 DB의 작동 모드가 바뀌기까지 약간의
  // 지연이 있을 수 있어, 잠시 후 상세정보를 다시 조회해서 화면에 최신 작동 모드를 반영한다.
  function handlePlaybackControl(opMode: "playback_start" | "playback_pause" | "playback_end") {
    window.parent.parent.postMessage(
      JSON.stringify({ vehicle_id: vehicle.vehicle_id, op_mode: opMode }),
      "*"
    );
    setTimeout(() => {
      fetchVehicleDetail(vehicle.vehicle_id, nowAsLocalTimestamp())
        .then((d) => setDetail(d))
        .catch(() => {});
    }, 1500);
  }

  // 지도(최종 위치 마커 + 경로)만 최초 로드 + (online일 때) 10초마다 갱신.
  // online 차량은 경로 범위를 "기간" 입력과 무관하게 고정(mapPeriod)해서 항상 실시간 위치를
  // 보여주고, offline 차량은 원래대로 "기간" 입력에 맞춰 경로가 같이 바뀐다.
  // 로그 데이터 화면을 보는 동안은 이 지도가 화면에 없으므로 불필요한 조회를 멈춘다.
  // 차량을 빠르게 바꿀 때 이전 차량의 응답이 늦게 도착해 새 차량 화면을 덮어쓰지 않도록
  // ignore 플래그로 막는다(클린업 시 true가 됨).
  useEffect(() => {
    if (screen !== "detail") return;
    let ignore = false;
    const routePeriod = isOnline ? mapPeriod : period;
    const startDate = toQueryTimestamp(routePeriod.start);
    const endDate = toQueryTimestamp(routePeriod.end);

    const load = () => {
      // 경고 목록에서 열었을 땐(periodReferenceTime 지정) 항상 그 시점 스냅샷을,
      // online 차량이면 매번 "지금"을 따로 조회해서 최신 위치를 따라가게 한다.
      // offline 차량은 별도 조회 없이, 아래에서 "기간"으로 불러온 경로의 마지막 지점을
      // 그대로 최종 위치로 쓴다 — 그래야 선택한 기간에 데이터가 없을 때 마커도 같이 사라진다
      // (별도 조회를 쓰면 기간과 무관하게 차량의 실제 마지막 위치가 계속 표시돼 혼란을 준다).
      const useOwnLocationQuery = isOnline || !!periodReferenceTime;
      const locationReq = useOwnLocationQuery
        ? fetch(
            appUrl(
              `/api/vehicle/location?vehicleId=${encodeURIComponent(
                vehicle.vehicle_id
              )}&at=${encodeURIComponent(periodReferenceTime ?? nowAsLocalTimestamp())}`
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
            vehicle.vehicle_id
          )}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
        )
      )
        .then((res) => res.json())
        .then((json) => {
          if (!ignore) {
            const points: LocationPoint[] = json.route ?? [];
            setRoute(points);
            if (!useOwnLocationQuery) {
              setLastLocation(points.length > 0 ? points[points.length - 1] : null);
            }
          }
        })
        .catch((e) => {
          if (!ignore) setError(e.message);
        });

      Promise.allSettled([locationReq, routeReq]).then(() => {
        if (!ignore) setMapLoaded(true);
      });
    };

    load();
    const timer = isOnline ? setInterval(load, REFRESH_INTERVAL_MS) : undefined;
    return () => {
      ignore = true;
      if (timer) clearInterval(timer);
    };
  }, [vehicle.vehicle_id, periodReferenceTime, referenceTime, mapPeriod, period, isOnline, screen]);

  // 차트는 기간이 바뀔 때만 재조회, 자동 갱신하지 않는다.
  useEffect(() => {
    let ignore = false;
    const startDate = toQueryTimestamp(period.start);
    const endDate = toQueryTimestamp(period.end);

    fetch(
      appUrl(
        `/api/vehicle/chart?vehicleId=${encodeURIComponent(
          vehicle.vehicle_id
        )}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      )
    )
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) setChartPoints(json.points ?? []);
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });

    return () => {
      ignore = true;
    };
  }, [vehicle.vehicle_id, period]);

  function handleSelectChartTime(datatime: string) {
    fetch(
      appUrl(
        `/api/vehicle/location?vehicleId=${encodeURIComponent(
          vehicle.vehicle_id
        )}&at=${encodeURIComponent(datatime)}`
      )
    )
      .then((res) => res.json())
      .then((json) => setPreviousLocation(json.location))
      .catch(() => {});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-7xl max-h-[90vh] flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">차량 상태 상세정보</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto">
        <div className="px-6 pt-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg text-gray-900">{vehicle.vehicle_id}</span>
              {showOnlineBadge && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    isOnline ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {screen === "detail" && isOnline && showPlaybackControls && (
                <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1.5">
                  <span className="text-xs text-gray-700 mr-1">재생 제어</span>
                  <button
                    onClick={() => handlePlaybackControl("playback_start")}
                    className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-1 text-xs font-medium hover:bg-emerald-100"
                  >
                    ▶ 시작
                  </button>
                  <button
                    onClick={() => handlePlaybackControl("playback_pause")}
                    className="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 text-gray-600 px-2 py-1 text-xs font-medium hover:bg-gray-100"
                  >
                    ❚❚ 일시정지
                  </button>
                  <button
                    onClick={() => handlePlaybackControl("playback_end")}
                    className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 text-red-700 px-2 py-1 text-xs font-medium hover:bg-red-100"
                  >
                    ■ 종료
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end">
            {(!isOnline || periodReferenceTime) && (
              <span className="text-sm text-gray-500">
                {dataTimeLabel}:{" "}
                {(periodReferenceTime ?? vehicle.data_time ?? "-").toString().replace("T", " ").slice(0, 19)}
              </span>
            )}
          </div>
        </div>

        {error && <div className="mx-6 mt-3 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">{error}</div>}

        <div className={screen === "log" ? "" : "hidden"}>
          {hasVisitedLog && (
            <LogDataPanel
              key={vehicle.vehicle_id}
              vehicleId={vehicle.vehicle_id}
              // online 차량은 "차량 데이터" 화면의 기간을 그대로 물려받지 않고 독립적인
              // 기본 기간을 새로 계산한다 — 안 그러면 그 화면에서 사용자가 좁혀둔 기간이
              // 그대로 넘어와서 로그 데이터가 하나도 없는 경우가 생긴다.
              // offline 차량은 기존처럼 "차량 데이터" 화면의 기간을 그대로 물려받는다.
              initialPeriod={isOnline ? defaultPeriod(effectiveReferenceTime) : period}
              detail={detail}
              onBack={() => setScreen("detail")}
              periodReferenceTime={periodReferenceTime}
            />
          )}
        </div>

        <div className={screen === "detail" ? "" : "hidden"}>
          <div className="px-6 pt-4 pb-2 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
              {mapLoaded ? (
                <VehicleMap
                  route={route}
                  lastLocation={lastLocation}
                  previousLocation={previousLocation}
                  resetKey={
                    isOnline
                      ? `${vehicle.vehicle_id}-${mapPeriod.start}-${mapPeriod.end}`
                      : `${vehicle.vehicle_id}-${period.start}-${period.end}`
                  }
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                  위치 정보를 불러오는 중...
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
                onClick={() => {
                  setScreen("log");
                  setHasVisitedLog(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 text-sm"
              >
                로그 데이터로 이동
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <div className="px-6 pb-6 pt-4">
            <VehicleChart points={chartPoints} onSelectTime={handleSelectChartTime} />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
