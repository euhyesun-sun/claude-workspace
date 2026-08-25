"use client";

import { useEffect, useMemo, useState } from "react";
import { appUrl } from "@/lib/app-url";
import { usePortalUser } from "@/hooks/usePortalUser";
import type { AlertRow, VehicleStatusRow } from "@/types/dashboard";
import AlertDetailModal from "./AlertDetailModal";
import VehicleDetailModal from "./VehicleDetailModal";

interface Period {
  start: string;
  end: string;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function defaultPeriod(): Period {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start: toLocalInputValue(start), end: toLocalInputValue(end) };
}

function toQueryTimestamp(inputValue: string): string {
  return inputValue.replace("T", " ") + ":00";
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 19);
}

export default function AlertDataScreen() {
  const { platformUser, portalUserId, error: authError } = usePortalUser();
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicleIdFilter, setVehicleIdFilter] = useState("ALL");
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [openAlert, setOpenAlert] = useState<AlertRow | null>(null);
  const [vehicles, setVehicles] = useState<VehicleStatusRow[]>([]);
  const [openVehicle, setOpenVehicle] = useState<VehicleStatusRow | null>(null);
  const [openVehiclePeriodReferenceTime, setOpenVehiclePeriodReferenceTime] = useState<
    string | undefined
  >(undefined);

  function refreshAlerts() {
    if (!portalUserId) return;
    const startDate = toQueryTimestamp(period.start);
    const endDate = toQueryTimestamp(period.end);
    fetch(
      appUrl(
        `/api/alert-list?portalUserId=${encodeURIComponent(
          portalUserId
        )}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      )
    )
      .then((res) => res.json())
      .then((json) => {
        setAlerts(json.alerts ?? []);
        setLoaded(true);
      })
      .catch((e) => {
        setError(e.message);
        setLoaded(true);
      });
  }

  // portalUserId나 기간이 바뀔 때만 조회 — 자동 갱신 없음(다른 화면과 동일한 정책)
  useEffect(() => {
    refreshAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalUserId, period]);

  // "차량 세부정보" 버튼에서 쓸 차량 상태 목록 — 한 번만 조회(다른 화면과 동일한 정책)
  useEffect(() => {
    if (!portalUserId) return;
    fetch(appUrl(`/api/vehicle-status?portalUserId=${encodeURIComponent(portalUserId)}`))
      .then((res) => res.json())
      .then((json) => setVehicles(json.vehicles ?? []))
      .catch(() => {});
  }, [portalUserId]);

  const vehicleIds = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.vehicle_id))).sort(),
    [vehicles]
  );

  const filtered = useMemo(
    () =>
      vehicleIdFilter === "ALL"
        ? alerts
        : alerts.filter((a) => a.vehicle_id === vehicleIdFilter),
    [alerts, vehicleIdFilter]
  );

  function handleFilterChange(value: string) {
    setVehicleIdFilter(value);
    setSelectedRowKey(null);
  }

  const selectedAlert =
    filtered.find((a, i) => `${a.vehicle_id}-${a.collect_datetime}-${i}` === selectedRowKey) ??
    null;

  if (platformUser === undefined) {
    return <div className="p-6 text-gray-500">로그인 정보를 확인하는 중...</div>;
  }
  if (platformUser === null) {
    return <div className="p-6 text-red-600">로그인이 필요합니다.</div>;
  }

  return (
    <div className="bg-[#f5f6f8] p-6">
      {(authError || error) && (
        <div className="mb-4 rounded-xl bg-red-50 text-red-700 px-6 py-3">
          {authError ?? error}
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm p-6">
        <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-gray-100">
          <h1 className="font-bold text-gray-900 text-lg">경고 목록</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">차량 ID</span>
            <select
              value={vehicleIdFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="ALL">ALL</option>
              {vehicleIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">기간</span>
            <input
              type="datetime-local"
              value={period.start}
              onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <span className="text-gray-400">~</span>
            <input
              type="datetime-local"
              value={period.end}
              onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                if (!selectedAlert) {
                  alert("경고를 선택해주세요.");
                  return;
                }
                setOpenAlert(selectedAlert);
              }}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
            >
              알림 세부정보
            </button>
            <button
              onClick={() => {
                if (!selectedAlert) {
                  alert("경고를 선택해주세요.");
                  return;
                }
                const vehicle = vehicles.find((v) => v.vehicle_id === selectedAlert.vehicle_id);
                if (!vehicle) {
                  alert("차량 정보를 찾을 수 없습니다.");
                  return;
                }
                setOpenVehicle(vehicle);
                setOpenVehiclePeriodReferenceTime(
                  selectedAlert.data_time ?? selectedAlert.collect_datetime ?? undefined
                );
              }}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
            >
              차량 세부정보
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm text-center border-separate border-spacing-0">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="h-10 text-gray-500 border-b border-gray-200">
                <th className="py-2 px-4 font-medium">데이터 시간</th>
                <th className="py-2 px-4 font-medium">작동 모드</th>
                <th className="py-2 px-4 font-medium">차량 ID</th>
                <th className="py-2 px-4 font-medium">소유자</th>
                <th className="py-2 px-4 font-medium">경고 메시지</th>
                <th className="py-2 px-4 font-medium">비고</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const rowKey = `${a.vehicle_id}-${a.collect_datetime}-${i}`;
                const isSelected = rowKey === selectedRowKey;
                return (
                  <tr
                    key={rowKey}
                    onClick={() => setSelectedRowKey(isSelected ? null : rowKey)}
                    className={`h-10 border-b border-gray-100 last:border-0 cursor-pointer ${
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    } text-gray-800`}
                  >
                    <td className="py-2 px-4">{formatDateTime(a.collect_datetime)}</td>
                    <td className="py-2 px-4">{a.op_mode_m ?? "-"}</td>
                    <td className="py-2 px-4">{a.vehicle_id}</td>
                    <td className="py-2 px-4">{a.group_nm ?? "-"}</td>
                    <td className="py-2 px-4">{a.alert_m ?? "-"}</td>
                    <td className="py-2 px-4">{a.notes ?? ""}</td>
                  </tr>
                );
              })}
              {loaded && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    표시할 경고가 없습니다.
                  </td>
                </tr>
              )}
              {!loaded && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    불러오는 중...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openAlert && (
        <AlertDetailModal
          alert={openAlert}
          onClose={() => {
            setOpenAlert(null);
            refreshAlerts();
          }}
        />
      )}

      {openVehicle && (
        <VehicleDetailModal
          vehicle={openVehicle}
          onClose={() => setOpenVehicle(null)}
          showPlaybackControls={false}
          showOnlineBadge={false}
          periodReferenceTime={openVehiclePeriodReferenceTime}
          dataTimeLabel="데이터 시간"
        />
      )}
    </div>
  );
}
