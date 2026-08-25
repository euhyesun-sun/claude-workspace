import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// [공지 관리] 10. 전체 시스템 및 긴급 공지 사항 조회 — 가장 최근에 등록된 공지 1건만 보여준다.
export async function GET() {
  const pool = getPool();
  const result = await pool.query(`SELECT * FROM notice_data ORDER BY datatime DESC LIMIT 1`);
  return NextResponse.json({ notices: result.rows });
}
