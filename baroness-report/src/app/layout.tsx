import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baroness 대시보드",
  description: "골프장 잔디깎기 차량 모니터링 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
