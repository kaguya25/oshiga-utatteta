# セキュリティ・コンプライアンスチェック 監査レポート

**対象**: 推しが歌ってた（oshiga-utatteta）
**診断日**: 2026-02-15
**診断範囲**: ソースコード全体、依存パッケージ、外部API連携、デプロイ構成

---

## 診断結果サマリ

| 区分 | 重大 | 中 | 軽微 | 情報 |
|------|------|-----|------|------|
| セキュリティ | 0 | 2 | 2 | 1 |
| API規約 | 0 | 1 | 2 | 0 |
| 法律 | 0 | 0 | 1 | 2 |
| **合計** | **0** | **3** | **5** | **3** |

---

## 1. セキュリティ診断

### [中] SEC-01: YouTube動画IDの未検証（iframeインジェクション）

**対象ファイル**: `components/YouTubePlayer.tsx`（L11）、`components/SpotifyPlayer.tsx`（L11）

**概要**: `videoId` / `trackId` をそのまま iframe の `src` に埋め込んでいる。Supabase の DB から取得した値が渡されるためリスクは低いが、万が一DB側に不正なデータが混入した場合、任意URLをiframeに読み込まれる可能性がある。

```tsx
// 現状
src={`https://www.youtube.com/embed/${videoId}`}
```

**推奨対策**: IDのバリデーション（正規表現で英数字・ハイフン・アンダースコアのみ許可）を追加する。

```tsx
const sanitizedId = videoId.replace(/[^a-zA-Z0-9_-]/g, '');
```

**リスク評価**: 中（DB経由のため直接的な攻撃は困難だが、防御の多層化として対応推奨）

---

### [中] SEC-02: Cron API RouteのRate Limiting未実装

**対象ファイル**: `app/api/cron/fetch-cover-songs/route.ts`

**概要**: Bearer Token認証はあるが、Rate Limitingが未実装。トークンが漏洩した場合、大量リクエストでYouTube APIクォータを消費される、またはSupabaseへの過剰な書き込みが発生する可能性がある。

**推奨対策**:

- Vercel の Edge Config や KV を使ったRate Limitingの実装
- または `maxDuration` に加え、直近の実行時刻をDBに記録し、間隔チェックを追加

**リスク評価**: 中（トークン漏洩が前提だが、影響が大きい）

---

### [軽微] SEC-03: フロントエンドで全データをフェッチ

**対象ファイル**: `app/page.tsx`（L20-23）

**概要**: `supabase.from('cover_songs').select('*')` で全カバー曲を一括取得している。データ量が増加した場合、パフォーマンス低下やメモリ圧迫が発生する。また全データがクライアントに露出する。

**推奨対策**: ページネーションの実装（`.range(start, end)`）

**リスク評価**: 軽微（現状のデータ量では問題なし。将来的な対応推奨）

---

### [軽微] SEC-04: セキュリティヘッダーの未設定

**対象ファイル**: `next.config.ts`

**概要**: `Content-Security-Policy`、`X-Frame-Options`、`X-Content-Type-Options` などのセキュリティヘッダーが未設定。Vercelのデフォルト設定に依存している状態。

**推奨対策**: `next.config.ts` で `headers()` を設定。特にiframe元を `youtube.com` と `spotify.com` に限定する CSP を推奨。

```ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
```

**リスク評価**: 軽微（Vercelのデフォルト保護があるため即座のリスクは低い）

---

### [情報] SEC-05: 環境変数管理は適切

**確認結果**:

- `.gitignore` で `.env*` が除外されている → **OK**
- GitHub Actions は `secrets.CRON_URL` / `secrets.CRON_SECRET` を使用 → **OK**
- フロントエンドは `NEXT_PUBLIC_` プレフィックスの Supabase URL / Anon Key のみ公開 → **OK**（Anon Key は RLS で保護されるため問題なし）
- Service Role Key はサーバーサイドのみで使用 → **OK**

---

## 2. API 規約チェック

### [中] TOS-01: YouTube API利用規約への準拠が不十分

**概要**: YouTube API Services Terms of Service では、API クライアントに以下を求めている。

**未対応の項目**:

1. YouTube の利用規約へのリンクをサイトに表示する義務
2. 自サイトの利用規約で「YouTube の利用規約に同意する旨」を明記する義務
3. プライバシーポリシーの掲示義務（YouTube API 経由のデータ取得がある場合）

**参照**: [YouTube API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service)

**推奨対策**: フッターに以下を追加。

- YouTube 利用規約へのリンク
- Google プライバシーポリシーへのリンク
- 自サイトの利用規約ページの作成

**リスク評価**: 中（違反状態。対応しないとAPIキーの失効リスクあり）

---

### [軽微] TOS-02: Spotify 埋め込みプレイヤーの商用利用制限

**概要**: Spotify Widgets Terms では「Spotify Play Button は商用目的に使用してはならない」としている。ただし、広告を含むWebサイトでの使用は制限されていない。

**現状の評価**: 本アプリは非営利・広告なしで運用されており、現時点では規約違反に該当しない。ただし、将来的に広告を設置したり、有料化する場合は再確認が必要。

**リスク評価**: 軽微（現状問題なし）

---

### [軽微] TOS-03: YouTube 埋め込みプレイヤーの利用条件

**概要**: YouTube の埋め込みプレイヤーの利用は許可されている。ただし以下の条件がある。

- サイトが「主としてYouTubeの動画コンテンツで構成される」場合は広告収入を得てはならない
- 動画の視聴にユーザー登録や課金を要求してはならない

**現状の評価**: 本アプリはカバー曲のメタデータ管理が主目的であり、YouTube 動画の単なるアグリゲーションではない。視聴は無料・登録不要。現時点で規約準拠。

**リスク評価**: 軽微（現状問題なし）

---

## 3. 法律チェック

### [軽微] LAW-01: プライバシーポリシーの未掲示

**概要**: Vercel Analytics を導入しており、ユーザーのアクセスデータ（IPアドレス等）を収集している。個人情報保護法上、プライバシーポリシーの掲示が推奨される。

また、YouTube API の利用規約上もプライバシーポリシーの掲示が義務付けられている（TOS-01と関連）。

**推奨対策**: プライバシーポリシーページの作成。記載内容:

- 収集するデータの種類（Vercel Analytics によるアクセスログ）
- データの利用目的
- 第三者への提供有無
- Google プライバシーポリシーへのリンク

**リスク評価**: 軽微（個人を特定するデータは収集していないが、対応推奨）

---

### [情報] LAW-02: 著作権法上の整理

**概要**: 本アプリの著作権法上のポジション整理。

| 要素 | 判定 | 根拠 |
|------|------|------|
| YouTube 埋め込み再生 | 適法 | YouTube が公式に提供する埋め込み機能を使用。著作権法上、リンクや埋め込みは複製に該当しない |
| Spotify 埋め込み再生 | 適法 | Spotify が公式に提供する埋め込みウィジェットを使用 |
| メタデータの収集・表示 | 適法 | 動画タイトル、サムネイル等はYouTube APIの正規ルートで取得。APIの利用規約に従う限り問題なし |
| サムネイル画像の表示 | 注意 | YouTube 利用規約で許可されているが、サムネイル自体の著作権はアップロード者に帰属。APIで取得した画像をそのまま表示する分には問題なし |

**結論**: 現状の実装は著作権法上問題なし。動画や楽曲の複製・ダウンロード機能は一切ないため、違法性はない。

---

### [情報] LAW-03: 特定商取引法

**概要**: 本アプリは非営利・無料で提供されており、物品・サービスの販売を行っていない。特定商取引法の適用対象外。

---

## 4. その他の発見事項

### SearchBar の placeholder に「Vtuber名」が残っている

**対象ファイル**: `components/SearchBar.tsx`（L11）

```tsx
placeholder = '曲名、Vtuber名、アーティスト名で検索...'
```

今回のVTuber表現修正の対象から漏れている。`曲名、チャンネル名、アーティスト名で検索...` に修正すべき。

---

## 対応優先度

| 優先度 | ID | 対応内容 |
|--------|-----|---------|
| 高 | TOS-01 | YouTube API 利用規約リンク・プライバシーポリシーの掲示 |
| 高 | LAW-01 | プライバシーポリシーページの作成 |
| 中 | SEC-01 | iframe ID のバリデーション追加 |
| 中 | SEC-02 | Cron API の Rate Limiting 検討 |
| 低 | SEC-03 | ページネーションの実装 |
| 低 | SEC-04 | セキュリティヘッダーの設定 |
| 即時 | - | SearchBar の placeholder 修正 |
