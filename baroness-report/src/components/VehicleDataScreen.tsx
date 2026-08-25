"use client";

import { useEffect, useMemo, useState } from "react";
import { appUrl } from "@/lib/app-url";
import { usePortalUser } from "@/hooks/usePortalUser";
import type { VehicleStatusRow } from "@/types/dashboard";
import StatusBadge from "./StatusBadge";
import VehicleDetailModal from "./VehicleDetailModal";
import VehicleCompareModal from "./VehicleCompareModal";

const PAGE_SIZE = 30;

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 19);
}

function formatHours(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(3);
}

export default function VehicleDataScreen() {
  const { platformUser, portalUserId, error: authError } = usePortalUser();
  const [vehicles, setVehicles] = useState<VehicleStatusRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicleIdFilter, setVehicleIdFilter] = useState("ALL");
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [openVehicle, setOpenVehicle] = useState<VehicleStatusRow | null>(null);
  const [compareVehicle, setCompareVehicle] = useState<VehicleStatusRow | null>(null);

  function refreshVehicles() {
    if (!portalUserId) return;
    fetch(appUrl(`/api/vehicle-status?portalUserId=${encodeURIComponent(portalUserId)}`))
      .then((res) => res.json())
      .then((json) => {
        setVehicles(json.vehicles ?? []);
        setLoaded(true);
      })
      .catch((e) => {
        setError(e.message);
        setLoaded(true);
      });
  }

  // portalUserId가 정해지면 한 번만 조회 — 자동 갱신 없음(대시보드와 동일한 정책)
  useEffect(() => {
    refreshVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalUserId]);

  const vehicleIds = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.vehicle_id))).sort(),
    [vehicles]
  );

  const filtered = useMemo(
    () =>
      vehicleIdFilter === "ALL"
        ? vehicles
        : vehicles.filter((v) => v.vehicle_id === vehicleIdFilter),
    [vehicles, vehicleIdFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedVehicle =
    filtered.find((v, i) => `${v.vehicle_id}-${v.collect_datetime}-${i}` === selectedRowKey) ??
    null;

  function handleFilterChange(value: string) {
    setVehicleIdFilter(value);
    setPage(1);
    setSelectedRowKey(null);
  }

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
          <h1 className="font-bold text-gray-900 text-lg">차량 상태</h1>
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
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => {
                if (!selectedVehicle) {
                  alert("차량을 선택해주세요.");
                  return;
                }
                setOpenVehicle(selectedVehicle);
              }}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm min-w-[92px] text-center"
            >
              세부정보
            </button>
            <button
              onClick={() => {
                if (!selectedVehicle) {
                  alert("차량을 선택해주세요.");
                  return;
                }
                setCompareVehicle(selectedVehicle);
              }}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm min-w-[92px] text-center"
            >
              비교
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm text-center border-separate border-spacing-0">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="py-2 px-4 font-medium">데이터 시간</th>
                <th className="py-2 px-4 font-medium">상태</th>
                <th className="py-2 px-4 font-medium">작동 모드</th>
                <th className="py-2 px-4 font-medium">차량 ID</th>
                <th className="py-2 px-4 font-medium">사양</th>
                <th className="py-2 px-4 font-medium">소유자</th>
                <th className="py-2 px-4 font-medium">가동 시간(h)</th>
                <th className="py-2 px-4 font-medium">무인 가동 시간(h)</th>
                <th className="py-2 px-4 font-medium">비고</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((v, i) => {
                const rowKey = `${v.vehicle_id}-${v.collect_datetime}-${i}`;
                const isSelected = rowKey === selectedRowKey;
                return (
                  <tr
                    key={rowKey}
                    onClick={() => setSelectedRowKey(isSelected ? null : rowKey)}
                    className={`border-b border-gray-100 last:border-0 cursor-pointer ${
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    } ${v.condition === "offline" ? "text-gray-400" : "text-gray-800"}`}
                  >
                    <td className="py-2 px-4">{formatDateTime(v.collect_datetime)}</td>
                    <td className="py-2 px-4">
                      <StatusBadge online={v.condition === "online"} />
                    </td>
                    <td className="py-2 px-4">{v.op_mode ?? "-"}</td>
                    <td className="py-2 px-4">{v.vehicle_id}</td>
                    <td className="py-2 px-4">{v.specification ?? "-"}</td>
                    <td className="py-2 px-4">{v.group_nm ?? "-"}</td>
                    <td className="py-2 px-4">{formatHours(v.eg_time)}</td>
                    <td className="py-2 px-4">{formatHours(v.uman_time)}</td>
                    <td className="py-2 px-4">
                      {v.notes && <span className="text-xs text-amber-600">{v.notes}</span>}
                    </td>
                  </tr>
                );
              })}
              {loaded && pageRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-400">
                    표시할 차량이 없습니다.
                  </td>
                </tr>
              )}
              {!loaded && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-400">
                    불러오는 중...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-2 py-1 text-sm text-gray-500 disabled:text-gray-300"
          >
            ≪
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2 py-1 text-sm text-gray-500 disabled:text-gray-300"
          >
            ‹
          </button>
          <span className="text-sm text-gray-700">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-2 py-1 text-sm text-gray-500 disabled:text-gray-300"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="px-2 py-1 text-sm text-gray-500 disabled:text-gray-300"
          >
            ≫
          </button>
        </div>
      </div>

      {openVehicle && (
        <VehicleDetailModal
          vehicle={openVehicle}
          onClose={() => {
            setOpenVehicle(null);
            refreshVehicles();
          }}
        />
      )}

      {compareVehicle && (
        <VehicleCompareModal
          vehicle={compareVehicle}
          allVehicleIds={vehicleIds}
          onClose={() => {
            setCompareVehicle(null);
            refreshVehicles();
          }}
        />
      )}
    </div>
  );
}
