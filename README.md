# claude-workspace

sun의 Claude Code 작업 공간입니다.

---

## 폴더 구조

```
claude-workspace/
│
├── README.md              # 이 파일 — 전체 구조 안내
├── CLAUDE.md              # Claude Code 행동 규칙 (보안·소통·작업 원칙)
├── SECURITY.md            # 키 노출 비상 대응 매뉴얼
│
├── .env / .env.local      # API 키·환경변수 (git 제외, 직접 입력 필요)
├── .gitignore             # git에서 제외할 파일 목록
│
├── .claude/
│   ├── launch.json        # 프로젝트별 dev 서버 실행 설정
│   └── skills/
│       └── SKILLS.md      # 재사용 가능한 작업 절차(스킬) 인덱스
│
├── habit-tracker/          # React + Vite + Supabase 습관 추적 앱
├── baroness-report/         # Baroness 데이터 조회용 Next.js 대시보드
├── baroness-docs/           # baroness-report 참고 문서 (점검 가이드, 테이블 정의서, 화면 기획 등)
├── awesome-claude-skills-master/  # 참고용 Claude Skills 모음 (외부 저장소)
│
├── docs/
│   ├── resume.pdf         # 이력서
│   └── sales.csv          # 매출 데이터
│
├── cowork/
│
└── tasks/
    ├── todo.md            # 오늘 할 일 체크리스트
    └── progress.md        # 완료 작업 기록 (append-only)
```

---

## 파일/폴더별 설명

| 파일/폴더 | 용도 | 수정 주체 |
|-----------|------|-----------|
| `CLAUDE.md` | Claude Code가 지켜야 할 규칙 모음 | 나 (직접) |
| `SECURITY.md` | 키 노출 시 대응 순서 안내 | Claude Code |
| `.env` / `.env.local` | 실제 API 키 보관 (절대 공유 금지) | 나 (직접) |
| `.gitignore` | 민감 파일 git 차단 목록 | Claude Code |
| `.claude/launch.json` | 프로젝트별 dev 서버 실행 설정 | Claude Code |
| `.claude/skills/` | 재사용 가능한 작업 절차 모음 | Claude Code |
| `habit-tracker/` | 습관 추적 앱 프로젝트 | Claude Code + 나 |
| `baroness-report/` | Baroness 대시보드 프로젝트 | Claude Code + 나 |
| `baroness-docs/` | baroness-report 참고 업무 문서 | 나 (직접) |
| `awesome-claude-skills-master/` | 외부 스킬 참고 자료 | 참고용 (수정 안 함) |
| `docs/` | 이력서, 데이터 파일 보관 | 나 (직접) |
| `tasks/todo.md` | 작업 시작 전 확인하는 할 일 목록 | Claude Code + 나 |
| `tasks/progress.md` | 완료된 작업 기록, 삭제 금지 | Claude Code |

---

## 사용 방법

### 새 작업 시작할 때
1. `tasks/todo.md` 열어서 할 일 확인·추가
2. Claude Code에게 작업 요청
3. 작업 완료 후 `tasks/progress.md`에 기록

### 프로젝트 dev 서버 실행할 때
`.claude/launch.json`에 등록된 이름으로 실행 (예: `habit-tracker`, `baroness-report`)

### API 키 등록할 때
```bash
nano .env   # 값을 직접 입력하고 저장
```

### 키가 노출됐을 때
→ Claude Code에게 **"키 노출 의심"** 이라고 말하면 `SECURITY.md` 순서로 안내받을 수 있습니다.

---

## 보안 주의사항

- `.env`, `.env.local` 파일은 **절대 git에 올리지 않습니다** (`.gitignore`로 차단)
- API 키는 코드에 직접 쓰지 않고 항상 환경변수로 참조합니다
- SSH 키(`*.key`, `*.pem`)도 git 차단 대상입니다
