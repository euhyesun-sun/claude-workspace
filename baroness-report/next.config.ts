import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-leaflet(지도)이 React 18 Strict Mode의 effect 이중 실행과 충돌해
  // "Map container is already initialized" 오류를 내서 로컬 개발용으로 끈다.
  // 플랫폼 배포 시에는 이 next.config.js 자체가 통째로 덮어써지므로 영향 없음.
  reactStrictMode: false,
};

export default nextConfig;
