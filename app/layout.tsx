import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "推しが歌ってた - カバー曲コレクション",
  description: "推しのアーティストがカバーした楽曲を一覧表示し、YouTubeとSpotifyで聴けるサイト",
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
        <Footer />
      </body>
    </html>
  );
}


