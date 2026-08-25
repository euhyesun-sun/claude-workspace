import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { resolveVehicleTimezoneHours } from "@/lib/vehicleTimezone";

export const dynamic = "force-dynamic";

// [차트] 3-5. 차량 핵심 데이터 시계열 차트 생성
// 원본 쿼리는 generate_series로 빈 구간을 0으로 채웠으나(분 단위 skeleton),
// 그 채움 로직을 빼고 실제 수집된 데이터만 있는 그대로 반환한다.
//
// WHERE절의 기간 조건은 row별 timezone 컬럼을 직접 참조하지 않고, 이 차량의 timezone 값을
// 미리 조회해 파라미터($4)로 바인딩한다 (자세한 이유는 route-history/route.ts 참고).
const QUERY = `
SELECT
	(collect_datetime + (COALESCE(timezone, 9) || ' hours')::interval) as datatime,
	fuel_lv,
	sog,
	pb_prg,
	pb_est
FROM bms_condition
WHERE
	collect_datetime >= ($2::timestamp - ($4 * INTERVAL '1 hour'))
	AND collect_datetime <= ($3::timestamp - ($4 * INTERVAL '1 hour'))
	AND vehicle_id = $1
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
  return NextResponse.json({ points: result.rows });
}
