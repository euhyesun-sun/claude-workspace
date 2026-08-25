"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { appUrl } from "@/lib/app-url";
import type { AlertDetail, AlertRow, AlertTimelineEntry, LocationPoint } from "@/types/dashboard";
import StatRow from "./StatRow";

const VehicleMap = dynamic(() => import("./VehicleMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
      지도를 불러오는 중...
    </div>
  ),
});

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return value.toString().replace("T", " ").slice(0, 19);
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-900 tabular-nums">{value}</div>
    </div>
  );
}

export default function AlertDetailModal({
  alert,
  onClose,
}: {
  alert: AlertRow;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [timeline, setTimeline] = useState<AlertTimelineEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEventDt, setCurrentEventDt] = useState(
    alert.collect_datetime ?? alert.data_time ?? ""
  );
  const [currentAlertMessage, setCurrentAlertMessage] = useState(
    alert.alert_m ?? alert.alert ?? ""
  );

  // 경고 이력 목록은 차량이 바뀌지 않는 한 한 번만 조회한다.
  useEffect(() => {
    let ignore = false;
    fetch(appUrl(`/api/vehicle/alert-timeline?vehicleId=${encodeURIComponent(alert.vehicle_id)}`))
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) setTimeline(json.timeline ?? []);
      })
      .catch((e) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, [alert.vehicle_id]);

  // 상세정보(지도+테이블들)는 현재 선택된 이벤트(최초 진입 시 클릭한 경고, 또는 아래
  // 경고 이력 목록에서 다시 선택한 항목)를 기준으로 조회한다.
  useEffect(() => {
    let ignore = false;

    fetch(
      appUrl(
        `/api/vehicle/alert-detail?vehicleId=${encodeURIComponent(
          alert.vehicle_id
        )}&eventDt=${encodeURIComponent(currentEventDt)}&alertMessage=${encodeURIComponent(
          currentAlertMessage
        )}`
      )
    )
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          setDetail(json.detail);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (!ignore) {
          setError(e.message);
          setLoaded(true);
        }
      });

    return () => {
      ignore = true;
    };
  }, [alert.vehicle_id, currentEventDt, currentAlertMessage]);

  function handleSelectTimelineEntry(entry: AlertTimelineEntry) {
    setCurrentEventDt(entry.collect_datetime);
    setCurrentAlertMessage(entry.alert_m ?? "");
  }

  // lat/lon이 둘 다 0인 경우는 GNSS 미수신 등으로 좌표가 없다는 뜻의 값이라, 실제 위치로 취급하지 않는다
  // (다른 위치 관련 API들도 동일하게 lat=0 AND lon=0을 걸러낸다).
  const eventLocation: LocationPoint | null =
    detail?.lat != null && detail?.lon != null && !(detail.lat === 0 && detail.lon === 0)
      ? { collect_datetime: detail.collect_datetime ?? currentEventDt, lat: detail.lat, lon: detail.lon }
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-7xl max-h-[90vh] flex-col rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-bold text-gray-900">경고 세부정보</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto">
        <div className="px-6 pt-4 flex items-center gap-3">
          <span className="font-bold text-lg text-gray-900">{alert.vehicle_id}</span>
          <span className="text-sm text-gray-500">{alert.group_nm ?? "-"}</span>
        </div>

        {error && <div className="mx-6 mt-3 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">{error}</div>}

        <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
            {loaded ? (
              <VehicleMap
                route={[]}
                lastLocation={eventLocation}
                resetKey={`${alert.vehicle_id}-${currentEventDt}`}
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

        <div className="px-6 pb-4">
          <div className="rounded-lg border border-gray-200 p-3 grid grid-cols-3 gap-2">
            <StatCell label="발생 시간" value={formatDateTime(detail?.collect_datetime ?? currentEventDt)} />
            <StatCell label="작동 시간 (h)" value={detail?.eg_time?.toString() ?? "-"} />
            <StatCell label="엔진 속도 (rpm)" value={detail?.eg_rpm?.toString() ?? "-"} />
            <StatCell label="롤 각도 (°)" value={detail?.roll?.toString() ?? "-"} />
            <StatCell label="피치 각도 (°)" value={detail?.pitch?.toString() ?? "-"} />
            <StatCell label="외기 온도 (℃)" value={detail?.oside_temp?.toString() ?? "-"} />
            <StatCell label="수온 (℃)" value={detail?.eg_wtemp?.toString() ?? "-"} />
            <StatCell label="전압 (V)" value={detail?.bt_volt?.toString() ?? "-"} />
            <StatCell label="GNSS 상태" value={detail?.quality ?? "-"} />
            <StatCell label="방위 타입" value={detail?.head_type ?? "-"} />
            <StatCell label="위성 수" value={detail?.num_sv?.toString() ?? "-"} />
            <StatCell label="나이" value={detail?.age?.toString() ?? "-"} />
            <StatCell label="Hdop" value={detail?.hdop?.toString() ?? "-"} />
            <StatCell label="타각 지시값 (°)" value={detail?.ster_ins?.toString() ?? "-"} />
            <StatCell label="타각 피드백 값 (°)" value={detail?.ster_fb?.toString() ?? "-"} />
            <StatCell label="가속기 지시값 (%)" value={detail?.trv_ins?.toString() ?? "-"} />
            <StatCell label="가속기 피드백 값 (%)" value={detail?.trv_fb?.toString() ?? "-"} />
          </div>
        </div>

        <div className="px-6 pb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-2">이 차량의 경고 이력</h3>
          <div className="overflow-auto max-h-60 rounded-lg border border-gray-200">
            <table className="w-full text-sm text-center">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-medium">데이터 시간</th>
                  <th className="py-2 px-4 font-medium">경고 메시지</th>
                </tr>
              </thead>
              <tbody>
                {timeline.map((t, i) => (
                  <tr
                    key={`${t.collect_datetime}-${i}`}
                    onClick={() => handleSelectTimelineEntry(t)}
                    className={`border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${
                      formatDateTime(t.collect_datetime) === formatDateTime(currentEventDt) &&
                      t.alert_m === currentAlertMessage
                        ? "text-red-700"
                        : "text-gray-800"
                    }`}
                  >
                    <td className="py-2 px-4">{formatDateTime(t.collect_datetime)}</td>
                    <td className="py-2 px-4">{t.alert_m ?? "-"}</td>
                  </tr>
                ))}
                {timeline.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-gray-400">
                      경고 이력이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
