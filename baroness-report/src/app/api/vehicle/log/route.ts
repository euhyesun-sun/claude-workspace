import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { LOG_COLUMN_KEYS } from "@/lib/logColumns";
import { resolveVehicleTimezoneHours } from "@/lib/vehicleTimezone";

export const dynamic = "force-dynamic";

// [로그 데이터] 3-7. 선택된 컬럼들에 대한 동적 로그 데이터 조회
export async function GET(req: NextRequest) {
  const vehicleId = req.nextUrl.searchParams.get("vehicleId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  const columnsParam = req.nextUrl.searchParams.get("columns") ?? "";

  if (!vehicleId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "vehicleId, startDate and endDate are required" },
      { status: 400 }
    );
  }

  // 컬럼명은 SQL 파라미터로 바인딩할 수 없으므로(식별자), 반드시 화이트리스트 검증 후에만
  // 쿼리 문자열에 직접 넣는다 — 여기서 걸러지지 않은 값은 쿼리에 들어가지 않는다.
  const columns = columnsParam
    .split(",")
    .map((c) => c.trim())
    .filter((c) => LOG_COLUMN_KEYS.has(c));

  if (columns.length === 0) {
    return NextResponse.json({ error: "columns is required" }, { status: 400 });
  }

  const selectList = columns
    .map((c) =>
      c === "dpf_st"
        ? `CASE WHEN ${c} = '1' THEN 1 ELSE 0 END AS "${c}"`
        : `${c} AS "${c}"`
    )
    .join(",\n    ");

  // WHERE절의 기간 조건은 row별 timezone 컬럼을 직접 참조하지 않고, 이 차량의 timezone 값을
  // 미리 조회해 파라미터($4)로 바인딩한다 (자세한 이유는 route-history/route.ts 참고).
  const query = `
SELECT
    (collect_datetime + (COALESCE(timezone, 9) || ' hours')::interval) AS datatime,
    ${selectList},
    lat, lon
FROM bms_log
WHERE
    vehicle_id = $1
    AND collect_datetime >= $2::timestamp - ($4 * INTERVAL '1 hour')
    AND collect_datetime <= $3::timestamp - ($4 * INTERVAL '1 hour')
ORDER BY collect_datetime ASC
`;

  const pool = getPool();
  const tzHours = await resolveVehicleTimezoneHours(pool, "bms_log", vehicleId);
  const result = await pool.query(query, [vehicleId, startDate, endDate, tzHours]);
  return NextResponse.json({ columns, points: result.rows });
}
