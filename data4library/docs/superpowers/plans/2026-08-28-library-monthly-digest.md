# 도서관 월간 트렌드 요약봇 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 정보나루(data4library) MCP로 이달의 트렌드 키워드와 전국 인기 대출 도서 TOP 10을 매달 자동으로 요약해, 보관용 마크다운 파일과 대시보드 Artifact로 남긴다.

**Architecture:** 커스텀 코드 없이 프로젝트 스킬(`SKILL.md`) 하나가 MCP 도구 호출 순서와 출력 형식을 지시하고, Claude가 그 절차를 그대로 실행한다. 수동 실행으로 검증한 뒤, `schedule` 스킬로 매월 1일 같은 절차를 자동 실행하도록 등록한다.

**Tech Stack:** Claude Code 프로젝트 스킬(Markdown), data4library MCP 도구, Artifact 도구, `schedule` 스킬. 별도 언어/프레임워크/의존성 없음.

**Spec:** [docs/superpowers/specs/2026-08-28-library-monthly-digest-design.md](../specs/2026-08-28-library-monthly-digest-design.md)

## Global Constraints

- 인기 대출 도서는 **전국 전체 기준, TOP 10**만 조회한다.
- `get_book_keywords`는 TOP 10 중 **상위 5권에만** 호출한다.
- MCP 도구 호출 실패 시 **재시도하지 않고**, 어떤 도구가 왜 실패했는지 그대로 보고하며 중단한다.
- 트렌드 키워드/인기 도서 결과가 **모두 비어 있으면** 파일도 Artifact도 만들지 않는다.
- 마크다운 보관 파일 경로: `data4library/digests/{YYYY}-{MM}.md` (매달 새 파일).
- 대시보드는 **같은 Artifact URL로 재발행**하며, `label`에 `"{YYYY}-{MM}"`을 지정한다.
- 재발행에 쓸 URL은 `data4library/digests/.dashboard-url`에 저장해 세션 간 영속화한다.
- 커스텀 파싱/렌더링 코드를 작성하지 않는다 — MCP 호출과 텍스트/HTML 종합은 Claude가 스킬 지침을 따라 직접 수행한다.
- data4library MCP 연결/인증키는 이 작업의 범위 밖이다. 연결이 확인되지 않으면 추측하지 않고 중단한다.

---

### Task 1: `library-monthly-digest` 프로젝트 스킬 작성

**Files:**
- Create: `.claude/skills/library-monthly-digest/SKILL.md`

**Interfaces:**
- Produces: 스킬 이름 `library-monthly-digest` — Task 2에서 이 이름으로 스킬을 호출해 수동 검증한다. 스킬은 실행 시 `data4library/digests/{YYYY}-{MM}.md` 파일과 `data4library/digests/.dashboard-url` 파일을 만들어낸다(둘 다 Task 2가 검증 대상으로 사용).

- [ ] **Step 1: SKILL.md 작성**

다음 내용 그대로 `.claude/skills/library-monthly-digest/SKILL.md`에 작성한다:

````markdown
---
name: library-monthly-digest
description: 정보나루(data4library) MCP로 이달의 트렌드 키워드와 전국 인기 대출 도서 TOP 10을 조회해 마크다운 파일과 대시보드 Artifact로 요약한다. "도서관 요약", "이달의 도서 트렌드", "library-monthly-digest" 요청 시 사용.
---

# 도서관 월간 트렌드 요약봇

## 목적

정보나루 MCP에서 이달의 트렌드 키워드와 전국 인기 대출 도서 TOP 10을 가져와 요약하고, 보관용 마크다운 파일(`data4library/digests/{YYYY}-{MM}.md`)과 대시보드 Artifact로 남긴다. 완전히 읽기 전용. 실패 시 재시도하지 않고 즉시 원인을 보고한다.

## 사전 확인

1. 정보나루 MCP 도구가 연결되어 있는지 확인한다. 연결된 MCP 도구 중 "이달의 트렌드 키워드", "인기 대출 도서", `get_book_keywords`에 해당하는 도구를 찾는다.
2. 하나라도 찾을 수 없으면 **여기서 중단**하고 사용자에게 "정보나루 MCP가 연결되어 있지 않습니다. Claude Code MCP 설정에서 data4library MCP를 추가하고 인증키를 등록해주세요"라고 보고한다. 추측으로 진행하지 않는다.

## 절차

1. 이번 달(YYYY년 M월) **이달의 트렌드 키워드** MCP 도구를 호출한다.
   - 실패 시: 어떤 도구가 어떤 오류로 실패했는지 그대로 보고하고 중단한다.
   - 결과가 비어 있으면: "이번 달 트렌드 키워드 데이터 없음"으로 기록하고 다음 단계로 진행한다.

2. **인기 대출 도서 조회** MCP 도구를 전국 전체 기준, TOP 10으로 호출한다.
   - 실패 시: 어떤 도구가 어떤 오류로 실패했는지 그대로 보고하고 중단한다.
   - 결과가 비어 있으면: "이번 달 인기 대출 도서 데이터 없음"으로 기록한다.

3. 2번 결과의 **상위 5권에 대해서만** `get_book_keywords`를 호출해 각 도서의 핵심 키워드를 가져온다 (6~10위는 호출하지 않음 — API 절약).
   - 개별 도서 조회 실패 시: 해당 도서만 "키워드 조회 실패"로 표시하고 나머지는 계속 진행한다 (전체 중단 아님 — 보조 정보이기 때문).

4. **1번과 2번 결과가 모두 비어 있으면** — 파일도 Artifact도 만들지 않고 "이번 달 데이터 없음"만 보고하고 종료한다.

5. 아래 형식으로 마크다운을 종합한다:

