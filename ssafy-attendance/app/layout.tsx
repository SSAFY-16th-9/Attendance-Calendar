import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "출결 모아 | SSAFY 16기 9반",
  description: "우리 반의 하루를 함께 확인하는 SSAFY 16기 9반 출결 공유 캘린더",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased"><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
