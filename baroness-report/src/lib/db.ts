import { Pool, types } from "pg";

// PostgreSQL의 timestamp(timezone 없는) 컬럼을 node-postgres가 기본적으로 JS Date로 파싱하면,
// 값을 "서버 프로세스의 로컬 타임존"으로 해석해서 내부적으로 UTC epoch로 바꿔버린다. 우리는
// SQL에서 이미 collect_datetime + timezone 만큼 보정한 "완성된 로컬 시각 문자열"을 그대로
// 내려주고 싶은데, Date로 파싱했다가 JSON으로 직렬화(toISOString)하는 과정에서 서버 로컬
// 타임존(운영/개발 환경 대부분 KST, UTC+9)만큼 또 변환이 걸려 SQL에서 더한 +9시간이 상쇄돼
// 버린다 — 그 결과 대시보드/목록에 표시되는 시간이 실제보다 9시간 느리게 나오는 버그가 있었다.
// 타임스탬프를 Date로 바꾸지 않고 Postgres가 계산한 문자열 그대로 돌려주면 이 문제가 사라진다.
types.setTypeParser(types.builtins.TIMESTAMP, (val) => val);

declare global {
  var __baronessDbPool: Pool | undefined;
}

function createPool(): Pool {
  return new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });
}

// standalone 보고서는 유휴 시 종료·재시작될 수 있으므로, 재시작 후에도
// 같은 프로세스 안에서는 풀을 재사용하되 매 요청마다 새로 만들지 않는다.
export function getPool(): Pool {
  if (!global.__baronessDbPool) {
    global.__baronessDbPool = createPool();
  }
  return global.__baronessDbPool;
}
