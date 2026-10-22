import { ArrowLeft, Banknote, CalendarDays, GraduationCap, Users } from "lucide-react";

const TABS = [
  { href: "/admin", label: "출결 관리", icon: CalendarDays },
  { href: "/admin/members", label: "회원 관리", icon: Users },
  { href: "/admin/cohorts", label: "기수 관리", icon: GraduationCap },
  { href: "/admin/fines", label: "벌금 관리", icon: Banknote },
] as const;

// Tabs across the top of every admin page, plus the way back to the calendar.
export default function AdminNav({ current }: { current: typeof TABS[number]["href"] }) {
  return <nav className="admin-nav" aria-label="관리자 메뉴">
    {TABS.map(({ href, label, icon: Icon }) => <a key={href} href={href} className={href === current ? "active" : ""} aria-current={href === current ? "page" : undefined}><Icon size={15} />{label}</a>)}
    <a href="/" className="admin-nav-calendar"><ArrowLeft size={15} />캘린더</a>
  </nav>;
}
