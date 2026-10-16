export const MEMBERS = [
  "이주언", "황규진", "남윤혁", "최성현", "임장원", "박재성",
  "전현민", "이지호", "김세진", "고태호", "강유빈", "이승하",
  "박시은", "이지현", "이창준", "홍정현", "김별찬", "박은빈",
  "이하람", "이미지", "손창민", "정인아", "황인규", "조석래", "김승환",
] as const;

export const TYPES = ["공가", "사유지각", "사유조퇴", "사유결석", "임의지각", "임의조퇴", "임의결석"] as const;
export type AttendanceType = typeof TYPES[number];
export type AttendanceEntry = { id: string; date: string; name: string; type: AttendanceType; reason: string; createdAt: string; ownerId?: string | null; adminRecord?: number; unnotified?: boolean; fineId?: string | null; fineStatus?: string | null };

export const canonicalName = (name: string) => name === "이주연" ? "이주언" : name;
export const nameAliases = (name: string) => name === "이주언" ? ["이주언", "이주연"] : [name];

export function koreaToday() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function validateEntry(value: unknown): { date: string; name: string; type: AttendanceType; reason: string } | string {
  if (!value || typeof value !== "object") return "등록할 내용을 확인해 주세요.";
  const input = value as Record<string, unknown>;
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return "날짜를 선택해 주세요.";
  const date = new Date(`${input.date}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input.date || input.date < "2000-01-01" || input.date > "2100-12-31") return "올바른 날짜를 선택해 주세요.";
  if (!MEMBERS.includes(input.name as typeof MEMBERS[number])) return "반 명단에서 이름을 선택해 주세요.";
  if (!TYPES.includes(input.type as AttendanceType)) return "출결 사유를 선택해 주세요.";
  if (input.reason != null && typeof input.reason !== "string") return "상세 이유는 글자로 입력해 주세요.";
  const reason = (input.reason as string || "").trim();
  if (reason.length > 500) return "상세 이유는 500자까지 입력할 수 있어요.";
  return { date: input.date, name: input.name as string, type: input.type as AttendanceType, reason };
}
