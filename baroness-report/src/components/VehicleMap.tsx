"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationPoint } from "@/types/dashboard";

function formatDateTime(value: string): string {
  return value.replace("T", " ").slice(0, 19);
}

function pinSvg(color: string): string {
  return `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`;
}

function createPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: pinSvg(color),
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    tooltipAnchor: [0, -32],
  });
}

// 최종 위치(빨강 = 현재)와 이전 위치(회색 = 과거)를 색으로 직관적으로 구분한다.
const lastIcon = createPinIcon("#dc2626");
const previousIcon = createPinIcon("#6b7280");

function createArrowIcon(bearingDeg: number): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<svg width="14" height="14" viewBox="0 0 14 14" style="transform: rotate(${bearingDeg}deg)">
      <path d="M7 0 L14 14 L7 10.5 L0 14 Z" fill="#1d4ed8" stroke="white" stroke-width="0.5"/>
    </svg>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function bearing(from: LocationPoint, to: LocationPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// 이동 순서를 보여주는 방향 화살표 — 포인트가 많아도 겹치지 않도록 일정 개수만 샘플링한다.
const MAX_ARROWS = 24;

function buildArrows(route: LocationPoint[]): { position: [number, number]; bearingDeg: number }[] {
  if (route.length < 2) return [];
  const step = Math.max(1, Math.floor(route.length / MAX_ARROWS));
  const arrows: { position: [number, number]; bearingDeg: number }[] = [];
  for (let i = 0; i < route.length - 1; i += step) {
    const from = route[i];
    const to = route[Math.min(i + step, route.length - 1)];
    if (from.lat === to.lat && from.lon === to.lon) continue;
    arrows.push({ position: [from.lat, from.lon], bearingDeg: bearing(from, to) });
  }
  return arrows;
}

function nearestPoint(route: LocationPoint[], lat: number, lon: number): LocationPoint | null {
  if (route.length === 0) return null;
  let best = route[0];
  let bestDist = Infinity;
  for (const p of route) {
    const d = (p.lat - lat) ** 2 + (p.lon - lon) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

// resetKey가 바뀔 때만(예: 차량/기간/조회 시점이 실제로 바뀔 때) 화면을 다시 맞추고,
// 같은 resetKey로 위치 값만 갱신되는 경우(온라인 차량의 10초 주기 갱신 등)는 건드리지
// 않는다 — 안 그러면 사용자가 확대/이동해둔 화면이 매 갱신마다 원위치로 돌아간다.
function FitBounds({ points, resetKey }: { points: [number, number][]; resetKey: string }) {
  const map = useMap();
  const firedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (points.length === 0) return;
    if (firedKeyRef.current === resetKey) return;
    firedKeyRef.current = resetKey;
    if (points.length === 1) {
      map.setView(points[0], 16);
    } else {
      map.fitBounds(points, { padding: [24, 24] });
    }
  }, [map, points, resetKey]);
  return null;
}

export default function VehicleMap({
  route,
  lastLocation,
  previousLocation,
  resetKey = "default",
}: {
  route: LocationPoint[];
  lastLocation: LocationPoint | null;
  previousLocation?: LocationPoint | null;
  // 지도를 자동으로 다시 맞출 기준 — 이 값이 바뀔 때만 재적용(fitBounds/setView)된다.
  // 보통 "차량ID-기간" 같은 조합을 넘겨서, 같은 맥락 안에서의 위치 값 갱신과
  // 실제로 다른 걸 보여줘야 하는 경우를 구분한다.
  resetKey?: string;
}) {
  const [hoverTime, setHoverTime] = useState<string | null>(null);

  const routeLatLng: [number, number][] = useMemo(
    () => route.map((p) => [p.lat, p.lon]),
    [route]
  );
  const arrows = useMemo(() => buildArrows(route), [route]);

  // 호버 등으로 인한 재렌더링마다 새 배열이 생기면 FitBounds가 매번 재실행되어
  // 사용자가 확대/이동한 화면을 계속 원위치로 되돌리므로, 실제 위치 값이 바뀔 때만 갱신되게 한다.
  const boundsPoints: [number, number][] = useMemo(
    () => [
      ...routeLatLng,
      ...(lastLocation ? [[lastLocation.lat, lastLocation.lon] as [number, number]] : []),
      ...(previousLocation ? [[previousLocation.lat, previousLocation.lon] as [number, number]] : []),
    ],
    [routeLatLng, lastLocation, previousLocation]
  );
  const center: [number, number] = lastLocation
    ? [lastLocation.lat, lastLocation.lon]
    : routeLatLng[0] ?? [35.681236, 139.767125];

  const hasLocationData = route.length > 0 || !!lastLocation || !!previousLocation;
  if (!hasLocationData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        차량의 위치 데이터가 없습니다.
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={16}
      maxZoom={19}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {routeLatLng.length > 1 && (
        <Polyline
          positions={routeLatLng}
          pathOptions={{ color: "#2563eb", weight: 3 }}
          eventHandlers={{
            mouseover: (e) => {
              const p = nearestPoint(route, e.latlng.lat, e.latlng.lng);
              setHoverTime(p ? p.collect_datetime : null);
            },
            mousemove: (e) => {
              const p = nearestPoint(route, e.latlng.lat, e.latlng.lng);
              setHoverTime(p ? p.collect_datetime : null);
            },
            mouseout: () => setHoverTime(null),
          }}
        >
          {/* sticky 툴팁은 레이어에 항상 바인딩돼 있어야 Leaflet이 mouseover에서 스스로 열어준다 */}
          <Tooltip sticky>{hoverTime ? formatDateTime(hoverTime) : ""}</Tooltip>
        </Polyline>
      )}
      {arrows.map((a, i) => (
        <Marker
          key={i}
          position={a.position}
          icon={createArrowIcon(a.bearingDeg)}
          interactive={false}
        />
      ))}
      {previousLocation && (
        <Marker position={[previousLocation.lat, previousLocation.lon]} icon={previousIcon}>
          <Tooltip direction="top" offset={[0, -4]}>
            이전 위치 · {formatDateTime(previousLocation.collect_datetime)}
          </Tooltip>
        </Marker>
      )}
      {lastLocation && (
        <Marker position={[lastLocation.lat, lastLocation.lon]} icon={lastIcon}>
          <Tooltip direction="top" offset={[0, -4]}>
            최종 위치 · {formatDateTime(lastLocation.collect_datetime)}
          </Tooltip>
        </Marker>
      )}
      {boundsPoints.length > 0 && <FitBounds points={boundsPoints} resetKey={resetKey} />}
    </MapContainer>
  );
}
