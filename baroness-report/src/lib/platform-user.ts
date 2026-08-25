import type { PlatformUser } from "@/types/dashboard";

/**
 * 플랫폼 로그인 사용자 정보를 가져온다 (같은 오리진 세션 쿠키 인증, 절대경로 그대로 호출).
 * 로컬 개발 환경에는 플랫폼 게이트웨이가 없어 이 API가 존재하지 않으므로,
 * NEXT_PUBLIC_DEV_PROVIDER_USER_ID가 설정돼 있으면 그 값으로 대체한다(개발용 임시 처리).
 */
export async function fetchPlatformUser(): Promise<PlatformUser | null> {
  try {
    const res = await fetch("/api/platform/user-info");
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) return json.data as PlatformUser;
    }
  } catch {
    // 플랫폼 밖(로컬 개발 등)에서는 이 요청이 실패한다 — 아래 개발용 폴백으로 이어짐
  }

  const devId = process.env.NEXT_PUBLIC_DEV_PROVIDER_USER_ID;
  if (devId) {
    return { id: devId, username: devId, name: devId, email: "", role: "DEV" };
  }
  return null;
}
