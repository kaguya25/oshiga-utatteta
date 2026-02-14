'use client';

import Link from 'next/link';
import { usePlaylistStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import './Header.css';

export default function Header() {
    const { playlist } = usePlaylistStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
                    </nav>
                </div>
            </div>
        </header>
    );
}
