import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { resolveVehicleTimezoneHours } from "@/lib/vehicleTimezone";

export const dynamic = "force-dynamic";

// [경고 상세] 5-3. 이 차량에서 발생한 전체 경고 이력 타임라인.
// 같은 초에 같은 메시지가 중복 수집된 경우 최신 1건만 남긴다.
const QUERY = `
SELECT
    date_trunc('second', collect_datetime + ($2 * INTERVAL '1 hour')) AS collect_datetime,
    alert_m, lat, lon
FROM (
    SELECT
        collect_datetime, alert_m, lat, lon,
        ROW_NUMBER() OVER (
            PARTITION BY date_trunc('second', collect_datetime), alert_m
            ORDER BY collect_datetime DESC
        ) AS rn
    FROM bms_alert
    WHERE vehicle_id = $1
        AND alert_m IS NOT NULL AND alert_m <> '' AND alert_m <> 'null'
) sub
WHERE rn = 1
ORDER BY collect_datetime DESC
LIMIT 200
`;

export async function GET(req: NextRequest) {
  const vehicleId = req.nextUrl.searchParams.get("vehicleId");
  if (!vehicleId) {
    return NextResponse.json({ error: "vehicleId is required" }, { status: 400 });
  }

  const pool = getPool();
  const tzHours = await resolveVehicleTimezoneHours(pool, "bms_log", vehicleId);
  const result = await pool.query(QUERY, [vehicleId, tzHours]);
  return NextResponse.json({ timeline: result.rows });
}
