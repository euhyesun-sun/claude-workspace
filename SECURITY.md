# 보안 비상 매뉴얼

> 키가 노출됐다고 의심되면 이 순서대로 즉시 대응하세요.
> 패닉하지 말고 순서대로 차근차근.

---

## 1단계 — 노출된 키 확인

어떤 키가 노출됐는지 먼저 파악합니다.

| 서비스 | 키 위치 | 관리 페이지 |
|--------|---------|------------|
| OpenRouter | `.env` → `OPENROUTER_API_KEY` | https://openrouter.ai/keys |
| Oracle 서버 | `~/.ssh/oracle-server.key` | Oracle Cloud Console |
| WordPress | `.env` → `WP_DB_PASSWORD` | 서버 phpMyAdmin / DB |

---

## 2단계 — 즉시 폐기

### OpenRouter 키 폐기
1. https://openrouter.ai/keys 접속
2. 노출된 키 옆 **Delete** 클릭
3. 즉시 새 키 발급

### Oracle SSH 키 폐기
1. Oracle Cloud Console → Compute → 인스턴스 선택
2. SSH 키 관리에서 기존 키 제거
3. 새 키페어 생성: `ssh-keygen -t ed25519 -f ~/.ssh/oracle-server-new.key`
4. 새 공개키를 서버에 등록

### WordPress DB 비밀번호 변경
1. Oracle 서버 SSH 접속
2. `mysql -u root -p` 접속
3. `ALTER USER 'wp_user'@'localhost' IDENTIFIED BY '새비밀번호';`
4. `wp-config.php` 업데이트

---

## 3단계 — 환경변수 교체

```bash
# .env 파일 열어서 새 키로 교체
nano ~/Documents/study/claude-workspace/.env
```

교체 후 서비스 재시작:
```bash
# 예: Python 스크립트라면 프로세스 재시작
# 예: Node.js라면 pm2 restart all
```

---

## 4단계 — 사용 이력 확인

### OpenRouter 사용 이력
- https://openrouter.ai/activity 에서 최근 API 호출 확인
- 모르는 요청이 있으면 즉시 키 폐기 완료 확인

### Oracle 서버 접속 이력
```bash
ssh oracle-server 'last -20'          # 최근 로그인 목록
ssh oracle-server 'journalctl -n 50'  # 최근 시스템 로그
```

---

## 체크리스트

- [ ] 노출된 키 특정
- [ ] 기존 키 폐기
- [ ] 새 키 발급
- [ ] .env 업데이트
- [ ] 서비스 재시작 및 정상 동작 확인
- [ ] 사용 이력 확인 (이상 접근 없는지)
- [ ] 노출 경로 파악 및 재발 방지

---

> 혼자 대응하기 어려우면 Claude Code에게 "키 노출 의심"이라고 말하면 이 매뉴얼 순서로 안내해드립니다.
