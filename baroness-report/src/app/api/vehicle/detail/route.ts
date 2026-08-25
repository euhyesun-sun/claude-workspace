import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { resolveVehicleTimezoneHours } from "@/lib/vehicleTimezone";

export const dynamic = "force-dynamic";

// [차량 상세] 3-4. 차량 상태 상세 정보 테이블 조회
//
// dataTime은 /api/vehicle-status가 내려준 값(= collect_datetime에 timezone을 더한 완성된
// 로컬 시각)을 그대로 되돌려받은 것이므로, 원본 collect_datetime과 비교하려면 timezone만큼
// 다시 빼야 한다 (db.ts에서 timestamp를 Date로 변환하지 않도록 고친 뒤로는 값이 왜곡되지
// 않고 그대로 전달되므로, route-history/chart/log와 동일한 패턴을 쓴다).
const QUERY = `
SELECT
	collect_datetime + (COALESCE(timezone, 9) || ' hours')::interval as collect_datetime,
	op_mode_m as op_mode,
	sys_mode_m as sys_mode,
	uni_posi_m as uni_posi,
	fuel_lv,
	sog,
	pb_data,
	pb_prg,
	pb_est,
	alert_m,
	lat,
	lon
FROM bms_condition
WHERE
	vehicle_id = $1
	AND collect_datetime
		BETWEEN $2::timestamp - ($3 * INTERVAL '1 hour') - INTERVAL '1 minutes'
        AND $2::timestamp - ($3 * INTERVAL '1 hour') + INTERVAL '1 minutes'
ORDER BY collect_datetime DESC
LIMIT 1
`;

export async function GET(req: NextRequest) {
  const vehicleId = req.nextUrl.searchParams.get("vehicleId");
  const dataTime = req.nextUrl.searchParams.get("dataTime");
  if (!vehicleId || !dataTime) {
    return NextResponse.json({ error: "vehicleId and dataTime are required" }, { status: 400 });
  }

  const pool = getPool();
  const tzHours = await resolveVehicleTimezoneHours(pool, "bms_condition", vehicleId);
  const result = await pool.query(QUERY, [vehicleId, dataTime, tzHours]);
  return NextResponse.json({ detail: result.rows[0] ?? null });
}
