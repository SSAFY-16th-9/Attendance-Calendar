"use client";
import { isCancelledFine } from "@/lib/attendance";
import { Fine, FineStatus } from "@/lib/fines";

// Status buttons for one fine, shared by the ledger table and the 개인별 내역 popup.
export default function FineRowActions({ entry, onAction }: { entry: Fine; onAction: (entry: Fine, status: FineStatus) => void }) {
  const label = `${entry.name} ${entry.date}`;
  return <div className="fine-row-actions">
    {entry.status === "unpaid" && <button onClick={() => onAction(entry, "paid")} aria-label={`${label} 납부 확인`}>납부 확인</button>}
    {entry.status === "paid" && <button onClick={() => onAction(entry, "unpaid")} aria-label={`${label} 미납으로 변경`}>미납 변경</button>}
    {isCancelledFine(entry.status)
      ? <button onClick={() => onAction(entry, "unpaid")} aria-label={`${label} 부과 복원`}>부과 복원</button>
      : <button className="fine-cancel-action" onClick={() => onAction(entry, "waived")} aria-label={`${label} 벌금 취소`}>부과 취소</button>}
  </div>;
}
