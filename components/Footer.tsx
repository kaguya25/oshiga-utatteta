import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <ul className="footer-links">
                        <li>
                            <a
                                href="https://www.youtube.com/t/terms"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                YouTube 利用規約
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://policies.google.com/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Google プライバシーポリシー
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://www.spotify.com/legal/end-user-agreement/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Spotify 利用規約
                            </a>
                        </li>
                    </ul>
                    <p className="footer-disclaimer">
                        本サイトはYouTube APIサービスを利用しています。利用にあたり、ユーザーは
                        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube利用規約</a>
                        に同意したものとみなされます。動画・楽曲の著作権は各権利者に帰属します。
                    </p>
                    <p className="footer-copyright">
                        &copy; {new Date().getFullYear()} 推しが歌ってた
                    </p>
                </div>
            </div>
        </footer>
    );
}
