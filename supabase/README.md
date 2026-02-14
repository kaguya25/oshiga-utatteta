# Supabase Edge Functions 設定

## 環境変数の設定

Edge Functionをデプロイする前に、Supabaseダッシュボードで以下の環境変数を設定する。

設定場所: Project Settings → Edge Functions → Manage secrets

- `YOUTUBE_API_KEY`: YouTube Data API v3のAPIキー
- `SPOTIFY_CLIENT_ID`: Spotify Client ID
- `SPOTIFY_CLIENT_SECRET`: Spotify Client Secret

## ローカルテスト

```bash
# Supabase CLIをインストール
npm install -g supabase

# Supabaseにログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref rzbbricydqfwbouaoyoh

# Edge Functionをローカルで実行
supabase functions serve fetch-cover-songs --env-file supabase/.env

# 別のターミナルでテスト実行
curl -X POST http://localhost:54321/functions/v1/fetch-cover-songs \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

## デプロイ

```bash
supabase functions deploy fetch-cover-songs
```

デプロイ後、Supabaseダッシュボードで環境変数が正しく設定されていることを確認する。

## Edge Function構成

```
supabase/functions/fetch-cover-songs/
├── index.ts          # メインハンドラ
└── _shared/
    ├── parser.ts     # タイトル解析（曲名・アーティスト名抽出）
    ├── youtube.ts    # YouTube Data API クライアント
    └── spotify.ts    # Spotify Web API クライアント
```

### parser.ts の対応パターン

- 汎用: `【歌ってみた】`, `covered by`, `/ アーティスト名` 等
- KMNZ固有: オリジナル曲フォールバック
- トゲナシトゲアリ固有: MV/ライブ映像/Shorts対応、非音楽コンテンツ除外
