#!/bin/bash
# cron에서 실행되는 래퍼 스크립트
# PATH가 제한된 cron 환경에서도 python3를 찾을 수 있도록 경로를 직접 지정합니다.

PYTHON="/Library/Frameworks/Python.framework/Versions/3.12/bin/python3"
SCRIPT="/Users/euhyesun/Documents/study/claude-workspace/scripts/weather_fetch.py"
LOG="/Users/euhyesun/Documents/study/claude-workspace/scripts/weather.log"

echo "──────────────────────────────" >> "$LOG"
echo "실행 시각: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG"

"$PYTHON" "$SCRIPT" >> "$LOG" 2>&1

if [ $? -eq 0 ]; then
    echo "상태: 성공" >> "$LOG"
else
    echo "상태: 실패 (위 로그 확인)" >> "$LOG"
fi
