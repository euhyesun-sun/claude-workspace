import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { resolveVehicleTimezoneHours } from "@/lib/vehicleTimezone";

export const dynamic = "force-dynamic";

// [지도] 3-2. 특정 기간 차량 이동 경로 조회
//
// WHERE절의 기간 조건은 row별 timezone 컬럼을 직접 참조하지 않고, 이 차량의 timezone 값을
// 미리 조회해 파라미터($4)로 바인딩한다. row 컬럼을 식에 직접 쓰면 PostgreSQL이 상수로
// 취급하지 못해 collect_datetime 인덱스를 못 쓰고 해당 차량의 전체 이력(수십만 행)을
// 스캔해버려 지도 로딩이 1~4초씩 걸렸다. 파라미터로 바인딩하면 값은 그대로 동적이면서
// (지역이 늘어 timezone이 9가 아니게 되어도 정상 동작) 인덱스도 그대로 쓸 수 있다.
const QUERY = `
SELECT
    collect_datetime + (COALESCE(timezone, 9) || ' hours')::interval AS collect_datetime,
    lat, lon
FROM bms_condition
WHERE
    vehicle_id = $1
    AND lat IS NOT NULL AND lon IS NOT NULL
    AND lat <> 0 AND lon <> 0
    AND collect_datetime >= $2::timestamp - ($4 * INTERVAL '1 hour')
    AND collect_datetime <= $3::timestamp - ($4 * INTERVAL '1 hour')
ORDER BY collect_datetime ASC
`;

export async function GET(req: NextRequest) {
  const vehicleId = req.nextUrl.searchParams.get("vehicleId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  if (!vehicleId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "vehicleId, startDate and endDate are required" },
      { status: 400 }
    );
  }

  const pool = getPool();
  const tzHours = await resolveVehicleTimezoneHours(pool, "bms_condition", vehicleId);
  const result = await pool.query(QUERY, [vehicleId, startDate, endDate, tzHours]);
  return NextResponse.json({ route: result.rows });
}
