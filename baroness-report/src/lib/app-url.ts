/**
 * standalone 보고서는 /r/{보고서ID} 하위 경로로 서빙된다.
 * 클라이언트에서 자체 API 호출·페이지 이동 시 이 헬퍼를 사용하면
 * 로컬 개발(루트 서빙)과 플랫폼 배포(/r/{id} 서빙) 양쪽에서 모두 동작한다.
 */
export function getBasePath(): string {
  if (typeof window === "undefined") return "";
  const m = window.location.pathname.match(/^\/r\/[^/]+/);
  return m ? m[0] : "";
}

/** 앱 내부 절대 경로('/api/...', '/', '/page')를 실제 요청 경로로 변환 */
export function appUrl(path: string): string {
  return `${getBasePath()}${path}` || "/";
}
