import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "推しが歌ってた - Vtuberカバー曲コレクション",
  description: "Vtuberがカバーした楽曲を一覧表示し、YouTubeとSpotifyで聴けるサイト",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <Header />
        <main className="main-content">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
