import Link from 'next/link';
import './Header.css';

export default function Header() {
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
                        <Link href="/playlist" className="nav-link">
                            プレイリスト
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
