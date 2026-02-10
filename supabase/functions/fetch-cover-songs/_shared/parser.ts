/**
 * 動画タイトルから楽曲名とアーティスト名を抽出する
 */
export function parseSongInfo(
    title: string,
    description: string = ""
): { songTitle: string | null; artistName: string | null } {
    // パターン1: 【歌ってみた】曲名 / アーティスト名
    let match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)\s*[/／]\s*(.+?)(?:【|$)/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン2: 曲名 / アーティスト【歌ってみた】
    match = title.match(/^(.+?)\s*[/／]\s*(.+?)\s*【(?:歌ってみた|カバー|cover|COVER)】/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン3: 曲名 - アーティスト cover
    match = title.match(/^(.+?)\s*[-−]\s*(.+?)\s*(?:cover|カバー|COVER)/i);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン4: 【カバー】曲名（アーティスト名）
    match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)(?:（|[(])(.+?)(?:）|[)])/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン5: 曲名（アーティスト名）【歌ってみた】
    match = title.match(/^(.+?)(?:（|[(])(.+?)(?:）|[)])\s*【(?:歌ってみた|カバー|cover|COVER)】/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン6: タイトルに / や - が含まれる場合、前半を曲名、後半をアーティスト名と推測
    match = title.match(/^(.+?)\s*[/／-−]\s*(.+?)(?:\s*(?:歌ってみた|カバー|cover|COVER))?$/i);
    if (match) {
        const songTitle = match[1].trim();
        let artistName = match[2].trim();
        // 後半から「歌ってみた」などのキーワードを除去
        artistName = artistName.replace(/(?:歌ってみた|カバー|cover|COVER|\s*【.*】)$/i, '').trim();
        if (songTitle && artistName) {
            return { songTitle, artistName };
        }
    }

    // 抽出できない場合は説明欄もチェック（将来的に実装）
    // TODO: 説明欄から楽曲情報を抽出するロジックを追加

    return { songTitle: null, artistName: null };
}

/**
 * タイトルがカバー曲かどうかを判定する
 */
export function isCoverSong(title: string): boolean {
    const coverKeywords = ['歌ってみた', 'カバー', 'COVER', 'cover', 'Cover'];
    return coverKeywords.some(keyword => title.includes(keyword));
}

/**
 * 文字列を正規化（Spotifyマッチング用）
 */
export function normalizeString(str: string): string {
    return str
        .replace(/\s*[\(（].*?[\)）]\s*/g, '') // かっこ内を削除
        .replace(/[～〜]/g, '-') // 波ダッシュをハイフンに
        .replace(/[!！]/g, '') // 感嘆符を削除
        .replace(/[?？]/g, '') // 疑問符を削除
        .replace(/\s+/g, ' ') // 複数空白を1つに
        .trim();
}
