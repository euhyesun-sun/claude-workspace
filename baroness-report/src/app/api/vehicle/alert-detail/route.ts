import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { resolveVehicleTimezoneHours } from "@/lib/vehicleTimezone";

export const dynamic = "force-dynamic";

// [경고 상세] 5-1 + 5-2. 경고 발생 순간(±1초)의 차량 기본 상태 + 하드웨어/제어계 상세 정보.
// 두 쿼리 모두 같은 행(같은 WHERE 조건)을 가리키므로 컬럼만 합쳐 한 번에 조회한다.
//
// eventDt는 /api/alerts가 내려준 값(= collect_datetime에 timezone을 더한 완성된 로컬
// 시각)을 그대로 되돌려받은 것이므로, 원본 collect_datetime과 비교하려면 timezone만큼
// 다시 빼야 한다 (db.ts에서 timestamp를 Date로 변환하지 않도록 고친 뒤로는 값이 왜곡되지
// 않고 그대로 전달되므로, route-history/chart/log와 동일한 패턴을 쓴다).
const QUERY = `
SELECT
    collect_datetime + (COALESCE(timezone, 9) || ' hours')::interval AS collect_datetime,
    op_mode_m AS op_mode,
    sys_mode_m AS sys_mode,
    uni_posi_m AS uni_posi,
    fuel_lv, sog, pb_data, pb_prg, pb_est, alert_m, lat, lon,
    eg_time, eg_rpm, roll, pitch, oside_temp,
    quality_m AS quality, head_type_m AS head_type,
    num_sv, age, hdop, bt_volt, eg_wtemp,
    ster_ins, ster_fb, trv_ins, trv_fb
FROM bms_alert
WHERE
    vehicle_id = $1
    AND collect_datetime BETWEEN
        $2::timestamp - ($4 * INTERVAL '1 hour') - INTERVAL '1 seconds'
        AND $2::timestamp - ($4 * INTERVAL '1 hour') + INTERVAL '1 seconds'
    AND alert_m = $3
    AND alert_m <> '' AND alert_m <> 'null'
ORDER BY collect_datetime DESC
LIMIT 1
`;

export async function GET(req: NextRequest) {
  const vehicleId = req.nextUrl.searchParams.get("vehicleId");
  const eventDt = req.nextUrl.searchParams.get("eventDt");
  const alertMessage = req.nextUrl.searchParams.get("alertMessage");
  if (!vehicleId || !eventDt || !alertMessage) {
    return NextResponse.json(
      { error: "vehicleId, eventDt and alertMessage are required" },
      { status: 400 }
    );
  }

  const pool = getPool();
  const tzHours = await resolveVehicleTimezoneHours(pool, "bms_log", vehicleId);
  const result = await pool.query(QUERY, [vehicleId, eventDt, alertMessage, tzHours]);
  return NextResponse.json({ detail: result.rows[0] ?? null });
}
