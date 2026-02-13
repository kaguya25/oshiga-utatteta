
import fs from 'fs';
import path from 'path';

// Production Parser Logic (Copied from initial-fetch.ts / parser.ts)
function parseSongInfo(
    title: string,
    description: string = "",
    channelName: string = ""
): { songTitle: string | null; artistName: string | null } {
    // HTMLエンティティのデコード
    title = title.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    // パターン1: 【歌ってみた】曲名 / アーティスト名
    let match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)\s*[/／]\s*(.+?)(?:【|$)/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン9 (KMNZ style): 曲名 - アーティスト名 (Cover) / VTuber名
    // 例: COZMIC TRAVEL - SOUL'd OUT(Cover) / KMNZ LITA
    match = title.match(/^(.+?)\s*[-−]\s*(.+?)\s*[\(（]Cover[\)）]\s*[/／]/i);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン2: 曲名 / アーティスト名【歌ってみた】
    match = title.match(/^(.+?)\s*[/／]\s*(.+?)\s*【(?:歌ってみた|カバー|cover|COVER)】/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン3: 曲名 - アーティスト名 cover
    match = title.match(/^(.+?)\s*[-−]\s*(.+?)\s*(?:cover|カバー|COVER)/i);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン4: 【歌ってみた】曲名（アーティスト名）
    match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)(?:（|[(])(.+?)(?:）|[)])/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン5: 曲名（アーティスト名）【歌ってみた】
    match = title.match(/^(.+?)(?:（|[(])(.+?)(?:）|[)])\s*【(?:歌ってみた|カバー|cover|COVER)】/);
    if (match) {
        return { songTitle: match[1].trim(), artistName: match[2].trim() };
    }

    // パターン6: 【歌ってみた】曲名【VTuber名】（オリジナル曲の場合もあるため、慎重に）
    match = title.match(/【(?:歌ってみた|カバー|cover|COVER)】(.+?)【(.+?)】/);
    if (match) {
        // description check logic omitted for basic test, assuming fail for now or lenient
        // For test script, let's just log potential match
        return { songTitle: match[1].trim(), artistName: "Unknown (Pattern 6)" };
    }

    // パターン7: 曲名 / アーティスト名 (【】なし)
    match = title.match(/^(.+?)\s*[/／\-−]\s*(.+?)(?:\s*(?:歌ってみた|カバー|cover|COVER))?$/i);
    if (match) {
        let songTitle = match[1].trim();
        let artistName = match[2].trim();
        artistName = artistName.replace(/(?:歌ってみた|カバー|cover|COVER|\s*【.*】)$/i, '').trim();

        if (songTitle && artistName) {
            return { songTitle, artistName };
        }
    }

    // Pattern 8
    match = title.match(/(.+?)?『(.+?)』(?:.*(?:cover|COVER|カバー|歌ってみた))?/i);
    if (match) {
        return { songTitle: match[2].trim(), artistName: match[1] || "Unknown" };
    }

    return { songTitle: null, artistName: null };
}

function main() {
    const titlesPath = path.join(__dirname, '..', 'kmnz_titles.json');
    if (!fs.existsSync(titlesPath)) {
        console.error('kmnz_titles.json not found');
        return;
    }

    const titles = JSON.parse(fs.readFileSync(titlesPath, 'utf-8'));
    let successCount = 0;

    console.log(`Testing parser against ${titles.length} titles...`);

    const failures: string[] = [];
    titles.forEach((title: string) => {
        // Mock description/channel
        const res = parseSongInfo(title, "", "KMNZ");
        if (res.songTitle) {
            // console.log(`✅ [OK] ${title} -> ${res.songTitle} / ${res.artistName}`);
            successCount++;
        } else {
            console.log(`❌ [FAIL] ${title}`);
            failures.push(title);
        }
    });

    console.log(`\nResults: ${successCount} / ${titles.length} passed.`);
    fs.writeFileSync('kmnz_failures.txt', failures.join('\n'));
    console.log('Saved failures to kmnz_failures.txt');
}

main();