```markdown
# 도서관 트렌드 요약 — {YYYY}년 {M}월

## 이달의 트렌드 키워드
{키워드1, 키워드2, 키워드3 ...}

## 인기 대출 도서 TOP 10
1. {책제목} — {저자} (대출 {N}회)
2. ...
...
10. ...

## TOP 5 핵심 키워드
1. {책제목}: {키워드A, 키워드B}
...
5. ...
```

6. `data4library/digests/{YYYY}-{MM}.md`로 저장한다 (폴더가 없으면 생성). 같은 내용을 터미널에도 출력한다.

7. **대시보드 Artifact 발행**:
   - `data4library/digests/.dashboard-url` 파일이 존재하는지 확인한다.
     - **있으면**: 그 안의 URL을 읽어 `Artifact` 도구에 `url` 파라미터로 지정해 **재발행**한다. `label`은 `"{YYYY}-{MM}"`으로 지정한다.
     - **없으면**: `url` 없이 새로 발행하고, 결과로 받은 URL을 `data4library/digests/.dashboard-url`에 저장한다. `label`은 `"{YYYY}-{MM}"`으로 지정한다.
   - 대시보드에는 최소한 다음을 포함한다: 이달의 트렌드 키워드(카드/태그), 인기 대출 도서 TOP 10(순위·제목·저자·대출횟수 리스트), TOP 5 핵심 키워드(태그).
   - Artifact를 처음 작성하기 전에 `artifact-design` 스킬을 먼저 로드한다 (Artifact 도구 사용 규칙).

## 출력 요약

완료 후 사용자에게 다음을 보고한다: 저장된 마크다운 파일 경로, 대시보드 Artifact URL, 이번 실행에서 실패/스킵된 항목(있다면).
````

- [ ] **Step 2: 필수 섹션 포함 여부 확인**

Run:
```bash
grep -c -E "트렌드 키워드|인기 대출 도서|get_book_keywords|dashboard-url|digests/\{YYYY\}" .claude/skills/library-monthly-digest/SKILL.md
```
Expected: `5` (다섯 패턴 모두 최소 한 번씩 등장)

- [ ] **Step 3: 커밋**

```bash
git add .claude/skills/library-monthly-digest/SKILL.md
git commit -m "feat: add library-monthly-digest skill"
```

---

### Task 2: 수동 실행으로 동작 검증

**Files:**
- Create (실행 결과로 생성됨): `data4library/digests/{YYYY}-{MM}.md`, `data4library/digests/.dashboard-url`

**Interfaces:**
- Consumes: Task 1에서 만든 `library-monthly-digest` 스킬
- Produces: 검증된 마크다운 파일과 `.dashboard-url` — Task 3(스케줄 등록)이 "이미 정상 동작 확인됨"을 전제로 진행

- [ ] **Step 1: data4library MCP 연결 확인**

연결된 MCP 도구 목록에서 "이달의 트렌드 키워드", "인기 대출 도서 조회", `get_book_keywords`에 해당하는 도구가 보이는지 확인한다.

Expected: 세 가지 모두 확인됨. **하나라도 없으면 여기서 멈추고 사용자에게 MCP 연결/인증키 설정을 요청한다 — 추측으로 다음 단계를 진행하지 않는다.**

- [ ] **Step 2: 스킬 수동 실행**

`library-monthly-digest` 스킬을 호출해 절차를 그대로 수행한다 (Skill 도구로 `skill: library-monthly-digest` 호출).

- [ ] **Step 3: 마크다운 파일 확인**

Run:
```bash
cat data4library/digests/*.md
```
Expected: Task 1의 SKILL.md에 정의된 형식(트렌드 키워드 / TOP 10 / TOP 5 키워드 3개 섹션)대로 실제 데이터가 채워져 있음. `{YYYY}` 같은 플레이스홀더 문자열이 그대로 남아있지 않아야 한다.

- [ ] **Step 4: 대시보드 Artifact 및 URL 저장 파일 확인**

Run:
```bash
cat data4library/digests/.dashboard-url
```
Expected: `https://`로 시작하는 유효한 Artifact URL 한 줄. 이 URL을 브라우저로 열어 트렌드 키워드/TOP 10/TOP 5 키워드가 대시보드에 시각적으로 표시되는지 눈으로 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add data4library/digests/
git commit -m "chore: record first library-monthly-digest run output"
```

---

### Task 3: 매월 1일 자동 실행 등록

**Files:**
- 없음 (코드 변경 없이 `schedule` 스킬로 크론 작업만 등록)

**Interfaces:**
- Consumes: Task 2에서 검증 완료된 `library-monthly-digest` 스킬
- Produces: 매월 1일 자동 실행되는 스케줄 작업 (schedule 스킬의 등록 목록에서 이름으로 확인 가능)

- [ ] **Step 1: schedule 스킬로 등록**

`schedule` 스킬을 사용해 다음 내용으로 매월 1일 실행되는 작업을 등록한다:
- 실행 프롬프트: `library-monthly-digest` 스킬 실행
- 주기: 매월 1일 (cron: `0 9 1 * *` 등 사용자가 원하는 시각으로— 정확한 실행 시각은 등록 시 사용자에게 확인)
- 실행 위치: 이 저장소(`data4library`) 디렉터리

- [ ] **Step 2: 등록 확인**

`schedule` 스킬(또는 해당 목록 조회 기능)로 등록된 작업 목록을 조회해 `library-monthly-digest` 관련 작업이 정상적으로 나타나는지 확인한다.

Expected: 등록된 작업 목록에 매월 1일 주기의 항목이 보임.

- [ ] **Step 3: 사용자에게 보고**

등록된 스케줄의 다음 실행 예정일과, 언제든 확인 가능한 대시보드 Artifact URL(`data4library/digests/.dashboard-url` 참고)을 사용자에게 안내한다.
