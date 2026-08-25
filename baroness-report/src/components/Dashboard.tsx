"use client";

import { useEffect, useState } from "react";
import { appUrl } from "@/lib/app-url";
import { fetchPlatformUser } from "@/lib/platform-user";
import type { AlertRow, Notice, PlatformUser, VehicleStatusRow } from "@/types/dashboard";
import NoticeBanner from "./NoticeBanner";
import VehicleStatusTable from "./VehicleStatusTable";
import AlertListTable from "./AlertListTable";
import VehicleDetailModal from "./VehicleDetailModal";
import AlertDetailModal from "./AlertDetailModal";

export default function Dashboard() {
  const [platformUser, setPlatformUser] = useState<PlatformUser | null | undefined>(undefined);
  const [portalUserId, setPortalUserId] = useState<string | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [vehicles, setVehicles] = useState<VehicleStatusRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleStatusRow | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertRow | null>(null);

  // 1) 플랫폼 로그인 사용자 조회
  useEffect(() => {
    fetchPlatformUser().then(setPlatformUser);
  }, []);

  // 지도(Leaflet)는 크기가 커서 처음 팝업 열 때 로딩이 느리게 느껴진다.
  // 대시보드가 뜬 시점에 미리 청크를 받아두면 실제로 팝업을 열 때는 바로 뜬다.
  useEffect(() => {
    import("./VehicleMap");
  }, []);

  // 2) 로그인 사용자 -> 내부 portal_user_id 매핑
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

  // 3) 공지사항 (사용자 무관)
  useEffect(() => {
    fetch(appUrl("/api/notices"))
      .then((res) => res.json())
      .then((json) => setNotices(json.notices ?? []))
      .catch(() => {});
  }, []);

  function refreshVehicles() {
    if (!portalUserId) return;
    fetch(appUrl(`/api/vehicle-status?portalUserId=${encodeURIComponent(portalUserId)}`))
      .then((res) => res.json())
      .then((json) => setVehicles(json.vehicles ?? []))
      .catch((e) => setError(e.message));
  }

  function refreshAlerts() {
    if (!portalUserId) return;
    fetch(appUrl(`/api/alerts?portalUserId=${encodeURIComponent(portalUserId)}`))
      .then((res) => res.json())
      .then((json) => setAlerts(json.alerts ?? []))
      .catch((e) => setError(e.message));
  }

  // 4) 차량 상태 / 경고 목록 (portalUserId가 정해지면 한 번만 조회 — 자동 갱신 없음)
  useEffect(() => {
    if (!portalUserId) return;
    refreshVehicles();
    refreshAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portalUserId]);

  if (platformUser === undefined) {
    return <div className="p-6 text-gray-500">로그인 정보를 확인하는 중...</div>;
  }
  if (platformUser === null) {
    return <div className="p-6 text-red-600">로그인이 필요합니다.</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f6f8] p-6 space-y-6">
      {error && <div className="rounded-xl bg-red-50 text-red-700 px-6 py-3">{error}</div>}
      <NoticeBanner notices={notices} />
      <VehicleStatusTable vehicles={vehicles} onSelectVehicle={setSelectedVehicle} />
      <AlertListTable alerts={alerts} onSelectAlert={setSelectedAlert} />
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => {
            setSelectedVehicle(null);
            refreshVehicles();
          }}
        />
      )}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          onClose={() => {
            setSelectedAlert(null);
            refreshAlerts();
          }}
        />
      )}
    </div>
  );
}
