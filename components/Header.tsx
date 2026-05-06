'use client';

import Link from 'next/link';
import { usePlaylistStore } from '@/lib/store';
import { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import './Header.css';

export default function Header() {
    const { playlist } = usePlaylistStore();
    const [mounted, setMounted] = useState(false);
    const { data: session } = useSession();

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
                            <Link href="/spotify" className="nav-link spotify-stats-link">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="nav-spotify-icon">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                </svg>
                                Spotify Stats
                            </Link>
                        </nav>
                        <div className="auth-placeholder"></div>
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
                        <Link href="/spotify" className="nav-link spotify-stats-link">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="nav-spotify-icon">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            Spotify Stats
                        </Link>
                    </nav>

                    <div className="header-auth">
                        {session ? (
                            <div className="user-profile">
                                {session.user?.image && (
                                    <img 
                                        src={session.user.image} 
                                        alt={session.user.name || ''} 
                                        className="user-avatar" 
                                    />
                                )}
                                <span className="user-name">{session.user?.name}</span>
                                <button onClick={() => signOut()} className="logout-btn">
                                    ログアウト
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => signIn('spotify')} className="login-btn">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="login-btn-icon">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                </svg>
                                ログイン
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
