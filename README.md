# 推しが歌ってた

[![Vercel App](https://therealsujitk-vercel-badge.vercel.app/?app=oshiga-utatteta)](https://oshiga-utatteta.vercel.app)

推しのアーティストがカバーした楽曲を一覧表示し、YouTubeとSpotifyで聴き比べられるWebアプリケーション

**Demo:** <https://oshiga-utatteta.vercel.app>

---

## 機能

- **カバー曲の一覧・検索**（カード形式、チャンネル名・曲名・アーティスト名で絞り込み）
- **詳細ページ**（YouTube埋め込み再生 + Spotify楽曲の連携・聴き比べ）
- **プレイリスト機能**（Zustand + localStorage永続化、連続再生）
- **Spotify Stats分析**
  - Spotifyアカウント連携（NextAuth.js）
  - バックグラウンドでの再生履歴自動同期
  - パーソナライズされたリスニング分析（再生ランキング、時間帯別ヒートマップ、視聴時間の推移）
- **自動楽曲取得**（GitHub Actions Cron → Vercel API Route → Supabase）

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 16 (App Router), React 19, TypeScript |
| スタイリング | Vanilla CSS |
| 状態管理 | Zustand (persist) |
| 認証 | NextAuth.js |
| データベース | Supabase (PostgreSQL), Prisma (ORM) |
| Edge Functions | Supabase Edge Functions (Deno) |
| デプロイ | Vercel |
| CI/CD | GitHub Actions (Cron) |
| 外部API | YouTube Data API v3, Spotify Web API |

---

## システム構成図

```mermaid
graph TD
    User((User))

    subgraph "Frontend (Vercel)"
        UI[Next.js App]
        Player[YouTube/Spotify Player]
        Dashboard[Spotify Stats Dashboard]
        Store[Zustand Store]
    end

    subgraph "Backend (Vercel API Routes)"
        Auth[NextAuth.js]
        SyncAPI[Spotify Sync API]
        StatsAPI[Spotify Stats API]
    end

    subgraph "Database & ORM"
        Prisma[Prisma Client]
        DB[(Supabase PostgreSQL)]
    end

    subgraph "External Services"
        YouTube[YouTube Data API v3]
        Spotify[Spotify Web API]
    end

    subgraph "Automation"
        GHA[GitHub Actions Cron]
        EF[Supabase Edge Functions]
    end

    User -->|Access| UI
    User -->|Login| Auth
    UI -->|Fetch Songs| Prisma
    UI -->|View Stats| StatsAPI
    UI -->|Playback| Player
    
    Auth -->|OAuth| Spotify
    
    StatsAPI --> Prisma
    SyncAPI -->|Fetch Recent Plays| Spotify
    SyncAPI --> Prisma
    
    GHA -->|Trigger Cover Search| EF
    GHA -->|Trigger History Sync| SyncAPI
    
    EF -->|1. Fetch Videos| YouTube
    EF -->|2. Search Tracks| Spotify
    EF -->|3. Upsert| DB
    
    Prisma --> DB
```

---

## プロジェクト構成

```
oshiga-utatteta/
├── app/
│   ├── layout.tsx              # ルートレイアウト
│   ├── page.tsx                # ホームページ（一覧・検索・最近聴いた曲）
│   ├── globals.css             # グローバルCSS
│   ├── api/
│   │   ├── auth/               # NextAuth エンドポイント
│   │   ├── cron/               # カバー曲取得の定期実行
│   │   └── spotify/            # Spotify Stats/Sync API
│   ├── cover/                  # カバー曲詳細ページ
│   ├── playlist/               # プレイリストページ
│   └── spotify/                # Spotify Stats ダッシュボードページ
├── components/
│   ├── CoverSongCard.tsx
│   ├── YouTubePlayer.tsx
│   ├── SpotifyStats/           # 統計表示コンポーネント群
│   └── ...
├── lib/
│   ├── prisma.ts               # Prismaクライアント
│   ├── auth.ts                 # NextAuth設定
│   ├── spotify/                # Spotify APIクライアント・統計ロジック
│   └── supabase.ts             # Supabaseクライアント
├── prisma/
│   └── schema.prisma           # データベーススキーマ（Supabase）
├── scripts/
│   ├── import-spotify.ts       # 過去のSpotify履歴インポートスクリプト
│   └── ...
├── supabase/
│   └── functions/              # Deno Edge Functions
├── .github/
│   └── workflows/              # GitHub Actions Cron設定
└── .env.local                  # 環境変数
```

---

## セットアップ

### 必要な環境

- Node.js 18以上
- Supabaseプロジェクト
- YouTube Data API v3キー
- Spotify APIクレデンシャル

### インストールと起動

```bash
npm install
npm run dev
```

### 環境変数（.env.local）

```env
# Database & Prisma
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[YOUR-PROJECT]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"

# Supabase (クライアント用)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# YouTube Data API
YOUTUBE_API_KEY=AIza...

# Spotify API
SPOTIFY_CLIENT_ID=xxxxx
SPOTIFY_CLIENT_SECRET=xxxxx

# Vercel Cron認証
CRON_SECRET=xxxxx
```

---

## データ取得の仕組み

### 自動取得（定期実行）

GitHub Actionsが1日4回（日本時間 9:00, 19:00, 21:00, 23:00）Vercel API Routeを呼び出し、各チャンネルの新着動画を取得する。

### 初回取得（手動）

```bash
# 全チャンネルの過去1年分を取得
npx tsx scripts/initial-fetch.ts 365

# 特定チャンネルのみ取得
npx tsx scripts/initial-fetch.ts 365 <channel_id>
```

### タイトル解析（パーサー）

動画タイトルから曲名・アーティスト名を正規表現で抽出する。対応パターン:

- `【歌ってみた】曲名 / アーティスト名`
- `曲名 - アーティスト cover`
- `【カバー】曲名（アーティスト名）`
- チャンネル固有ロジック（KMNZ、トゲナシトゲアリ）

---

## デプロイ

1. GitHubにpush（mainブランチ）
2. Vercelが自動デプロイ
3. Vercelダッシュボードで環境変数を設定

---

## デザインシステム

| 項目 | 値 |
|------|-----|
| プライマリカラー | `#FF6B9D` (ピンク) |
| セカンダリカラー | `#C56BFF` (紫) |
| アクセントカラー | `#FFD93D` (イエロー) |
| 見出しフォント | Inter |
| 本文フォント | Noto Sans JP |
