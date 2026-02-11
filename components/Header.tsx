'use client';

import Link from 'next/link';
import { usePlaylistStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import './Header.css';

export default function Header() {
    const { playlist } = usePlaylistStore();
    const [mounted, setMounted] = useState(false);

    // Hydration mismatch回避のため、マウント後に表示
    useEffect(() => {
        setMounted(true);
    }, []);

    // マウント前はプレースホルダー的なヘッダーを返す（または何も返さない）
    // ここではレイアウトシフトを防ぐために静的なヘッダーを返すのが理想
    if (!mounted) {
        return (
            <header className="header">
                <div className="container">
                    <div className="header-content">
                        <Link href="/" className="logo">
                            <h1 className="logo-text">推しが歌ってた</h1>
                        </Link>
                        <nav className="nav">
                            <Link href="/" className="nav-link">ホーム</Link>
                            <Link href="/playlist" className="nav-link">プレイリスト</Link>
                        </nav>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className="header">
            <div className="container">
                <div className="header-content">
                    <Link href="/" className="logo">
                        <h1 className="logo-text">推しが歌ってた</h1>
                    </Link>

                    <nav className="nav">
                        <Link href="/" className="nav-link">
                            ホーム
                        </Link>
                        <Link href="/playlist" className="nav-link playlist-link">
                            プレイリスト
                            <span className={`playlist-badge ${playlist.length > 0 ? 'visible' : ''}`}>
                                {playlist.length}
                            </span>
                        </Link>
                        {/* TODO: 認証機能実装後に有効化 */}
                        {/* <Link href="/my-favorites" className="nav-link">
              お気に入り
            </Link>
            <button className="btn btn-primary btn-sm">
              ログイン
            </button> */}
                    </nav>
                </div>
            </div>
        </header>
    );
}
