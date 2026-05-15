#!/usr/bin/env python3
"""
경기도 성남시 금토동 날씨 + 미세먼지 수집기
사용 API: Open-Meteo (https://open-meteo.com) — API 키 불필요, 무료
"""

import urllib.request
import json
import sys
from datetime import datetime

# ── 설정 ──────────────────────────────────────────────
LOCATION_NAME = "경기도 성남시 금토동"
LAT = 37.3891
LON = 127.1029
OUTPUT_FILE = "/Users/euhyesun/Documents/study/claude-workspace/weather.txt"
# ─────────────────────────────────────────────────────


def fetch_json(url: str) -> dict:
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[오류] 요청 실패: {e}")
        sys.exit(1)


def fetch_weather() -> dict:
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={LAT}&longitude={LON}"
        "&current=temperature_2m,apparent_temperature,"
        "relative_humidity_2m,precipitation,weather_code,"
        "wind_speed_10m,wind_direction_10m"
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum"
        "&timezone=Asia%2FSeoul"
        "&forecast_days=1"
    )
    return fetch_json(url)


def fetch_air_quality() -> dict:
    url = (
        "https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={LAT}&longitude={LON}"
        "&current=pm10,pm2_5"
        "&timezone=Asia%2FSeoul"
    )
    return fetch_json(url)


# WMO 날씨 코드 → 한국어
WEATHER_CODES = {
    0: "맑음", 1: "대체로 맑음", 2: "구름 조금", 3: "흐림",
    45: "안개", 48: "안개(서리)",
    51: "이슬비(약)", 53: "이슬비", 55: "이슬비(강)",
    61: "비(약)", 63: "비", 65: "비(강)",
    71: "눈(약)", 73: "눈", 75: "눈(강)", 77: "눈 결정",
    80: "소나기(약)", 81: "소나기", 82: "소나기(강)",
    85: "눈 소나기(약)", 86: "눈 소나기(강)",
    95: "뇌우", 96: "뇌우+우박", 99: "뇌우+강한 우박",
}

# 풍향 변환
def wind_direction(deg: float) -> str:
    dirs = ["북", "북북동", "북동", "동북동", "동", "동남동", "남동", "남남동",
            "남", "남남서", "남서", "서남서", "서", "서북서", "북서", "북북서"]
    return dirs[round(deg / 22.5) % 16]

# 미세먼지 등급 (환경부 기준)
def pm10_grade(v: float) -> str:
    if v <= 30:   return "좋음"
    if v <= 80:   return "보통"
    if v <= 150:  return "나쁨"
    return "매우나쁨"

def pm25_grade(v: float) -> str:
    if v <= 15:   return "좋음"
    if v <= 35:   return "보통"
    if v <= 75:   return "나쁨"
    return "매우나쁨"

GRADE_ICON = {"좋음": "🟢", "보통": "🟡", "나쁨": "🟠", "매우나쁨": "🔴"}


def build_report(weather: dict, air: dict) -> str:
    now = datetime.now().strftime("%Y년 %m월 %d일 %H:%M")
    cur = weather["current"]
    daily = weather["daily"]

    temp       = cur["temperature_2m"]
    feels_like = cur["apparent_temperature"]
    humidity   = cur["relative_humidity_2m"]
    precip     = cur["precipitation"]
    w_code     = cur["weather_code"]
    wind_spd   = cur["wind_speed_10m"]
    wind_dir   = cur["wind_direction_10m"]
    temp_max   = daily["temperature_2m_max"][0]
    temp_min   = daily["temperature_2m_min"][0]
    precip_sum = daily["precipitation_sum"][0]

    pm10_val  = air["current"]["pm10"]
    pm25_val  = air["current"]["pm2_5"]
    g10  = pm10_grade(pm10_val)
    g25  = pm25_grade(pm25_val)

    lines = [
        "=" * 46,
        f"  {LOCATION_NAME} 날씨 정보",
        f"  수집 시각: {now}",
        "=" * 46,
        "",
        "[ 현재 날씨 ]",
        f"  날씨 상태  : {WEATHER_CODES.get(w_code, f'코드 {w_code}')}",
        f"  기온       : {temp}°C  (체감 {feels_like}°C)",
        f"  최고 / 최저: {temp_max}°C / {temp_min}°C",
        f"  습도       : {humidity}%",
        f"  강수량     : {precip} mm  (오늘 합계 {precip_sum} mm)",
        f"  풍속 / 풍향: {wind_spd} km/h  {wind_direction(wind_dir)}풍",
        "",
        "[ 미세먼지 ]",
        f"  미세먼지(PM10)  : {pm10_val:.1f} µg/m³  {GRADE_ICON[g10]} {g10}",
        f"  초미세먼지(PM2.5): {pm25_val:.1f} µg/m³  {GRADE_ICON[g25]} {g25}",
        "",
        "  ※ 등급 기준 (환경부)",
        "     PM10  — 좋음 ≤30 / 보통 ≤80 / 나쁨 ≤150 / 매우나쁨 >150",
        "     PM2.5 — 좋음 ≤15 / 보통 ≤35 / 나쁨 ≤75  / 매우나쁨 >75",
        "",
        "[ 출처 ]",
        "  날씨: Open-Meteo (https://open-meteo.com)",
        "  대기: Open-Meteo Air Quality API",
        "=" * 46,
    ]
    return "\n".join(lines)


def main():
    print("날씨 정보를 가져오는 중...")
    weather = fetch_weather()
    print("미세먼지 정보를 가져오는 중...")
    air = fetch_air_quality()

    report = build_report(weather, air)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(report + "\n")

    print(f"저장 완료 → {OUTPUT_FILE}")
    print()
    print(report)


if __name__ == "__main__":
    main()
