import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { resolveVehicleTimezoneHours } from "@/lib/vehicleTimezone";

export const dynamic = "force-dynamic";

// [지도] 3-1. 차량의 마지막 수집 위치 조회 / 3-3. 차량의 이전 위치 조회
// 두 쿼리가 동일한 로직(기준 시각 ±1분 이내 최신 1건)이라 기준 시각(at)만 바꿔 재사용한다.
//
// 기준 시각(at)은 /api/vehicle-status·/api/vehicle/chart가 돌려준 값(= collect_datetime에
// timezone을 더한 완성된 로컬 시각)을 그대로 되돌려받은 것이므로, 원본 collect_datetime과
// 비교하려면 timezone만큼 다시 빼야 한다 (db.ts에서 timestamp를 Date로 변환하지 않도록
// 고친 뒤로는 값이 왜곡되지 않고 그대로 전달되므로, route-history/chart/log와 동일한
// 패턴을 쓴다).
const QUERY = `
SELECT
    collect_datetime + (COALESCE(timezone, 9) || ' hours')::interval AS collect_datetime,
    lat, lon
FROM bms_condition
WHERE
    vehicle_id = $1
    AND lat IS NOT NULL AND lon IS NOT NULL
    AND lat <> 0 AND lon <> 0
    AND collect_datetime
        BETWEEN $2::timestamp - ($3 * INTERVAL '1 hour') - INTERVAL '1 minutes'
        AND     $2::timestamp - ($3 * INTERVAL '1 hour') + INTERVAL '1 minutes'
ORDER BY collect_datetime DESC
LIMIT 1
`;

export async function GET(req: NextRequest) {
  const vehicleId = req.nextUrl.searchParams.get("vehicleId");
  const at = req.nextUrl.searchParams.get("at");
  if (!vehicleId || !at) {
    return NextResponse.json({ error: "vehicleId and at are required" }, { status: 400 });
  }

  const pool = getPool();
  const tzHours = await resolveVehicleTimezoneHours(pool, "bms_condition", vehicleId);
  const result = await pool.query(QUERY, [vehicleId, at, tzHours]);
  return NextResponse.json({ location: result.rows[0] ?? null });
}
