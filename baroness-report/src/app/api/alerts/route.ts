import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// [경고 목록] 4. 차량 경고 내역 조회
const QUERY = `
WITH device_user AS (
    SELECT sensor_id, user_id, 'user' AS src
    FROM violet.v_tb_device_user
    WHERE user_id IN (
        SELECT user_id
        FROM violet.fn_get_group_hierarchy_with_users_new($1)
    )
    UNION ALL
    SELECT sensor_id, user_id, 'exc' AS src
    FROM violet.tb_device_user_exc
    WHERE user_id = $1
),
collect_info AS (
	SELECT
		vehicle_id, last_collect_datetime
	FROM public.bms_collect_info ci
    JOIN device_user du
      ON du.sensor_id = ci.vehicle_id
      AND ci.topic = 'alert'
    GROUP BY ci.vehicle_id, ci.last_collect_datetime
),
latest_alert AS (
    SELECT
        a.collect_datetime, COALESCE(a.timezone, 9) as timezone,
        a.op_mode_m,
        a.vehicle_id,
        a.alert_m
    FROM bms_alert a
    JOIN collect_info ci
      ON ci.vehicle_id = a.vehicle_id
      AND ci.last_collect_datetime = a.collect_datetime
    WHERE
    	a.alert_m <> '' AND a.alert_m <> 'null'
),
user_group AS (
    SELECT
        du.sensor_id AS sensor_id,
        gm.group_nm AS group_nm,
        du.user_id
    FROM violet.tb_device_user du
    LEFT JOIN violet.tb_users u
      ON du.user_id = u.user_id
    LEFT JOIN violet.tb_group_mgmt gm
      ON u.group_id::int = gm.id
    WHERE du.user_id IN (
        SELECT user_id
        FROM violet.tb_users
        WHERE role_id = 'ROLE_GROUP'
    )
)
SELECT DISTINCT
    (b.collect_datetime + (COALESCE(b.timezone, 9) || ' hours')::INTERVAL) AS collect_datetime,
    b.op_mode_m AS op_mode_m,
    b.vehicle_id as vehicle,
    ug.group_nm as group_nm,
    b.alert_m as alert_m,
    CASE WHEN du.src = 'exc' THEN 'View Only' ELSE '' END AS notes,
    (b.collect_datetime + (COALESCE(b.timezone, 9) || ' hours')::INTERVAL) as data_time,
    b.vehicle_id as vehicle_id
FROM latest_alert b
LEFT JOIN user_group ug
  ON b.vehicle_id = ug.sensor_id
LEFT JOIN device_user du
  ON b.vehicle_id = du.sensor_id
ORDER BY collect_datetime DESC
`;

export async function GET(req: NextRequest) {
  const portalUserId = req.nextUrl.searchParams.get("portalUserId");
  if (!portalUserId) {
    return NextResponse.json({ error: "portalUserId is required" }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query(QUERY, [portalUserId]);
  return NextResponse.json({ alerts: result.rows });
}
