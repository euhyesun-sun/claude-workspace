# claude-workspace

sun의 Claude Code 작업 공간입니다.

---

## 폴더 구조

```
claude-workspace/
│
├── README.md          # 이 파일 — 전체 구조 안내
├── CLAUDE.md          # Claude Code 행동 규칙 (보안·소통·작업 원칙)
├── SECURITY.md        # 키 노출 비상 대응 매뉴얼
│
├── .env               # API 키·환경변수 (git 제외, 직접 입력 필요)
├── .gitignore         # git에서 제외할 파일 목록
│
├── docs/
│   ├── resume.pdf     # 이력서
│   └── sales.csv      # 매출 데이터
│
├── scripts/
│   ├── weather_fetch.py   # 날씨 데이터 수집 스크립트
│   └── run_weather.sh     # 날씨 스크립트 실행 래퍼
│
├── tasks/
│   ├── todo.md        # 오늘 할 일 체크리스트
│   └── progress.md    # 완료 작업 기록 (append-only)
│
├── portfolio.html     # 포트폴리오 페이지
└── weather.txt        # 날씨 수집 결과
```

---

## 파일별 설명

| 파일/폴더 | 용도 | 수정 주체 |
|-----------|------|-----------|
| `CLAUDE.md` | Claude Code가 지켜야 할 규칙 모음 | 나 (직접) |
| `SECURITY.md` | 키 노출 시 대응 순서 안내 | Claude Code |
| `.env` | 실제 API 키 보관 (절대 공유 금지) | 나 (직접) |
| `.gitignore` | 민감 파일 git 차단 목록 | Claude Code |
| `docs/` | 이력서, 데이터 파일 보관 | 나 (직접) |
| `scripts/` | 자동화 스크립트 모음 | Claude Code + 나 |
| `tasks/todo.md` | 작업 시작 전 확인하는 할 일 목록 | Claude Code + 나 |
| `tasks/progress.md` | 완료된 작업 기록, 삭제 금지 | Claude Code |
| `portfolio.html` | 포트폴리오 웹페이지 | Claude Code + 나 |
| `weather.txt` | 날씨 API 수집 결과 | Claude Code |

---

## 사용 방법

### 새 작업 시작할 때
1. `tasks/todo.md` 열어서 할 일 확인·추가
2. Claude Code에게 작업 요청
3. 작업 완료 후 `tasks/progress.md`에 기록

### API 키 등록할 때
```bash
nano .env   # 값을 직접 입력하고 저장
```

### 키가 노출됐을 때
→ Claude Code에게 **"키 노출 의심"** 이라고 말하면 `SECURITY.md` 순서로 안내받을 수 있습니다.

---

## 보안 주의사항

- `.env` 파일은 **절대 git에 올리지 않습니다** (`.gitignore`로 차단)
- API 키는 코드에 직접 쓰지 않고 항상 환경변수로 참조합니다
- SSH 키(`*.key`, `*.pem`)도 git 차단 대상입니다
