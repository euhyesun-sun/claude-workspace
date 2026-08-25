import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// [차량 데이터] 2. 실시간 차량 상태 조회
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
        ci.vehicle_id,
        MAX(ci.last_collect_datetime) FILTER (WHERE ci.topic = 'condition') AS last_condition_dt,
        MAX(ci.last_collect_datetime) FILTER (WHERE ci.topic = 'log') AS last_log_dt
    FROM public.bms_collect_info ci
      JOIN device_user du
      ON du.sensor_id = ci.vehicle_id
    GROUP BY ci.vehicle_id
),
latest_condition AS (
    SELECT
        c.collect_datetime,
        COALESCE(c.timezone, 9) as timezone,
        c.vehicle_id,
        c.op_mode_m AS op_mode
    FROM bms_condition c
    JOIN collect_info ci
      ON ci.vehicle_id = c.vehicle_id
      AND ci.last_condition_dt = c.collect_datetime
),
latest_log AS (
    SELECT
        l.vehicle_id,
        l.eg_time,
        l.uman_time
    FROM bms_log l
    JOIN collect_info ci
      ON ci.vehicle_id = l.vehicle_id
      AND ci.last_log_dt = l.collect_datetime
),
user_groups AS (
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
    CASE
        WHEN (b.collect_datetime AT TIME ZONE 'UTC') < now() - INTERVAL '10 seconds' THEN '-'
        ELSE b.op_mode
        END AS op_mode,
    b.vehicle_id AS sensor_id,
    v.specification,
    ug.group_nm,
    l.eg_time,
    l.uman_time,
    CASE
        WHEN (b.collect_datetime AT TIME ZONE 'UTC') >= now() - INTERVAL '10 seconds' THEN 'online'
        ELSE 'offline'
        END AS condition,
    (b.collect_datetime + (COALESCE(b.timezone, 9) || ' hours')::INTERVAL) AS data_time,
    b.vehicle_id,
    CASE WHEN BOOL_OR(du.src = 'exc') THEN 'View Only' ELSE '' END AS notes
FROM latest_condition b
LEFT JOIN vehicle_info v
  ON b.vehicle_id = v.vehicle_id
LEFT JOIN latest_log l
  ON b.vehicle_id = l.vehicle_id
LEFT JOIN user_groups ug
  ON b.vehicle_id = ug.sensor_id
LEFT JOIN device_user du
  ON b.vehicle_id = du.sensor_id
GROUP BY
    b.collect_datetime, COALESCE(b.timezone, 9), b.op_mode, b.vehicle_id,
    v.specification,
    ug.group_nm,
    l.eg_time, l.uman_time
ORDER BY collect_datetime DESC
`;

export async function GET(req: NextRequest) {
  const portalUserId = req.nextUrl.searchParams.get("portalUserId");
  if (!portalUserId) {
    return NextResponse.json({ error: "portalUserId is required" }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query(QUERY, [portalUserId]);
  return NextResponse.json({ vehicles: result.rows });
}
