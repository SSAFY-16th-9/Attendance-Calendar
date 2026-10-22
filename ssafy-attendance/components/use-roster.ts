"use client";
import { useEffect, useState } from "react";
type Roster = { names: string[]; cohort: { id: string; name: string } | null };
// One request per page load, shared by the roster and class-label hooks.
let request: Promise<Roster> | null = null;
const loadRoster = () => request ??= fetch("/api/roster", { cache: "no-store" }).then(r => r.ok ? r.json() as Promise<Roster> : Promise.reject()).catch(() => ({ names: [], cohort: null }));
function useRosterData() {
  const [data, setData] = useState<Roster | null>(null);
  useEffect(() => { loadRoster().then(setData); }, []);
  return data;
}
// Live class roster from the members table; null until it loads.
export function useRoster() { return useRosterData()?.names ?? null; }
// The class being viewed: "16기 9반", "16기 · 9반" and the two-digit class number.
export function useClassInfo() {
  const cohort = useRosterData()?.cohort;
  return { name: cohort?.name ?? "", short: cohort?.name.replace(" ", " · ") ?? "", classNo: cohort ? (cohort.id.split("-")[1] || "").padStart(2, "0") : "" };
}
