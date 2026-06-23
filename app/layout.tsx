import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "営業管理ダッシュボード | 株式会社サードスコープ",
  description:
    "営業の行動量と成果を定量的に可視化し、AI考察とネクストアクションを提示するダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
