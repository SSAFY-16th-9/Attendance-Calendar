import { canonicalName, MEMBERS } from "./attendance.ts";

export const FINE_AMOUNT = 5000;
export const FINE_TYPES = ["임의지각", "임의결석"] as const;
export const FINE_STATUSES = ["unpaid", "paid", "waived"] as const;
export type FineStatus = typeof FINE_STATUSES[number];
export const STATUS_LABELS: Record<FineStatus, string> = { unpaid: "미납", paid: "납부 완료", waived: "부과 취소" };
export type Fine = { id: string; attendanceId: string; date: string; name: string; type: string; amount: number; status: FineStatus; paidAt: string | null; createdAt: string; updatedAt: string; revision: number };
export type FineCandidate = { id: string; date: string; name: string; type: string };
export type FineReport = { entries: Fine[]; summary: FineSummary; people: PersonFineSummary[]; total: number; page: number; pageSize: number };
export type FineSummary = { assessed: number; collected: number; outstanding: number; unpaidCount: number; paidCount: number; waivedCount: number };
export type PersonFineSummary = FineSummary & { name: string };
export const emptySummary: FineSummary = { assessed: 0, collected: 0, outstanding: 0, unpaidCount: 0, paidCount: 0, waivedCount: 0 };

export const isFineType = (type: string) => FINE_TYPES.includes(type as typeof FINE_TYPES[number]);
export const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;
export function validateFineStatus(input: unknown): { id: string; status: FineStatus; revision: number } | string {
  if (!input || typeof input !== "object") return "변경할 벌금 내역을 확인해 주세요.";
  const value = input as Record<string, unknown>;
  if (typeof value.id !== "string" || !/^[0-9a-f-]{36}$/.test(value.id)) return "변경할 내역을 확인해 주세요.";
  if (!FINE_STATUSES.includes(value.status as FineStatus)) return "납부 상태를 확인해 주세요.";
  if (!Number.isSafeInteger(value.revision) || (value.revision as number) < 0) return "내역을 새로고침한 뒤 다시 시도해 주세요.";
  return { id: value.id, status: value.status as FineStatus, revision: value.revision as number };
}

export function summarizeFines(entries: Pick<Fine, "amount" | "status">[]): FineSummary {
  const summary = { ...emptySummary };
  for (const entry of entries) {
    if (entry.status === "waived") { summary.waivedCount++; continue; }
    summary.assessed += entry.amount;
    if (entry.status === "paid") { summary.collected += entry.amount; summary.paidCount++; }
    else { summary.outstanding += entry.amount; summary.unpaidCount++; }
  }
  return summary;
}

export function summarizePeople(entries: Pick<Fine, "name" | "amount" | "status">[]): PersonFineSummary[] {
  return MEMBERS.map(name => ({ name, ...summarizeFines(entries.filter(entry => canonicalName(entry.name) === name)) }))
    .sort((a, b) => b.outstanding - a.outstanding || b.assessed - a.assessed || a.name.localeCompare(b.name, "ko"));
}
