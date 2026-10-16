"use client";
import { createContext, useContext, useEffect, useState } from "react";
export type CurrentUser = { id: string | null; name: string; username: string; role: "member" | "admin"; mustChangePassword: boolean };
const AuthContext = createContext<{ user: CurrentUser | null; loading: boolean }>({ user: null, loading: true });
export function useAuth() { return useContext(AuthContext); }
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw Error();
      const result = await response.json() as { user: CurrentUser | null };
      setUser(result.user);
      if (!result.user && location.pathname !== "/login") location.replace(`/login?next=${encodeURIComponent(location.pathname)}`);
      else if (result.user?.mustChangePassword && !["/account", "/login"].includes(location.pathname)) location.replace("/account");
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}
