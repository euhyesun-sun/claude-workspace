import type { AlertRow } from "@/types/dashboard";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 19);
}

export default function AlertListTable({
  alerts,
  onSelectAlert,
}: {
  alerts: AlertRow[];
  onSelectAlert?: (alert: AlertRow) => void;
}) {
  return (
    <div className="rounded-xl bg-white shadow-sm p-6">
      <h2 className="font-bold text-gray-900 mb-4">경고 목록</h2>
      <div className="overflow-auto max-h-80">
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
            {alerts.map((a, i) => (
              <tr
                key={`${a.vehicle_id}-${a.collect_datetime}-${i}`}
                onClick={() => onSelectAlert?.(a)}
                className="h-10 border-b border-gray-100 last:border-0 text-gray-800 cursor-pointer hover:bg-gray-50"
              >
                <td className="py-2 px-4">{formatDateTime(a.collect_datetime)}</td>
                <td className="py-2 px-4">{a.op_mode_m ?? "-"}</td>
                <td className="py-2 px-4">{a.vehicle_id}</td>
                <td className="py-2 px-4">{a.group_nm ?? "-"}</td>
                <td className="py-2 px-4">{a.alert_m ?? "-"}</td>
                <td className="py-2 px-4">{a.notes ?? ""}</td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-400">
                  표시할 경고가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
