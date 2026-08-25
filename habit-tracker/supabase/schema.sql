create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  color text not null check (color ~* '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index if not exists idx_habit_logs_habit_id on habit_logs(habit_id);
create index if not exists idx_habit_logs_log_date on habit_logs(log_date);

alter table habits enable row level security;
alter table habit_logs enable row level security;

-- 로그인 없는 anon-key 공개 접근 정책 (guestbook과 동일한 신뢰 모델).
-- anon key를 가진 누구나 읽기/쓰기 가능 — 로컬 전용 개인 도구 단계에서만 허용.
-- 나중에 공개 배포 시엔 Supabase Auth로 전환 검토 필요.
create policy "public read habits" on habits for select using (true);
create policy "public write habits" on habits for insert with check (true);
create policy "public update habits" on habits for update using (true);
create policy "public delete habits" on habits for delete using (true);

create policy "public read habit_logs" on habit_logs for select using (true);
create policy "public write habit_logs" on habit_logs for insert with check (true);
create policy "public delete habit_logs" on habit_logs for delete using (true);
