import type { Notice } from "@/types/dashboard";

function pickMessage(notice: Notice): string {
  // 한국어 사용자용 화면이므로 notice_korean을 최우선으로 사용한다 (CLAUDE.md: 사용 언어 한국어 우선).
  const candidateKeys = ["notice_korean", "message", "content", "title", "notice", "text"];
  for (const key of candidateKeys) {
    const value = notice[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  const firstString = Object.values(notice).find((v) => typeof v === "string" && v.trim());
  return (firstString as string) ?? "";
}

export default function NoticeBanner({ notices }: { notices: Notice[] }) {
  if (notices.length === 0) return null;

  return (
    <div className="rounded-xl bg-white shadow-sm px-6 py-4 flex items-center gap-4">
      <span className="font-bold text-gray-900 shrink-0">중요 공지</span>
      <span className="w-px self-stretch bg-gray-200" />
      <span className="text-gray-700 truncate">{pickMessage(notices[0])}</span>
    </div>
  );
}
