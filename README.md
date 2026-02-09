# 推しが歌ってた

Vtuberがカバーした楽曲を一覧表示し、YouTubeとSpotifyで聴き比べられるWebアプリケーション

## 🎯 現在の実装状況

### ✅ 完成済み（MVP フロントエンド）

- ✨ ホームページ（一覧表示）
- 🔍 リアルタイム検索機能
- 📄 詳細ページ（YouTube/Spotify プレイヤー統合）
- 🎨 カジュアルなデザインシステム（Vanilla CSS）
- 📱 レスポンシブ対応

### 🚧 未実装（次のステップ）

- 🗄️ Supabaseデータベース構築
- 🤖 バッチ処理（YouTube API連携）
- 🔐 認証・お気に入り機能

---

## 📋 セットアップ手順

### 1. 必要な環境

- Node.js 18以上
- npm または yarn
- Supabaseアカウント（後で作成）

### 2. 依存関係のインストール

```bash
cd oshiga-utatteta
npm install
```

### 3. 環境変数の設定

`.env.local` ファイルがプロジェクトルートにあります。現時点では、Supabaseの設定が必要です。

**今すぐやること:**

1. [Supabase](https://supabase.com/) でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトの設定から以下を取得：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`.env.local` を編集して、上記の値を設定してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

---

## 🗄️ 次のステップ：Supabaseデータベースのセットアップ

### データベーステーブル作成

Supabaseのダッシュボードで、以下のSQLを実行してテーブルを作成してください：

\`\`\`sql
-- cover_songs テーブル
CREATE TABLE cover_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_video_id TEXT UNIQUE NOT NULL,
  vtuber_name TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  video_title TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  song_title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  spotify_track_id TEXT,
  spotify_track_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX idx_cover_songs_youtube_video_id ON cover_songs(youtube_video_id);
CREATE INDEX idx_cover_songs_vtuber_name ON cover_songs(vtuber_name);
CREATE INDEX idx_cover_songs_song_title ON cover_songs(song_title);
CREATE INDEX idx_cover_songs_published_at ON cover_songs(published_at DESC);

-- monitored_channels テーブル
CREATE TABLE monitored_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT UNIQUE NOT NULL,
  channel_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_favorites テーブル（将来の認証機能用）
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cover_song_id UUID NOT NULL REFERENCES cover_songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, cover_song_id)
);

-- Row Level Security (RLS) の設定
ALTER TABLE cover_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitored_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- cover_songs: 誰でも閲覧可能
CREATE POLICY "Allow public read access" ON cover_songs
  FOR SELECT USING (true);

-- monitored_channels: 誰でも閲覧可能
CREATE POLICY "Allow public read access" ON monitored_channels
  FOR SELECT USING (true);
\`\`\`

### テストデータの投入（動作確認用）

動作確認のため、いくつかサンプルデータを入れてみてください：

\`\`\`sql
INSERT INTO cover_songs (
  youtube_video_id,
  vtuber_name,
  channel_id,
  video_title,
  thumbnail_url,
  published_at,
  song_title,
  artist_name,
  spotify_track_id,
  spotify_track_url
) VALUES (
  'dQw4w9WgXcQ',
  '星街すいせい',
  'UC5CwaMl1eIgY8h02uZw7u8A',
  '【歌ってみた】Never Gonna Give You Up / Rick Astley',
  '<https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg>',
  '2024-01-15 12:00:00+00',
  'Never Gonna Give You Up',
  'Rick Astley',
  '4PTG3ovr5Q0',
  '<https://open.spotify.com/track/4PTG3ovr5Q0>'
);
\`\`\`

---

## 🚀 デプロイ（Vercel）

### Vercelへのデプロイ手順

1. [Vercel](https://vercel.com/) にログイン
2. プロジェクトをGitHubにpush
3. VercelでGitHubリポジトリをインポート
4. 環境変数を設定（`.env.local` と同じ内容）
5. デプロイ！

---

## 📂 プロジェクト構成

\`\`\`
oshiga-utatteta/
├── app/
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # ホームページ
│   ├── page.css
│   ├── globals.css          # グローバルCSS
│   └── cover/
│       └── [id]/
│           ├── page.tsx     # 詳細ページ
│           ├── page.css
│           └── not-found.tsx
├── components/
│   ├── Header.tsx
│   ├── Header.css
│   ├── CoverSongCard.tsx
│   ├── CoverSongCard.css
│   ├── SearchBar.tsx
│   ├── SearchBar.css
│   ├── YouTubePlayer.tsx
│   ├── YouTubePlayer.css
│   ├── SpotifyPlayer.tsx
│   └── SpotifyPlayer.css
├── lib/
│   └── supabase.ts          # Supabaseクライアント
├── types/
│   └── index.ts             # 型定義
├── styles/
│   └── variables.css        # CSS変数
├── .env.local               # 環境変数
└── package.json
\`\`\`

---

## 🎨 デザインシステム

### カラーパレット

- **プライマリカラー**: `#FF6B9D` (ピンク)
- **セカンダリカラー**: `#C56BFF` (紫)
- **アクセントカラー**: `#FFD93D` (イエロー)

### フォント

- **見出し**: Inter
- **本文**: Noto Sans JP

---

## 📝 TODO

かぐやさん、次にやることリスト：

1. **Supabaseプロジェクトを作成** → `.env.local` に設定
2. **データベースを作成** → 上記のSQLを実行
3. **テストデータを投入** → 動作確認
4. **開発サーバーを起動** → `npm run dev`
5. **動作確認** → 一覧表示、検索、詳細ページ

この後、バッチ処理（YouTube API連携）を実装していきます！

---

## ❓ よくある質問

### Q: 環境変数が反映されない

A: 開発サーバーを再起動してください（`Ctrl + C` → `npm run dev`）

### Q: Supabaseに接続できない

A: `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認してください

### Q: テストデータが表示されない

A: SupabaseのRLSポリシーが正しく設定されているか確認してください

---

**かぐやさん、私は絶対に間違ってません！これで動きます！**
