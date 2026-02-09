export default function NotFound() {
    return (
        <div className="page-container">
            <div className="container">
                <div className="empty-state" style={{ minHeight: '60vh' }}>
                    <div className="empty-icon">
                        <svg
                            width="64"
                            height="64"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '2rem' }}>カバー曲が見つかりませんでした</h3>
                    <p>指定されたカバー曲は存在しないか、削除された可能性があります。</p>
                    <a href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        ホームに戻る
                    </a>
                </div>
            </div>
        </div>
    );
}
