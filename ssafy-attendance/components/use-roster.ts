"use client";
import { useEffect, useState } from "react";
// Live class roster from the members table; null until it loads.
export function useRoster() {
  const [names, setNames] = useState<string[] | null>(null);
  useEffect(() => { fetch("/api/roster", { cache: "no-store" }).then(r => r.ok ? r.json() as Promise<{ names: string[] }> : Promise.reject()).then(data => setNames(data.names)).catch(() => setNames([])); }, []);
  return names;
}
