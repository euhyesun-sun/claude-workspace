"use client";

import { useEffect, useState } from "react";
import { appUrl } from "@/lib/app-url";
import { fetchPlatformUser } from "@/lib/platform-user";
import type { PlatformUser } from "@/types/dashboard";

// 리포트 플랫폼 위에서 독립적으로 열리는 각 화면(대시보드, 차량 데이터 등)이 공통으로
// 필요로 하는 "플랫폼 로그인 사용자 -> 내부 portal_user_id" 조회를 한 곳에 모아둔다.
export function usePortalUser() {
  const [platformUser, setPlatformUser] = useState<PlatformUser | null | undefined>(undefined);
  const [portalUserId, setPortalUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlatformUser().then(setPlatformUser);
  }, []);

  useEffect(() => {
    if (!platformUser) return;
    fetch(appUrl(`/api/portal-user?providerUserId=${encodeURIComponent(platformUser.username)}`))
      .then((res) => {
        if (!res.ok) throw new Error("포탈 사용자 조회 실패");
        return res.json();
      })
      .then((json) => setPortalUserId(json.portalUserId))
      .catch((e) => setError(e.message));
  }, [platformUser]);

  return { platformUser, portalUserId, error };
}
