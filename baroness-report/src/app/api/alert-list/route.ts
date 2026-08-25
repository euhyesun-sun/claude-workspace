import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// [경고 목록] 4. 차량 경고 내역 조회 (날짜 범위 전체) — Baroness_query_20260819.txt 그대로 포팅.
// 여러 차량을 한 번에 조회하는 쿼리라 vehicle_timezone 파라미터 바인딩을 쓰지 않고,
// 원본 쿼리처럼 row별 timezone 컬럼을 그대로 사용한다(팝업류 단일 차량 쿼리와의 차이점).
const QUERY = `
WITH device_user_summary AS (
    SELECT
        sensor_id,
        BOOL_OR(src = 'exc') AS is_exc
    FROM (
        SELECT sensor_id, 'user' AS src
        FROM violet.v_tb_device_user
        WHERE user_id IN (
            SELECT user_id FROM violet.fn_get_group_hierarchy_with_users_new($1)
        )
        UNION ALL
        SELECT sensor_id, 'exc' AS src
        FROM violet.tb_device_user_exc
        WHERE user_id = $1
    ) combined
    GROUP BY sensor_id
),
user_group AS (
    SELECT DISTINCT ON (du.sensor_id)
        du.sensor_id,
        gm.group_nm
    FROM violet.tb_device_user du
    JOIN violet.tb_users u
        ON du.user_id = u.user_id
        AND u.role_id = 'ROLE_GROUP'
    LEFT JOIN violet.tb_group_mgmt gm
        ON u.group_id::int = gm.id
    ORDER BY du.sensor_id, gm.group_nm
),
latest_alert AS (
    SELECT DISTINCT
        a.vehicle_id,
        a.alert_m,
        a.op_mode_m,
        date_trunc(
            'second',
            a.collect_datetime + (COALESCE(a.timezone, 9) || ' hours')::INTERVAL
        ) AS collect_datetime,
        dus.is_exc
    FROM bms_alert a
    JOIN device_user_summary dus
        ON a.vehicle_id = dus.sensor_id
    WHERE
        a.collect_datetime >= ($2::timestamp - (COALESCE(a.timezone, 9)::text || ' hours')::interval)
        AND a.collect_datetime <= ($3::timestamp - (COALESCE(a.timezone, 9)::text || ' hours')::interval)
        AND a.alert_m <> '' AND a.alert_m <> 'null'
)
SELECT
    b.collect_datetime AS collect_datetime,
    b.op_mode_m AS op_mode_m,
    b.vehicle_id AS vehicle_id,
    ug.group_nm AS group_nm,
    b.alert_m AS alert_m,
    b.collect_datetime AS data_time,
    CASE WHEN b.is_exc THEN 'View Only' ELSE '' END AS notes
FROM latest_alert b
LEFT JOIN user_group ug
    ON b.vehicle_id = ug.sensor_id
ORDER BY b.collect_datetime DESC
`;

export async function GET(req: NextRequest) {
  const portalUserId = req.nextUrl.searchParams.get("portalUserId");
  const startDate = req.nextUrl.searchParams.get("startDate");
  const endDate = req.nextUrl.searchParams.get("endDate");
  if (!portalUserId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "portalUserId, startDate and endDate are required" },
      { status: 400 }
    );
  }

  const pool = getPool();
  const result = await pool.query(QUERY, [portalUserId, startDate, endDate]);
  return NextResponse.json({ alerts: result.rows });
}
