import type { Pool } from "pg";

// bms_condition/bms_log는 row마다 timezone 컬럼(시간 오프셋, 시간 단위)을 갖는다.
// 현재는 일본 서비스라 전부 9지만 지역이 늘어나면 차량마다 값이 달라질 수 있으므로
// 코드에 9를 고정해 넣지 않고, 매 요청마다 해당 차량의 최신 timezone 값을 DB에서 조회해 쓴다.
//
// 이 값을 SQL 파라미터로 바인딩해서 기간 조건(collect_datetime >= $2 - ($4 * interval '1 hour'))에
// 쓰면, row별 컬럼을 직접 참조할 때와 달리 PostgreSQL이 상수로 취급해 collect_datetime 인덱스를
// 그대로 쓸 수 있다 — 값을 하드코딩하지 않으면서도 성능 문제를 피하는 방법.
export async function resolveVehicleTimezoneHours(
  pool: Pool,
  table: "bms_condition" | "bms_log",
  vehicleId: string
): Promise<number> {
  const result = await pool.query<{ timezone: number | null }>(
    `SELECT timezone FROM ${table} WHERE vehicle_id = $1 ORDER BY collect_datetime DESC LIMIT 1`,
    [vehicleId]
  );
  return result.rows[0]?.timezone ?? 9;
}
