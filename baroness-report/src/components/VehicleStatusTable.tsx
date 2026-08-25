import type { VehicleStatusRow } from "@/types/dashboard";
import StatusBadge from "./StatusBadge";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 19);
}

function formatHours(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return Number(value).toFixed(3);
}

export default function VehicleStatusTable({
  vehicles,
  onSelectVehicle,
}: {
  vehicles: VehicleStatusRow[];
  onSelectVehicle?: (vehicle: VehicleStatusRow) => void;
}) {
  return (
    <div className="rounded-xl bg-white shadow-sm p-6">
      <h2 className="font-bold text-gray-900 mb-4">차량 상태</h2>
      <div className="overflow-auto max-h-80">
        <table className="w-full text-sm text-center border-separate border-spacing-0">
          <thead className="sticky top-0 bg-white z-10">
            <tr className="h-10 text-gray-500 border-b border-gray-200">
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
            {vehicles.map((v, i) => (
              <tr
                key={`${v.vehicle_id}-${v.collect_datetime}-${i}`}
                onClick={() => onSelectVehicle?.(v)}
                className={`h-10 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 ${
                  v.condition === "offline" ? "text-gray-400" : "text-gray-800"
                }`}
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
                  {v.notes && (
                    <span className="text-xs text-amber-600">{v.notes}</span>
                  )}
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-gray-400">
                  표시할 차량이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
