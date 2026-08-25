import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

// [공통] 1. 포탈 사용자 ID 조회
export async function GET(req: NextRequest) {
  const providerUserId = req.nextUrl.searchParams.get("providerUserId");
  if (!providerUserId) {
    return NextResponse.json({ error: "providerUserId is required" }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id
     FROM violet.tb_users_sso_accounts
     WHERE company = 'baroness'
       AND provider_user_id = $1`,
    [providerUserId]
  );

  const portalUserId = result.rows[0]?.user_id ?? null;
  if (!portalUserId) {
    return NextResponse.json({ error: "portal user not found" }, { status: 404 });
  }
  return NextResponse.json({ portalUserId });
}
